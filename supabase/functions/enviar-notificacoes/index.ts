import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = 'https://spinsc.github.io/easy-nautic'

interface NotificacaoRow {
  id: string
  motivo: string | null
  prestadores: { email: string | null; nome: string } | null
  chamados: { descricao: string; embarcacoes: { nome: string } | null } | null
}

Deno.serve(async (_req: Request) => {
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: pendentes, error } = await supabase
    .from('chamado_notificacoes')
    .select('id, motivo, prestadores(email, nome), chamados(descricao, embarcacoes(nome))')
    .eq('canal', 'email')
    .eq('status', 'pendente')
    .limit(50)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let enviados = 0
  let falharam = 0

  for (const row of (pendentes ?? []) as unknown as NotificacaoRow[]) {
    const prestador = row.prestadores
    const chamado = row.chamados
    if (!prestador?.email || !chamado) {
      await supabase.from('chamado_notificacoes').update({ status: 'falhou' }).eq('id', row.id)
      falharam++
      continue
    }

    const embarcacaoNome = chamado.embarcacoes?.nome ?? 'uma embarcação'
    const html = `<p>Olá, ${prestador.nome}!</p>
<p>${embarcacaoNome} precisa de um serviço que combina com o seu perfil:</p>
<p><strong>${chamado.descricao}</strong></p>
${row.motivo ? `<p style="color:#666">${row.motivo}</p>` : ''}
<p><a href="${SITE_URL}/chamados">Acesse o Easy Nautic</a> pra ver os detalhes e enviar uma cotação.</p>`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Easy Nautic <onboarding@resend.dev>',
          to: prestador.email,
          subject: 'Nova solicitação de serviço perto de você',
          html,
        }),
      })

      if (res.ok) {
        await supabase
          .from('chamado_notificacoes')
          .update({ status: 'enviado', enviado_em: new Date().toISOString() })
          .eq('id', row.id)
        enviados++
      } else {
        await supabase.from('chamado_notificacoes').update({ status: 'falhou' }).eq('id', row.id)
        falharam++
      }
    } catch {
      await supabase.from('chamado_notificacoes').update({ status: 'falhou' }).eq('id', row.id)
      falharam++
    }
  }

  return new Response(JSON.stringify({ enviados, falharam }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
