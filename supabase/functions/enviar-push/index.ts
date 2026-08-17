import { createClient } from 'jsr:@supabase/supabase-js@2'
import { JWT } from 'npm:google-auth-library@9'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
const SITE_URL = 'https://spinsc.github.io/easy-nautic'

interface NotificacaoRow {
  id: string
  motivo: string | null
  prestador_id: string
  chamados: { descricao: string; embarcacoes: { nome: string } | null } | null
}

function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err)
        return
      }
      resolve(tokens!.access_token!)
    })
  })
}

Deno.serve(async (_req: Request) => {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    return new Response(JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT não configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: pendentes, error } = await supabase
    .from('chamado_notificacoes')
    .select('id, motivo, prestador_id, chamados(descricao, embarcacoes(nome))')
    .eq('canal', 'push')
    .eq('status', 'pendente')
    .limit(50)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let accessToken: string
  try {
    accessToken = await getAccessToken(serviceAccount.client_email, serviceAccount.private_key)
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Falha ao autenticar com o Firebase', detail: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let enviados = 0
  let falharam = 0

  for (const row of (pendentes ?? []) as unknown as NotificacaoRow[]) {
    const chamado = row.chamados
    if (!chamado) {
      await supabase.from('chamado_notificacoes').update({ status: 'falhou' }).eq('id', row.id)
      falharam++
      continue
    }

    const { data: assinaturas } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('prestador_id', row.prestador_id)

    if (!assinaturas || assinaturas.length === 0) {
      await supabase.from('chamado_notificacoes').update({ status: 'falhou' }).eq('id', row.id)
      falharam++
      continue
    }

    const embarcacaoNome = chamado.embarcacoes?.nome ?? 'uma embarcação'
    let algumEnviado = false

    for (const assinatura of assinaturas) {
      try {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: assinatura.fcm_token,
              notification: {
                title: 'Nova solicitação de serviço perto de você',
                body: `${embarcacaoNome}: ${chamado.descricao}`,
              },
              webpush: {
                fcm_options: { link: `${SITE_URL}/chamados` },
              },
            },
          }),
        })
        if (res.ok) {
          algumEnviado = true
        } else {
          console.error('FCM falhou', res.status, await res.text())
        }
      } catch (e) {
        console.error('Erro ao enviar push', e)
      }
    }

    if (algumEnviado) {
      await supabase
        .from('chamado_notificacoes')
        .update({ status: 'enviado', enviado_em: new Date().toISOString() })
        .eq('id', row.id)
      enviados++
    } else {
      await supabase.from('chamado_notificacoes').update({ status: 'falhou' }).eq('id', row.id)
      falharam++
    }
  }

  return new Response(JSON.stringify({ enviados, falharam }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
