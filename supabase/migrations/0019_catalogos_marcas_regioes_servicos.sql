-- Catálogos estruturados pra permitir cruzar chamado (marca do equipamento + região da
-- embarcação) com prestadores, em vez de comparar texto livre. Substitui gradualmente
-- marcas_atendidas (jsonb de texto) e regiao_atuacao (texto livre).

create table estados (
  id int primary key,
  sigla text not null unique,
  nome text not null
);

create table cidades (
  id int primary key,
  nome text not null,
  estado_id int not null references estados(id)
);
create index cidades_estado_id_idx on cidades (estado_id);
create index cidades_nome_idx on cidades (nome);

alter table estados enable row level security;
alter table cidades enable row level security;
create policy leitura_publica_estados on estados for select using (true);
create policy leitura_publica_cidades on cidades for select using (true);
revoke insert, update, delete on estados from anon, authenticated;
revoke insert, update, delete on cidades from anon, authenticated;

create table marcas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);
alter table marcas enable row level security;
create policy leitura_publica_marcas on marcas for select using (true);
revoke insert, update, delete on marcas from anon, authenticated;

create table tipos_servico (
  id uuid primary key default gen_random_uuid(),
  categoria_servico_id uuid references categorias_servico(id) on delete set null,
  nome text not null,
  ordem int not null default 0
);
alter table tipos_servico enable row level security;
create policy leitura_publica_tipos_servico on tipos_servico for select using (true);
revoke insert, update, delete on tipos_servico from anon, authenticated;

-- prestador atende essas marcas (substitui prestador_categorias.marcas_atendidas em texto)
create table prestador_marcas (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references prestadores(id) on delete cascade,
  marca_id uuid not null references marcas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (prestador_id, marca_id)
);
alter table prestador_marcas enable row level security;
create policy prestador_gerencia_proprias_marcas on prestador_marcas
  for all using (auth.uid() = prestador_id) with check (auth.uid() = prestador_id);
create policy leitura_publica_marcas_de_prestadores_verificados on prestador_marcas
  for select using (
    exists (select 1 from prestadores p where p.id = prestador_marcas.prestador_id and p.status_verificacao = 'verificado')
  );

-- prestador atende essas cidades (substitui prestador_categorias.regiao_atuacao em texto)
create table prestador_regioes (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references prestadores(id) on delete cascade,
  cidade_id int not null references cidades(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (prestador_id, cidade_id)
);
alter table prestador_regioes enable row level security;
create policy prestador_gerencia_proprias_regioes on prestador_regioes
  for all using (auth.uid() = prestador_id) with check (auth.uid() = prestador_id);
create policy leitura_publica_regioes_de_prestadores_verificados on prestador_regioes
  for select using (
    exists (select 1 from prestadores p where p.id = prestador_regioes.prestador_id and p.status_verificacao = 'verificado')
  );

-- marca estruturada do equipamento (mantém a coluna de texto livre existente por
-- compatibilidade, mas o cruzamento passa a usar marca_id)
alter table equipamentos_embarcados add column marca_id uuid references marcas(id) on delete set null;

-- cidade estruturada da embarcação
alter table embarcacoes add column cidade_id int references cidades(id) on delete set null;
