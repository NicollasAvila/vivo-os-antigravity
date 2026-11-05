import React, { useEffect, useReducer } from 'react';
import { SparklesIcon, Cog6ToothIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { buildTours } from '../../services/tours';
import { isTourSeen, subscribeTourPrefs, type TourId } from '../../lib/tourPrefs';
import { tTour } from '../../lib/i18nTour';

// Um ícone por tour. Ao criar um tour novo (lib/tourPrefs.ts), adicione a
// entrada correspondente aqui.
const ICONS: Record<TourId, React.ReactNode> = {
  welcome: <SparklesIcon className="w-4 h-4" />,
  settings: <Cog6ToothIcon className="w-4 h-4" />,
};

interface TourListProps {
  onStart: (id: TourId) => void;
  /** 'menu' é a lista compacta dentro do popover da sidebar. */
  variant?: 'menu' | 'settings';
}

/** Lista de guias compartilhada pelo popover da sidebar e pelas Configurações. */
export default function TourList({ onStart, variant = 'menu' }: TourListProps) {
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribeTourPrefs(refresh), []);

  const tours = buildTours();

  return (
    <ul className={variant === 'settings' ? 'divide-y divide-gray-100' : 'space-y-0.5'}>
      {tours.map((tour) => {
        const seen = isTourSeen(tour.id);
        return (
          <li key={tour.id}>
            <button
              type="button"
              onClick={() => onStart(tour.id)}
              className={`w-full flex items-start gap-2.5 text-left cursor-pointer transition-colors duration-150 ${
                variant === 'settings'
                  ? 'px-1 py-3 hover:bg-gray-50 rounded-md'
                  : 'rounded-md px-2 py-2 hover:bg-gray-50'
              }`}
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
                {ICONS[tour.id]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-gray-900">{tour.title}</span>
                  {seen && (
                    <CheckCircleIcon className="w-3.5 h-3.5 shrink-0 text-gray-300" aria-label={tTour('tour.ui.seen')} />
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-gray-500">{tour.description}</span>
              </span>
              <span className="mt-0.5 shrink-0 text-xs font-medium text-[var(--color-primary-700)]">
                {seen ? tTour('tour.ui.replay') : tTour('tour.ui.start')}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
