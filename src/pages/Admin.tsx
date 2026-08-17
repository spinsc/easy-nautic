import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mensagemErro } from '@/lib/errors'
import {
  souAdmin,
  listPrestadoresAdmin,
  updatePrestador,
  getUrlDocumentoPrestador,
  listTodosChamadosAdmin,
  atualizarStatusChamado,
} from '@/lib/api'
import type { Chamado, Prestador, StatusChamado, StatusVerificacao } from '@/types'

const STATUS_PRESTADOR_LABELS: Record<StatusVerificacao, string> = {
  pendente: 'Pendente',
  verificado: 'Verificado',
  rejeitado: 'Rejeitado',
}

const STATUS_CHAMADO_LABELS: Record<StatusChamado, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_confirmacao: 'Aguardando confirmação',
  concluido: 'Concluído',
  em_disputa: 'Em disputa',
}

export default function Admin() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [prestadores, setPrestadores] = useState<Prestador[]>([])
  const [filtroStatus, setFiltroStatus] = useState<StatusVerificacao>('pendente')
  const [chamados, setChamados] = useState<(Chamado & { embarcacao_nome: string })[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    try {
      const ok = await souAdmin()
      setAutorizado(ok)
      if (ok) {
        const [p, c] = await Promise.all([listPrestadoresAdmin(filtroStatus), listTodosChamadosAdmin()])
        setPrestadores(p)
        setChamados(c)
      }
      setErro(null)
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar painel'))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroStatus])

  async function definirStatusPrestador(id: string, status: StatusVerificacao) {
    try {
      await updatePrestador(id, { status_verificacao: status })
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao atualizar prestador'))
    }
  }

  async function abrirDocumento(path: string) {
    try {
      const url = await getUrlDocumentoPrestador(path)
      window.open(url, '_blank')
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao abrir documento'))
    }
  }

  async function mudarStatusChamado(id: string, status: StatusChamado) {
    try {
      await atualizarStatusChamado(id, status)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao atualizar chamado'))
    }
  }

  if (carregando) return <p className="p-8 text-sm text-slate-400">Carregando…</p>
  if (autorizado === false) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-slate-500">Você não tem acesso ao painel admin.</p>
        <Link to="/perfil" className="mt-2 inline-block text-sm text-tide-600 hover:underline">
          Voltar ao perfil
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Easy Nautic</p>
          <h1 className="font-display text-3xl text-slate-900">Painel admin</h1>
        </div>
        <Link to="/perfil" className="text-sm text-slate-500 hover:text-slate-900">
          Perfil
        </Link>
      </header>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-slate-900">Cadastros de prestadores</h2>
          <div className="flex gap-1 rounded-md border border-slate-200 p-1">
            {(['pendente', 'verificado', 'rejeitado'] as StatusVerificacao[]).map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  filtroStatus === s ? 'bg-tide-700 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {STATUS_PRESTADOR_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {prestadores.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum prestador nesse status.</p>
        ) : (
          <div className="space-y-3">
            {prestadores.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.nome}</p>
                    <p className="text-xs text-slate-500">
                      {p.email} {p.telefone && `· ${p.telefone}`}
                    </p>
                    {p.documentos_verificacao.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.documentos_verificacao.map((doc, i) => (
                          <button
                            key={i}
                            onClick={() => abrirDocumento(doc.path)}
                            className="text-xs text-tide-600 hover:underline"
                          >
                            {doc.nome_arquivo}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {p.status_verificacao === 'pendente' && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => definirStatusPrestador(p.id, 'verificado')}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => definirStatusPrestador(p.id, 'rejeitado')}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg text-slate-900">Chamados (mediação)</h2>
        {chamados.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum chamado registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {chamados.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {STATUS_CHAMADO_LABELS[c.status]}
                      </span>
                      {c.tipo === 'garantia' && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                          Garantia
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900">{c.embarcacao_nome}</p>
                    <p className="text-sm text-slate-600">{c.descricao}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {c.status !== 'aberto' && (
                      <button
                        onClick={() => mudarStatusChamado(c.id, 'aberto')}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900"
                      >
                        Reabrir
                      </button>
                    )}
                    {c.status !== 'em_andamento' && (
                      <button
                        onClick={() => mudarStatusChamado(c.id, 'em_andamento')}
                        className="text-xs font-medium text-tide-600 hover:text-tide-700"
                      >
                        Em andamento
                      </button>
                    )}
                    {c.status !== 'concluido' && (
                      <button
                        onClick={() => mudarStatusChamado(c.id, 'concluido')}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
