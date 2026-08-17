-- Confirmação de serviço concluído, prazo de 3 dias com auto-confirmação, e rejeição de
-- serviço com motivo + evidências (alimenta a mediação de disputas do painel admin).

alter table chamados drop constraint chamados_status_check;
alter table chamados add constraint chamados_status_check
  check (status in ('aberto', 'em_andamento', 'aguardando_confirmacao', 'concluido', 'em_disputa'));

alter table chamados add column terminei_em timestamptz;

-- Trigger que valida a transição de status inteira numa peça só (mesmo motivo do trigger
-- de cotações: RLS declarativa sozinha não trava corretamente uma máquina de estados).
create or replace function valida_transicao_chamado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.sistema', true) = 'true' then
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.status = 'aberto' and new.status = 'em_andamento' then
    return new;
  end if;

  if old.status = 'em_andamento' and new.status = 'aguardando_confirmacao' then
    if old.atendido_por is distinct from auth.uid() then
      raise exception 'Só o prestador responsável pode marcar o chamado como concluído.';
    end if;
    new.terminei_em := now();
    return new;
  end if;

  if old.status = 'aguardando_confirmacao' and new.status in ('concluido', 'em_disputa') then
    if not (ator_do_chamado(old.id, 'aprovar') or sou_admin()) then
      raise exception 'Sem permissão para confirmar ou rejeitar este serviço.';
    end if;
    return new;
  end if;

  if old.status = 'em_disputa' and new.status in ('em_andamento', 'concluido') then
    if not (ator_do_chamado(old.id, 'aprovar') or sou_admin()) then
      raise exception 'Sem permissão para resolver esta disputa.';
    end if;
    return new;
  end if;

  raise exception 'Transição de status inválida: % -> %', old.status, new.status;
end;
$$;

create trigger trg_valida_transicao_chamado
  before update on chamados
  for each row
  execute function valida_transicao_chamado();

-- Quando uma cotação é aprovada: rejeita as demais pendentes do mesmo chamado e move o
-- chamado pra "em_andamento" com o prestador vencedor.
create or replace function aprova_cotacao_atualiza_chamado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'aprovada' and old.status = 'pendente' then
    update cotacoes set status = 'rejeitada'
      where chamado_id = new.chamado_id and id <> new.id and status = 'pendente';

    update chamados set status = 'em_andamento', atendido_por = new.prestador_id
      where id = new.chamado_id and status = 'aberto';
  end if;
  return new;
end;
$$;

create trigger trg_aprova_cotacao_atualiza_chamado
  after update on cotacoes
  for each row
  execute function aprova_cotacao_atualiza_chamado();

-- Cotação só pode ser paga depois que o chamado está de fato concluído (confirmado).
create or replace function valida_transicao_cotacao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    if old.prestador_id <> auth.uid() or old.status <> 'pendente' then
      raise exception 'Sem permissão para editar esta cotação.';
    end if;
    return new;
  end if;

  if old.status = 'pendente' and new.status in ('aprovada', 'rejeitada') then
    if not (ator_do_chamado(old.chamado_id, 'aprovar') or sou_admin()) then
      raise exception 'Sem permissão para aprovar/rejeitar esta cotação.';
    end if;
    return new;
  end if;

  if old.status = 'aprovada' and new.status = 'paga' then
    if not exists (select 1 from chamados c where c.id = old.chamado_id and c.status = 'concluido') then
      raise exception 'O chamado precisa estar concluído antes de liberar o pagamento.';
    end if;
    if not (ator_do_chamado(old.chamado_id, 'pagar') or sou_admin()) then
      raise exception 'Sem permissão para marcar esta cotação como paga.';
    end if;
    return new;
  end if;

  raise exception 'Transição de status inválida: % -> %', old.status, new.status;
end;
$$;

-- Rejeição de serviço: motivo + evidências (imagens/vídeos/textos comprovando o motivo).
create table chamado_rejeicoes (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  motivo text not null,
  evidencias jsonb not null default '[]'::jsonb,
  criado_por uuid references prestadores(id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table chamado_rejeicoes enable row level security;

create policy ve_rejeicoes_do_chamado on chamado_rejeicoes
  for select using (ator_do_chamado(chamado_id, 'ver') or sou_admin());

create policy cria_rejeicao on chamado_rejeicoes
  for insert to authenticated
  with check (ator_do_chamado(chamado_id, 'aprovar') or sou_admin());

insert into storage.buckets (id, name, public) values ('evidencias-chamados', 'evidencias-chamados', false);

create policy ator_upload_evidencias on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidencias-chamados'
    and ator_do_chamado(((storage.foldername(name))[1])::uuid, 'aprovar')
  );

create policy ator_le_evidencias on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidencias-chamados'
    and (ator_do_chamado(((storage.foldername(name))[1])::uuid, 'ver') or sou_admin())
  );

-- Prazo de 3 dias: se ninguém confirmar/rejeitar, o serviço é aprovado automaticamente.
create extension if not exists pg_cron;

create or replace function confirmar_servicos_por_timeout()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.sistema', 'true', true);
  update chamados
  set status = 'concluido'
  where status = 'aguardando_confirmacao'
    and terminei_em < now() - interval '3 days';
end;
$$;

revoke all on function confirmar_servicos_por_timeout() from public, anon, authenticated;

select cron.schedule('confirmar-servicos-por-timeout', '0 * * * *', $$select confirmar_servicos_por_timeout();$$);
