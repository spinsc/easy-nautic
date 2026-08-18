-- Painel admin master: dashboard com indicadores agregados do sistema (cadastros,
-- negócios por prestador/embarcação, série temporal, saúde do envio de notificações).
-- Tudo via funções SECURITY DEFINER que checam sou_admin() internamente — evita expor
-- as tabelas brutas (cotacoes, chamado_notificacoes) via RLS só pra isso.

create or replace function admin_dashboard_kpis()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  resultado json;
begin
  if not sou_admin() then
    raise exception 'Acesso negado';
  end if;

  select json_build_object(
    'total_prestadores', (select count(*) from prestadores),
    'prestadores_pendentes', (select count(*) from prestadores where status_verificacao = 'pendente'),
    'prestadores_verificados', (select count(*) from prestadores where status_verificacao = 'verificado'),
    'prestadores_rejeitados', (select count(*) from prestadores where status_verificacao = 'rejeitado'),
    'novos_prestadores_30d', (select count(*) from prestadores where criado_em >= now() - interval '30 days'),
    'total_embarcacoes', (select count(*) from embarcacoes),
    'novas_embarcacoes_30d', (select count(*) from embarcacoes where criado_em >= now() - interval '30 days'),
    'total_chamados', (select count(*) from chamados),
    'chamados_abertos', (select count(*) from chamados where status = 'aberto'),
    'chamados_em_andamento', (select count(*) from chamados where status = 'em_andamento'),
    'chamados_aguardando_confirmacao', (select count(*) from chamados where status = 'aguardando_confirmacao'),
    'chamados_concluidos', (select count(*) from chamados where status = 'concluido'),
    'chamados_em_disputa', (select count(*) from chamados where status = 'em_disputa'),
    'novos_chamados_30d', (select count(*) from chamados where criado_em >= now() - interval '30 days'),
    'total_cotacoes', (select count(*) from cotacoes),
    'cotacoes_aprovadas', (select count(*) from cotacoes where status = 'aprovada'),
    'cotacoes_pagas', (select count(*) from cotacoes where status = 'paga'),
    'valor_total_pago', (select coalesce(sum(valor), 0) from cotacoes where status = 'paga'),
    'ticket_medio_pago', (select coalesce(avg(valor), 0) from cotacoes where status = 'paga')
  ) into resultado;

  return resultado;
end;
$$;

create or replace function admin_negocios_por_prestador(p_limite int default 20)
returns table (
  prestador_id uuid,
  nome text,
  status_verificacao text,
  qtd_chamados_atendidos bigint,
  qtd_chamados_concluidos bigint,
  qtd_cotacoes_pagas bigint,
  valor_total numeric,
  avaliacao_media numeric,
  total_avaliacoes int
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not sou_admin() then
    raise exception 'Acesso negado';
  end if;

  return query
  select
    p.id as prestador_id,
    p.nome,
    p.status_verificacao,
    count(distinct c.id) filter (where c.atendido_por = p.id) as qtd_chamados_atendidos,
    count(distinct c.id) filter (where c.atendido_por = p.id and c.status = 'concluido') as qtd_chamados_concluidos,
    count(distinct q.id) filter (where q.status = 'paga') as qtd_cotacoes_pagas,
    coalesce(sum(q.valor) filter (where q.status = 'paga'), 0) as valor_total,
    p.avaliacao_media,
    p.total_avaliacoes
  from prestadores p
  left join chamados c on c.atendido_por = p.id
  left join cotacoes q on q.prestador_id = p.id
  group by p.id
  having count(distinct c.id) filter (where c.atendido_por = p.id) > 0
  order by valor_total desc, qtd_chamados_concluidos desc
  limit p_limite;
end;
$$;

create or replace function admin_negocios_por_embarcacao(p_limite int default 20)
returns table (
  embarcacao_id uuid,
  nome text,
  cliente_nome text,
  qtd_chamados bigint,
  qtd_chamados_concluidos bigint,
  valor_total numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not sou_admin() then
    raise exception 'Acesso negado';
  end if;

  return query
  select
    e.id as embarcacao_id,
    e.nome,
    e.cliente_nome,
    count(distinct c.id) as qtd_chamados,
    count(distinct c.id) filter (where c.status = 'concluido') as qtd_chamados_concluidos,
    coalesce(sum(q.valor) filter (where q.status = 'paga'), 0) as valor_total
  from embarcacoes e
  join chamados c on c.embarcacao_id = e.id
  left join cotacoes q on q.chamado_id = c.id
  group by e.id
  order by valor_total desc, qtd_chamados desc
  limit p_limite;
end;
$$;

create or replace function admin_serie_temporal(p_meses int default 12)
returns table (
  mes date,
  novos_prestadores bigint,
  novas_embarcacoes bigint,
  novos_chamados bigint,
  chamados_concluidos bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not sou_admin() then
    raise exception 'Acesso negado';
  end if;

  return query
  with meses as (
    select date_trunc('month', now()) - make_interval(months => n) as mes
    from generate_series(0, p_meses - 1) as n
  )
  select
    m.mes::date,
    (select count(*) from prestadores p where date_trunc('month', p.criado_em) = m.mes),
    (select count(*) from embarcacoes e where date_trunc('month', e.criado_em) = m.mes),
    (select count(*) from chamados c where date_trunc('month', c.criado_em) = m.mes),
    (select count(*) from chamados c where date_trunc('month', c.concluido_em) = m.mes)
  from meses m
  order by m.mes;
end;
$$;

create or replace function admin_notificacoes_stats()
returns table (
  canal text,
  status text,
  qtd bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not sou_admin() then
    raise exception 'Acesso negado';
  end if;

  return query
  select n.canal, n.status, count(*)
  from chamado_notificacoes n
  group by n.canal, n.status
  order by n.canal, n.status;
end;
$$;

revoke all on function admin_dashboard_kpis() from public, anon;
revoke all on function admin_negocios_por_prestador(int) from public, anon;
revoke all on function admin_negocios_por_embarcacao(int) from public, anon;
revoke all on function admin_serie_temporal(int) from public, anon;
revoke all on function admin_notificacoes_stats() from public, anon;

grant execute on function admin_dashboard_kpis() to authenticated;
grant execute on function admin_negocios_por_prestador(int) to authenticated;
grant execute on function admin_negocios_por_embarcacao(int) to authenticated;
grant execute on function admin_serie_temporal(int) to authenticated;
grant execute on function admin_notificacoes_stats() to authenticated;
