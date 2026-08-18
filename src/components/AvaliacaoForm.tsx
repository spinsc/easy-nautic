import { useState } from 'react'
import { criarAvaliacao } from '@/lib/api'
import { mensagemErro } from '@/lib/errors'
import type { Avaliacao, PapelAvaliado } from '@/types'

export function AvaliacaoForm({
  chamadoId,
  papelAvaliado,
  minhaAvaliacao,
  rotulo,
  onAvaliado,
}: {
  chamadoId: string
  papelAvaliado: PapelAvaliado
  minhaAvaliacao: Avaliacao | null | undefined
  rotulo: string
  onAvaliado: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (minhaAvaliacao) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="text-amber-500">{'★'.repeat(minhaAvaliacao.nota)}</span>
        <span className="text-slate-300">{'★'.repeat(5 - minhaAvaliacao.nota)}</span>
        {minhaAvaliacao.comentario && <p className="mt-1 text-slate-600">"{minhaAvaliacao.comentario}"</p>}
      </div>
    )
  }

  if (!aberto) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-3">
        <button onClick={() => setAberto(true)} className="text-xs font-medium text-tide-600 hover:text-tide-700">
          {rotulo}
        </button>
      </div>
    )
  }

  async function enviar() {
    if (!nota) return
    setEnviando(true)
    setErro(null)
    try {
      await criarAvaliacao(chamadoId, papelAvaliado, nota, comentario || undefined)
      setAberto(false)
      onAvaliado()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao enviar avaliação'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <p className="text-xs font-medium text-slate-900">{rotulo}</p>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            className={`text-xl leading-none ${n <= nota ? 'text-amber-500' : 'text-slate-300'}`}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Comentário (opcional)"
        rows={2}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-tide-500 focus:ring-1 focus:ring-tide-500"
      />
      <div className="flex gap-2">
        <button
          onClick={enviar}
          disabled={!nota || enviando}
          className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
        >
          {enviando ? 'Enviando…' : 'Enviar avaliação'}
        </button>
        <button onClick={() => setAberto(false)} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
          Cancelar
        </button>
      </div>
    </div>
  )
}
