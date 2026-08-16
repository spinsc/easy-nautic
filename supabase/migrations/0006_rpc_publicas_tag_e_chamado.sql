create or replace function buscar_embarcacao_por_tag(p_tag_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_embarcacao_id uuid;
  v_result json;
begin
  select embarcacao_id into v_embarcacao_id
  from embarcacoes_tags
  where tag_id = p_tag_id and ativo = true;

  if v_embarcacao_id is null then
    return null;
  end if;

  update embarcacoes_tags set contagem_leituras = contagem_leituras + 1 where tag_id = p_tag_id;

  select json_build_object(
    'embarcacao', (select json_build_object(
      'id', e.id, 'nome', e.nome, 'fabricante', e.fabricante, 'modelo', e.modelo,
      'ano', e.ano, 'comprimento', e.comprimento
    ) from embarcacoes e where e.id = v_embarcacao_id),
    'equipamentos', (select coalesce(json_agg(json_build_object(
      'id', eq.id, 'categoria', eq.categoria, 'nome', eq.nome, 'marca', eq.marca,
      'modelo', eq.modelo, 'garantia_vence_em', eq.garantia_vence_em
    )), '[]'::json) from equipamentos_embarcados eq where eq.embarcacao_id = v_embarcacao_id),
    'chamados', (select coalesce(json_agg(json_build_object(
      'id', c.id, 'tipo', c.tipo, 'descricao', c.descricao, 'status', c.status, 'criado_em', c.criado_em
    ) order by c.criado_em desc), '[]'::json) from chamados c where c.embarcacao_id = v_embarcacao_id)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function buscar_embarcacao_por_tag(text) from public;
grant execute on function buscar_embarcacao_por_tag(text) to anon, authenticated;

create or replace function abrir_chamado_por_tag(p_tag_id text, p_descricao text, p_equipamento_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_embarcacao_id uuid;
  v_tipo text := 'comercial';
  v_hoje date := current_date;
  v_chamado_id uuid;
begin
  select embarcacao_id into v_embarcacao_id
  from embarcacoes_tags
  where tag_id = p_tag_id and ativo = true;

  if v_embarcacao_id is null then
    raise exception 'Tag não encontrada.';
  end if;

  if p_equipamento_id is not null then
    if exists (
      select 1 from equipamentos_embarcados
      where id = p_equipamento_id and embarcacao_id = v_embarcacao_id
        and garantia_vence_em is not null and garantia_vence_em >= v_hoje
    ) then
      v_tipo := 'garantia';
    end if;
  else
    if exists (
      select 1 from embarcacoes
      where id = v_embarcacao_id and data_venda is not null and prazo_garantia_casco_meses is not null
        and (data_venda + (prazo_garantia_casco_meses || ' months')::interval) >= v_hoje
    ) then
      v_tipo := 'garantia';
    end if;
  end if;

  insert into chamados (embarcacao_id, equipamento_id, tipo, descricao)
  values (v_embarcacao_id, p_equipamento_id, v_tipo, p_descricao)
  returning id into v_chamado_id;

  return v_chamado_id;
end;
$$;

revoke all on function abrir_chamado_por_tag(text, text, uuid) from public;
grant execute on function abrir_chamado_por_tag(text, text, uuid) to anon, authenticated;
