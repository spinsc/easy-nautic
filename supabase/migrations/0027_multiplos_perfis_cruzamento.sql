-- Sistema de múltiplos perfis (marinheiro, lojista/revendedor, estaleiro, marina etc.):
-- generaliza o cruzamento pra 3 estratégias, já que hoje um chamado SEM equipamento
-- vinculado (ex: "preciso de um marinheiro") não gerava nenhuma notificação pra ninguém.

alter table chamados
  add column categoria_servico_id uuid references categorias_servico(id),
  add column marca_id uuid references marcas(id);

comment on column chamados.categoria_servico_id is 'Usado quando o chamado não tem equipamento vinculado — pedido de serviço por categoria (ex: Marinheiro).';
comment on column chamados.marca_id is 'Usado quando o chamado é um pedido de peça/cotação por marca, sem um equipamento cadastrado.';

create or replace function gerar_candidatos_chamado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marca_id uuid;
  v_marca_nome text;
  v_cidade_id int;
  v_cidade_nome text;
  v_estado_sigla text;
  v_categoria_nome text;
begin
  select e.cidade_id, c.nome, es.sigla into v_cidade_id, v_cidade_nome, v_estado_sigla
  from embarcacoes e
  left join cidades c on c.id = e.cidade_id
  left join estados es on es.id = c.estado_id
  where e.id = new.embarcacao_id;

  if v_cidade_id is null then
    return new;
  end if;

  if new.equipamento_id is not null then
    -- Estratégia 1: equipamento vinculado -> casa pela marca do equipamento.
    select eq.marca_id, m.nome into v_marca_id, v_marca_nome
    from equipamentos_embarcados eq
    left join marcas m on m.id = eq.marca_id
    where eq.id = new.equipamento_id;

    if v_marca_id is null then
      return new;
    end if;

    insert into chamado_notificacoes (chamado_id, prestador_id, motivo, canal)
    select new.id, pm.prestador_id, format('Marca: %s · Região: %s/%s', v_marca_nome, v_cidade_nome, v_estado_sigla), 'email'
    from prestador_marcas pm
    join prestador_regioes pr on pr.prestador_id = pm.prestador_id and pr.cidade_id = v_cidade_id
    where pm.marca_id = v_marca_id
    on conflict do nothing;

    insert into chamado_notificacoes (chamado_id, prestador_id, motivo, canal)
    select new.id, pm.prestador_id, format('Marca: %s · Região: %s/%s', v_marca_nome, v_cidade_nome, v_estado_sigla), 'push'
    from prestador_marcas pm
    join prestador_regioes pr on pr.prestador_id = pm.prestador_id and pr.cidade_id = v_cidade_id
    where pm.marca_id = v_marca_id
      and exists (select 1 from push_subscriptions ps where ps.prestador_id = pm.prestador_id)
    on conflict do nothing;

  elsif new.marca_id is not null then
    -- Estratégia 2: pedido de peça sem equipamento cadastrado -> casa pela marca informada direto no chamado.
    select m.nome into v_marca_nome from marcas m where m.id = new.marca_id;

    insert into chamado_notificacoes (chamado_id, prestador_id, motivo, canal)
    select new.id, pm.prestador_id, format('Peça · Marca: %s · Região: %s/%s', v_marca_nome, v_cidade_nome, v_estado_sigla), 'email'
    from prestador_marcas pm
    join prestador_regioes pr on pr.prestador_id = pm.prestador_id and pr.cidade_id = v_cidade_id
    where pm.marca_id = new.marca_id
    on conflict do nothing;

    insert into chamado_notificacoes (chamado_id, prestador_id, motivo, canal)
    select new.id, pm.prestador_id, format('Peça · Marca: %s · Região: %s/%s', v_marca_nome, v_cidade_nome, v_estado_sigla), 'push'
    from prestador_marcas pm
    join prestador_regioes pr on pr.prestador_id = pm.prestador_id and pr.cidade_id = v_cidade_id
    where pm.marca_id = new.marca_id
      and exists (select 1 from push_subscriptions ps where ps.prestador_id = pm.prestador_id)
    on conflict do nothing;

  elsif new.categoria_servico_id is not null then
    -- Estratégia 3: pedido de serviço por categoria, sem equipamento nem marca (ex: Marinheiro, Marina).
    select nome into v_categoria_nome from categorias_servico where id = new.categoria_servico_id;

    insert into chamado_notificacoes (chamado_id, prestador_id, motivo, canal)
    select new.id, pc.prestador_id, format('Categoria: %s · Região: %s/%s', v_categoria_nome, v_cidade_nome, v_estado_sigla), 'email'
    from prestador_categorias pc
    join prestador_regioes pr on pr.prestador_id = pc.prestador_id and pr.cidade_id = v_cidade_id
    where pc.categoria_servico_id = new.categoria_servico_id
    on conflict do nothing;

    insert into chamado_notificacoes (chamado_id, prestador_id, motivo, canal)
    select new.id, pc.prestador_id, format('Categoria: %s · Região: %s/%s', v_categoria_nome, v_cidade_nome, v_estado_sigla), 'push'
    from prestador_categorias pc
    join prestador_regioes pr on pr.prestador_id = pc.prestador_id and pr.cidade_id = v_cidade_id
    where pc.categoria_servico_id = new.categoria_servico_id
      and exists (select 1 from push_subscriptions ps where ps.prestador_id = pc.prestador_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

insert into categorias_servico (nome, ordem)
select 'Marina', (select coalesce(max(ordem), 0) + 1 from categorias_servico)
where not exists (select 1 from categorias_servico where nome = 'Marina');
