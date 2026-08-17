-- Estende o casamento técnico-marca pra também considerar o caminho estruturado
-- (prestador_marcas + equipamentos_embarcados.marca_id), mantendo o texto livre
-- (marcas_atendidas / marca) como fallback pra quem ainda não migrou.

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
  ) or exists (
    select 1
    from equipamentos_embarcados eq
    join prestador_marcas pm on pm.prestador_id = auth.uid() and pm.marca_id = eq.marca_id
    where eq.id = p_equipamento_id and eq.marca_id is not null
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
  ) or exists (
    select 1
    from equipamentos_embarcados eq
    join prestador_marcas pm on pm.prestador_id = auth.uid() and pm.marca_id = eq.marca_id
    where eq.embarcacao_id = p_embarcacao_id and eq.marca_id is not null
  );
$$;
