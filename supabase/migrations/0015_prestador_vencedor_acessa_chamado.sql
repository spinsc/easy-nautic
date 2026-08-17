-- Gap encontrado na revisão: quando a cotação de um prestador é aprovada, ele vira
-- atendido_por do chamado, mas nenhuma policy dava a ele select/update nesse chamado —
-- ficaria sem conseguir sequer ver o próprio chamado pra marcar como concluído depois.

create policy prestador_vencedor_ve_e_atende_chamado on chamados
  for all using (atendido_por = auth.uid());
