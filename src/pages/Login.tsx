import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CampoTexto } from '@/components/campos'
import { HeroCarousel } from '@/components/HeroCarousel'
import { heroSlides } from '@/lib/heroSlides'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('E-mail ou senha incorretos.')
      setEntrando(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 md:block">
        <HeroCarousel slides={heroSlides} />
        <div className="absolute bottom-10 left-10 right-10 z-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-tide-200">Easy Nautic</p>
          <p className="mt-2 max-w-sm font-display text-2xl text-white">
            O marketplace que conecta o mar aos profissionais certos.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-slate-50 px-6 md:w-1/2">
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600 md:hidden">Easy Nautic</p>
          <h1 className="mb-6 font-display text-2xl text-slate-900">Entrar</h1>

          {erro && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <CampoTexto label="E-mail" type="email" value={email} onChange={setEmail} required />
            <CampoTexto label="Senha" type="password" value={senha} onChange={setSenha} required />
            <button
              type="submit"
              disabled={entrando}
              className="w-full rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
            >
              {entrando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Ainda não é prestador?{' '}
            <Link to="/cadastro" className="font-medium text-tide-600 hover:text-tide-700">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
