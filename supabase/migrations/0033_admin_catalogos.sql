-- Painel admin de catálogos: categorias de serviço e marcas já existiam (só com leitura pública),
-- agora ganham policies de escrita restritas a admin. Formas de pagamento vira um catálogo de
-- verdade (antes era texto livre por prestador). Regiões macro permite agrupar cidades do IBGE
-- sob um nome (ex: "Grande Florianópolis") pra o prestador marcar de uma vez só.

create policy admin_gerencia_categorias_servico on categorias_servico for all
  using (sou_admin()) with check (sou_admin());

create policy admin_gerencia_marcas on marcas for all
  using (sou_admin()) with check (sou_admin());

create table formas_pagamento_catalogo (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
alter table formas_pagamento_catalogo enable row level security;
create policy leitura_publica_formas_pagamento_catalogo on formas_pagamento_catalogo for select using (true);
create policy admin_gerencia_formas_pagamento_catalogo on formas_pagamento_catalogo for all
  using (sou_admin()) with check (sou_admin());

create table regioes_macro (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);
alter table regioes_macro enable row level security;
create policy leitura_publica_regioes_macro on regioes_macro for select using (true);
create policy admin_gerencia_regioes_macro on regioes_macro for all
  using (sou_admin()) with check (sou_admin());

create table regiao_macro_cidades (
  regiao_macro_id uuid not null references regioes_macro(id) on delete cascade,
  cidade_id int not null references cidades(id),
  primary key (regiao_macro_id, cidade_id)
);
alter table regiao_macro_cidades enable row level security;
create policy leitura_publica_regiao_macro_cidades on regiao_macro_cidades for select using (true);
create policy admin_gerencia_regiao_macro_cidades on regiao_macro_cidades for all
  using (sou_admin()) with check (sou_admin());
