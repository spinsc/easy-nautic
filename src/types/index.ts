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

export type CategoriaEquipamento = 'MOTOR' | 'GERADOR' | 'AR_CONDICIONADO' | 'ACESSORIO'
export type StatusChamado = 'aberto' | 'em_andamento' | 'concluido'
export type TipoChamado = 'comercial' | 'garantia'

export interface Embarcacao {
  id: string
  estaleiro_id: string
  cliente_nome: string
  cliente_telefone: string | null
  cliente_email: string | null
  nome: string
  fabricante: string | null
  modelo: string | null
  numero_registro: string | null
  comprimento: number | null
  ano: number | null
  data_venda: string | null
  prazo_garantia_casco_meses: number | null
  estado_geral: Record<string, string>
  atributos: Record<string, string | number | boolean | null>
  criado_em: string
}

export interface EquipamentoEmbarcado {
  id: string
  embarcacao_id: string
  categoria: CategoriaEquipamento
  nome: string
  marca: string | null
  modelo: string | null
  numero_serie: string | null
  instalado_em: string | null
  data_venda: string | null
  prazo_garantia_meses: number | null
  garantia_vence_em: string | null
  criado_em: string
}

export interface EmbarcacaoTag {
  id: string
  embarcacao_id: string
  tag_id: string
  modelo_nfc: string
  modo_gravacao: string
  ativo: boolean
  contagem_leituras: number
  criado_em: string
}

export interface Chamado {
  id: string
  embarcacao_id: string
  equipamento_id: string | null
  tipo: TipoChamado
  descricao: string
  status: StatusChamado
  atendido_por: string | null
  criado_em: string
  concluido_em: string | null
}

export interface EmbarcacaoPublicaData {
  embarcacao: {
    id: string
    nome: string
    fabricante: string | null
    modelo: string | null
    ano: number | null
    comprimento: number | null
  }
  equipamentos: {
    id: string
    categoria: CategoriaEquipamento
    nome: string
    marca: string | null
    modelo: string | null
    garantia_vence_em: string | null
  }[]
  chamados: {
    id: string
    tipo: TipoChamado
    descricao: string
    status: StatusChamado
    criado_em: string
  }[]
}
