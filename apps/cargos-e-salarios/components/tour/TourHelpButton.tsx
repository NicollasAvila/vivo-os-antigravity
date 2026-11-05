import React, { useEffect, useReducer, useRef, useState } from 'react';
import { QuestionMarkCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Tooltip from '../ui/Tooltip';
import Checkbox from '../ui/Checkbox';
import TourList from './TourList';
import { useTour } from './TourProvider';
import { autoTourForPage, getTour } from '../../services/tours';
import { autoToursEnabled, setAutoTours, subscribeTourPrefs, type TourId } from '../../lib/tourPrefs';
import { tTour } from '../../lib/i18nTour';

interface TourHelpButtonProps {
  expanded: boolean;
  onNavigated?: () => void;
}

/**
 * Discreet entry point in the sidebar footer: replays the guide of the current
 * screen or any other one, and toggles the automatic tips.
 */
export default function TourHelpButton({ expanded, onNavigated }: TourHelpButtonProps) {
  const { start, page } = useTour();
  const [open, setOpen] = useState(false);
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeTourPrefs(refresh), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const currentId = autoTourForPage(page);
  const currentTour = currentId ? getTour(currentId) : undefined;
  const autoOn = autoToursEnabled();

  const launch = (id: TourId) => {
    setOpen(false);
    onNavigated?.();
    start(id);
  };

  return (
    <div className="relative" ref={boxRef}>
      <Tooltip content={tTour('tour.menu.button')} placement="right" disabled={expanded}>
        <button
          type="button"
          data-tour="tour-help"
          onClick={() => setOpen((value) => !value)}
          aria-label={tTour('tour.menu.button')}
          aria-expanded={open}
          className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium cursor-pointer transition-all duration-150 ${
            expanded ? '' : 'justify-center px-0'
          } ${open ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
        >
          <QuestionMarkCircleIcon className="w-5 h-5 shrink-0" />
          {expanded && <span className="truncate">{tTour('tour.menu.button')}</span>}
        </button>
      </Tooltip>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 max-w-[80vw] rounded-lg bg-white p-2 shadow-xl ring-1 ring-gray-900/10 animate-fade-in">
          <div className="px-2 pb-1.5 pt-1">
            <p className="text-sm font-semibold text-gray-900">{tTour('tour.menu.title')}</p>
            <p className="text-xs text-gray-500">{tTour('tour.menu.subtitle')}</p>
          </div>

          {currentTour && (
            <button
              type="button"
              onClick={() => launch(currentTour.id)}
              className="mb-1 flex w-full items-center gap-2 rounded-md bg-[var(--color-primary-50)] px-2 py-2 text-left text-sm font-medium text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)] transition-colors duration-150 cursor-pointer"
            >
              <ArrowPathIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tTour('tour.menu.current')}</span>
            </button>
          )}

          <div className="max-h-72 overflow-y-auto">
            <TourList onStart={launch} />
          </div>

          <div className="mt-1 border-t border-gray-100 px-2 pt-2.5">
            <Checkbox
              label={tTour('tour.menu.auto')}
              description={tTour('tour.menu.auto_hint')}
              checked={autoOn}
              onChange={setAutoTours}
            />
          </div>
        </div>
      )}
    </div>
  );
}
