-- Proprietário como dono alternativo de embarcação (conta própria, sem precisar de estaleiro),
-- cadastro de embarcação mais completo (specs técnicas, localização, documentação, fotos),
-- tripulação (marinheiro vinculado a embarcações) e atributos de marinheiro em prestador_categorias.

alter table embarcacoes alter column estaleiro_id drop not null;
alter table embarcacoes add column proprietario_id uuid references prestadores(id) on delete set null;
alter table embarcacoes add constraint embarcacoes_tem_dono
  check (estaleiro_id is not null or proprietario_id is not null);

-- especificações técnicas
alter table embarcacoes add column motorizacao text;
alter table embarcacoes add column capacidade_pessoas int;
alter table embarcacoes add column calado numeric;
alter table embarcacoes add column boca numeric;
alter table embarcacoes add column tipo_casco text;
alter table embarcacoes add column combustivel text;

-- localização
alter table embarcacoes add column marina text;
alter table embarcacoes add column vaga text;
alter table embarcacoes add column cidade text;

-- documentação
alter table embarcacoes add column numero_tie text;
alter table embarcacoes add column seguradora text;
alter table embarcacoes add column apolice_seguro text;
alter table embarcacoes add column vistoria_validade date;
alter table embarcacoes add column documentos jsonb not null default '[]'::jsonb;

-- fotos
alter table embarcacoes add column fotos jsonb not null default '[]'::jsonb;

-- proprietário gerencia as próprias embarcações, igual ao estaleiro já fazia
create policy proprietario_gerencia_proprias_embarcacoes on embarcacoes
  for all using (auth.uid() = proprietario_id) with check (auth.uid() = proprietario_id);

-- estende gestão de equipamentos/tags/chamados pro proprietário também
create policy proprietario_gerencia_equipamentos_das_proprias_embarcacoes on equipamentos_embarcados
  for all using (
    exists (select 1 from embarcacoes e where e.id = equipamentos_embarcados.embarcacao_id and e.proprietario_id = auth.uid())
  )
  with check (
    exists (select 1 from embarcacoes e where e.id = equipamentos_embarcados.embarcacao_id and e.proprietario_id = auth.uid())
  );

create policy proprietario_gerencia_tags_das_proprias_embarcacoes on embarcacoes_tags
  for all using (
    exists (select 1 from embarcacoes e where e.id = embarcacoes_tags.embarcacao_id and e.proprietario_id = auth.uid())
  )
  with check (
    exists (select 1 from embarcacoes e where e.id = embarcacoes_tags.embarcacao_id and e.proprietario_id = auth.uid())
  );

create policy proprietario_gerencia_chamados_das_proprias_embarcacoes on chamados
  for all using (
    exists (select 1 from embarcacoes e where e.id = chamados.embarcacao_id and e.proprietario_id = auth.uid())
  )
  with check (
    exists (select 1 from embarcacoes e where e.id = chamados.embarcacao_id and e.proprietario_id = auth.uid())
  );

-- tripulação: marinheiro vinculado a uma ou mais embarcações
create table embarcacao_tripulantes (
  id uuid primary key default gen_random_uuid(),
  embarcacao_id uuid not null references embarcacoes(id) on delete cascade,
  marinheiro_id uuid not null references prestadores(id) on delete cascade,
  funcao text,
  criado_em timestamptz not null default now(),
  unique (embarcacao_id, marinheiro_id)
);

alter table embarcacao_tripulantes enable row level security;

create policy dono_gerencia_tripulacao on embarcacao_tripulantes
  for all using (
    exists (
      select 1 from embarcacoes e
      where e.id = embarcacao_tripulantes.embarcacao_id
        and (e.estaleiro_id = auth.uid() or e.proprietario_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from embarcacoes e
      where e.id = embarcacao_tripulantes.embarcacao_id
        and (e.estaleiro_id = auth.uid() or e.proprietario_id = auth.uid())
    )
  );

create policy marinheiro_ve_propria_tripulacao on embarcacao_tripulantes
  for select using (marinheiro_id = auth.uid());

-- SECURITY DEFINER pra não criar recursão entre embarcacoes <-> embarcacao_tripulantes
-- (mesmo padrão de tecnico_atende_equipamento/embarcacao)
create or replace function marinheiro_tripula_embarcacao(p_embarcacao_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from embarcacao_tripulantes
    where embarcacao_id = p_embarcacao_id and marinheiro_id = auth.uid()
  );
$$;

revoke all on function marinheiro_tripula_embarcacao(uuid) from public, anon;
grant execute on function marinheiro_tripula_embarcacao(uuid) to authenticated;

create policy marinheiro_ve_embarcacoes_que_tripula on embarcacoes
  for select using (marinheiro_tripula_embarcacao(id));

-- atributos de marinheiro (disponibilidade, valor, habilidades) em prestador_categorias
alter table prestador_categorias add column dias_disponiveis text[] not null default '{}';
alter table prestador_categorias add column periodo_disponivel text;
alter table prestador_categorias add column valor_diaria numeric;
alter table prestador_categorias add column habilidade_culinaria text;
alter table prestador_categorias add column barman boolean not null default false;
alter table prestador_categorias add column categoria_habilitacao text;

-- storage: documentos e fotos de embarcação
insert into storage.buckets (id, name, public) values ('midia-embarcacoes', 'midia-embarcacoes', false);

create policy dono_upload_midia_embarcacao on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'midia-embarcacoes'
    and exists (
      select 1 from embarcacoes e
      where e.id::text = (storage.foldername(name))[1]
        and (e.estaleiro_id = auth.uid() or e.proprietario_id = auth.uid())
    )
  );

create policy dono_le_midia_embarcacao on storage.objects
  for select to authenticated
  using (
    bucket_id = 'midia-embarcacoes'
    and exists (
      select 1 from embarcacoes e
      where e.id::text = (storage.foldername(name))[1]
        and (e.estaleiro_id = auth.uid() or e.proprietario_id = auth.uid())
    )
  );

create policy dono_apaga_midia_embarcacao on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'midia-embarcacoes'
    and exists (
      select 1 from embarcacoes e
      where e.id::text = (storage.foldername(name))[1]
        and (e.estaleiro_id = auth.uid() or e.proprietario_id = auth.uid())
    )
  );

create policy admin_le_midia_embarcacao on storage.objects
  for select to authenticated
  using (bucket_id = 'midia-embarcacoes' and sou_admin());
