export type TipoPessoa = 'PF' | 'PJ'
export type StatusVerificacao = 'pendente' | 'verificado' | 'rejeitado'

export interface CategoriaServico {
  id: string
  nome: string
  descricao: string | null
  ordem: number
}

export interface Estado {
  id: number
  sigla: string
  nome: string
}

export interface Cidade {
  id: number
  nome: string
  estado_id: number
}

export interface Marca {
  id: string
  nome: string
  criado_em: string
}

export interface TipoServico {
  id: string
  categoria_servico_id: string | null
  nome: string
  ordem: number
}

export interface PrestadorMarca {
  id: string
  prestador_id: string
  marca_id: string
  criado_em: string
}

export interface PrestadorRegiao {
  id: string
  prestador_id: string
  cidade_id: number
  criado_em: string
}

export interface DocumentoVerificacao {
  path: string
  nome_arquivo: string
}

export interface FormaPagamento {
  tipo: string
  dados: string
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
  formas_pagamento: FormaPagamento[]
  condicao_pagamento_padrao: string | null
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
  dias_disponiveis: string[]
  periodo_disponivel: string | null
  valor_diaria: number | null
  habilidade_culinaria: string | null
  barman: boolean
  categoria_habilitacao: string | null
  criado_em: string
}

export type CategoriaEquipamento = 'MOTOR' | 'GERADOR' | 'AR_CONDICIONADO' | 'ACESSORIO'
export type StatusChamado = 'aberto' | 'em_andamento' | 'aguardando_confirmacao' | 'concluido' | 'em_disputa'
export type TipoChamado = 'comercial' | 'garantia'

export interface Embarcacao {
  id: string
  estaleiro_id: string | null
  proprietario_id: string | null
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
  motorizacao: string | null
  capacidade_pessoas: number | null
  calado: number | null
  boca: number | null
  tipo_casco: string | null
  combustivel: string | null
  marina: string | null
  vaga: string | null
  cidade: string | null
  cidade_id: number | null
  numero_tie: string | null
  seguradora: string | null
  apolice_seguro: string | null
  vistoria_validade: string | null
  documentos: DocumentoVerificacao[]
  fotos: DocumentoVerificacao[]
  estado_geral: Record<string, string>
  atributos: Record<string, string | number | boolean | null>
  criado_em: string
}

export interface EmbarcacaoTripulante {
  id: string
  embarcacao_id: string
  marinheiro_id: string
  funcao: string | null
  pode_solicitar: boolean
  pode_aprovar: boolean
  pode_pagar: boolean
  criado_em: string
}

export interface EquipamentoEmbarcado {
  id: string
  embarcacao_id: string
  categoria: CategoriaEquipamento
  nome: string
  marca: string | null
  marca_id: string | null
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
  terminei_em: string | null
  criado_em: string
  concluido_em: string | null
}

export type StatusNotificacao = 'pendente' | 'enviado' | 'falhou'

export interface ChamadoNotificacao {
  id: string
  chamado_id: string
  prestador_id: string
  motivo: string | null
  canal: 'email' | 'push'
  status: StatusNotificacao
  criado_em: string
  enviado_em: string | null
}

export interface ChamadoRejeicao {
  id: string
  chamado_id: string
  motivo: string
  evidencias: DocumentoVerificacao[]
  criado_por: string | null
  criado_em: string
}

export type StatusCotacao = 'pendente' | 'aprovada' | 'rejeitada' | 'paga'

export interface Cotacao {
  id: string
  chamado_id: string
  prestador_id: string
  valor: number
  descricao: string | null
  forma_pagamento: FormaPagamento | null
  condicao_pagamento: string | null
  status: StatusCotacao
  criado_em: string
  aprovado_em: string | null
  aprovado_por: string | null
  pago_em: string | null
  pago_por: string | null
}

export interface ChamadoPergunta {
  id: string
  chamado_id: string
  prestador_id: string
  pergunta: string
  resposta: string | null
  respondido_por: string | null
  criado_em: string
  respondido_em: string | null
}

export type StatusVisita = 'solicitada' | 'autorizada' | 'recusada' | 'realizada'

export interface ChamadoVisita {
  id: string
  chamado_id: string
  prestador_id: string
  data_sugerida: string
  status: StatusVisita
  motivo_recusa: string | null
  criado_em: string
  respondido_em: string | null
  respondido_por: string | null
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
