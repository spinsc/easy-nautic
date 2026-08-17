-- Função de trigger não deveria aparecer como chamável via RPC (mesmo não sendo
-- realmente invocável fora de um trigger, por retornar o pseudotipo `trigger`).
revoke all on function aprova_cotacao_atualiza_chamado() from public, anon, authenticated;
