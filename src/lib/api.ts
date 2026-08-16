import { supabase } from './supabase'
import type { CategoriaServico, DocumentoVerificacao, Prestador, PrestadorCategoria, TipoPessoa } from '@/types'

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
