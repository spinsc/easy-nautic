import { Link } from 'react-router-dom'
import { HeroCarousel } from '@/components/HeroCarousel'
import { heroSlides } from '@/lib/heroSlides'

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <HeroCarousel slides={heroSlides} />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <p className="text-[11px] uppercase tracking-[0.3em] text-tide-200">Marketplace náutico</p>
        <h1 className="font-display text-4xl text-white sm:text-5xl">Easy Nautic</h1>
        <p className="max-w-md text-sm text-slate-200 sm:text-base">
          Conectamos donos de embarcação a prestadores, marinheiros, estaleiros, lojistas e marinas — tudo em um só
          lugar.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            to="/cadastro"
            className="rounded-md bg-tide-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-tide-900/30 hover:bg-tide-500"
          >
            Quero me cadastrar
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-white/40 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/10"
          >
            Entrar
          </Link>
        </div>
      </div>
    </div>
  )
}
