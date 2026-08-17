-- Prestador pode tirar dúvidas sobre o chamado antes/durante a cotação, e solicitar uma
-- visita a bordo — que exige autorização explícita do dono/marinheiro, já que dá acesso
-- físico à embarcação.

create table chamado_perguntas (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  prestador_id uuid not null references prestadores(id) on delete cascade,
  pergunta text not null,
  resposta text,
  respondido_por uuid references prestadores(id) on delete set null,
  criado_em timestamptz not null default now(),
  respondido_em timestamptz
);

alter table chamado_perguntas enable row level security;

create policy ve_perguntas_do_chamado on chamado_perguntas
  for select using (prestador_id = auth.uid() or ator_do_chamado(chamado_id, 'ver') or sou_admin());

create policy prestador_pergunta on chamado_perguntas
  for insert to authenticated
  with check (prestador_id = auth.uid() and ator_do_chamado(chamado_id, 'ver'));

create policy dono_responde_pergunta on chamado_perguntas
  for update using (ator_do_chamado(chamado_id, 'aprovar') or sou_admin());

create table chamado_visitas (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  prestador_id uuid not null references prestadores(id) on delete cascade,
  data_sugerida timestamptz not null,
  status text not null default 'solicitada' check (status in ('solicitada', 'autorizada', 'recusada', 'realizada')),
  motivo_recusa text,
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  respondido_por uuid references prestadores(id) on delete set null
);

alter table chamado_visitas enable row level security;

create policy ve_visitas_do_chamado on chamado_visitas
  for select using (prestador_id = auth.uid() or ator_do_chamado(chamado_id, 'ver') or sou_admin());

create policy prestador_solicita_visita on chamado_visitas
  for insert to authenticated
  with check (prestador_id = auth.uid() and ator_do_chamado(chamado_id, 'ver'));

create policy atualiza_visita on chamado_visitas
  for update using (
    prestador_id = auth.uid() or ator_do_chamado(chamado_id, 'aprovar') or sou_admin()
  );

-- Autorização de acesso à embarcação é sensível — mesmo padrão anti-composição-OR das
-- outras máquinas de estado (RLS declarativa sozinha não trava a transição certa aqui).
create or replace function valida_transicao_visita()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    if old.prestador_id <> auth.uid() or old.status <> 'solicitada' then
      raise exception 'Sem permissão para editar esta visita.';
    end if;
    return new;
  end if;

  if old.status = 'solicitada' and new.status in ('autorizada', 'recusada') then
    if not (ator_do_chamado(old.chamado_id, 'aprovar') or sou_admin()) then
      raise exception 'Sem permissão para autorizar ou recusar esta visita.';
    end if;
    new.respondido_em := now();
    new.respondido_por := auth.uid();
    return new;
  end if;

  if old.status = 'autorizada' and new.status = 'realizada' then
    if old.prestador_id is distinct from auth.uid() and not (ator_do_chamado(old.chamado_id, 'aprovar') or sou_admin()) then
      raise exception 'Sem permissão para marcar esta visita como realizada.';
    end if;
    return new;
  end if;

  raise exception 'Transição de status inválida: % -> %', old.status, new.status;
end;
$$;

create trigger trg_valida_transicao_visita
  before update on chamado_visitas
  for each row
  execute function valida_transicao_visita();
