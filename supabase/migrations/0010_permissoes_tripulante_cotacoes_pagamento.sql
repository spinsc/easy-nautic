-- Permissões granulares de marinheiro (solicitar/aprovar/pagar serviços da embarcação),
-- forma de pagamento global do prestador, e cotações comerciais dos chamados (valor +
-- forma de pagamento, que pode usar a global do prestador ou uma específica da cotação).

alter table embarcacao_tripulantes add column pode_solicitar boolean not null default true;
alter table embarcacao_tripulantes add column pode_aprovar boolean not null default false;
alter table embarcacao_tripulantes add column pode_pagar boolean not null default false;

alter table prestadores add column formas_pagamento jsonb not null default '[]'::jsonb;

-- SECURITY DEFINER pra não recursar entre chamados <-> embarcacoes <-> embarcacao_tripulantes
-- (mesmo padrão de tecnico_atende_*/marinheiro_tripula_embarcacao).
create or replace function tripulante_pode(p_embarcacao_id uuid, p_permissao text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from embarcacao_tripulantes t
    where t.embarcacao_id = p_embarcacao_id and t.marinheiro_id = auth.uid()
      and (
        p_permissao = 'ver'
        or (p_permissao = 'solicitar' and t.pode_solicitar)
        or (p_permissao = 'aprovar' and t.pode_aprovar)
        or (p_permissao = 'pagar' and t.pode_pagar)
      )
  );
$$;

revoke all on function tripulante_pode(uuid, text) from public, anon;
grant execute on function tripulante_pode(uuid, text) to authenticated;

create or replace function ator_do_chamado(p_chamado_id uuid, p_permissao text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from chamados c join embarcacoes e on e.id = c.embarcacao_id
    where c.id = p_chamado_id and (e.estaleiro_id = auth.uid() or e.proprietario_id = auth.uid())
  ) or exists (
    select 1 from chamados c where c.id = p_chamado_id and tripulante_pode(c.embarcacao_id, p_permissao)
  );
$$;

revoke all on function ator_do_chamado(uuid, text) from public, anon;
grant execute on function ator_do_chamado(uuid, text) to authenticated;

create policy tripulante_ve_chamados_da_embarcacao on chamados
  for select using (tripulante_pode(embarcacao_id, 'ver'));

create policy tripulante_solicita_chamados on chamados
  for insert to authenticated
  with check (tripulante_pode(embarcacao_id, 'solicitar'));

create table cotacoes (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  prestador_id uuid not null references prestadores(id) on delete cascade,
  valor numeric not null,
  descricao text,
  forma_pagamento jsonb,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada', 'paga')),
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  aprovado_por uuid references prestadores(id) on delete set null,
  pago_em timestamptz,
  pago_por uuid references prestadores(id) on delete set null
);

alter table cotacoes enable row level security;

create policy ve_cotacoes_do_chamado on cotacoes
  for select using (prestador_id = auth.uid() or ator_do_chamado(chamado_id, 'ver') or sou_admin());

create policy prestador_cria_cotacao on cotacoes
  for insert to authenticated
  with check (prestador_id = auth.uid());

create policy prestador_atualiza_propria_cotacao_pendente on cotacoes
  for update using (prestador_id = auth.uid() and status = 'pendente');

create policy aprova_cotacao on cotacoes
  for update using (ator_do_chamado(chamado_id, 'aprovar') or sou_admin());

create policy paga_cotacao on cotacoes
  for update using (ator_do_chamado(chamado_id, 'pagar') or sou_admin());
