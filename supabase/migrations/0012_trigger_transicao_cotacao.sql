-- A tentativa anterior (0011) de travar a transição de status via USING/WITH CHECK separados
-- em aprova_cotacao/paga_cotacao não é suficiente: o Postgres combina o WITH CHECK de TODAS
-- as políticas de UPDATE aplicáveis via OR, não só da política cujo USING liberou a linha.
-- Um tripulante com pode_aprovar E pode_pagar conseguia pular pendente -> paga direto, porque
-- o with_check de paga_cotacao ('paga') validava sozinho, mesmo sem seu próprio using
-- (status = 'aprovada') ter sido a razão da linha estar acessível.
--
-- Corrigido com um trigger, que enxerga OLD e NEW juntos e valida a transição inteira numa
-- peça só — RLS continua controlando visibilidade, o trigger é quem garante a regra de negócio.

drop policy if exists aprova_cotacao on cotacoes;
drop policy if exists paga_cotacao on cotacoes;
drop policy if exists prestador_atualiza_propria_cotacao_pendente on cotacoes;

create policy atualiza_cotacao on cotacoes
  for update using (
    prestador_id = auth.uid() or ator_do_chamado(chamado_id, 'ver') or sou_admin()
  );

create or replace function valida_transicao_cotacao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    if old.prestador_id <> auth.uid() or old.status <> 'pendente' then
      raise exception 'Sem permissão para editar esta cotação.';
    end if;
    return new;
  end if;

  if old.status = 'pendente' and new.status in ('aprovada', 'rejeitada') then
    if not (ator_do_chamado(old.chamado_id, 'aprovar') or sou_admin()) then
      raise exception 'Sem permissão para aprovar/rejeitar esta cotação.';
    end if;
    return new;
  end if;

  if old.status = 'aprovada' and new.status = 'paga' then
    if not (ator_do_chamado(old.chamado_id, 'pagar') or sou_admin()) then
      raise exception 'Sem permissão para marcar esta cotação como paga.';
    end if;
    return new;
  end if;

  raise exception 'Transição de status inválida: % -> %', old.status, new.status;
end;
$$;

create trigger trg_valida_transicao_cotacao
  before update on cotacoes
  for each row
  execute function valida_transicao_cotacao();
