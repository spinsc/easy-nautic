-- A política de leitura do técnico em `equipamentos_embarcados`/`embarcacoes` bloqueava a
-- própria subquery da política de `chamados` (RLS se aplica a toda referência de tabela,
-- inclusive dentro de outra política) e, pior, criava recursão infinita entre
-- embarcacoes <-> equipamentos_embarcados quando as duas se referenciavam mutuamente.
--
-- Corrigido com funções SECURITY DEFINER: rodam com privilégio do dono da tabela,
-- então não disparam RLS de novo nas tabelas que consultam — quebra o ciclo.
create or replace function tecnico_atende_equipamento(p_equipamento_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from equipamentos_embarcados eq
    join prestador_categorias pc on pc.prestador_id = auth.uid()
    where eq.id = p_equipamento_id
      and eq.marca is not null
      and pc.marcas_atendidas ? eq.marca
  );
$$;

create or replace function tecnico_atende_embarcacao(p_embarcacao_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from equipamentos_embarcados eq
    join prestador_categorias pc on pc.prestador_id = auth.uid()
    where eq.embarcacao_id = p_embarcacao_id
      and eq.marca is not null
      and pc.marcas_atendidas ? eq.marca
  );
$$;

revoke all on function tecnico_atende_equipamento(uuid) from public, anon;
revoke all on function tecnico_atende_embarcacao(uuid) from public, anon;
grant execute on function tecnico_atende_equipamento(uuid) to authenticated;
grant execute on function tecnico_atende_embarcacao(uuid) to authenticated;

drop policy if exists tecnico_ve_chamados_de_garantia_da_sua_marca on chamados;
create policy tecnico_ve_chamados_de_garantia_da_sua_marca on chamados
  for select using (
    tipo = 'garantia' and equipamento_id is not null and tecnico_atende_equipamento(equipamento_id)
  );

drop policy if exists tecnico_atende_chamados_de_garantia_da_sua_marca on chamados;
create policy tecnico_atende_chamados_de_garantia_da_sua_marca on chamados
  for update using (
    tipo = 'garantia' and equipamento_id is not null and tecnico_atende_equipamento(equipamento_id)
  );

drop policy if exists tecnico_ve_equipamentos_da_sua_marca on equipamentos_embarcados;
create policy tecnico_ve_equipamentos_da_sua_marca on equipamentos_embarcados
  for select using (tecnico_atende_equipamento(id));

drop policy if exists tecnico_ve_embarcacoes_com_equipamento_da_sua_marca on embarcacoes;
create policy tecnico_ve_embarcacoes_com_equipamento_da_sua_marca on embarcacoes
  for select using (tecnico_atende_embarcacao(id));
