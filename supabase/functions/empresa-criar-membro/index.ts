import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CorpoRequisicao {
  email: string
  senha: string
  nome: string
  telefone?: string
  papel?: string
}

function resposta(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return resposta({ error: 'Não autenticado' }, 401)
  }

  const clienteChamador = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await clienteChamador.auth.getUser()
  if (userError || !userData.user) {
    return resposta({ error: 'Não autenticado' }, 401)
  }

  const { data: empresa, error: empresaError } = await clienteChamador
    .from('prestadores')
    .select('id, tipo_pessoa')
    .eq('id', userData.user.id)
    .single()

  if (empresaError || !empresa || empresa.tipo_pessoa !== 'PJ') {
    return resposta({ error: 'Só pessoas jurídicas podem cadastrar funcionários autorizados' }, 403)
  }

  let corpo: CorpoRequisicao
  try {
    corpo = await req.json()
  } catch {
    return resposta({ error: 'Corpo da requisição inválido' }, 400)
  }

  if (!corpo.email || !corpo.senha || !corpo.nome) {
    return resposta({ error: 'email, senha e nome são obrigatórios' }, 400)
  }
  if (corpo.senha.length < 6) {
    return resposta({ error: 'Senha precisa ter pelo menos 6 caracteres' }, 400)
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: novoUsuario, error: erroCriacao } = await admin.auth.admin.createUser({
    email: corpo.email,
    password: corpo.senha,
    email_confirm: true,
    user_metadata: {
      tipo_pessoa: 'PF',
      nome: corpo.nome,
      telefone: corpo.telefone ?? null,
    },
  })

  if (erroCriacao || !novoUsuario.user) {
    return resposta({ error: erroCriacao?.message ?? 'Falha ao criar usuário' }, 400)
  }

  const { error: erroVinculo } = await admin.from('prestador_membros').insert({
    empresa_id: empresa.id,
    membro_id: novoUsuario.user.id,
    papel: corpo.papel || null,
  })

  if (erroVinculo) {
    return resposta({ error: erroVinculo.message }, 400)
  }

  return resposta({ id: novoUsuario.user.id }, 200)
})
