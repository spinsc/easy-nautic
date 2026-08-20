import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cadastrarPrestador } from '@/lib/api'
import { mensagemErro } from '@/lib/errors'
import { CampoTexto, CampoSelect } from '@/components/campos'
import { HeroCarousel } from '@/components/HeroCarousel'
import { heroSlides } from '@/lib/heroSlides'
import type { TipoPessoa } from '@/types'

export default function Cadastro() {
  const navigate = useNavigate()
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>('PF')
  const [nome, setNome] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [representanteLegal, setRepresentanteLegal] = useState('')
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [precisaConfirmarEmail, setPrecisaConfirmarEmail] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      await cadastrarPrestador({
        email,
        senha,
        tipo_pessoa: tipoPessoa,
        nome,
        cpf_cnpj: cpfCnpj,
        telefone,
        representante_legal: tipoPessoa === 'PJ' ? representanteLegal : undefined,
      })
      // O aceite fica registrado de fato no primeiro login (tela de termos obrigatória),
      // já que logo após o signUp ainda não existe sessão se a confirmação de e-mail está ligada.
      setPrecisaConfirmarEmail(true)
      setTimeout(() => navigate('/perfil'), 1200)
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao cadastrar'))
    } finally {
      setEnviando(false)
    }
  }

  if (precisaConfirmarEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 font-display text-xl text-slate-900">Cadastro enviado</h1>
          <p className="text-sm text-slate-500">
            Se o e-mail exigir confirmação, verifique sua caixa de entrada. Redirecionando…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 md:block">
        <HeroCarousel slides={heroSlides} />
        <div className="absolute bottom-10 left-10 right-10 z-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-tide-200">Easy Nautic</p>
          <p className="mt-2 max-w-sm font-display text-2xl text-white">
            Cadastre-se e receba solicitações de serviço da sua região.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-slate-50 px-6 py-10 md:w-1/2">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600 md:hidden">Easy Nautic</p>
          <h1 className="mb-6 font-display text-2xl text-slate-900">Cadastro de prestador</h1>

          {erro && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <CampoSelect
              label="Tipo de pessoa"
              value={tipoPessoa}
              onChange={(v) => setTipoPessoa(v as TipoPessoa)}
              options={[
                { value: 'PF', label: 'Pessoa física' },
                { value: 'PJ', label: 'Pessoa jurídica' },
              ]}
            />
            <CampoTexto label={tipoPessoa === 'PF' ? 'Nome completo' : 'Razão social'} value={nome} onChange={setNome} required />
            <CampoTexto
              label={tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
              value={cpfCnpj}
              onChange={setCpfCnpj}
              required
            />
            {tipoPessoa === 'PJ' && (
              <CampoTexto
                label="Nome do representante legal"
                value={representanteLegal}
                onChange={setRepresentanteLegal}
                required
              />
            )}
            <CampoTexto label="Telefone" type="tel" value={telefone} onChange={setTelefone} required />
            <CampoTexto label="E-mail" type="email" value={email} onChange={setEmail} required />
            <CampoTexto label="Senha" type="password" value={senha} onChange={setSenha} required />
            <CampoTexto label="Confirmar senha" type="password" value={confirmarSenha} onChange={setConfirmarSenha} required />
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={(e) => setAceitouTermos(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-tide-700 focus:ring-tide-500"
                required
              />
              Li e concordo com os termos de uso da plataforma.
            </label>
            <button
              type="submit"
              disabled={enviando || !aceitouTermos}
              className="w-full rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
            >
              {enviando ? 'Enviando…' : 'Cadastrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-tide-600 hover:text-tide-700">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
