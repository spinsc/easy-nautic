-- Avaliação bidirecional pós-conclusão (modelo Uber motorista/passageiro): o lado
-- tomador (dono/estaleiro da embarcação, ou tripulante com pode_aprovar) avalia o
-- prestador, e o prestador vencedor avalia o tomador. Só depois do chamado concluído.
-- avaliado_id é sempre derivado no servidor (nunca confiado do cliente) pra evitar
-- que alguém aponte a nota pra um destinatário errado.

create table avaliacoes (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  avaliador_id uuid not null references auth.users(id) on delete cascade,
  avaliado_id uuid not null references auth.users(id) on delete cascade,
  papel_avaliado text not null check (papel_avaliado in ('prestador', 'tomador')),
  nota int not null check (nota between 1 and 5),
  comentario text,
  criado_em timestamptz not null default now(),
  unique (chamado_id, avaliador_id)
);

alter table avaliacoes enable row level security;

create policy ve_proprias_avaliacoes on avaliacoes
  for select using (avaliador_id = auth.uid() or avaliado_id = auth.uid() or sou_admin());

create policy cria_propria_avaliacao on avaliacoes
  for insert with check (avaliador_id = auth.uid());

create or replace function valida_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_embarcacao_id uuid;
  v_atendido_por uuid;
  v_proprietario_id uuid;
  v_estaleiro_id uuid;
begin
  select c.status, c.embarcacao_id, c.atendido_por
    into v_status, v_embarcacao_id, v_atendido_por
  from chamados c
  where c.id = new.chamado_id;

  if v_status is null then
    raise exception 'Chamado não encontrado';
  end if;

  if v_status != 'concluido' then
    raise exception 'Só é possível avaliar depois que o chamado for concluído';
  end if;

  select e.proprietario_id, e.estaleiro_id into v_proprietario_id, v_estaleiro_id
  from embarcacoes e where e.id = v_embarcacao_id;

  if new.papel_avaliado = 'prestador' then
    if not ator_do_chamado(new.chamado_id, 'aprovar') then
      raise exception 'Sem permissão para avaliar o prestador deste chamado';
    end if;
    if v_atendido_por is null then
      raise exception 'Chamado sem prestador vencedor definido';
    end if;
    new.avaliado_id := v_atendido_por;
  else
    if new.avaliador_id is distinct from v_atendido_por then
      raise exception 'Só o prestador que atendeu o chamado pode avaliar o tomador';
    end if;
    if coalesce(v_proprietario_id, v_estaleiro_id) is null then
      raise exception 'Embarcação sem responsável definido para avaliação';
    end if;
    new.avaliado_id := coalesce(v_proprietario_id, v_estaleiro_id);
  end if;

  return new;
end;
$$;

create trigger valida_avaliacao_trigger
  before insert on avaliacoes
  for each row execute function valida_avaliacao();

revoke all on function valida_avaliacao() from public, anon, authenticated;

-- Mantém prestadores.avaliacao_media / total_avaliacoes (colunas já existentes)
-- sincronizados com as avaliações recebidas como prestador.
create or replace function atualiza_media_prestador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.papel_avaliado = 'prestador' then
    update prestadores set
      total_avaliacoes = (select count(*) from avaliacoes where avaliado_id = new.avaliado_id and papel_avaliado = 'prestador'),
      avaliacao_media = (select avg(nota) from avaliacoes where avaliado_id = new.avaliado_id and papel_avaliado = 'prestador')
    where id = new.avaliado_id;
  end if;
  return new;
end;
$$;

create trigger atualiza_media_prestador_trigger
  after insert on avaliacoes
  for each row execute function atualiza_media_prestador();

revoke all on function atualiza_media_prestador() from public, anon, authenticated;
