-- Funcionários autorizados por empresa (PJ): o próprio login da empresa cria contas de
-- acesso pra pessoas físicas atuarem "em nome" dela. Cada funcionário loga com a própria
-- conta, mas passa a poder gerenciar marcas/regiões/categorias/cotações/chamados da
-- empresa como se fosse ela — sou_eu_ou_membro() substitui os checks antigos de
-- "= auth.uid()" nas policies que hoje só permitiam o dono literal da conta agir.

create table prestador_membros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references prestadores(id) on delete cascade,
  membro_id uuid not null references prestadores(id) on delete cascade,
  papel text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (empresa_id, membro_id)
);

alter table prestador_membros enable row level security;

create policy ve_proprios_vinculos on prestador_membros
  for select using (empresa_id = auth.uid() or membro_id = auth.uid() or sou_admin());

create policy empresa_revoga_membro on prestador_membros
  for update using (empresa_id = auth.uid()) with check (empresa_id = auth.uid());

create or replace function membro_de_empresa(p_empresa_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from prestador_membros
    where empresa_id = p_empresa_id and membro_id = auth.uid() and ativo
  );
$$;

revoke all on function membro_de_empresa(uuid) from public, anon;
grant execute on function membro_de_empresa(uuid) to authenticated;

create or replace function sou_eu_ou_membro(p_prestador_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_prestador_id = auth.uid() or membro_de_empresa(p_prestador_id);
$$;

revoke all on function sou_eu_ou_membro(uuid) from public, anon;
grant execute on function sou_eu_ou_membro(uuid) to authenticated;

-- Catálogo do prestador (marcas/regiões/categorias): membro gerencia como se fosse a empresa.
drop policy prestador_gerencia_proprias_categorias on prestador_categorias;
create policy prestador_gerencia_proprias_categorias on prestador_categorias
  for all using (sou_eu_ou_membro(prestador_id)) with check (sou_eu_ou_membro(prestador_id));

drop policy prestador_gerencia_proprias_marcas on prestador_marcas;
create policy prestador_gerencia_proprias_marcas on prestador_marcas
  for all using (sou_eu_ou_membro(prestador_id)) with check (sou_eu_ou_membro(prestador_id));

drop policy prestador_gerencia_proprias_regioes on prestador_regioes;
create policy prestador_gerencia_proprias_regioes on prestador_regioes
  for all using (sou_eu_ou_membro(prestador_id)) with check (sou_eu_ou_membro(prestador_id));

-- Cotações: membro cria/gerencia cotação em nome da empresa.
drop policy prestador_cria_cotacao on cotacoes;
create policy prestador_cria_cotacao on cotacoes
  for insert with check (sou_eu_ou_membro(prestador_id));

drop policy atualiza_cotacao on cotacoes;
create policy atualiza_cotacao on cotacoes
  for update using (sou_eu_ou_membro(prestador_id) or ator_do_chamado(chamado_id, 'ver') or sou_admin());

drop policy ve_cotacoes_do_chamado on cotacoes;
create policy ve_cotacoes_do_chamado on cotacoes
  for select using (sou_eu_ou_membro(prestador_id) or ator_do_chamado(chamado_id, 'ver') or sou_admin());

-- Chamados: membro vê/gerencia chamado vencido pela empresa.
drop policy prestador_vencedor_ve_e_atende_chamado on chamados;
create policy prestador_vencedor_ve_e_atende_chamado on chamados
  for all using (atendido_por is not null and sou_eu_ou_membro(atendido_por));

-- Perguntas e visitas do chamado: mesma extensão.
drop policy prestador_pergunta on chamado_perguntas;
create policy prestador_pergunta on chamado_perguntas
  for insert with check (sou_eu_ou_membro(prestador_id) and ator_do_chamado(chamado_id, 'ver'));

drop policy ve_perguntas_do_chamado on chamado_perguntas;
create policy ve_perguntas_do_chamado on chamado_perguntas
  for select using (sou_eu_ou_membro(prestador_id) or ator_do_chamado(chamado_id, 'ver') or sou_admin());

drop policy atualiza_visita on chamado_visitas;
create policy atualiza_visita on chamado_visitas
  for update using (sou_eu_ou_membro(prestador_id) or ator_do_chamado(chamado_id, 'aprovar') or sou_admin());

drop policy prestador_solicita_visita on chamado_visitas;
create policy prestador_solicita_visita on chamado_visitas
  for insert with check (sou_eu_ou_membro(prestador_id) and ator_do_chamado(chamado_id, 'ver'));

drop policy ve_visitas_do_chamado on chamado_visitas;
create policy ve_visitas_do_chamado on chamado_visitas
  for select using (sou_eu_ou_membro(prestador_id) or ator_do_chamado(chamado_id, 'ver') or sou_admin());

drop policy ve_proprias_notificacoes on chamado_notificacoes;
create policy ve_proprias_notificacoes on chamado_notificacoes
  for select using (sou_eu_ou_membro(prestador_id) or ator_do_chamado(chamado_id, 'ver') or sou_admin());

-- Helpers centrais que checavam atendido_por/dono diretamente por auth.uid().
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
  ) or (
    p_permissao = 'ver' and exists (
      select 1 from chamados c
      where c.id = p_chamado_id and c.atendido_por is not null and sou_eu_ou_membro(c.atendido_por)
    )
  );
$$;

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
    if old.atendido_por is null or not sou_eu_ou_membro(old.atendido_por) then
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
