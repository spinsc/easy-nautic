import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { mensagemErro } from '@/lib/errors'
import {
  souAdmin,
  listPrestadoresAdmin,
  updatePrestador,
  getUrlDocumentoPrestador,
  listTodosChamadosAdmin,
  atualizarStatusChamado,
  getDashboardKpis,
  listNegociosPorPrestador,
  listNegociosPorEmbarcacao,
  getSerieTemporal,
  getNotificacoesStats,
} from '@/lib/api'
import type {
  AdminDashboardKpis,
  AdminNegocioEmbarcacao,
  AdminNegocioPrestador,
  AdminNotificacaoStat,
  AdminSerieTemporalPonto,
  Chamado,
  Prestador,
  StatusChamado,
  StatusVerificacao,
} from '@/types'

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

const CANAL_LABELS: Record<string, string> = { email: 'E-mail', push: 'Push' }
const STATUS_NOTIF_LABELS: Record<string, string> = { pendente: 'Pendente', enviado: 'Enviado', falhou: 'Falhou' }
const STATUS_NOTIF_CORES: Record<string, string> = { pendente: 'text-slate-500', enviado: 'text-emerald-600', falhou: 'text-red-600' }

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export default function Admin() {
  const [aba, setAba] = useState<'dashboard' | 'moderacao'>('dashboard')
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Moderação
  const [prestadores, setPrestadores] = useState<Prestador[]>([])
  const [filtroStatus, setFiltroStatus] = useState<StatusVerificacao>('pendente')
  const [chamados, setChamados] = useState<(Chamado & { embarcacao_nome: string })[]>([])

  // Dashboard
  const [kpis, setKpis] = useState<AdminDashboardKpis | null>(null)
  const [negociosPrestador, setNegociosPrestador] = useState<AdminNegocioPrestador[]>([])
  const [negociosEmbarcacao, setNegociosEmbarcacao] = useState<AdminNegocioEmbarcacao[]>([])
  const [serieTemporal, setSerieTemporal] = useState<AdminSerieTemporalPonto[]>([])
  const [notificacoesStats, setNotificacoesStats] = useState<AdminNotificacaoStat[]>([])

  async function carregar() {
    setCarregando(true)
    try {
      const ok = await souAdmin()
      setAutorizado(ok)
      if (ok) {
        const [p, c, k, np, ne, serie, ns] = await Promise.all([
          listPrestadoresAdmin(filtroStatus),
          listTodosChamadosAdmin(),
          getDashboardKpis(),
          listNegociosPorPrestador(10),
          listNegociosPorEmbarcacao(10),
          getSerieTemporal(12),
          getNotificacoesStats(),
        ])
        setPrestadores(p)
        setChamados(c)
        setKpis(k)
        setNegociosPrestador(np)
        setNegociosEmbarcacao(ne)
        setSerieTemporal(serie)
        setNotificacoesStats(ns)
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

  const dadosSerie = serieTemporal.map((p) => ({ ...p, mesLabel: mesLabel.format(new Date(p.mes)) }))

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Easy Nautic</p>
          <h1 className="font-display text-3xl text-slate-900">Painel admin</h1>
        </div>
        <Link to="/perfil" className="text-sm text-slate-500 hover:text-slate-900">
          Perfil
        </Link>
      </header>

      <div className="mb-8 flex gap-1 rounded-md border border-slate-200 p-1" style={{ width: 'fit-content' }}>
        {(['dashboard', 'moderacao'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`rounded px-4 py-1.5 text-sm font-medium ${
              aba === a ? 'bg-tide-700 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {a === 'dashboard' ? 'Dashboard' : 'Moderação'}
          </button>
        ))}
      </div>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>
      )}

      {aba === 'dashboard' && kpis && (
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 font-display text-lg text-slate-900">Cadastros</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Prestadores" value={String(kpis.total_prestadores)} sub={`+${kpis.novos_prestadores_30d} em 30d`} />
              <StatTile label="Verificados" value={String(kpis.prestadores_verificados)} />
              <StatTile label="Pendentes" value={String(kpis.prestadores_pendentes)} />
              <StatTile label="Embarcações" value={String(kpis.total_embarcacoes)} sub={`+${kpis.novas_embarcacoes_30d} em 30d`} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg text-slate-900">Negócios</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Chamados totais" value={String(kpis.total_chamados)} sub={`+${kpis.novos_chamados_30d} em 30d`} />
              <StatTile label="Concluídos" value={String(kpis.chamados_concluidos)} />
              <StatTile label="Em disputa" value={String(kpis.chamados_em_disputa)} />
              <StatTile label="Valor total pago" value={moeda.format(kpis.valor_total_pago)} sub={`Ticket médio ${moeda.format(kpis.ticket_medio_pago)}`} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile label="Abertos" value={String(kpis.chamados_abertos)} />
              <StatTile label="Em andamento" value={String(kpis.chamados_em_andamento)} />
              <StatTile label="Aguard. confirmação" value={String(kpis.chamados_aguardando_confirmacao)} />
              <StatTile label="Cotações aprovadas" value={String(kpis.cotacoes_aprovadas)} />
              <StatTile label="Cotações pagas" value={String(kpis.cotacoes_pagas)} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg text-slate-900">Evolução (últimos 12 meses)</h2>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dadosSerie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e1e0d9" vertical={false} />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 12, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#898781' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e1e0d9' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="novos_prestadores" name="Novos prestadores" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="novas_embarcacoes" name="Novas embarcações" stroke="#eb6834" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="novos_chamados" name="Novos chamados" stroke="#1baf7a" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="chamados_concluidos" name="Chamados concluídos" stroke="#eda100" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-3 font-display text-lg text-slate-900">Top prestadores</h2>
              {negociosPrestador.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum prestador com chamados atendidos ainda.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                        <th className="px-3 py-2 font-medium">Prestador</th>
                        <th className="px-3 py-2 font-medium">Concluídos</th>
                        <th className="px-3 py-2 font-medium">Valor pago</th>
                        <th className="px-3 py-2 font-medium">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negociosPrestador.map((n) => (
                        <tr key={n.prestador_id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 text-slate-900">{n.nome}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">{n.qtd_chamados_concluidos}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">{moeda.format(n.valor_total)}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">
                            {n.avaliacao_media ? `${n.avaliacao_media.toFixed(1)} (${n.total_avaliacoes})` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 font-display text-lg text-slate-900">Top embarcações</h2>
              {negociosEmbarcacao.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma embarcação com chamados ainda.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                        <th className="px-3 py-2 font-medium">Embarcação</th>
                        <th className="px-3 py-2 font-medium">Chamados</th>
                        <th className="px-3 py-2 font-medium">Valor pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negociosEmbarcacao.map((n) => (
                        <tr key={n.embarcacao_id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 text-slate-900">
                            {n.nome}
                            <span className="block text-xs text-slate-400">{n.cliente_nome}</span>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">
                            {n.qtd_chamados_concluidos}/{n.qtd_chamados}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">{moeda.format(n.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg text-slate-900">Saúde das notificações</h2>
            {notificacoesStats.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma notificação de cruzamento gerada ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {notificacoesStats.map((s) => (
                  <span
                    key={`${s.canal}-${s.status}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                  >
                    {CANAL_LABELS[s.canal] ?? s.canal} · <span className={STATUS_NOTIF_CORES[s.status]}>{STATUS_NOTIF_LABELS[s.status] ?? s.status}</span> · {s.qtd}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {aba === 'moderacao' && (
        <>
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
        </>
      )}
    </div>
  )
}
