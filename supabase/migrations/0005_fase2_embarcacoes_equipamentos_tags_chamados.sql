create table embarcacoes (
  id uuid primary key default gen_random_uuid(),
  estaleiro_id uuid not null references prestadores(id) on delete cascade,
  cliente_nome text not null,
  cliente_telefone text,
  cliente_email text,
  nome text not null,
  fabricante text,
  modelo text,
  numero_registro text,
  comprimento numeric,
  ano int,
  data_venda date,
  prazo_garantia_casco_meses int,
  estado_geral jsonb not null default '{}'::jsonb,
  atributos jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

alter table embarcacoes enable row level security;
create policy estaleiro_gerencia_proprias_embarcacoes on embarcacoes
  for all using (auth.uid() = estaleiro_id) with check (auth.uid() = estaleiro_id);

create table equipamentos_embarcados (
  id uuid primary key default gen_random_uuid(),
  embarcacao_id uuid not null references embarcacoes(id) on delete cascade,
  categoria text not null check (categoria in ('MOTOR', 'GERADOR', 'AR_CONDICIONADO', 'ACESSORIO')),
  nome text not null,
  marca text,
  modelo text,
  numero_serie text,
  instalado_em date,
  data_venda date,
  prazo_garantia_meses int,
  garantia_vence_em date,
  criado_em timestamptz not null default now()
);

alter table equipamentos_embarcados enable row level security;
create policy estaleiro_gerencia_equipamentos_das_proprias_embarcacoes on equipamentos_embarcados
  for all using (
    exists (select 1 from embarcacoes e where e.id = equipamentos_embarcados.embarcacao_id and e.estaleiro_id = auth.uid())
  )
  with check (
    exists (select 1 from embarcacoes e where e.id = equipamentos_embarcados.embarcacao_id and e.estaleiro_id = auth.uid())
  );

create table embarcacoes_tags (
  id uuid primary key default gen_random_uuid(),
  embarcacao_id uuid not null references embarcacoes(id) on delete cascade,
  tag_id text not null unique,
  modelo_nfc text not null default 'NTAG213',
  modo_gravacao text not null default 'HUB',
  ativo boolean not null default true,
  contagem_leituras int not null default 0,
  criado_em timestamptz not null default now()
);

alter table embarcacoes_tags enable row level security;
create policy estaleiro_gerencia_tags_das_proprias_embarcacoes on embarcacoes_tags
  for all using (
    exists (select 1 from embarcacoes e where e.id = embarcacoes_tags.embarcacao_id and e.estaleiro_id = auth.uid())
  )
  with check (
    exists (select 1 from embarcacoes e where e.id = embarcacoes_tags.embarcacao_id and e.estaleiro_id = auth.uid())
  );

create table chamados (
  id uuid primary key default gen_random_uuid(),
  embarcacao_id uuid not null references embarcacoes(id) on delete cascade,
  equipamento_id uuid references equipamentos_embarcados(id) on delete set null,
  tipo text not null check (tipo in ('comercial', 'garantia')),
  descricao text not null,
  status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'concluido')),
  atendido_por uuid references prestadores(id) on delete set null,
  criado_em timestamptz not null default now(),
  concluido_em timestamptz
);

alter table chamados enable row level security;

-- estaleiro dono da embarcação sempre vê e gerencia
create policy estaleiro_gerencia_chamados_das_proprias_embarcacoes on chamados
  for all using (
    exists (select 1 from embarcacoes e where e.id = chamados.embarcacao_id and e.estaleiro_id = auth.uid())
  )
  with check (
    exists (select 1 from embarcacoes e where e.id = chamados.embarcacao_id and e.estaleiro_id = auth.uid())
  );

-- representante técnico da marca do equipamento também vê e pode atender
create policy tecnico_ve_chamados_de_garantia_da_sua_marca on chamados
  for select using (
    tipo = 'garantia'
    and equipamento_id is not null
    and exists (
      select 1
      from equipamentos_embarcados eq
      join prestador_categorias pc on pc.prestador_id = auth.uid()
      where eq.id = chamados.equipamento_id
        and eq.marca is not null
        and pc.marcas_atendidas ? eq.marca
    )
  );

create policy tecnico_atende_chamados_de_garantia_da_sua_marca on chamados
  for update using (
    tipo = 'garantia'
    and equipamento_id is not null
    and exists (
      select 1
      from equipamentos_embarcados eq
      join prestador_categorias pc on pc.prestador_id = auth.uid()
      where eq.id = chamados.equipamento_id
        and eq.marca is not null
        and pc.marcas_atendidas ? eq.marca
    )
  );

-- leitura/criação pública (via RPC security definer, não direto pela tabela)
revoke all on chamados from anon;
