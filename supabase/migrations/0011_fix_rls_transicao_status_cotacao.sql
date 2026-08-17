-- Bug encontrado na verificação: as políticas aprova_cotacao/paga_cotacao só checavam QUEM
-- pode agir (via ator_do_chamado), mas não travavam PARA QUAL status a linha podia mudar —
-- como múltiplas políticas de UPDATE são combinadas com OR também no WITH CHECK (não fica
-- restrito à mesma política que liberou a leitura via USING), um tripulante com só
-- pode_aprovar conseguia gravar status='paga' direto, pulando a permissão de pagamento.
-- Corrigido restringindo USING à transição de origem esperada e WITH CHECK ao destino permitido.

drop policy if exists aprova_cotacao on cotacoes;
create policy aprova_cotacao on cotacoes
  for update using (status = 'pendente' and (ator_do_chamado(chamado_id, 'aprovar') or sou_admin()))
  with check (status in ('aprovada', 'rejeitada'));

drop policy if exists paga_cotacao on cotacoes;
create policy paga_cotacao on cotacoes
  for update using (status = 'aprovada' and (ator_do_chamado(chamado_id, 'pagar') or sou_admin()))
  with check (status = 'paga');
