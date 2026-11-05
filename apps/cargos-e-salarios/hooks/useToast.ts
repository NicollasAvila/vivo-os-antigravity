import { useSyncExternalStore } from 'react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface HostedToast extends ToastItem {
  phase: 'visible' | 'exiting';
}

interface AutoTimer {
  timeoutId: number | null;
  remaining: number;
  startedAt: number;
}

const TOAST_DURATION = 4000;
const EXIT_DURATION = 200;
const subscribers = new Set<() => void>();
const autoTimers = new Map<string, AutoTimer>();
const exitTimers = new Map<string, number>();
let toastStore: HostedToast[] = [];

function notify() {
  subscribers.forEach((subscriber) => subscriber());
}

function subscribe(subscriber: () => void) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

function getSnapshot() {
  return toastStore;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function finalize(id: string) {
  const exitTimer = exitTimers.get(id);
  if (exitTimer !== undefined) window.clearTimeout(exitTimer);
  exitTimers.delete(id);

  const autoTimer = autoTimers.get(id);
  if (autoTimer?.timeoutId !== null && autoTimer?.timeoutId !== undefined) {
    window.clearTimeout(autoTimer.timeoutId);
  }
  autoTimers.delete(id);

  const next = toastStore.filter((toast) => toast.id !== id);
  if (next.length === toastStore.length) return;
  toastStore = next;
  notify();
}

function removeToast(id: string) {
  const toast = toastStore.find((item) => item.id === id);
  if (!toast || toast.phase === 'exiting') return;

  const autoTimer = autoTimers.get(id);
  if (autoTimer?.timeoutId !== null && autoTimer?.timeoutId !== undefined) {
    window.clearTimeout(autoTimer.timeoutId);
  }
  autoTimers.delete(id);

  toastStore = toastStore.map((item) => (
    item.id === id ? { ...item, phase: 'exiting' } : item
  ));
  notify();

  const exitTimer = window.setTimeout(
    () => finalize(id),
    prefersReducedMotion() ? 0 : EXIT_DURATION,
  );
  exitTimers.set(id, exitTimer);
}

function startTimer(id: string, remaining: number) {
  const current = autoTimers.get(id);
  if (current?.timeoutId !== null && current?.timeoutId !== undefined) {
    window.clearTimeout(current.timeoutId);
  }
  if (remaining <= 0) {
    removeToast(id);
    return;
  }

  const timeoutId = window.setTimeout(() => removeToast(id), remaining);
  autoTimers.set(id, { timeoutId, remaining, startedAt: Date.now() });
}

function pauseToast(id: string) {
  const timer = autoTimers.get(id);
  if (!timer || timer.timeoutId === null) return;
  window.clearTimeout(timer.timeoutId);
  const elapsed = Date.now() - timer.startedAt;
  autoTimers.set(id, {
    timeoutId: null,
    remaining: Math.max(0, timer.remaining - elapsed),
    startedAt: 0,
  });
}

function resumeToast(id: string) {
  const timer = autoTimers.get(id);
  if (!timer || timer.timeoutId !== null) return;
  startTimer(id, timer.remaining);
}

export function pushToast(type: ToastItem['type'], message: string) {
  const toast: HostedToast = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    message,
    phase: 'visible',
  };
  toastStore = [...toastStore, toast];
  startTimer(toast.id, TOAST_DURATION);
  notify();
}

export function useToastHost() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { toasts, remove: removeToast, pause: pauseToast, resume: resumeToast };
}
