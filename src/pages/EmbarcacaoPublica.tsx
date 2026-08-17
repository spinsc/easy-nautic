import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { mensagemErro } from '@/lib/errors'
import { buscarEmbarcacaoPorTag, abrirChamadoPorTag } from '@/lib/api'
import type { CategoriaEquipamento, EmbarcacaoPublicaData, StatusChamado } from '@/types'

const CATEGORIA_LABELS: Record<CategoriaEquipamento, string> = {
  MOTOR: 'Motor',
  GERADOR: 'Gerador',
  AR_CONDICIONADO: 'Ar condicionado',
  ACESSORIO: 'Acessório',
}

const STATUS_LABELS: Record<StatusChamado, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_confirmacao: 'Aguardando confirmação',
  concluido: 'Concluído',
  em_disputa: 'Em disputa',
}

export default function EmbarcacaoPublica() {
  const { tagId } = useParams<{ tagId: string }>()
  const [dados, setDados] = useState<EmbarcacaoPublicaData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [abrindoChamado, setAbrindoChamado] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [equipamentoId, setEquipamentoId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)

  async function carregar() {
    if (!tagId) return
    setCarregando(true)
    try {
      const data = await buscarEmbarcacaoPorTag(tagId)
      setDados(data)
      setErro(data ? null : 'Tag não encontrada.')
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar embarcação'))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId])

  async function enviarChamado() {
    if (!tagId || !descricao.trim()) return
    setEnviando(true)
    try {
      await abrirChamadoPorTag(tagId, descricao.trim(), equipamentoId || null)
      setDescricao('')
      setEquipamentoId('')
      setAbrindoChamado(false)
      setSucesso('Chamado aberto com sucesso.')
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao abrir chamado'))
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <p className="p-8 text-center text-sm text-slate-400">Carregando…</p>
  if (erro && !dados) return <p className="p-8 text-center text-sm text-red-600">{erro}</p>
  if (!dados) return null

  return (
    <div className="mx-auto max-w-lg p-6">
      <header className="mb-6 flex items-center gap-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Easy Nautic</p>
      </header>

      <h1 className="font-display text-2xl text-slate-900">{dados.embarcacao.nome}</h1>
      <p className="mb-6 text-sm text-slate-500">
        {[dados.embarcacao.fabricante, dados.embarcacao.modelo, dados.embarcacao.ano].filter(Boolean).join(' · ') || '—'}
      </p>

      {sucesso && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {sucesso}
        </div>
      )}
      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>
      )}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-display text-lg text-slate-900">Abrir chamado</h2>
        {!abrindoChamado ? (
          <button
            onClick={() => setAbrindoChamado(true)}
            className="w-full rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800"
          >
            Solicitar serviço
          </button>
        ) : (
          <div className="space-y-3">
            {dados.equipamentos.length > 0 && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-900">Sobre qual item? (opcional)</span>
                <select
                  value={equipamentoId}
                  onChange={(e) => setEquipamentoId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-tide-500 focus:ring-1 focus:ring-tide-500"
                >
                  <option value="">Embarcação em geral</option>
                  {dados.equipamentos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {CATEGORIA_LABELS[eq.categoria]} — {eq.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-900">Descreva o problema</span>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-tide-500 focus:ring-1 focus:ring-tide-500"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={enviarChamado}
                disabled={enviando || !descricao.trim()}
                className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
              >
                {enviando ? 'Enviando…' : 'Enviar'}
              </button>
              <button onClick={() => setAbrindoChamado(false)} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      {dados.chamados.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-display text-lg text-slate-900">Histórico</h2>
          <div className="space-y-2">
            {dados.chamados.map((c) => (
              <div key={c.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">{STATUS_LABELS[c.status]}</span>
                  {c.tipo === 'garantia' && <span className="text-xs font-medium text-violet-600">Garantia</span>}
                </div>
                <p className="text-slate-900">{c.descricao}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
