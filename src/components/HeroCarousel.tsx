import { useEffect, useState } from 'react'

export interface HeroSlide {
  src: string
  alt: string
}

/**
 * Carrossel de imagens em tela cheia usado no topo do site. Pensado pra, no futuro,
 * virar o slot de banners animados de patrocinadores — basta trocar a fonte dos slides
 * (hoje fotos de embarcações do estoque, depois pode virar peças pagas por anunciante).
 */
export function HeroCarousel({ slides, intervalMs = 6000 }: { slides: HeroSlide[]; intervalMs?: number }) {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setIndice((i) => (i + 1) % slides.length), intervalMs)
    return () => clearInterval(t)
  }, [slides.length, intervalMs])

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-900">
      {slides.map((slide, i) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            i === indice ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-slate-950/60" />

      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              onClick={() => setIndice(i)}
              aria-label={`Ir para o slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === indice ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
