create extension if not exists "pgcrypto";

create table categorias_servico (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

alter table categorias_servico enable row level security;
create policy leitura_publica_categorias on categorias_servico for select using (true);
revoke insert, update, delete on categorias_servico from anon, authenticated;

create table prestadores (
  id uuid primary key references auth.users(id) on delete cascade,
  tipo_pessoa text not null check (tipo_pessoa in ('PF', 'PJ')),
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  status_verificacao text not null default 'pendente'
    check (status_verificacao in ('pendente', 'verificado', 'rejeitado')),
  documentos_verificacao jsonb not null default '[]'::jsonb,
  avaliacao_media numeric,
  total_avaliacoes int not null default 0,
  criado_em timestamptz not null default now()
);

alter table prestadores enable row level security;
create policy prestador_gerencia_proprio_perfil on prestadores
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy leitura_publica_prestadores_verificados on prestadores
  for select using (status_verificacao = 'verificado');

create table prestador_categorias (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references prestadores(id) on delete cascade,
  categoria_servico_id uuid not null references categorias_servico(id) on delete cascade,
  especialidade text,
  regiao_atuacao text,
  marcas_atendidas jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  unique (prestador_id, categoria_servico_id)
);

alter table prestador_categorias enable row level security;
create policy prestador_gerencia_proprias_categorias on prestador_categorias
  for all using (auth.uid() = prestador_id) with check (auth.uid() = prestador_id);
create policy leitura_publica_categorias_de_prestadores_verificados on prestador_categorias
  for select using (
    exists (
      select 1 from prestadores p
      where p.id = prestador_categorias.prestador_id
        and p.status_verificacao = 'verificado'
    )
  );

insert into categorias_servico (nome, ordem) values
  ('Marinheiro', 1),
  ('Mecânica', 2),
  ('Elétrica', 3),
  ('Laminação', 4),
  ('Pintura', 5),
  ('Tapeçaria', 6),
  ('Marcenaria', 7),
  ('Reboque/Transporte', 8),
  ('Limpeza/Detailing', 9),
  ('Vistoria', 10),
  ('Estaleiro', 11),
  ('Revendedor Autorizado', 12),
  ('Fábrica', 13),
  ('Assistência Técnica', 14);
