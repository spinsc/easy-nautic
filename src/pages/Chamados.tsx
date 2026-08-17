import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mensagemErro } from '@/lib/errors'
import { CampoTexto, CampoNumero, CampoCheckbox } from '@/components/campos'
import { listMeusChamados, atualizarStatusChamado, getMeuPrestador, createCotacao } from '@/lib/api'
import type { Chamado, Prestador, StatusChamado } from '@/types'

const STATUS_LABELS: Record<StatusChamado, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_confirmacao: 'Aguardando confirmação',
  concluido: 'Concluído',
  em_disputa: 'Em disputa',
}

const STATUS_STYLES: Record<StatusChamado, string> = {
  aberto: 'bg-amber-100 text-amber-700',
  em_andamento: 'bg-tide-100 text-tide-700',
  aguardando_confirmacao: 'bg-violet-100 text-violet-700',
  concluido: 'bg-emerald-100 text-emerald-700',
  em_disputa: 'bg-red-100 text-red-700',
}

export default function Chamados() {
  const [itens, setItens] = useState<(Chamado & { embarcacao_nome: string })[]>([])
  const [prestador, setPrestador] = useState<Prestador | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const [cotandoId, setCotandoId] = useState<string | null>(null)
  const [valorCotacao, setValorCotacao] = useState<number | null>(null)
  const [descricaoCotacao, setDescricaoCotacao] = useState('')
  const [usarFormaGlobal, setUsarFormaGlobal] = useState(true)
  const [tipoPagamentoCustom, setTipoPagamentoCustom] = useState('')
  const [dadosPagamentoCustom, setDadosPagamentoCustom] = useState('')
  const [usarCondicaoGlobal, setUsarCondicaoGlobal] = useState(true)
  const [condicaoCustom, setCondicaoCustom] = useState('')

  async function carregar() {
    setCarregando(true)
    try {
      const [p, ch] = await Promise.all([getMeuPrestador(), listMeusChamados()])
      setPrestador(p)
      setItens(ch)
      setErro(null)
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar chamados'))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function mudarStatus(id: string, status: StatusChamado) {
    if (!prestador) return
    try {
      await atualizarStatusChamado(id, status, prestador.id)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao atualizar chamado'))
    }
  }

  function iniciarCotacao(chamadoId: string) {
    setCotandoId(chamadoId)
    setValorCotacao(null)
    setDescricaoCotacao('')
    setUsarFormaGlobal(true)
    setTipoPagamentoCustom('')
    setDadosPagamentoCustom('')
    setUsarCondicaoGlobal(true)
    setCondicaoCustom('')
    setSucesso(null)
  }

  async function enviarCotacao() {
    if (!prestador || !cotandoId || valorCotacao == null) return
    try {
      await createCotacao(
        cotandoId,
        prestador.id,
        valorCotacao,
        descricaoCotacao || null,
        usarFormaGlobal ? null : { tipo: tipoPagamentoCustom, dados: dadosPagamentoCustom },
        usarCondicaoGlobal ? null : condicaoCustom
      )
      setCotandoId(null)
      setSucesso('Cotação enviada.')
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao enviar cotação'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Easy Nautic</p>
          <h1 className="font-display text-3xl text-slate-900">Chamados</h1>
        </div>
        <Link to="/perfil" className="text-sm text-slate-500 hover:text-slate-900">
          Perfil
        </Link>
      </header>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {sucesso}
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-slate-400">
          Nenhum chamado aparece aqui ainda. Chamados de garantia relacionados às marcas que você atende, ou de
          embarcações que você vendeu, aparecem automaticamente.
        </p>
      ) : (
        <div className="space-y-3">
          {itens.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                    {c.tipo === 'garantia' && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                        Garantia
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900">{c.embarcacao_nome}</p>
                  <p className="text-sm text-slate-600">{c.descricao}</p>
                  {c.status === 'aguardando_confirmacao' && c.terminei_em && (
                    <p className="mt-1 text-xs text-slate-400">
                      Confirmação automática em {new Date(new Date(c.terminei_em).getTime() + 3 * 86400000).toLocaleDateString('pt-BR')}, se ninguém responder.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {c.status === 'aberto' && (
                    <button
                      onClick={() => mudarStatus(c.id, 'em_andamento')}
                      className="text-xs font-medium text-tide-600 hover:text-tide-700"
                    >
                      Iniciar
                    </button>
                  )}
                  {c.status === 'em_andamento' && (
                    <button
                      onClick={() => mudarStatus(c.id, 'aguardando_confirmacao')}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      Marcar como concluído
                    </button>
                  )}
                  {c.status === 'aberto' && cotandoId !== c.id && (
                    <button
                      onClick={() => iniciarCotacao(c.id)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Cotar
                    </button>
                  )}
                </div>
              </div>

              {cotandoId === c.id && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  <CampoNumero label="Valor (R$)" value={valorCotacao} onChange={setValorCotacao} />
                  <CampoTexto label="Observações (opcional)" value={descricaoCotacao} onChange={setDescricaoCotacao} />
                  <CampoCheckbox
                    label="Usar minha forma de pagamento cadastrada no perfil"
                    checked={usarFormaGlobal}
                    onChange={setUsarFormaGlobal}
                  />
                  {!usarFormaGlobal && (
                    <div className="grid grid-cols-2 gap-3">
                      <CampoTexto label="Tipo" value={tipoPagamentoCustom} onChange={setTipoPagamentoCustom} placeholder="ex: Pix" />
                      <CampoTexto label="Dados" value={dadosPagamentoCustom} onChange={setDadosPagamentoCustom} />
                    </div>
                  )}
                  <CampoCheckbox
                    label="Usar minha condição de pagamento padrão"
                    checked={usarCondicaoGlobal}
                    onChange={setUsarCondicaoGlobal}
                  />
                  {!usarCondicaoGlobal && (
                    <CampoTexto
                      label="Condição de pagamento"
                      value={condicaoCustom}
                      onChange={setCondicaoCustom}
                      placeholder="ex: 50% de entrada, 50% na conclusão"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={enviarCotacao}
                      disabled={valorCotacao == null}
                      className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
                    >
                      Enviar cotação
                    </button>
                    <button onClick={() => setCotandoId(null)} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
