import { supabase } from './supabase'
import type {
  AdminDashboardKpis,
  AdminNegocioEmbarcacao,
  AdminNegocioPrestador,
  AdminNotificacaoStat,
  AdminSerieTemporalPonto,
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
  EmbarcacaoPublicaData,
  EmbarcacaoTag,
  EmbarcacaoTripulante,
  EquipamentoEmbarcado,
  Estado,
  FormaPagamento,
  Marca,
  Prestador,
  PrestadorCategoria,
  PushSubscription,
  StatusCotacao,
  StatusVerificacao,
  StatusVisita,
  TipoPessoa,
  TipoServico,
} from '@/types'

export async function listCategoriasServico(): Promise<CategoriaServico[]> {
  const { data, error } = await supabase.from('categorias_servico').select('*').order('ordem')
  if (error) throw error
  return data ?? []
}

export async function cadastrarPrestador(dados: {
  email: string
  senha: string
  tipo_pessoa: TipoPessoa
  nome: string
  cpf_cnpj: string
  telefone: string
}): Promise<void> {
  // A linha em `prestadores` é criada por um trigger no banco (on_auth_user_created),
  // a partir de raw_user_meta_data — não por um insert daqui. Isso evita depender de uma
  // sessão ativa logo após o signUp, que não existe quando confirmação de e-mail está ligada.
  const { error: authError } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: {
      data: {
        tipo_pessoa: dados.tipo_pessoa,
        nome: dados.nome,
        cpf_cnpj: dados.cpf_cnpj,
        telefone: dados.telefone,
      },
    },
  })
  if (authError) throw authError
}

export async function getMeuPrestador(): Promise<Prestador | null> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null
  const { data, error } = await supabase
    .from('prestadores')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updatePrestador(id: string, patch: Partial<Omit<Prestador, 'id' | 'criado_em'>>): Promise<void> {
  const { error } = await supabase.from('prestadores').update(patch).eq('id', id)
  if (error) throw error
}

export async function listPrestadorCategorias(prestadorId: string): Promise<PrestadorCategoria[]> {
  const { data, error } = await supabase
    .from('prestador_categorias')
    .select('*')
    .eq('prestador_id', prestadorId)
    .order('criado_em')
  if (error) throw error
  return data ?? []
}

export async function addPrestadorCategoria(
  categoria: Omit<PrestadorCategoria, 'id' | 'criado_em'>
): Promise<PrestadorCategoria> {
  const { data, error } = await supabase.from('prestador_categorias').insert(categoria).select().single()
  if (error) throw error
  return data
}

export async function updatePrestadorCategoria(
  id: string,
  patch: Partial<Omit<PrestadorCategoria, 'id' | 'prestador_id' | 'criado_em'>>
): Promise<void> {
  const { error } = await supabase.from('prestador_categorias').update(patch).eq('id', id)
  if (error) throw error
}

export async function removePrestadorCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('prestador_categorias').delete().eq('id', id)
  if (error) throw error
}

export async function uploadDocumentoPrestador(prestadorId: string, file: File): Promise<DocumentoVerificacao> {
  const path = `${prestadorId}/${crypto.randomUUID()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('documentos-prestadores').upload(path, file)
  if (uploadError) throw uploadError
  return { path, nome_arquivo: file.name }
}

export async function getUrlDocumentoPrestador(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documentos-prestadores')
    .createSignedUrl(path, 60 * 10)
  if (error) throw error
  return data.signedUrl
}

// ---------- Catálogos (marcas, regiões, tipos de serviço) ----------

export async function listEstados(): Promise<Estado[]> {
  const { data, error } = await supabase.from('estados').select('*').order('nome')
  if (error) throw error
  return data ?? []
}

export async function listCidadesPorEstado(estadoId: number): Promise<Cidade[]> {
  const { data, error } = await supabase.from('cidades').select('*').eq('estado_id', estadoId).order('nome')
  if (error) throw error
  return data ?? []
}

export async function getCidade(cidadeId: number): Promise<Cidade | null> {
  const { data, error } = await supabase.from('cidades').select('*').eq('id', cidadeId).maybeSingle()
  if (error) throw error
  return data
}

export async function listMarcas(): Promise<Marca[]> {
  const { data, error } = await supabase.from('marcas').select('*').order('nome')
  if (error) throw error
  return data ?? []
}

export async function listTiposServico(categoriaServicoId?: string): Promise<TipoServico[]> {
  let query = supabase.from('tipos_servico').select('*').order('ordem')
  if (categoriaServicoId) query = query.eq('categoria_servico_id', categoriaServicoId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listMinhasMarcas(prestadorId: string): Promise<(Marca & { prestador_marca_id: string })[]> {
  const { data, error } = await supabase.from('prestador_marcas').select('id, marcas(*)').eq('prestador_id', prestadorId)
  if (error) throw error
  return (data ?? []).map((row) => {
    const m = row.marcas as unknown as Marca
    return { ...m, prestador_marca_id: row.id as string }
  })
}

export async function addMinhaMarca(prestadorId: string, marcaId: string): Promise<void> {
  const { error } = await supabase.from('prestador_marcas').insert({ prestador_id: prestadorId, marca_id: marcaId })
  if (error) throw error
}

export async function removeMinhaMarca(id: string): Promise<void> {
  const { error } = await supabase.from('prestador_marcas').delete().eq('id', id)
  if (error) throw error
}

export async function listMinhasRegioes(prestadorId: string): Promise<(Cidade & { prestador_regiao_id: string; sigla_estado: string })[]> {
  const { data, error } = await supabase
    .from('prestador_regioes')
    .select('id, cidades(*, estados(sigla))')
    .eq('prestador_id', prestadorId)
  if (error) throw error
  return (data ?? []).map((row) => {
    const c = row.cidades as unknown as Cidade & { estados: { sigla: string } | null }
    const { estados, ...cidade } = c
    return { ...cidade, prestador_regiao_id: row.id as string, sigla_estado: estados?.sigla ?? '' }
  })
}

export async function addMinhaRegiao(prestadorId: string, cidadeId: number): Promise<void> {
  const { error } = await supabase.from('prestador_regioes').insert({ prestador_id: prestadorId, cidade_id: cidadeId })
  if (error) throw error
}

export async function removeMinhaRegiao(id: string): Promise<void> {
  const { error } = await supabase.from('prestador_regioes').delete().eq('id', id)
  if (error) throw error
}

export async function listMinhasAssinaturasPush(prestadorId: string): Promise<PushSubscription[]> {
  const { data, error } = await supabase.from('push_subscriptions').select('*').eq('prestador_id', prestadorId)
  if (error) throw error
  return data ?? []
}

export async function salvarTokenPush(prestadorId: string, fcmToken: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ prestador_id: prestadorId, fcm_token: fcmToken }, { onConflict: 'prestador_id,fcm_token' })
  if (error) throw error
}

export async function removerTokenPush(id: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('id', id)
  if (error) throw error
}

// ---------- Embarcações (Fase 2 — módulo de garantia) ----------

export async function listMinhasEmbarcacoes(): Promise<Embarcacao[]> {
  const { data, error } = await supabase.from('embarcacoes').select('*').order('nome')
  if (error) throw error
  return data ?? []
}

export async function getEmbarcacao(id: string): Promise<Embarcacao | null> {
  const { data, error } = await supabase.from('embarcacoes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createEmbarcacao(
  embarcacao: Omit<Embarcacao, 'id' | 'estado_geral' | 'atributos' | 'documentos' | 'fotos' | 'criado_em'>
): Promise<Embarcacao> {
  const { data, error } = await supabase
    .from('embarcacoes')
    .insert({ ...embarcacao, estado_geral: {}, atributos: {}, documentos: [], fotos: [] })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmbarcacao(
  id: string,
  patch: Partial<Omit<Embarcacao, 'id' | 'estaleiro_id' | 'proprietario_id' | 'criado_em'>>
): Promise<void> {
  const { error } = await supabase.from('embarcacoes').update(patch).eq('id', id)
  if (error) throw error
}

export async function uploadMidiaEmbarcacao(
  embarcacaoId: string,
  file: File,
  tipo: 'documentos' | 'fotos'
): Promise<DocumentoVerificacao> {
  const path = `${embarcacaoId}/${tipo}/${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('midia-embarcacoes').upload(path, file)
  if (error) throw error
  return { path, nome_arquivo: file.name }
}

export async function getUrlMidiaEmbarcacao(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('midia-embarcacoes').createSignedUrl(path, 60 * 10)
  if (error) throw error
  return data.signedUrl
}

// ---------- Tripulação (marinheiro vinculado a embarcações) ----------

export async function listTripulacao(
  embarcacaoId: string
): Promise<(EmbarcacaoTripulante & { marinheiro_nome: string })[]> {
  const { data, error } = await supabase
    .from('embarcacao_tripulantes')
    .select('*, prestadores(nome)')
    .eq('embarcacao_id', embarcacaoId)
    .order('criado_em')
  if (error) throw error
  return (data ?? []).map((row) => {
    const { prestadores, ...t } = row as unknown as EmbarcacaoTripulante & { prestadores: { nome: string } | null }
    return { ...t, marinheiro_nome: prestadores?.nome ?? '—' }
  })
}

export async function addTripulante(
  embarcacaoId: string,
  marinheiroId: string,
  funcao: string | null,
  permissoes: { pode_solicitar: boolean; pode_aprovar: boolean; pode_pagar: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('embarcacao_tripulantes')
    .insert({ embarcacao_id: embarcacaoId, marinheiro_id: marinheiroId, funcao, ...permissoes })
  if (error) throw error
}

export async function updateTripulante(
  id: string,
  patch: Partial<Pick<EmbarcacaoTripulante, 'funcao' | 'pode_solicitar' | 'pode_aprovar' | 'pode_pagar'>>
): Promise<void> {
  const { error } = await supabase.from('embarcacao_tripulantes').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeTripulante(id: string): Promise<void> {
  const { error } = await supabase.from('embarcacao_tripulantes').delete().eq('id', id)
  if (error) throw error
}

export async function listPrestadoresPorCategoria(categoriaServicoId: string): Promise<Prestador[]> {
  const { data, error } = await supabase
    .from('prestador_categorias')
    .select('prestadores(*)')
    .eq('categoria_servico_id', categoriaServicoId)
  if (error) throw error
  return (data ?? []).map((row) => row.prestadores as unknown as Prestador).filter(Boolean)
}

export async function deleteEmbarcacao(id: string): Promise<void> {
  const { error } = await supabase.from('embarcacoes').delete().eq('id', id)
  if (error) throw error
}

export async function listEquipamentos(embarcacaoId: string): Promise<EquipamentoEmbarcado[]> {
  const { data, error } = await supabase
    .from('equipamentos_embarcados')
    .select('*')
    .eq('embarcacao_id', embarcacaoId)
    .order('criado_em')
  if (error) throw error
  return data ?? []
}

function calcularGarantiaVenceEm(dataVenda: string | null, prazoMeses: number | null): string | null {
  if (!dataVenda || !prazoMeses) return null
  const data = new Date(`${dataVenda}T00:00:00`)
  data.setMonth(data.getMonth() + prazoMeses)
  return data.toISOString().slice(0, 10)
}

export async function createEquipamento(
  equipamento: Omit<EquipamentoEmbarcado, 'id' | 'garantia_vence_em' | 'criado_em'>
): Promise<EquipamentoEmbarcado> {
  const { data, error } = await supabase
    .from('equipamentos_embarcados')
    .insert({
      ...equipamento,
      garantia_vence_em: calcularGarantiaVenceEm(equipamento.data_venda, equipamento.prazo_garantia_meses),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEquipamento(
  id: string,
  patch: Partial<Omit<EquipamentoEmbarcado, 'id' | 'embarcacao_id' | 'garantia_vence_em' | 'criado_em'>>
): Promise<void> {
  const payload = {
    ...patch,
    ...('data_venda' in patch || 'prazo_garantia_meses' in patch
      ? { garantia_vence_em: calcularGarantiaVenceEm(patch.data_venda ?? null, patch.prazo_garantia_meses ?? null) }
      : {}),
  }
  const { error } = await supabase.from('equipamentos_embarcados').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteEquipamento(id: string): Promise<void> {
  const { error } = await supabase.from('equipamentos_embarcados').delete().eq('id', id)
  if (error) throw error
}

export async function listTags(embarcacaoId: string): Promise<EmbarcacaoTag[]> {
  const { data, error } = await supabase
    .from('embarcacoes_tags')
    .select('*')
    .eq('embarcacao_id', embarcacaoId)
    .order('criado_em')
  if (error) throw error
  return data ?? []
}

export async function createTag(
  tag: Omit<EmbarcacaoTag, 'id' | 'ativo' | 'contagem_leituras' | 'criado_em'>
): Promise<EmbarcacaoTag> {
  const { data, error } = await supabase
    .from('embarcacoes_tags')
    .insert({ ...tag, ativo: true, contagem_leituras: 0 })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listMeusChamados(): Promise<(Chamado & { embarcacao_nome: string })[]> {
  const { data, error } = await supabase
    .from('chamados')
    .select('*, embarcacoes(nome)')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const { embarcacoes, ...chamado } = row as unknown as Chamado & { embarcacoes: { nome: string } | null }
    return { ...chamado, embarcacao_nome: embarcacoes?.nome ?? '—' }
  })
}

export async function listChamadosDaEmbarcacao(embarcacaoId: string): Promise<Chamado[]> {
  const { data, error } = await supabase
    .from('chamados')
    .select('*')
    .eq('embarcacao_id', embarcacaoId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function criarChamado(
  embarcacaoId: string,
  descricao: string,
  equipamentoId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('chamados')
    .insert({ embarcacao_id: embarcacaoId, equipamento_id: equipamentoId, tipo: 'comercial', descricao })
  if (error) throw error
}

export async function atualizarStatusChamado(
  id: string,
  status: Chamado['status'],
  atendidoPor?: string
): Promise<void> {
  const patch: Partial<Chamado> = { status }
  if (atendidoPor) patch.atendido_por = atendidoPor
  if (status === 'concluido') patch.concluido_em = new Date().toISOString()
  const { error } = await supabase.from('chamados').update(patch).eq('id', id)
  if (error) throw error
}

// ---------- Painel admin ----------

export async function souAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('sou_admin')
  if (error) throw error
  return Boolean(data)
}

export async function listPrestadoresAdmin(filtroStatus?: StatusVerificacao): Promise<Prestador[]> {
  let query = supabase.from('prestadores').select('*').order('criado_em', { ascending: false })
  if (filtroStatus) query = query.eq('status_verificacao', filtroStatus)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listTodosChamadosAdmin(): Promise<(Chamado & { embarcacao_nome: string })[]> {
  const { data, error } = await supabase
    .from('chamados')
    .select('*, embarcacoes(nome)')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const { embarcacoes, ...chamado } = row as unknown as Chamado & { embarcacoes: { nome: string } | null }
    return { ...chamado, embarcacao_nome: embarcacoes?.nome ?? '—' }
  })
}

export async function getDashboardKpis(): Promise<AdminDashboardKpis> {
  const { data, error } = await supabase.rpc('admin_dashboard_kpis')
  if (error) throw error
  return data as AdminDashboardKpis
}

export async function listNegociosPorPrestador(limite = 20): Promise<AdminNegocioPrestador[]> {
  const { data, error } = await supabase.rpc('admin_negocios_por_prestador', { p_limite: limite })
  if (error) throw error
  return data ?? []
}

export async function listNegociosPorEmbarcacao(limite = 20): Promise<AdminNegocioEmbarcacao[]> {
  const { data, error } = await supabase.rpc('admin_negocios_por_embarcacao', { p_limite: limite })
  if (error) throw error
  return data ?? []
}

export async function getSerieTemporal(meses = 12): Promise<AdminSerieTemporalPonto[]> {
  const { data, error } = await supabase.rpc('admin_serie_temporal', { p_meses: meses })
  if (error) throw error
  return data ?? []
}

export async function getNotificacoesStats(): Promise<AdminNotificacaoStat[]> {
  const { data, error } = await supabase.rpc('admin_notificacoes_stats')
  if (error) throw error
  return data ?? []
}

export async function uploadEvidenciaChamado(chamadoId: string, file: File): Promise<DocumentoVerificacao> {
  const path = `${chamadoId}/${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('evidencias-chamados').upload(path, file)
  if (error) throw error
  return { path, nome_arquivo: file.name }
}

export async function getUrlEvidencia(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('evidencias-chamados').createSignedUrl(path, 60 * 10)
  if (error) throw error
  return data.signedUrl
}

export async function listRejeicoesDoChamado(chamadoId: string): Promise<ChamadoRejeicao[]> {
  const { data, error } = await supabase
    .from('chamado_rejeicoes')
    .select('*')
    .eq('chamado_id', chamadoId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function rejeitarServico(
  chamadoId: string,
  motivo: string,
  evidencias: DocumentoVerificacao[]
): Promise<void> {
  const { error: erroRejeicao } = await supabase
    .from('chamado_rejeicoes')
    .insert({ chamado_id: chamadoId, motivo, evidencias })
  if (erroRejeicao) throw erroRejeicao
  const { error: erroStatus } = await supabase.from('chamados').update({ status: 'em_disputa' }).eq('id', chamadoId)
  if (erroStatus) throw erroStatus
}

export async function resolverDisputa(chamadoId: string, status: 'em_andamento' | 'concluido'): Promise<void> {
  const patch: Partial<Chamado> = { status }
  if (status === 'concluido') patch.concluido_em = new Date().toISOString()
  const { error } = await supabase.from('chamados').update(patch).eq('id', chamadoId)
  if (error) throw error
}

// ---------- Perguntas sobre o chamado ----------

export async function listPerguntasDoChamado(chamadoId: string): Promise<(ChamadoPergunta & { prestador_nome: string })[]> {
  const { data, error } = await supabase
    .from('chamado_perguntas')
    .select('*, prestadores(nome)')
    .eq('chamado_id', chamadoId)
    .order('criado_em')
  if (error) throw error
  return (data ?? []).map((row) => {
    const { prestadores, ...p } = row as unknown as ChamadoPergunta & { prestadores: { nome: string } | null }
    return { ...p, prestador_nome: prestadores?.nome ?? '—' }
  })
}

export async function perguntarSobreChamado(chamadoId: string, prestadorId: string, pergunta: string): Promise<void> {
  const { error } = await supabase.from('chamado_perguntas').insert({ chamado_id: chamadoId, prestador_id: prestadorId, pergunta })
  if (error) throw error
}

export async function responderPergunta(id: string, resposta: string, respondidoPor: string): Promise<void> {
  const { error } = await supabase
    .from('chamado_perguntas')
    .update({ resposta, respondido_por: respondidoPor, respondido_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ---------- Visita a bordo ----------

export async function listVisitasDoChamado(chamadoId: string): Promise<(ChamadoVisita & { prestador_nome: string })[]> {
  const { data, error } = await supabase
    .from('chamado_visitas')
    .select('*, prestadores(nome)')
    .eq('chamado_id', chamadoId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const { prestadores, ...v } = row as unknown as ChamadoVisita & { prestadores: { nome: string } | null }
    return { ...v, prestador_nome: prestadores?.nome ?? '—' }
  })
}

export async function solicitarVisita(chamadoId: string, prestadorId: string, dataSugerida: string): Promise<void> {
  const { error } = await supabase
    .from('chamado_visitas')
    .insert({ chamado_id: chamadoId, prestador_id: prestadorId, data_sugerida: dataSugerida })
  if (error) throw error
}

export async function atualizarStatusVisita(id: string, status: StatusVisita, motivoRecusa?: string): Promise<void> {
  const patch: Partial<ChamadoVisita> = { status }
  if (motivoRecusa) patch.motivo_recusa = motivoRecusa
  const { error } = await supabase.from('chamado_visitas').update(patch).eq('id', id)
  if (error) throw error
}

export async function listNotificacoesDoChamado(
  chamadoId: string
): Promise<(ChamadoNotificacao & { prestador_nome: string })[]> {
  const { data, error } = await supabase
    .from('chamado_notificacoes')
    .select('*, prestadores(nome)')
    .eq('chamado_id', chamadoId)
  if (error) throw error
  return (data ?? []).map((row) => {
    const { prestadores, ...n } = row as unknown as ChamadoNotificacao & { prestadores: { nome: string } | null }
    return { ...n, prestador_nome: prestadores?.nome ?? '—' }
  })
}

// ---------- Cotações (proposta de valor de um prestador pra um chamado) ----------

export async function listCotacoesDoChamado(chamadoId: string): Promise<(Cotacao & { prestador_nome: string })[]> {
  const { data, error } = await supabase
    .from('cotacoes')
    .select('*, prestadores(nome)')
    .eq('chamado_id', chamadoId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const { prestadores, ...c } = row as unknown as Cotacao & { prestadores: { nome: string } | null }
    return { ...c, prestador_nome: prestadores?.nome ?? '—' }
  })
}

export async function listMinhasCotacoes(): Promise<Cotacao[]> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []
  const { data, error } = await supabase
    .from('cotacoes')
    .select('*')
    .eq('prestador_id', userData.user.id)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createCotacao(
  chamadoId: string,
  prestadorId: string,
  valor: number,
  descricao: string | null,
  formaPagamento: FormaPagamento | null,
  condicaoPagamento: string | null
): Promise<void> {
  const { error } = await supabase.from('cotacoes').insert({
    chamado_id: chamadoId,
    prestador_id: prestadorId,
    valor,
    descricao,
    forma_pagamento: formaPagamento,
    condicao_pagamento: condicaoPagamento,
  })
  if (error) throw error
}

export async function atualizarStatusCotacao(id: string, status: StatusCotacao, atorId: string): Promise<void> {
  const patch: Partial<Cotacao> = { status }
  if (status === 'aprovada') {
    patch.aprovado_em = new Date().toISOString()
    patch.aprovado_por = atorId
  }
  if (status === 'paga') {
    patch.pago_em = new Date().toISOString()
    patch.pago_por = atorId
  }
  const { error } = await supabase.from('cotacoes').update(patch).eq('id', id)
  if (error) throw error
}

// ---------- Página pública por tag ----------

export async function buscarEmbarcacaoPorTag(tagId: string): Promise<EmbarcacaoPublicaData | null> {
  const { data, error } = await supabase.rpc('buscar_embarcacao_por_tag', { p_tag_id: tagId })
  if (error) throw error
  return data as EmbarcacaoPublicaData | null
}

export async function abrirChamadoPorTag(
  tagId: string,
  descricao: string,
  equipamentoId: string | null
): Promise<string> {
  const { data, error } = await supabase.rpc('abrir_chamado_por_tag', {
    p_tag_id: tagId,
    p_descricao: descricao,
    p_equipamento_id: equipamentoId,
  })
  if (error) throw error
  return data as string
}
