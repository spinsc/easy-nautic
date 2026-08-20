import type { HeroSlide } from '@/components/HeroCarousel'

const BASE = import.meta.env.BASE_URL

export const heroSlides: HeroSlide[] = [
  { src: `${BASE}images/hero/yacht-aerial.jpg`, alt: 'Lancha ancorada na Baía de Guanabara, vista aérea' },
  { src: `${BASE}images/hero/pontoon-action.jpg`, alt: 'Pontoon em movimento na água' },
  { src: `${BASE}images/hero/yacht-topdown.jpg`, alt: 'Vista de cima de uma lancha ancorada' },
  { src: `${BASE}images/hero/helm-view.jpg`, alt: 'Timão de uma embarcação com o Pão de Açúcar ao fundo' },
]
