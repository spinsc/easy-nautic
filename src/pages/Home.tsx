import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Fase 1 — Cadastro de prestadores</p>
      <h1 className="font-display text-3xl text-slate-900">Easy Nautic</h1>
      <p className="max-w-md text-sm text-slate-500">Marketplace de serviços náuticos.</p>
      <div className="mt-4 flex gap-3">
        <Link
          to="/cadastro"
          className="rounded-md bg-tide-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-tide-800"
        >
          Sou prestador, quero me cadastrar
        </Link>
        <Link
          to="/login"
          className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-tide-500"
        >
          Entrar
        </Link>
      </div>
    </div>
  )
}
