import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { mensagemErro } from '@/lib/errors'
import { CampoTexto, CampoSelect } from '@/components/campos'
import {
  listCategoriasServico,
  getMeuPrestador,
  updatePrestador,
  listPrestadorCategorias,
  addPrestadorCategoria,
  removePrestadorCategoria,
  uploadDocumentoPrestador,
  getUrlDocumentoPrestador,
} from '@/lib/api'
import type { CategoriaServico, Prestador, PrestadorCategoria, StatusVerificacao } from '@/types'

const STATUS_LABELS: Record<StatusVerificacao, string> = {
  pendente: 'Pendente de verificação',
  verificado: 'Verificado',
  rejeitado: 'Rejeitado',
}

const STATUS_STYLES: Record<StatusVerificacao, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  verificado: 'bg-emerald-100 text-emerald-700',
  rejeitado: 'bg-red-100 text-red-700',
}

function textoParaLista(texto: string): string[] {
  return texto.split(',').map((s) => s.trim()).filter(Boolean)
}

function listaParaTexto(lista: string[]): string {
  return lista.join(', ')
}

export default function Perfil() {
  const [prestador, setPrestador] = useState<Prestador | null>(null)
  const [categorias, setCategorias] = useState<CategoriaServico[]>([])
  const [minhasCategorias, setMinhasCategorias] = useState<PrestadorCategoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvandoDados, setSalvandoDados] = useState(false)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')

  const [adicionandoCategoria, setAdicionandoCategoria] = useState(false)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [regiaoAtuacao, setRegiaoAtuacao] = useState('')
  const [marcasAtendidas, setMarcasAtendidas] = useState('')

  const [enviandoDocumento, setEnviandoDocumento] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const p = await getMeuPrestador()
      setPrestador(p)
      if (p) {
        setNome(p.nome)
        setTelefone(p.telefone ?? '')
        const [cats, minhas] = await Promise.all([listCategoriasServico(), listPrestadorCategorias(p.id)])
        setCategorias(cats)
        setMinhasCategorias(minhas)
      }
      setErro(null)
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar perfil'))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function salvarDados() {
    if (!prestador) return
    setSalvandoDados(true)
    try {
      await updatePrestador(prestador.id, { nome, telefone: telefone || null })
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao salvar dados'))
    } finally {
      setSalvandoDados(false)
    }
  }

  const categoriasDisponiveis = categorias.filter(
    (c) => !minhasCategorias.some((mc) => mc.categoria_servico_id === c.id)
  )

  const ehEstaleiro = minhasCategorias.some(
    (mc) => categorias.find((c) => c.id === mc.categoria_servico_id)?.nome === 'Estaleiro'
  )

  async function adicionarCategoria() {
    if (!prestador || !categoriaSelecionada) return
    try {
      await addPrestadorCategoria({
        prestador_id: prestador.id,
        categoria_servico_id: categoriaSelecionada,
        especialidade: especialidade || null,
        regiao_atuacao: regiaoAtuacao || null,
        marcas_atendidas: textoParaLista(marcasAtendidas),
      })
      setCategoriaSelecionada('')
      setEspecialidade('')
      setRegiaoAtuacao('')
      setMarcasAtendidas('')
      setAdicionandoCategoria(false)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao adicionar categoria'))
    }
  }

  async function removerCategoria(id: string) {
    if (!confirm('Remover esta categoria de atuação?')) return
    try {
      await removePrestadorCategoria(id)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao remover categoria'))
    }
  }

  async function handleUploadDocumento(file: File) {
    if (!prestador) return
    setEnviandoDocumento(true)
    try {
      const documento = await uploadDocumentoPrestador(prestador.id, file)
      await updatePrestador(prestador.id, {
        documentos_verificacao: [...prestador.documentos_verificacao, documento],
      })
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao enviar documento'))
    } finally {
      setEnviandoDocumento(false)
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

  if (carregando) return <p className="p-8 text-sm text-slate-400">Carregando…</p>
  if (!prestador) return <p className="p-8 text-sm text-slate-400">Perfil não encontrado.</p>

  return (
    <div className="mx-auto max-w-2xl p-8">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Easy Nautic</p>
          <h1 className="font-display text-3xl text-slate-900">{prestador.nome}</h1>
          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[prestador.status_verificacao]}`}
          >
            {STATUS_LABELS[prestador.status_verificacao]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {ehEstaleiro && (
            <Link to="/embarcacoes" className="text-sm text-slate-500 hover:text-slate-900">
              Embarcações
            </Link>
          )}
          <Link to="/chamados" className="text-sm text-slate-500 hover:text-slate-900">
            Chamados
          </Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Sair
          </button>
        </div>
      </header>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-display text-lg text-slate-900">Meus dados</h2>
        <div className="space-y-4">
          <CampoTexto label="Nome" value={nome} onChange={setNome} />
          <CampoTexto label="Telefone" type="tel" value={telefone} onChange={setTelefone} />
          <button
            onClick={salvarDados}
            disabled={salvandoDados}
            className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
          >
            {salvandoDados ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-slate-900">Categorias de atuação</h2>
          {!adicionandoCategoria && categoriasDisponiveis.length > 0 && (
            <button
              onClick={() => setAdicionandoCategoria(true)}
              className="text-sm font-medium text-tide-600 hover:text-tide-700"
            >
              + Adicionar
            </button>
          )}
        </div>

        {minhasCategorias.length === 0 && !adicionandoCategoria && (
          <p className="text-sm text-slate-400">Nenhuma categoria cadastrada ainda.</p>
        )}

        <div className="space-y-3">
          {minhasCategorias.map((mc) => {
            const cat = categorias.find((c) => c.id === mc.categoria_servico_id)
            return (
              <div key={mc.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{cat?.nome ?? '—'}</p>
                    {mc.especialidade && <p className="text-xs text-slate-500">Especialidade: {mc.especialidade}</p>}
                    {mc.regiao_atuacao && <p className="text-xs text-slate-500">Região: {mc.regiao_atuacao}</p>}
                    {mc.marcas_atendidas.length > 0 && (
                      <p className="text-xs text-slate-500">Marcas: {listaParaTexto(mc.marcas_atendidas)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removerCategoria(mc.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {adicionandoCategoria && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
            <CampoSelect
              label="Categoria"
              value={categoriaSelecionada}
              onChange={setCategoriaSelecionada}
              options={[
                { value: '', label: 'Selecione…' },
                ...categoriasDisponiveis.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
            <CampoTexto label="Especialidade (opcional)" value={especialidade} onChange={setEspecialidade} />
            <CampoTexto label="Região de atuação" value={regiaoAtuacao} onChange={setRegiaoAtuacao} />
            <div>
              <CampoTexto label="Marcas que atende (opcional)" value={marcasAtendidas} onChange={setMarcasAtendidas} />
              <p className="mt-1 text-xs text-slate-400">Separe por vírgula — ex: Mercury, Volvo Penta.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={adicionarCategoria}
                disabled={!categoriaSelecionada}
                className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
              >
                Adicionar
              </button>
              <button
                onClick={() => setAdicionandoCategoria(false)}
                className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-display text-lg text-slate-900">Documentos de verificação</h2>
        {prestador.documentos_verificacao.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">Nenhum documento enviado ainda.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {prestador.documentos_verificacao.map((doc, i) => (
              <li key={i}>
                <button
                  onClick={() => abrirDocumento(doc.path)}
                  className="text-sm text-tide-600 hover:text-tide-700 hover:underline"
                >
                  {doc.nome_arquivo}
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="inline-block cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-tide-500">
          {enviandoDocumento ? 'Enviando…' : 'Enviar documento'}
          <input
            type="file"
            className="hidden"
            disabled={enviandoDocumento}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUploadDocumento(file)
            }}
          />
        </label>
      </section>
    </div>
  )
}
