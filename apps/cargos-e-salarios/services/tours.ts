// ============================================================================
// tours — definição dos guias de uso (o "guia rápido" do app)
// ============================================================================
//
// Cada tour é uma sequência de passos. Um passo pode:
//   - destacar um elemento da tela (spotlight) via `target`, um seletor CSS.
//     Convenção: marque o elemento com `data-tour="nome"` no JSX e use
//     `[data-tour="nome"]` aqui. NUNCA use classes utilitárias como seletor.
//   - navegar para outra tela antes de aparecer (`page`);
//   - aparecer centralizado quando não tem `target` (bom para o 1º passo).
//
// PARA ADICIONAR UM TOUR:
//   1. inclua o id no union `TourId` em lib/tourPrefs.ts;
//   2. escreva as strings em lib/i18nTour.ts (título, descrição, passos);
//   3. adicione a definição em `buildTours()` abaixo;
//   4. se o guia deve abrir sozinho na primeira visita de uma tela,
//      mapeie em `autoTourForPage`;
//   5. escolha um ícone em components/tour/TourList.tsx.
//
// As strings são resolvidas em `buildTours()` (não em constantes de módulo)
// para acompanharem o idioma atual.
// ============================================================================

import { tTour } from '../lib/i18nTour';
import type { TourId } from '../lib/tourPrefs';

/** Telas onde um passo de tour pode viver (espelha o router do App.tsx). */
export type TourPage = 'home' | 'settings';

export interface TourStep {
  key: string;
  /** Seletor CSS do elemento a destacar. Sem elemento → cartão centralizado. */
  target?: string;
  /** Tela que o passo precisa; o tour navega até lá antes de mostrar. */
  page?: TourPage;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  title: string;
  body: string;
}

export interface TourDef {
  id: TourId;
  title: string;
  description: string;
  /** Tela onde o tour faz sentido (usada pelo menu de replay). */
  page: TourPage | null;
  /** Tours que não se alcançam só por navegação (precisam de um item aberto). */
  contextual?: boolean;
  steps: TourStep[];
}

/** Construído sob demanda para as strings seguirem o idioma atual. */
export function buildTours(): TourDef[] {
  return [
    {
      id: 'welcome',
      title: tTour('tour.welcome.title'),
      description: tTour('tour.welcome.desc'),
      page: 'home',
      steps: [
        { key: 'intro', page: 'home', title: tTour('tour.welcome.s1.t'), body: tTour('tour.welcome.s1.b') },
        { key: 'nav', page: 'home', target: '[data-tour="nav-home"]', placement: 'right', title: tTour('tour.welcome.s2.t'), body: tTour('tour.welcome.s2.b') },
        { key: 'help', page: 'home', target: '[data-tour="tour-help"]', placement: 'right', title: tTour('tour.welcome.s3.t'), body: tTour('tour.welcome.s3.b') },
      ],
    },
    {
      id: 'settings',
      title: tTour('tour.settings.title'),
      description: tTour('tour.settings.desc'),
      page: 'settings',
      steps: [
        { key: 'language', page: 'settings', target: '[data-tour="settings-language"]', title: tTour('tour.settings.s1.t'), body: tTour('tour.settings.s1.b') },
        { key: 'guides', page: 'settings', target: '[data-tour="settings-guides"]', title: tTour('tour.settings.s2.t'), body: tTour('tour.settings.s2.b') },
      ],
    },
  ];
}

export function getTour(id: TourId): TourDef | undefined {
  return buildTours().find((tour) => tour.id === id);
}

/** Tour que abre sozinho na primeira visita a uma tela. */
export function autoTourForPage(page: TourPage): TourId | null {
  if (page === 'home') return 'welcome';
  if (page === 'settings') return 'settings';
  return null;
}
