import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mensagemErro } from '@/lib/errors'
import {
  listMinhasEmbarcacoes,
  createEmbarcacao,
  getMeuPrestador,
  listCategoriasServico,
  listPrestadorCategorias,
  listEstados,
  listCidadesPorEstado,
} from '@/lib/api'
import { CampoTexto, CampoNumero, CampoData, CampoSelect } from '@/components/campos'
import type { Cidade, Embarcacao, Estado } from '@/types'

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
  motorizacao: '',
  capacidade_pessoas: null as number | null,
  calado: null as number | null,
  boca: null as number | null,
  tipo_casco: '',
  combustivel: '',
  marina: '',
  vaga: '',
}

export default function Embarcacoes() {
  const [itens, setItens] = useState<Embarcacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState(EMBARCACAO_VAZIA)
  const [ehEstaleiro, setEhEstaleiro] = useState(false)
  const [modo, setModo] = useState<'proprietario' | 'estaleiro'>('proprietario')
  const [estados, setEstados] = useState<Estado[]>([])
  const [estadoSelecionado, setEstadoSelecionado] = useState('')
  const [cidadesDoEstado, setCidadesDoEstado] = useState<Cidade[]>([])
  const [cidadeSelecionada, setCidadeSelecionada] = useState('')

  async function carregar() {
    setCarregando(true)
    try {
      const [lista, prestador, listaEstados] = await Promise.all([listMinhasEmbarcacoes(), getMeuPrestador(), listEstados()])
      setItens(lista)
      setEstados(listaEstados)
      if (prestador) {
        const [cats, minhas] = await Promise.all([listCategoriasServico(), listPrestadorCategorias(prestador.id)])
        setEhEstaleiro(minhas.some((mc) => cats.find((c) => c.id === mc.categoria_servico_id)?.nome === 'Estaleiro'))
      }
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

  async function onEstadoSelecionado(estadoId: string) {
    setEstadoSelecionado(estadoId)
    setCidadeSelecionada('')
    if (!estadoId) {
      setCidadesDoEstado([])
      return
    }
    try {
      setCidadesDoEstado(await listCidadesPorEstado(Number(estadoId)))
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar cidades'))
    }
  }

  async function salvar() {
    setSalvando(true)
    try {
      const prestador = await getMeuPrestador()
      if (!prestador) throw new Error('Prestador não encontrado.')
      const comoEstaleiro = ehEstaleiro && modo === 'estaleiro'
      await createEmbarcacao({
        estaleiro_id: comoEstaleiro ? prestador.id : null,
        proprietario_id: comoEstaleiro ? null : prestador.id,
        cliente_nome: comoEstaleiro ? form.cliente_nome : prestador.nome,
        cliente_telefone: comoEstaleiro ? form.cliente_telefone || null : prestador.telefone,
        cliente_email: comoEstaleiro ? form.cliente_email || null : prestador.email,
        nome: form.nome,
        fabricante: form.fabricante || null,
        modelo: form.modelo || null,
        numero_registro: form.numero_registro || null,
        comprimento: form.comprimento,
        ano: form.ano,
        data_venda: form.data_venda || null,
        prazo_garantia_casco_meses: form.prazo_garantia_casco_meses,
        motorizacao: form.motorizacao || null,
        capacidade_pessoas: form.capacidade_pessoas,
        calado: form.calado,
        boca: form.boca,
        tipo_casco: form.tipo_casco || null,
        combustivel: form.combustivel || null,
        marina: form.marina || null,
        vaga: form.vaga || null,
        cidade: cidadesDoEstado.find((c) => String(c.id) === cidadeSelecionada)?.nome ?? null,
        cidade_id: cidadeSelecionada ? Number(cidadeSelecionada) : null,
        numero_tie: null,
        seguradora: null,
        apolice_seguro: null,
        vistoria_validade: null,
      })
      setForm(EMBARCACAO_VAZIA)
      setEstadoSelecionado('')
      setCidadeSelecionada('')
      setCidadesDoEstado([])
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
              {ehEstaleiro && (
                <CampoSelect
                  label="Cadastrar como"
                  value={modo}
                  onChange={(v) => setModo(v as 'proprietario' | 'estaleiro')}
                  options={[
                    { value: 'proprietario', label: 'Minha própria embarcação' },
                    { value: 'estaleiro', label: 'Embarcação de um cliente' },
                  ]}
                />
              )}
              {ehEstaleiro && modo === 'estaleiro' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoTexto label="Nome do cliente" value={form.cliente_nome} onChange={(v) => setForm({ ...form, cliente_nome: v })} required />
                    <CampoTexto label="Telefone do cliente" type="tel" value={form.cliente_telefone} onChange={(v) => setForm({ ...form, cliente_telefone: v })} />
                  </div>
                  <CampoTexto label="E-mail do cliente" type="email" value={form.cliente_email} onChange={(v) => setForm({ ...form, cliente_email: v })} />
                </>
              )}
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

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-3 text-sm font-medium text-slate-900">Especificações técnicas</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoTexto label="Motorização" value={form.motorizacao} onChange={(v) => setForm({ ...form, motorizacao: v })} placeholder="ex: 2x Mercury 300HP" />
                    <CampoNumero label="Capacidade (pessoas)" value={form.capacidade_pessoas} onChange={(v) => setForm({ ...form, capacidade_pessoas: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoNumero label="Calado (m)" value={form.calado} onChange={(v) => setForm({ ...form, calado: v })} />
                    <CampoNumero label="Boca (m)" value={form.boca} onChange={(v) => setForm({ ...form, boca: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoTexto label="Tipo de casco" value={form.tipo_casco} onChange={(v) => setForm({ ...form, tipo_casco: v })} placeholder="ex: Monocasco" />
                    <CampoTexto label="Combustível" value={form.combustivel} onChange={(v) => setForm({ ...form, combustivel: v })} placeholder="ex: Gasolina" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-3 text-sm font-medium text-slate-900">Localização</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <CampoTexto label="Marina" value={form.marina} onChange={(v) => setForm({ ...form, marina: v })} />
                    <CampoTexto label="Vaga" value={form.vaga} onChange={(v) => setForm({ ...form, vaga: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoSelect
                      label="Estado"
                      value={estadoSelecionado}
                      onChange={onEstadoSelecionado}
                      options={[{ value: '', label: 'Selecione…' }, ...estados.map((e) => ({ value: String(e.id), label: e.nome }))]}
                    />
                    <CampoSelect
                      label="Cidade"
                      value={cidadeSelecionada}
                      onChange={setCidadeSelecionada}
                      options={[
                        { value: '', label: estadoSelecionado ? 'Selecione…' : 'Escolha um estado antes' },
                        ...cidadesDoEstado.map((c) => ({ value: String(c.id), label: c.nome })),
                      ]}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Documentação, fotos e tripulação podem ser adicionadas depois, na ficha da embarcação.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={salvar}
                  disabled={salvando || !form.nome.trim() || (ehEstaleiro && modo === 'estaleiro' && !form.cliente_nome.trim())}
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
