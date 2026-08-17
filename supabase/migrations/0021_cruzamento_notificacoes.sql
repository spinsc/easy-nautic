-- Cruzamento: quando um chamado é aberto com um equipamento (marca conhecida), acha os
-- prestadores que atendem aquela marca E aquela região da embarcação, e registra como
-- candidatos notificados. Fase C/D (e-mail/push) consomem essa tabela pra enviar de verdade.

create table chamado_notificacoes (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  prestador_id uuid not null references prestadores(id) on delete cascade,
  motivo text,
  canal text not null default 'email' check (canal in ('email', 'push')),
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'falhou')),
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  unique (chamado_id, prestador_id, canal)
);

alter table chamado_notificacoes enable row level security;

create policy ve_proprias_notificacoes on chamado_notificacoes
  for select using (prestador_id = auth.uid() or ator_do_chamado(chamado_id, 'ver') or sou_admin());

-- só o processo de cruzamento (SECURITY DEFINER) grava aqui — cliente não insere direto
revoke insert, update, delete on chamado_notificacoes from anon, authenticated;

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

  insert into chamado_notificacoes (chamado_id, prestador_id, motivo)
  select
    new.id,
    pm.prestador_id,
    format('Marca: %s · Região: %s/%s', v_marca_nome, v_cidade_nome, v_estado_sigla)
  from prestador_marcas pm
  join prestador_regioes pr on pr.prestador_id = pm.prestador_id and pr.cidade_id = v_cidade_id
  where pm.marca_id = v_marca_id
  on conflict do nothing;

  return new;
end;
$$;

create trigger trg_gerar_candidatos_chamado
  after insert on chamados
  for each row
  execute function gerar_candidatos_chamado();

revoke all on function gerar_candidatos_chamado() from public, anon, authenticated;
