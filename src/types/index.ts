export type TipoPessoa = 'PF' | 'PJ'
export type StatusVerificacao = 'pendente' | 'verificado' | 'rejeitado'

export interface CategoriaServico {
  id: string
  nome: string
  descricao: string | null
  ordem: number
}

export interface DocumentoVerificacao {
  path: string
  nome_arquivo: string
}

export interface Prestador {
  id: string
  tipo_pessoa: TipoPessoa
  nome: string
  cpf_cnpj: string | null
  telefone: string | null
  email: string | null
  status_verificacao: StatusVerificacao
  documentos_verificacao: DocumentoVerificacao[]
  avaliacao_media: number | null
  total_avaliacoes: number
  criado_em: string
}

export interface PrestadorCategoria {
  id: string
  prestador_id: string
  categoria_servico_id: string
  especialidade: string | null
  regiao_atuacao: string | null
  marcas_atendidas: string[]
  criado_em: string
}
