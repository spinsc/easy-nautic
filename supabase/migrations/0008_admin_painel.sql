-- Painel administrativo: aprovação de cadastros de prestadores e mediação de chamados.
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table admins enable row level security;

-- SECURITY DEFINER pra não depender de policy própria em `admins` (mesmo padrão
-- já usado em tecnico_atende_equipamento/embarcacao) — evita ciclo de RLS.
create or replace function sou_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

revoke all on function sou_admin() from public, anon;
grant execute on function sou_admin() to authenticated;

create policy admin_ve_todos_prestadores on prestadores
  for select using (sou_admin());

create policy admin_atualiza_prestadores on prestadores
  for update using (sou_admin());

create policy admin_ve_todos_chamados on chamados
  for select using (sou_admin());

create policy admin_atualiza_chamados on chamados
  for update using (sou_admin());

create policy admin_ve_todas_embarcacoes on embarcacoes
  for select using (sou_admin());

create policy admin_ve_todos_equipamentos on equipamentos_embarcados
  for select using (sou_admin());

create policy admin_le_documentos_prestadores on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos-prestadores' and sou_admin());
