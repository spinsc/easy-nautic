import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { mensagemErro } from '@/lib/errors'
import { CampoTexto, CampoSelect, CampoNumero, CampoCheckbox } from '@/components/campos'
import {
  listCategoriasServico,
  getMeuPrestador,
  updatePrestador,
  listPrestadorCategorias,
  addPrestadorCategoria,
  removePrestadorCategoria,
  uploadDocumentoPrestador,
  getUrlDocumentoPrestador,
  souAdmin,
  listMarcas,
  listMinhasMarcas,
  addMinhaMarca,
  removeMinhaMarca,
  listEstados,
  listCidadesPorEstado,
  listMinhasRegioes,
  addMinhaRegiao,
  removeMinhaRegiao,
  listMinhasAssinaturasPush,
  salvarTokenPush,
  removerTokenPush,
  getMinhaAvaliacaoComoTomador,
} from '@/lib/api'
import { solicitarTokenPush } from '@/lib/firebase'
import type {
  CategoriaServico,
  Cidade,
  Estado,
  Marca,
  Prestador,
  PrestadorCategoria,
  PushSubscription,
  StatusVerificacao,
} from '@/types'

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
  const [diasDisponiveis, setDiasDisponiveis] = useState('')
  const [periodoDisponivel, setPeriodoDisponivel] = useState('')
  const [valorDiaria, setValorDiaria] = useState<number | null>(null)
  const [habilidadeCulinaria, setHabilidadeCulinaria] = useState('')
  const [barman, setBarman] = useState(false)
  const [categoriaHabilitacao, setCategoriaHabilitacao] = useState('')

  const [enviandoDocumento, setEnviandoDocumento] = useState(false)
  const [ehAdmin, setEhAdmin] = useState(false)

  const [adicionandoPagamento, setAdicionandoPagamento] = useState(false)
  const [tipoPagamento, setTipoPagamento] = useState('')
  const [dadosPagamento, setDadosPagamento] = useState('')
  const [condicaoPagamentoPadrao, setCondicaoPagamentoPadrao] = useState('')
  const [salvandoCondicaoPagamento, setSalvandoCondicaoPagamento] = useState(false)

  const [marcasCatalogo, setMarcasCatalogo] = useState<Marca[]>([])
  const [minhasMarcas, setMinhasMarcas] = useState<(Marca & { prestador_marca_id: string })[]>([])
  const [marcaSelecionada, setMarcaSelecionada] = useState('')

  const [estados, setEstados] = useState<Estado[]>([])
  const [minhasRegioes, setMinhasRegioes] = useState<(Cidade & { prestador_regiao_id: string; sigla_estado: string })[]>([])
  const [estadoSelecionado, setEstadoSelecionado] = useState('')
  const [cidadesDoEstado, setCidadesDoEstado] = useState<Cidade[]>([])
  const [cidadeSelecionada, setCidadeSelecionada] = useState('')

  const [assinaturasPush, setAssinaturasPush] = useState<PushSubscription[]>([])
  const [ativandoPush, setAtivandoPush] = useState(false)

  const [avaliacaoTomador, setAvaliacaoTomador] = useState<{ media: number; total: number } | null>(null)

  async function carregar() {
    setCarregando(true)
    try {
      const p = await getMeuPrestador()
      setPrestador(p)
      if (p) {
        setNome(p.nome)
        setTelefone(p.telefone ?? '')
        setCondicaoPagamentoPadrao(p.condicao_pagamento_padrao ?? '')
        const [cats, minhas, admin, catalogoMarcas, marcasProprias, listaEstados, regioesProprias, assinaturasProprias, avaliacaoComoTomador] =
          await Promise.all([
            listCategoriasServico(),
            listPrestadorCategorias(p.id),
            souAdmin(),
            listMarcas(),
            listMinhasMarcas(p.id),
            listEstados(),
            listMinhasRegioes(p.id),
            listMinhasAssinaturasPush(p.id),
            getMinhaAvaliacaoComoTomador(),
          ])
        setCategorias(cats)
        setMinhasCategorias(minhas)
        setEhAdmin(admin)
        setMarcasCatalogo(catalogoMarcas)
        setMinhasMarcas(marcasProprias)
        setEstados(listaEstados)
        setMinhasRegioes(regioesProprias)
        setAssinaturasPush(assinaturasProprias)
        setAvaliacaoTomador(avaliacaoComoTomador)
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

  const marcasDisponiveis = marcasCatalogo.filter((m) => !minhasMarcas.some((mm) => mm.id === m.id))

  async function adicionarMarca() {
    if (!prestador || !marcaSelecionada) return
    try {
      await addMinhaMarca(prestador.id, marcaSelecionada)
      setMarcaSelecionada('')
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao adicionar marca'))
    }
  }

  async function removerMarca(id: string) {
    try {
      await removeMinhaMarca(id)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao remover marca'))
    }
  }

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

  async function adicionarRegiao() {
    if (!prestador || !cidadeSelecionada) return
    try {
      await addMinhaRegiao(prestador.id, Number(cidadeSelecionada))
      setCidadeSelecionada('')
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao adicionar região'))
    }
  }

  async function removerRegiao(id: string) {
    try {
      await removeMinhaRegiao(id)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao remover região'))
    }
  }

  async function ativarNotificacoesPush() {
    if (!prestador) return
    setAtivandoPush(true)
    try {
      const token = await solicitarTokenPush()
      if (!token) throw new Error('Não foi possível gerar o token de notificações.')
      await salvarTokenPush(prestador.id, token)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao ativar notificações'))
    } finally {
      setAtivandoPush(false)
    }
  }

  async function desativarNotificacaoPush(id: string) {
    try {
      await removerTokenPush(id)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao desativar notificação'))
    }
  }

  async function adicionarCategoria() {
    if (!prestador || !categoriaSelecionada) return
    try {
      await addPrestadorCategoria({
        prestador_id: prestador.id,
        categoria_servico_id: categoriaSelecionada,
        especialidade: especialidade || null,
        regiao_atuacao: regiaoAtuacao || null,
        marcas_atendidas: textoParaLista(marcasAtendidas),
        dias_disponiveis: textoParaLista(diasDisponiveis),
        periodo_disponivel: periodoDisponivel || null,
        valor_diaria: valorDiaria,
        habilidade_culinaria: habilidadeCulinaria || null,
        barman,
        categoria_habilitacao: categoriaHabilitacao || null,
      })
      setCategoriaSelecionada('')
      setEspecialidade('')
      setRegiaoAtuacao('')
      setMarcasAtendidas('')
      setDiasDisponiveis('')
      setPeriodoDisponivel('')
      setValorDiaria(null)
      setHabilidadeCulinaria('')
      setBarman(false)
      setCategoriaHabilitacao('')
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

  async function salvarCondicaoPagamento() {
    if (!prestador) return
    setSalvandoCondicaoPagamento(true)
    try {
      await updatePrestador(prestador.id, { condicao_pagamento_padrao: condicaoPagamentoPadrao || null })
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao salvar condição de pagamento'))
    } finally {
      setSalvandoCondicaoPagamento(false)
    }
  }

  async function adicionarFormaPagamento() {
    if (!prestador || !tipoPagamento.trim() || !dadosPagamento.trim()) return
    try {
      await updatePrestador(prestador.id, {
        formas_pagamento: [...prestador.formas_pagamento, { tipo: tipoPagamento.trim(), dados: dadosPagamento.trim() }],
      })
      setTipoPagamento('')
      setDadosPagamento('')
      setAdicionandoPagamento(false)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao adicionar forma de pagamento'))
    }
  }

  async function removerFormaPagamento(index: number) {
    if (!prestador) return
    try {
      await updatePrestador(prestador.id, {
        formas_pagamento: prestador.formas_pagamento.filter((_, i) => i !== index),
      })
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao remover forma de pagamento'))
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
          {prestador.avaliacao_media != null && (
            <p className="mt-2 text-xs text-slate-500">
              Como prestador: <span className="text-amber-500">★</span> {prestador.avaliacao_media.toFixed(1)} (
              {prestador.total_avaliacoes} avaliaç{prestador.total_avaliacoes === 1 ? 'ão' : 'ões'})
            </p>
          )}
          {avaliacaoTomador && (
            <p className="mt-1 text-xs text-slate-500">
              Como cliente: <span className="text-amber-500">★</span> {avaliacaoTomador.media.toFixed(1)} (
              {avaliacaoTomador.total} avaliaç{avaliacaoTomador.total === 1 ? 'ão' : 'ões'})
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/embarcacoes" className="text-sm text-slate-500 hover:text-slate-900">
            Embarcações
          </Link>
          <Link to="/chamados" className="text-sm text-slate-500 hover:text-slate-900">
            Chamados
          </Link>
          {ehAdmin && (
            <Link to="/admin" className="text-sm text-slate-500 hover:text-slate-900">
              Admin
            </Link>
          )}
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
                    {mc.categoria_habilitacao && (
                      <p className="text-xs text-slate-500">Habilitação: {mc.categoria_habilitacao}</p>
                    )}
                    {mc.dias_disponiveis.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Disponível: {listaParaTexto(mc.dias_disponiveis)}
                        {mc.periodo_disponivel && ` (${mc.periodo_disponivel})`}
                      </p>
                    )}
                    {mc.valor_diaria != null && (
                      <p className="text-xs text-slate-500">Diária: R$ {mc.valor_diaria}</p>
                    )}
                    {mc.habilidade_culinaria && (
                      <p className="text-xs text-slate-500">Cozinha: {mc.habilidade_culinaria}</p>
                    )}
                    {mc.barman && <p className="text-xs text-slate-500">Barman</p>}
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
            {categorias.find((c) => c.id === categoriaSelecionada)?.nome === 'Marinheiro' && (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Dados de marinheiro</p>
                <CampoTexto label="Categoria de habilitação" value={categoriaHabilitacao} onChange={setCategoriaHabilitacao} placeholder="ex: Arrais Amador" />
                <div>
                  <CampoTexto label="Dias disponíveis" value={diasDisponiveis} onChange={setDiasDisponiveis} placeholder="ex: sáb, dom" />
                  <p className="mt-1 text-xs text-slate-400">Separe por vírgula.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CampoTexto label="Período" value={periodoDisponivel} onChange={setPeriodoDisponivel} placeholder="ex: manhã e tarde" />
                  <CampoNumero label="Valor da diária (R$)" value={valorDiaria} onChange={setValorDiaria} />
                </div>
                <CampoTexto label="Habilidade culinária (opcional)" value={habilidadeCulinaria} onChange={setHabilidadeCulinaria} placeholder="ex: Chef especializado em frutos do mar" />
                <CampoCheckbox label="Atua como barman" checked={barman} onChange={setBarman} />
              </div>
            )}
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

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-1 font-display text-lg text-slate-900">Marcas que atende</h2>
        <p className="mb-4 text-xs text-slate-400">
          Usadas pra você aparecer nas solicitações de serviço de embarcações com equipamentos dessas marcas.
        </p>
        {minhasMarcas.length === 0 && (
          <p className="mb-3 text-sm text-slate-400">Nenhuma marca cadastrada ainda.</p>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          {minhasMarcas.map((m) => (
            <span key={m.id} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {m.nome}
              <button onClick={() => removerMarca(m.prestador_marca_id)} className="text-red-600 hover:text-red-700">
                ×
              </button>
            </span>
          ))}
        </div>
        {marcasDisponiveis.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <CampoSelect
                label="Adicionar marca"
                value={marcaSelecionada}
                onChange={setMarcaSelecionada}
                options={[{ value: '', label: 'Selecione…' }, ...marcasDisponiveis.map((m) => ({ value: m.id, label: m.nome }))]}
              />
            </div>
            <button
              onClick={adicionarMarca}
              disabled={!marcaSelecionada}
              className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-1 font-display text-lg text-slate-900">Regiões de atendimento</h2>
        <p className="mb-4 text-xs text-slate-400">Cidades onde você atende presencialmente.</p>
        {minhasRegioes.length === 0 && (
          <p className="mb-3 text-sm text-slate-400">Nenhuma região cadastrada ainda.</p>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          {minhasRegioes.map((r) => (
            <span key={r.id} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {r.nome} — {r.sigla_estado}
              <button onClick={() => removerRegiao(r.prestador_regiao_id)} className="text-red-600 hover:text-red-700">
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CampoSelect
            label="Estado"
            value={estadoSelecionado}
            onChange={onEstadoSelecionado}
            options={[{ value: '', label: 'Selecione…' }, ...estados.map((e) => ({ value: String(e.id), label: e.nome }))]}
          />
          <div className="flex items-end gap-2">
            <div className="flex-1">
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
            <button
              onClick={adicionarRegiao}
              disabled={!cidadeSelecionada}
              className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-1 font-display text-lg text-slate-900">Notificações push</h2>
        <p className="mb-4 text-xs text-slate-400">
          Receba um aviso no navegador assim que surgir uma solicitação de serviço compatível com suas marcas e regiões.
        </p>
        {assinaturasPush.length === 0 ? (
          <button
            onClick={ativarNotificacoesPush}
            disabled={ativandoPush}
            className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
          >
            {ativandoPush ? 'Ativando…' : 'Ativar notificações neste navegador'}
          </button>
        ) : (
          <div className="space-y-2">
            {assinaturasPush.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span>Este navegador está recebendo notificações</span>
                <button onClick={() => desativarNotificacaoPush(a.id)} className="text-red-600 hover:text-red-700">
                  Desativar
                </button>
              </div>
            ))}
            <button
              onClick={ativarNotificacoesPush}
              disabled={ativandoPush}
              className="text-sm font-medium text-tide-600 hover:text-tide-700 disabled:opacity-50"
            >
              {ativandoPush ? 'Ativando…' : '+ Ativar em outro navegador/dispositivo'}
            </button>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-slate-900">Formas de pagamento</h2>
          {!adicionandoPagamento && (
            <button
              onClick={() => setAdicionandoPagamento(true)}
              className="text-sm font-medium text-tide-600 hover:text-tide-700"
            >
              + Adicionar
            </button>
          )}
        </div>
        <p className="mb-4 text-xs text-slate-400">
          Usadas por padrão nas suas cotações — você pode especificar outra forma em cada cotação, se preferir.
        </p>

        <div className="mb-4 border-b border-slate-200 pb-4">
          <CampoTexto
            label="Condição de pagamento padrão"
            value={condicaoPagamentoPadrao}
            onChange={setCondicaoPagamentoPadrao}
            placeholder="ex: 50% de entrada, 50% na conclusão do serviço"
          />
          <button
            onClick={salvarCondicaoPagamento}
            disabled={salvandoCondicaoPagamento}
            className="mt-2 rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
          >
            {salvandoCondicaoPagamento ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        {prestador.formas_pagamento.length === 0 && !adicionandoPagamento && (
          <p className="text-sm text-slate-400">Nenhuma forma de pagamento cadastrada ainda.</p>
        )}

        <div className="space-y-2">
          {prestador.formas_pagamento.map((fp, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{fp.tipo}</p>
                <p className="text-xs text-slate-500">{fp.dados}</p>
              </div>
              <button onClick={() => removerFormaPagamento(i)} className="text-xs text-red-600 hover:text-red-700">
                Remover
              </button>
            </div>
          ))}
        </div>

        {adicionandoPagamento && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
            <CampoTexto label="Tipo" value={tipoPagamento} onChange={setTipoPagamento} placeholder="ex: Pix, Transferência, Boleto" />
            <CampoTexto label="Dados" value={dadosPagamento} onChange={setDadosPagamento} placeholder="ex: chave pix, dados bancários" />
            <div className="flex gap-2">
              <button
                onClick={adicionarFormaPagamento}
                disabled={!tipoPagamento.trim() || !dadosPagamento.trim()}
                className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
              >
                Adicionar
              </button>
              <button onClick={() => setAdicionandoPagamento(false)} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
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
