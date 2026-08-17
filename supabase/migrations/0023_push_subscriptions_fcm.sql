-- Push via Firebase Cloud Messaging (escolhido em vez de Web Push/VAPID puro porque
-- o mesmo sistema serve web e, depois, app mobile nativo, sem trocar de infraestrutura).

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references prestadores(id) on delete cascade,
  fcm_token text not null,
  criado_em timestamptz not null default now(),
  unique (prestador_id, fcm_token)
);

alter table push_subscriptions enable row level security;

create policy prestador_gerencia_proprias_assinaturas on push_subscriptions
  for all using (auth.uid() = prestador_id) with check (auth.uid() = prestador_id);

-- Estende o cruzamento (Fase B) pra também gerar notificação canal=push quando o
-- prestador tem uma assinatura ativa, além do canal=email que já existia.
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
begin
  if new.equipamento_id is null then
    return new;
  end if;

  select eq.marca_id, m.nome into v_marca_id, v_marca_nome
  from equipamentos_embarcados eq
  left join marcas m on m.id = eq.marca_id
  where eq.id = new.equipamento_id;

  select e.cidade_id, c.nome, es.sigla into v_cidade_id, v_cidade_nome, v_estado_sigla
  from embarcacoes e
  left join cidades c on c.id = e.cidade_id
  left join estados es on es.id = c.estado_id
  where e.id = new.embarcacao_id;

  if v_marca_id is null or v_cidade_id is null then
    return new;
  end if;

  insert into chamado_notificacoes (chamado_id, prestador_id, motivo, canal)
  select
    new.id,
    pm.prestador_id,
    format('Marca: %s · Região: %s/%s', v_marca_nome, v_cidade_nome, v_estado_sigla),
    'email'
  from prestador_marcas pm
  join prestador_regioes pr on pr.prestador_id = pm.prestador_id and pr.cidade_id = v_cidade_id
  where pm.marca_id = v_marca_id
  on conflict do nothing;

  insert into chamado_notificacoes (chamado_id, prestador_id, motivo, canal)
  select
    new.id,
    pm.prestador_id,
    format('Marca: %s · Região: %s/%s', v_marca_nome, v_cidade_nome, v_estado_sigla),
    'push'
  from prestador_marcas pm
  join prestador_regioes pr on pr.prestador_id = pm.prestador_id and pr.cidade_id = v_cidade_id
  where pm.marca_id = v_marca_id
    and exists (select 1 from push_subscriptions ps where ps.prestador_id = pm.prestador_id)
  on conflict do nothing;

  return new;
end;
$$;
