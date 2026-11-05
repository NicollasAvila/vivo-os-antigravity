import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import TourOverlay from './TourOverlay';
import { autoTourForPage, getTour, type TourDef, type TourPage } from '../../services/tours';
import { autoToursEnabled, isTourSeen, markTourSeen, type TourId } from '../../lib/tourPrefs';

interface TourContextValue {
  /** Tour running right now, if any. */
  activeId: TourId | null;
  /** Screen the app is on — used by the replay menu. */
  page: TourPage;
  /** Opens a tour on demand (replay). */
  start: (id: TourId) => void;
  /** Opens a tour only the first time, and only if automatic tips are on. */
  startOnce: (id: TourId) => void;
  stop: () => void;
}

const TourContext = createContext<TourContextValue>({
  activeId: null,
  page: 'home',
  start: () => {},
  startOnce: () => {},
  stop: () => {},
});

export function useTour(): TourContextValue {
  return useContext(TourContext);
}

interface TourProviderProps {
  page: TourPage;
  onNavigate: (page: TourPage) => void;
  children: React.ReactNode;
}

/**
 * Orchestrates the guided tours: keeps the current step, navigates between
 * screens when a step lives somewhere else and remembers what was already seen.
 */
export default function TourProvider({ page, onNavigate, children }: TourProviderProps) {
  const [tour, setTour] = useState<TourDef | null>(null);
  const [index, setIndex] = useState(0);

  const tourRef = useRef<TourDef | null>(null);
  tourRef.current = tour;
  const pageRef = useRef<TourPage>(page);
  pageRef.current = page;
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;

  const start = useCallback((id: TourId) => {
    const def = getTour(id);
    if (!def) return;
    console.log('[tour] starting', id);
    setTour(def);
    setIndex(0);
    const wanted = def.steps[0]?.page || (def.contextual ? null : def.page);
    if (wanted && wanted !== pageRef.current) navigateRef.current(wanted);
  }, []);

  const startOnce = useCallback((id: TourId) => {
    if (tourRef.current) return;
    if (!autoToursEnabled() || isTourSeen(id)) return;
    start(id);
  }, [start]);

  const finish = useCallback(() => {
    const current = tourRef.current;
    if (current) markTourSeen(current.id);
    setTour(null);
    setIndex(0);
  }, []);

  const go = useCallback((next: number) => {
    const current = tourRef.current;
    if (!current) return;
    if (next < 0) return;
    if (next >= current.steps.length) { finish(); return; }
    const step = current.steps[next];
    if (step.page && step.page !== pageRef.current) navigateRef.current(step.page);
    setIndex(next);
  }, [finish]);

  // First visit to a screen opens its guide (unless it was seen or turned off).
  useEffect(() => {
    const id = autoTourForPage(page);
    if (!id) return;
    if (tourRef.current || !autoToursEnabled() || isTourSeen(id)) return;
    const timer = window.setTimeout(() => {
      if (tourRef.current || isTourSeen(id)) return;
      start(id);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [page, start]);

  const value = useMemo<TourContextValue>(() => ({
    activeId: tour?.id ?? null,
    page,
    start,
    startOnce,
    stop: finish,
  }), [tour?.id, page, start, startOnce, finish]);

  const step = tour?.steps[index];

  return (
    <TourContext.Provider value={value}>
      {children}
      {tour && step && (
        <TourOverlay
          key={`${tour.id}-${step.key}`}
          step={step}
          index={index}
          total={tour.steps.length}
          onNext={() => go(index + 1)}
          onPrev={() => go(index - 1)}
          onClose={finish}
        />
      )}
    </TourContext.Provider>
  );
}
