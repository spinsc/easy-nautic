-- Gap encontrado na verificação: ator_do_chamado só considerava dono/tripulante pra
-- permissão 'ver', então o prestador responsável (atendido_por) não conseguia ver as
-- próprias cotações concorrentes nem o motivo de uma rejeição do serviço que ele executou.

create or replace function ator_do_chamado(p_chamado_id uuid, p_permissao text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from chamados c join embarcacoes e on e.id = c.embarcacao_id
    where c.id = p_chamado_id and (e.estaleiro_id = auth.uid() or e.proprietario_id = auth.uid())
  ) or exists (
    select 1 from chamados c where c.id = p_chamado_id and tripulante_pode(c.embarcacao_id, p_permissao)
  ) or (
    p_permissao = 'ver' and exists (
      select 1 from chamados c where c.id = p_chamado_id and c.atendido_por = auth.uid()
    )
  );
$$;
