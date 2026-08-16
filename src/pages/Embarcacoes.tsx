import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mensagemErro } from '@/lib/errors'
import { listMinhasEmbarcacoes, createEmbarcacao, getMeuPrestador } from '@/lib/api'
import { CampoTexto, CampoNumero, CampoData } from '@/components/campos'
import type { Embarcacao } from '@/types'

const EMBARCACAO_VAZIA = {
  cliente_nome: '',
  cliente_telefone: '',
  cliente_email: '',
  nome: '',
  fabricante: '',
  modelo: '',
  numero_registro: '',
  comprimento: null as number | null,
  ano: null as number | null,
  data_venda: '',
  prazo_garantia_casco_meses: null as number | null,
}

export default function Embarcacoes() {
  const [itens, setItens] = useState<Embarcacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState(EMBARCACAO_VAZIA)

  async function carregar() {
    setCarregando(true)
    try {
      setItens(await listMinhasEmbarcacoes())
      setErro(null)
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar embarcações'))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function salvar() {
    setSalvando(true)
    try {
      const prestador = await getMeuPrestador()
      if (!prestador) throw new Error('Prestador não encontrado.')
      await createEmbarcacao({
        estaleiro_id: prestador.id,
        cliente_nome: form.cliente_nome,
        cliente_telefone: form.cliente_telefone || null,
        cliente_email: form.cliente_email || null,
        nome: form.nome,
        fabricante: form.fabricante || null,
        modelo: form.modelo || null,
        numero_registro: form.numero_registro || null,
        comprimento: form.comprimento,
        ano: form.ano,
        data_venda: form.data_venda || null,
        prazo_garantia_casco_meses: form.prazo_garantia_casco_meses,
      })
      setForm(EMBARCACAO_VAZIA)
      setCriando(false)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao salvar embarcação'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Easy Nautic</p>
          <h1 className="font-display text-3xl text-slate-900">Minhas embarcações</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/perfil" className="text-sm text-slate-500 hover:text-slate-900">
            Perfil
          </Link>
          <button
            onClick={() => setCriando(true)}
            className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800"
          >
            + Nova embarcação
          </button>
        </div>
      </header>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma embarcação cadastrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Fabricante/Modelo</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {itens.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-slate-900">{e.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{e.cliente_nome}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[e.fabricante, e.modelo].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/embarcacoes/${e.id}`} className="text-sm font-medium text-tide-600 hover:text-tide-700">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {criando && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="mb-4 font-display text-xl text-slate-900">Nova embarcação</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CampoTexto label="Nome do cliente" value={form.cliente_nome} onChange={(v) => setForm({ ...form, cliente_nome: v })} required />
                <CampoTexto label="Telefone do cliente" type="tel" value={form.cliente_telefone} onChange={(v) => setForm({ ...form, cliente_telefone: v })} />
              </div>
              <CampoTexto label="E-mail do cliente" type="email" value={form.cliente_email} onChange={(v) => setForm({ ...form, cliente_email: v })} />
              <div className="grid grid-cols-2 gap-4">
                <CampoTexto label="Nome da embarcação" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
                <CampoTexto label="Número de registro" value={form.numero_registro} onChange={(v) => setForm({ ...form, numero_registro: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CampoTexto label="Fabricante" value={form.fabricante} onChange={(v) => setForm({ ...form, fabricante: v })} />
                <CampoTexto label="Modelo" value={form.modelo} onChange={(v) => setForm({ ...form, modelo: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CampoNumero label="Comprimento (m)" value={form.comprimento} onChange={(v) => setForm({ ...form, comprimento: v })} />
                <CampoNumero label="Ano" value={form.ano} onChange={(v) => setForm({ ...form, ano: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CampoData label="Data da venda" value={form.data_venda} onChange={(v) => setForm({ ...form, data_venda: v })} />
                <CampoNumero
                  label="Garantia do casco (meses)"
                  value={form.prazo_garantia_casco_meses}
                  onChange={(v) => setForm({ ...form, prazo_garantia_casco_meses: v })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={salvar}
                  disabled={salvando || !form.nome.trim() || !form.cliente_nome.trim()}
                  className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
                >
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
                <button
                  onClick={() => {
                    setCriando(false)
                    setForm(EMBARCACAO_VAZIA)
                  }}
                  className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
