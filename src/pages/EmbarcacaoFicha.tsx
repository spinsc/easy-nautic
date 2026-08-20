import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mensagemErro } from '@/lib/errors'
import { CampoTexto, CampoSelect, CampoData, CampoNumero, CampoCheckbox } from '@/components/campos'
import { AvaliacaoForm } from '@/components/AvaliacaoForm'
import {
  getEmbarcacao,
  updateEmbarcacao,
  listEquipamentos,
  createEquipamento,
  deleteEquipamento,
  listTags,
  createTag,
  listChamadosDaEmbarcacao,
  atualizarStatusChamado,
  uploadMidiaEmbarcacao,
  getUrlMidiaEmbarcacao,
  listTripulacao,
  addTripulante,
  updateTripulante,
  removeTripulante,
  listPrestadoresPorCategoria,
  listCategoriasServico,
  listCotacoesDoChamado,
  atualizarStatusCotacao,
  getMeuPrestador,
  criarChamado,
  listRejeicoesDoChamado,
  rejeitarServico,
  resolverDisputa,
  uploadEvidenciaChamado,
  getUrlEvidencia,
  listPerguntasDoChamado,
  responderPergunta,
  listVisitasDoChamado,
  atualizarStatusVisita,
  listMarcas,
  listEstados,
  listCidadesPorEstado,
  getCidade,
  listNotificacoesDoChamado,
  listAvaliacoesDoChamado,
} from '@/lib/api'
import type {
  Avaliacao,
  CategoriaEquipamento,
  CategoriaServico,
  Chamado,
  ChamadoNotificacao,
  ChamadoPergunta,
  ChamadoRejeicao,
  ChamadoVisita,
  Cidade,
  Cotacao,
  DocumentoVerificacao,
  Embarcacao,
  Estado,
  Marca,
  EmbarcacaoTag,
  EmbarcacaoTripulante,
  EquipamentoEmbarcado,
  Prestador,
  StatusChamado,
} from '@/types'

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

const STATUS_STYLES: Record<StatusChamado, string> = {
  aberto: 'bg-amber-100 text-amber-700',
  em_andamento: 'bg-tide-100 text-tide-700',
  aguardando_confirmacao: 'bg-violet-100 text-violet-700',
  em_disputa: 'bg-red-100 text-red-700',
  concluido: 'bg-emerald-100 text-emerald-700',
}

const STATUS_COTACAO_LABELS: Record<Cotacao['status'], string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  paga: 'Paga',
}

const STATUS_COTACAO_STYLES: Record<Cotacao['status'], string> = {
  pendente: 'bg-amber-100 text-amber-700',
  aprovada: 'bg-tide-100 text-tide-700',
  rejeitada: 'bg-red-100 text-red-700',
  paga: 'bg-emerald-100 text-emerald-700',
}

const STATUS_VISITA_LABELS: Record<ChamadoVisita['status'], string> = {
  solicitada: 'Aguardando resposta',
  autorizada: 'Autorizada',
  recusada: 'Recusada',
  realizada: 'Realizada',
}

const EQUIPAMENTO_VAZIO = {
  categoria: 'MOTOR' as CategoriaEquipamento,
  nome: '',
  marca_id: '',
  modelo: '',
  numero_serie: '',
  instalado_em: '',
  data_venda: '',
  prazo_garantia_meses: null as number | null,
}

const DETALHES_VAZIO = {
  motorizacao: '',
  capacidade_pessoas: null as number | null,
  calado: null as number | null,
  boca: null as number | null,
  tipo_casco: '',
  combustivel: '',
  marina: '',
  vaga: '',
  numero_tie: '',
  seguradora: '',
  apolice_seguro: '',
  vistoria_validade: '',
}

const BASE_URL_TAG = `${window.location.origin}${import.meta.env.BASE_URL}b/`

export default function EmbarcacaoFicha() {
  const { id } = useParams<{ id: string }>()
  const [embarcacao, setEmbarcacao] = useState<Embarcacao | null>(null)
  const [equipamentos, setEquipamentos] = useState<EquipamentoEmbarcado[]>([])
  const [tags, setTags] = useState<EmbarcacaoTag[]>([])
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [tripulacao, setTripulacao] = useState<(EmbarcacaoTripulante & { marinheiro_nome: string })[]>([])
  const [marinheirosDisponiveis, setMarinheirosDisponiveis] = useState<Prestador[]>([])
  const [cotacoesPorChamado, setCotacoesPorChamado] = useState<Record<string, (Cotacao & { prestador_nome: string })[]>>({})
  const [notificacoesPorChamado, setNotificacoesPorChamado] = useState<Record<string, (ChamadoNotificacao & { prestador_nome: string })[]>>({})
  const [meuPrestadorId, setMeuPrestadorId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [adicionandoEquipamento, setAdicionandoEquipamento] = useState(false)
  const [formEquipamento, setFormEquipamento] = useState(EQUIPAMENTO_VAZIO)

  const [adicionandoTag, setAdicionandoTag] = useState(false)
  const [novoTagId, setNovoTagId] = useState('')

  const [editandoDetalhes, setEditandoDetalhes] = useState(false)
  const [detalhes, setDetalhes] = useState(DETALHES_VAZIO)
  const [salvandoDetalhes, setSalvandoDetalhes] = useState(false)

  const [marcasCatalogo, setMarcasCatalogo] = useState<Marca[]>([])
  const [estados, setEstados] = useState<Estado[]>([])
  const [estadoSelecionado, setEstadoSelecionado] = useState('')
  const [cidadesDoEstado, setCidadesDoEstado] = useState<Cidade[]>([])
  const [cidadeSelecionada, setCidadeSelecionada] = useState('')

  const [enviandoMidia, setEnviandoMidia] = useState(false)

  const [marinheiroSelecionado, setMarinheiroSelecionado] = useState('')
  const [funcaoTripulante, setFuncaoTripulante] = useState('')
  const [permissoesTripulante, setPermissoesTripulante] = useState({
    pode_solicitar: true,
    pode_aprovar: false,
    pode_pagar: false,
  })

  const [abrindoChamado, setAbrindoChamado] = useState(false)
  const [descricaoChamado, setDescricaoChamado] = useState('')
  const [equipamentoChamado, setEquipamentoChamado] = useState('')
  const [tipoPedidoSemEquip, setTipoPedidoSemEquip] = useState('')
  const [marcaChamado, setMarcaChamado] = useState('')
  const [categoriaChamado, setCategoriaChamado] = useState('')
  const [categoriasServico, setCategoriasServico] = useState<CategoriaServico[]>([])

  const [rejeicoesPorChamado, setRejeicoesPorChamado] = useState<Record<string, ChamadoRejeicao[]>>({})
  const [rejeitandoId, setRejeitandoId] = useState<string | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [evidenciasRejeicao, setEvidenciasRejeicao] = useState<DocumentoVerificacao[]>([])
  const [enviandoEvidencia, setEnviandoEvidencia] = useState(false)

  const [perguntasPorChamado, setPerguntasPorChamado] = useState<Record<string, (ChamadoPergunta & { prestador_nome: string })[]>>({})
  const [respondendoId, setRespondendoId] = useState<string | null>(null)
  const [resposta, setResposta] = useState('')

  const [visitasPorChamado, setVisitasPorChamado] = useState<Record<string, (ChamadoVisita & { prestador_nome: string })[]>>({})
  const [recusandoVisitaId, setRecusandoVisitaId] = useState<string | null>(null)
  const [motivoRecusaVisita, setMotivoRecusaVisita] = useState('')

  const [avaliacoesPorChamado, setAvaliacoesPorChamado] = useState<Record<string, Avaliacao[]>>({})

  async function carregar() {
    if (!id) return
    setCarregando(true)
    try {
      const [emb, eq, tg, ch, trip, cats, meuPrestador, catalogoMarcas, listaEstados] = await Promise.all([
        getEmbarcacao(id),
        listEquipamentos(id),
        listTags(id),
        listChamadosDaEmbarcacao(id),
        listTripulacao(id),
        listCategoriasServico(),
        getMeuPrestador(),
        listMarcas(),
        listEstados(),
      ])
      setMarcasCatalogo(catalogoMarcas)
      setEstados(listaEstados)
      setEmbarcacao(emb)
      setEquipamentos(eq)
      setTags(tg)
      setChamados(ch)
      setTripulacao(trip)
      setMeuPrestadorId(meuPrestador?.id ?? null)
      setCategoriasServico(cats)
      const cotacoesEntries = await Promise.all(ch.map(async (c) => [c.id, await listCotacoesDoChamado(c.id)] as const))
      setCotacoesPorChamado(Object.fromEntries(cotacoesEntries))
      const notificacoesEntries = await Promise.all(ch.map(async (c) => [c.id, await listNotificacoesDoChamado(c.id)] as const))
      setNotificacoesPorChamado(Object.fromEntries(notificacoesEntries))
      const rejeicoesEntries = await Promise.all(
        ch.filter((c) => c.status === 'em_disputa').map(async (c) => [c.id, await listRejeicoesDoChamado(c.id)] as const)
      )
      setRejeicoesPorChamado(Object.fromEntries(rejeicoesEntries))
      const perguntasEntries = await Promise.all(ch.map(async (c) => [c.id, await listPerguntasDoChamado(c.id)] as const))
      setPerguntasPorChamado(Object.fromEntries(perguntasEntries))
      const visitasEntries = await Promise.all(ch.map(async (c) => [c.id, await listVisitasDoChamado(c.id)] as const))
      setVisitasPorChamado(Object.fromEntries(visitasEntries))
      const avaliacoesEntries = await Promise.all(
        ch.filter((c) => c.status === 'concluido').map(async (c) => [c.id, await listAvaliacoesDoChamado(c.id)] as const)
      )
      setAvaliacoesPorChamado(Object.fromEntries(avaliacoesEntries))
      if (emb) {
        setDetalhes({
          motorizacao: emb.motorizacao ?? '',
          capacidade_pessoas: emb.capacidade_pessoas,
          calado: emb.calado,
          boca: emb.boca,
          tipo_casco: emb.tipo_casco ?? '',
          combustivel: emb.combustivel ?? '',
          marina: emb.marina ?? '',
          vaga: emb.vaga ?? '',
          numero_tie: emb.numero_tie ?? '',
          seguradora: emb.seguradora ?? '',
          apolice_seguro: emb.apolice_seguro ?? '',
          vistoria_validade: emb.vistoria_validade ?? '',
        })
        if (emb.cidade_id) {
          const cidade = await getCidade(emb.cidade_id)
          if (cidade) {
            setEstadoSelecionado(String(cidade.estado_id))
            setCidadesDoEstado(await listCidadesPorEstado(cidade.estado_id))
            setCidadeSelecionada(String(emb.cidade_id))
          }
        }
      }
      const categoriaMarinheiro = cats.find((c) => c.nome === 'Marinheiro')
      if (categoriaMarinheiro) {
        setMarinheirosDisponiveis(await listPrestadoresPorCategoria(categoriaMarinheiro.id))
      }
      setErro(null)
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar embarcação'))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function salvarEquipamento() {
    if (!id) return
    try {
      await createEquipamento({
        embarcacao_id: id,
        categoria: formEquipamento.categoria,
        nome: formEquipamento.nome,
        marca: marcasCatalogo.find((m) => m.id === formEquipamento.marca_id)?.nome ?? null,
        marca_id: formEquipamento.marca_id || null,
        modelo: formEquipamento.modelo || null,
        numero_serie: formEquipamento.numero_serie || null,
        instalado_em: formEquipamento.instalado_em || null,
        data_venda: formEquipamento.data_venda || null,
        prazo_garantia_meses: formEquipamento.prazo_garantia_meses,
      })
      setFormEquipamento(EQUIPAMENTO_VAZIO)
      setAdicionandoEquipamento(false)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao adicionar equipamento'))
    }
  }

  async function removerEquipamento(equipamentoId: string) {
    if (!confirm('Remover este equipamento?')) return
    try {
      await deleteEquipamento(equipamentoId)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao remover equipamento'))
    }
  }

  async function salvarTag() {
    if (!id || !novoTagId.trim()) return
    try {
      await createTag({ embarcacao_id: id, tag_id: novoTagId.trim(), modelo_nfc: 'NTAG213', modo_gravacao: 'HUB' })
      setNovoTagId('')
      setAdicionandoTag(false)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao criar tag'))
    }
  }

  async function confirmarServico(chamadoId: string) {
    try {
      await atualizarStatusChamado(chamadoId, 'concluido')
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao confirmar serviço'))
    }
  }

  function iniciarRejeicao(chamadoId: string) {
    setRejeitandoId(chamadoId)
    setMotivoRejeicao('')
    setEvidenciasRejeicao([])
  }

  async function handleUploadEvidencia(chamadoId: string, file: File) {
    setEnviandoEvidencia(true)
    try {
      const item = await uploadEvidenciaChamado(chamadoId, file)
      setEvidenciasRejeicao((prev) => [...prev, item])
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao enviar evidência'))
    } finally {
      setEnviandoEvidencia(false)
    }
  }

  async function enviarRejeicao() {
    if (!rejeitandoId || !motivoRejeicao.trim()) return
    try {
      await rejeitarServico(rejeitandoId, motivoRejeicao.trim(), evidenciasRejeicao)
      setRejeitandoId(null)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao rejeitar serviço'))
    }
  }

  async function abrirEvidencia(path: string) {
    try {
      const url = await getUrlEvidencia(path)
      window.open(url, '_blank')
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao abrir evidência'))
    }
  }

  async function resolverDisputaChamado(chamadoId: string, status: 'em_andamento' | 'concluido') {
    try {
      await resolverDisputa(chamadoId, status)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao resolver disputa'))
    }
  }

  async function enviarResposta(perguntaId: string) {
    if (!meuPrestadorId || !resposta.trim()) return
    try {
      await responderPergunta(perguntaId, resposta.trim(), meuPrestadorId)
      setResposta('')
      setRespondendoId(null)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao responder pergunta'))
    }
  }

  async function autorizarVisita(id: string) {
    try {
      await atualizarStatusVisita(id, 'autorizada')
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao autorizar visita'))
    }
  }

  async function recusarVisita(id: string) {
    if (!motivoRecusaVisita.trim()) return
    try {
      await atualizarStatusVisita(id, 'recusada', motivoRecusaVisita.trim())
      setRecusandoVisitaId(null)
      setMotivoRecusaVisita('')
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao recusar visita'))
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

  async function salvarDetalhes() {
    if (!id) return
    setSalvandoDetalhes(true)
    try {
      await updateEmbarcacao(id, {
        motorizacao: detalhes.motorizacao || null,
        capacidade_pessoas: detalhes.capacidade_pessoas,
        calado: detalhes.calado,
        boca: detalhes.boca,
        tipo_casco: detalhes.tipo_casco || null,
        combustivel: detalhes.combustivel || null,
        marina: detalhes.marina || null,
        vaga: detalhes.vaga || null,
        cidade: cidadesDoEstado.find((c) => String(c.id) === cidadeSelecionada)?.nome ?? null,
        cidade_id: cidadeSelecionada ? Number(cidadeSelecionada) : null,
        numero_tie: detalhes.numero_tie || null,
        seguradora: detalhes.seguradora || null,
        apolice_seguro: detalhes.apolice_seguro || null,
        vistoria_validade: detalhes.vistoria_validade || null,
      })
      setEditandoDetalhes(false)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao salvar detalhes'))
    } finally {
      setSalvandoDetalhes(false)
    }
  }

  async function handleUploadMidia(file: File, tipo: 'documentos' | 'fotos') {
    if (!id || !embarcacao) return
    setEnviandoMidia(true)
    try {
      const item = await uploadMidiaEmbarcacao(id, file, tipo)
      await updateEmbarcacao(id, { [tipo]: [...embarcacao[tipo], item] })
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao enviar arquivo'))
    } finally {
      setEnviandoMidia(false)
    }
  }

  async function abrirMidia(path: string) {
    try {
      const url = await getUrlMidiaEmbarcacao(path)
      window.open(url, '_blank')
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao abrir arquivo'))
    }
  }

  async function vincularTripulante() {
    if (!id || !marinheiroSelecionado) return
    try {
      await addTripulante(id, marinheiroSelecionado, funcaoTripulante || null, permissoesTripulante)
      setMarinheiroSelecionado('')
      setFuncaoTripulante('')
      setPermissoesTripulante({ pode_solicitar: true, pode_aprovar: false, pode_pagar: false })
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao vincular marinheiro'))
    }
  }

  async function desvincularTripulante(tripulanteId: string) {
    try {
      await removeTripulante(tripulanteId)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao remover tripulante'))
    }
  }

  async function alterarPermissaoTripulante(
    tripulanteId: string,
    campo: 'pode_solicitar' | 'pode_aprovar' | 'pode_pagar',
    valor: boolean
  ) {
    try {
      await updateTripulante(tripulanteId, { [campo]: valor })
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao atualizar permissão'))
    }
  }

  async function salvarChamado() {
    if (!id || !descricaoChamado.trim()) return
    try {
      const categoriaServicoId = !equipamentoChamado && tipoPedidoSemEquip === 'categoria' ? categoriaChamado : null
      const marcaId = !equipamentoChamado && tipoPedidoSemEquip === 'peca' ? marcaChamado : null
      await criarChamado(id, descricaoChamado.trim(), equipamentoChamado || null, categoriaServicoId, marcaId)
      setDescricaoChamado('')
      setEquipamentoChamado('')
      setTipoPedidoSemEquip('')
      setMarcaChamado('')
      setCategoriaChamado('')
      setAbrindoChamado(false)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao abrir chamado'))
    }
  }

  async function mudarStatusCotacao(cotacaoId: string, status: Cotacao['status']) {
    if (!meuPrestadorId) return
    try {
      await atualizarStatusCotacao(cotacaoId, status, meuPrestadorId)
      await carregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao atualizar cotação'))
    }
  }

  if (carregando) return <p className="p-8 text-sm text-slate-400">Carregando…</p>
  if (!embarcacao) return <p className="p-8 text-sm text-slate-400">Embarcação não encontrada.</p>

  const marinheirosNaoVinculados = marinheirosDisponiveis.filter(
    (m) => !tripulacao.some((t) => t.marinheiro_id === m.id)
  )

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link to="/embarcacoes" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Minhas embarcações
      </Link>
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Ficha completa</p>
        <h1 className="font-display text-3xl text-slate-900">{embarcacao.nome}</h1>
        <p className="text-sm text-slate-500">Cliente: {embarcacao.cliente_nome}</p>
      </header>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-slate-900">Especificações, localização e documentação</h2>
          {!editandoDetalhes && (
            <button onClick={() => setEditandoDetalhes(true)} className="text-sm font-medium text-tide-600 hover:text-tide-700">
              Editar
            </button>
          )}
        </div>

        {!editandoDetalhes ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <p className="text-slate-500">Motorização: <span className="text-slate-900">{embarcacao.motorizacao ?? '—'}</span></p>
            <p className="text-slate-500">Capacidade: <span className="text-slate-900">{embarcacao.capacidade_pessoas ?? '—'}</span></p>
            <p className="text-slate-500">Calado: <span className="text-slate-900">{embarcacao.calado ?? '—'}</span></p>
            <p className="text-slate-500">Boca: <span className="text-slate-900">{embarcacao.boca ?? '—'}</span></p>
            <p className="text-slate-500">Tipo de casco: <span className="text-slate-900">{embarcacao.tipo_casco ?? '—'}</span></p>
            <p className="text-slate-500">Combustível: <span className="text-slate-900">{embarcacao.combustivel ?? '—'}</span></p>
            <p className="text-slate-500">Marina: <span className="text-slate-900">{embarcacao.marina ?? '—'}</span></p>
            <p className="text-slate-500">Vaga: <span className="text-slate-900">{embarcacao.vaga ?? '—'}</span></p>
            <p className="text-slate-500">Cidade: <span className="text-slate-900">{embarcacao.cidade ?? '—'}</span></p>
            <p className="text-slate-500">TIE: <span className="text-slate-900">{embarcacao.numero_tie ?? '—'}</span></p>
            <p className="text-slate-500">Seguradora: <span className="text-slate-900">{embarcacao.seguradora ?? '—'}</span></p>
            <p className="text-slate-500">Apólice: <span className="text-slate-900">{embarcacao.apolice_seguro ?? '—'}</span></p>
            <p className="text-slate-500">Vistoria válida até: <span className="text-slate-900">{embarcacao.vistoria_validade ?? '—'}</span></p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CampoTexto label="Motorização" value={detalhes.motorizacao} onChange={(v) => setDetalhes({ ...detalhes, motorizacao: v })} />
              <CampoNumero label="Capacidade (pessoas)" value={detalhes.capacidade_pessoas} onChange={(v) => setDetalhes({ ...detalhes, capacidade_pessoas: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CampoNumero label="Calado (m)" value={detalhes.calado} onChange={(v) => setDetalhes({ ...detalhes, calado: v })} />
              <CampoNumero label="Boca (m)" value={detalhes.boca} onChange={(v) => setDetalhes({ ...detalhes, boca: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CampoTexto label="Tipo de casco" value={detalhes.tipo_casco} onChange={(v) => setDetalhes({ ...detalhes, tipo_casco: v })} />
              <CampoTexto label="Combustível" value={detalhes.combustivel} onChange={(v) => setDetalhes({ ...detalhes, combustivel: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CampoTexto label="Marina" value={detalhes.marina} onChange={(v) => setDetalhes({ ...detalhes, marina: v })} />
              <CampoTexto label="Vaga" value={detalhes.vaga} onChange={(v) => setDetalhes({ ...detalhes, vaga: v })} />
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
            <div className="grid grid-cols-2 gap-4">
              <CampoTexto label="Número TIE" value={detalhes.numero_tie} onChange={(v) => setDetalhes({ ...detalhes, numero_tie: v })} />
              <CampoTexto label="Seguradora" value={detalhes.seguradora} onChange={(v) => setDetalhes({ ...detalhes, seguradora: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CampoTexto label="Apólice de seguro" value={detalhes.apolice_seguro} onChange={(v) => setDetalhes({ ...detalhes, apolice_seguro: v })} />
              <CampoData label="Vistoria válida até" value={detalhes.vistoria_validade} onChange={(v) => setDetalhes({ ...detalhes, vistoria_validade: v })} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={salvarDetalhes}
                disabled={salvandoDetalhes}
                className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
              >
                {salvandoDetalhes ? 'Salvando…' : 'Salvar'}
              </button>
              <button onClick={() => setEditandoDetalhes(false)} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-display text-lg text-slate-900">Documentos</h2>
        {embarcacao.documentos.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">Nenhum documento enviado ainda.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {embarcacao.documentos.map((doc, i) => (
              <li key={i}>
                <button onClick={() => abrirMidia(doc.path)} className="text-sm text-tide-600 hover:text-tide-700 hover:underline">
                  {doc.nome_arquivo}
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="inline-block cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-tide-500">
          {enviandoMidia ? 'Enviando…' : 'Enviar documento'}
          <input
            type="file"
            className="hidden"
            disabled={enviandoMidia}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUploadMidia(file, 'documentos')
            }}
          />
        </label>
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-display text-lg text-slate-900">Fotos</h2>
        {embarcacao.fotos.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">Nenhuma foto enviada ainda.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {embarcacao.fotos.map((foto, i) => (
              <li key={i}>
                <button onClick={() => abrirMidia(foto.path)} className="text-sm text-tide-600 hover:text-tide-700 hover:underline">
                  {foto.nome_arquivo}
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="inline-block cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-tide-500">
          {enviandoMidia ? 'Enviando…' : 'Enviar foto'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={enviandoMidia}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUploadMidia(file, 'fotos')
            }}
          />
        </label>
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-display text-lg text-slate-900">Tripulação</h2>
        {tripulacao.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">Nenhum marinheiro vinculado ainda.</p>
        ) : (
          <div className="mb-4 space-y-2">
            {tripulacao.map((t) => (
              <div key={t.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{t.marinheiro_nome}</p>
                    {t.funcao && <p className="text-xs text-slate-500">{t.funcao}</p>}
                  </div>
                  <button onClick={() => desvincularTripulante(t.id)} className="text-xs text-red-600 hover:text-red-700">
                    Remover
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-2">
                  <CampoCheckbox
                    label="Pode solicitar"
                    checked={t.pode_solicitar}
                    onChange={(v) => alterarPermissaoTripulante(t.id, 'pode_solicitar', v)}
                  />
                  <CampoCheckbox
                    label="Pode aprovar"
                    checked={t.pode_aprovar}
                    onChange={(v) => alterarPermissaoTripulante(t.id, 'pode_aprovar', v)}
                  />
                  <CampoCheckbox
                    label="Pode pagar"
                    checked={t.pode_pagar}
                    onChange={(v) => alterarPermissaoTripulante(t.id, 'pode_pagar', v)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {marinheirosNaoVinculados.length > 0 && (
          <div className="space-y-4 border-t border-slate-200 pt-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <CampoSelect
                  label="Marinheiro"
                  value={marinheiroSelecionado}
                  onChange={setMarinheiroSelecionado}
                  options={[
                    { value: '', label: 'Selecione…' },
                    ...marinheirosNaoVinculados.map((m) => ({ value: m.id, label: m.nome })),
                  ]}
                />
              </div>
              <div className="flex-1">
                <CampoTexto label="Função (opcional)" value={funcaoTripulante} onChange={setFuncaoTripulante} placeholder="ex: Comandante" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <CampoCheckbox
                label="Pode solicitar serviços"
                checked={permissoesTripulante.pode_solicitar}
                onChange={(v) => setPermissoesTripulante({ ...permissoesTripulante, pode_solicitar: v })}
              />
              <CampoCheckbox
                label="Pode aprovar cotações"
                checked={permissoesTripulante.pode_aprovar}
                onChange={(v) => setPermissoesTripulante({ ...permissoesTripulante, pode_aprovar: v })}
              />
              <CampoCheckbox
                label="Pode marcar como pago"
                checked={permissoesTripulante.pode_pagar}
                onChange={(v) => setPermissoesTripulante({ ...permissoesTripulante, pode_pagar: v })}
              />
            </div>
            <button
              onClick={vincularTripulante}
              disabled={!marinheiroSelecionado}
              className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
            >
              Vincular
            </button>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-slate-900">Equipamentos</h2>
          {!adicionandoEquipamento && (
            <button onClick={() => setAdicionandoEquipamento(true)} className="text-sm font-medium text-tide-600 hover:text-tide-700">
              + Adicionar
            </button>
          )}
        </div>

        {equipamentos.length === 0 && !adicionandoEquipamento && (
          <p className="text-sm text-slate-400">Nenhum equipamento cadastrado ainda.</p>
        )}

        <div className="space-y-3">
          {equipamentos.map((eq) => (
            <div key={eq.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {CATEGORIA_LABELS[eq.categoria]} — {eq.nome}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[eq.marca, eq.modelo].filter(Boolean).join(' ') || '—'}
                  </p>
                  {eq.garantia_vence_em && (
                    <p className="text-xs text-slate-500">Garantia até: {eq.garantia_vence_em}</p>
                  )}
                </div>
                <button onClick={() => removerEquipamento(eq.id)} className="text-xs text-red-600 hover:text-red-700">
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {adicionandoEquipamento && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
            <CampoSelect
              label="Categoria"
              value={formEquipamento.categoria}
              onChange={(v) => setFormEquipamento({ ...formEquipamento, categoria: v as CategoriaEquipamento })}
              options={Object.entries(CATEGORIA_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <CampoTexto label="Nome" value={formEquipamento.nome} onChange={(v) => setFormEquipamento({ ...formEquipamento, nome: v })} required />
            <div className="grid grid-cols-2 gap-4">
              <CampoSelect
                label="Marca"
                value={formEquipamento.marca_id}
                onChange={(v) => setFormEquipamento({ ...formEquipamento, marca_id: v })}
                options={[{ value: '', label: 'Selecione…' }, ...marcasCatalogo.map((m) => ({ value: m.id, label: m.nome }))]}
              />
              <CampoTexto label="Modelo" value={formEquipamento.modelo} onChange={(v) => setFormEquipamento({ ...formEquipamento, modelo: v })} />
            </div>
            <CampoTexto label="Número de série" value={formEquipamento.numero_serie} onChange={(v) => setFormEquipamento({ ...formEquipamento, numero_serie: v })} />
            <div className="grid grid-cols-2 gap-4">
              <CampoData label="Data da venda/instalação" value={formEquipamento.data_venda} onChange={(v) => setFormEquipamento({ ...formEquipamento, data_venda: v })} />
              <CampoNumero
                label="Garantia (meses)"
                value={formEquipamento.prazo_garantia_meses}
                onChange={(v) => setFormEquipamento({ ...formEquipamento, prazo_garantia_meses: v })}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={salvarEquipamento}
                disabled={!formEquipamento.nome.trim()}
                className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
              >
                Adicionar
              </button>
              <button onClick={() => setAdicionandoEquipamento(false)} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-slate-900">Tags NFC</h2>
          {!adicionandoTag && (
            <button onClick={() => setAdicionandoTag(true)} className="text-sm font-medium text-tide-600 hover:text-tide-700">
              + Nova tag
            </button>
          )}
        </div>

        {tags.length === 0 && !adicionandoTag && <p className="text-sm text-slate-400">Nenhuma tag gravada ainda.</p>}

        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{tag.tag_id}</p>
                <p className="text-xs text-slate-500">{BASE_URL_TAG}{tag.tag_id}</p>
              </div>
              <span className="text-xs text-slate-400">{tag.contagem_leituras} leituras</span>
            </div>
          ))}
        </div>

        {adicionandoTag && (
          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
            <CampoTexto label="Código físico da tag" value={novoTagId} onChange={setNovoTagId} placeholder="ex: barco-nome-01" />
            <p className="text-xs text-slate-400">
              Grave esta URL no chip: {BASE_URL_TAG}
              {novoTagId || 'TAG-XXX'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={salvarTag}
                disabled={!novoTagId.trim()}
                className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
              >
                Salvar tag
              </button>
              <button onClick={() => setAdicionandoTag(false)} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-slate-900">Chamados</h2>
          {!abrindoChamado && (
            <button onClick={() => setAbrindoChamado(true)} className="text-sm font-medium text-tide-600 hover:text-tide-700">
              + Solicitar serviço
            </button>
          )}
        </div>

        {abrindoChamado && (
          <div className="mb-4 space-y-4 rounded-md border border-slate-200 p-3">
            {equipamentos.length > 0 && (
              <CampoSelect
                label="Sobre qual item? (opcional)"
                value={equipamentoChamado}
                onChange={setEquipamentoChamado}
                options={[
                  { value: '', label: 'Embarcação em geral' },
                  ...equipamentos.map((eq) => ({ value: eq.id, label: `${CATEGORIA_LABELS[eq.categoria]} — ${eq.nome}` })),
                ]}
              />
            )}
            {!equipamentoChamado && (
              <>
                <CampoSelect
                  label="Tipo de pedido"
                  value={tipoPedidoSemEquip}
                  onChange={setTipoPedidoSemEquip}
                  options={[
                    { value: '', label: 'Serviço geral' },
                    { value: 'peca', label: 'Peça / equipamento por marca' },
                    { value: 'categoria', label: 'Serviço por categoria (ex: Marinheiro, Marina)' },
                  ]}
                />
                {tipoPedidoSemEquip === 'peca' && (
                  <CampoSelect
                    label="Marca da peça"
                    value={marcaChamado}
                    onChange={setMarcaChamado}
                    options={[{ value: '', label: 'Selecione…' }, ...marcasCatalogo.map((m) => ({ value: m.id, label: m.nome }))]}
                  />
                )}
                {tipoPedidoSemEquip === 'categoria' && (
                  <CampoSelect
                    label="Categoria de serviço"
                    value={categoriaChamado}
                    onChange={setCategoriaChamado}
                    options={[{ value: '', label: 'Selecione…' }, ...categoriasServico.map((c) => ({ value: c.id, label: c.nome }))]}
                  />
                )}
              </>
            )}
            <CampoTexto label="Descreva o problema" value={descricaoChamado} onChange={setDescricaoChamado} />
            <div className="flex gap-2">
              <button
                onClick={salvarChamado}
                disabled={!descricaoChamado.trim()}
                className="rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
              >
                Enviar
              </button>
              <button onClick={() => setAbrindoChamado(false)} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {chamados.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum chamado registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {chamados.map((c) => (
              <div key={c.id} className="rounded-md border border-slate-200 p-3">
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
                    <p className="text-sm text-slate-900">{c.descricao}</p>
                  </div>
                  {c.status === 'aguardando_confirmacao' && rejeitandoId !== c.id && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => confirmarServico(c.id)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => iniciarRejeicao(c.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                  {c.status === 'em_disputa' && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => resolverDisputaChamado(c.id, 'em_andamento')}
                        className="text-xs font-medium text-tide-600 hover:text-tide-700"
                      >
                        Reabrir pro prestador
                      </button>
                      <button
                        onClick={() => resolverDisputaChamado(c.id, 'concluido')}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Confirmar mesmo assim
                      </button>
                    </div>
                  )}
                </div>

                {c.status === 'aguardando_confirmacao' && c.terminei_em && (
                  <p className="mt-1 text-xs text-slate-400">
                    Confirmação automática em{' '}
                    {new Date(new Date(c.terminei_em).getTime() + 3 * 86400000).toLocaleDateString('pt-BR')}, se
                    ninguém responder.
                  </p>
                )}

                {c.status === 'concluido' && (
                  <AvaliacaoForm
                    chamadoId={c.id}
                    papelAvaliado="prestador"
                    minhaAvaliacao={avaliacoesPorChamado[c.id]?.find((a) => a.avaliador_id === meuPrestadorId)}
                    rotulo="Avaliar prestador"
                    onAvaliado={carregar}
                  />
                )}

                {rejeitandoId === c.id && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    <CampoTexto label="Motivo da rejeição" value={motivoRejeicao} onChange={setMotivoRejeicao} />
                    {evidenciasRejeicao.length > 0 && (
                      <ul className="space-y-1">
                        {evidenciasRejeicao.map((ev, i) => (
                          <li key={i} className="text-xs text-slate-500">{ev.nome_arquivo}</li>
                        ))}
                      </ul>
                    )}
                    <label className="inline-block cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-tide-500">
                      {enviandoEvidencia ? 'Enviando…' : '+ Anexar imagem, vídeo ou documento'}
                      <input
                        type="file"
                        className="hidden"
                        disabled={enviandoEvidencia}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadEvidencia(c.id, file)
                        }}
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={enviarRejeicao}
                        disabled={!motivoRejeicao.trim()}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Enviar rejeição
                      </button>
                      <button onClick={() => setRejeitandoId(null)} className="rounded-md px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {c.status === 'em_disputa' && (rejeicoesPorChamado[c.id]?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Motivo da disputa</p>
                    {rejeicoesPorChamado[c.id].map((rej) => (
                      <div key={rej.id} className="rounded-md bg-red-50 p-2 text-xs">
                        <p className="mb-1 text-slate-900">{rej.motivo}</p>
                        {rej.evidencias.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {rej.evidencias.map((ev, i) => (
                              <button key={i} onClick={() => abrirEvidencia(ev.path)} className="text-tide-600 hover:underline">
                                {ev.nome_arquivo}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(perguntasPorChamado[c.id]?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Dúvidas</p>
                    {perguntasPorChamado[c.id].map((p) => (
                      <div key={p.id} className="rounded-md bg-slate-50 p-2 text-xs">
                        <p className="text-slate-900">
                          <span className="font-medium">{p.prestador_nome}:</span> {p.pergunta}
                        </p>
                        {p.resposta ? (
                          <p className="mt-1 text-slate-600">Resposta: {p.resposta}</p>
                        ) : respondendoId === p.id ? (
                          <div className="mt-2 space-y-2">
                            <CampoTexto label="Resposta" value={resposta} onChange={setResposta} />
                            <div className="flex gap-2">
                              <button onClick={() => enviarResposta(p.id)} disabled={!resposta.trim()} className="font-medium text-tide-600 hover:text-tide-700 disabled:opacity-50">
                                Enviar
                              </button>
                              <button onClick={() => setRespondendoId(null)} className="text-slate-500 hover:text-slate-900">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setRespondendoId(p.id)
                              setResposta('')
                            }}
                            className="mt-1 font-medium text-tide-600 hover:text-tide-700"
                          >
                            Responder
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(visitasPorChamado[c.id]?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Visita a bordo</p>
                    {visitasPorChamado[c.id].map((v) => (
                      <div key={v.id} className="rounded-md bg-slate-50 p-2 text-xs">
                        <p className="text-slate-900">
                          <span className="font-medium">{v.prestador_nome}</span> — {new Date(v.data_sugerida).toLocaleString('pt-BR')} —{' '}
                          {STATUS_VISITA_LABELS[v.status]}
                        </p>
                        {v.motivo_recusa && <p className="mt-1 text-slate-500">Motivo: {v.motivo_recusa}</p>}
                        {v.status === 'solicitada' && recusandoVisitaId !== v.id && (
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => autorizarVisita(v.id)} className="font-medium text-tide-600 hover:text-tide-700">
                              Autorizar
                            </button>
                            <button onClick={() => setRecusandoVisitaId(v.id)} className="font-medium text-red-600 hover:text-red-700">
                              Recusar
                            </button>
                          </div>
                        )}
                        {recusandoVisitaId === v.id && (
                          <div className="mt-2 space-y-2">
                            <CampoTexto label="Motivo da recusa" value={motivoRecusaVisita} onChange={setMotivoRecusaVisita} />
                            <div className="flex gap-2">
                              <button onClick={() => recusarVisita(v.id)} disabled={!motivoRecusaVisita.trim()} className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
                                Confirmar recusa
                              </button>
                              <button onClick={() => setRecusandoVisitaId(null)} className="text-slate-500 hover:text-slate-900">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(notificacoesPorChamado[c.id]?.length ?? 0) > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-400">
                      {notificacoesPorChamado[c.id].length} prestador(es) notificado(s) automaticamente:{' '}
                      {notificacoesPorChamado[c.id].map((n) => n.prestador_nome).join(', ')}
                    </p>
                  </div>
                )}

                {(cotacoesPorChamado[c.id]?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cotações</p>
                    {cotacoesPorChamado[c.id].map((cot) => (
                      <div key={cot.id} className="rounded-md bg-slate-50 p-2 text-xs">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium text-slate-900">
                            {cot.prestador_nome} — R$ {cot.valor}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_COTACAO_STYLES[cot.status]}`}>
                            {STATUS_COTACAO_LABELS[cot.status]}
                          </span>
                        </div>
                        {cot.descricao && <p className="mb-1 text-slate-600">{cot.descricao}</p>}
                        <p className="text-slate-500">
                          Pagamento: {cot.forma_pagamento ? `${cot.forma_pagamento.tipo} — ${cot.forma_pagamento.dados}` : 'padrão do prestador'}
                        </p>
                        <p className="text-slate-500">
                          Condição: {cot.condicao_pagamento ?? 'padrão do prestador'}
                        </p>
                        <div className="mt-2 flex gap-2">
                          {cot.status === 'pendente' && (
                            <>
                              <button
                                onClick={() => mudarStatusCotacao(cot.id, 'aprovada')}
                                className="font-medium text-tide-600 hover:text-tide-700"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => mudarStatusCotacao(cot.id, 'rejeitada')}
                                className="font-medium text-red-600 hover:text-red-700"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          {cot.status === 'aprovada' && (
                            <button
                              onClick={() => mudarStatusCotacao(cot.id, 'paga')}
                              className="font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              Marcar como paga
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
