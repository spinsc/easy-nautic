import { supabase } from './supabase'
import type {
  CategoriaServico,
  Chamado,
  DocumentoVerificacao,
  Embarcacao,
  EmbarcacaoPublicaData,
  EmbarcacaoTag,
  EquipamentoEmbarcado,
  Prestador,
  PrestadorCategoria,
  StatusVerificacao,
  TipoPessoa,
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
  embarcacao: Omit<Embarcacao, 'id' | 'estado_geral' | 'atributos' | 'criado_em'>
): Promise<Embarcacao> {
  const { data, error } = await supabase
    .from('embarcacoes')
    .insert({ ...embarcacao, estado_geral: {}, atributos: {} })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmbarcacao(
  id: string,
  patch: Partial<Omit<Embarcacao, 'id' | 'estaleiro_id' | 'criado_em'>>
): Promise<void> {
  const { error } = await supabase.from('embarcacoes').update(patch).eq('id', id)
  if (error) throw error
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
