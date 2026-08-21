-- A relação empresa <-> membro (prestador_membros) por si só não dava direito de leitura
-- da tabela prestadores: a empresa não conseguia ver o nome/e-mail do funcionário vinculado
-- (aparecia "—" na tela "Minha equipe"), e o funcionário não conseguia ver os dados da
-- empresa em nome de quem está atuando (banner "Você está atuando em nome de").
create policy vinculo_ve_prestador on prestadores for select using (
  membro_de_empresa(id)
  or exists (
    select 1 from prestador_membros pm
    where pm.membro_id = prestadores.id and pm.empresa_id = auth.uid()
  )
);
