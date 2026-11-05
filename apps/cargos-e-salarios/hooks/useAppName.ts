import { useEffect, useState } from 'react';
import { appName, ensureAppName, subscribeAppName } from '../lib/appName';

/**
 * The app name as configured on the platform. Re-renders the caller when the
 * platform name is resolved (or changed) so no screen ever shows a stale brand.
 */
export function useAppName(): string {
  const [name, setName] = useState<string>(() => appName());

  useEffect(() => {
    let alive = true;
    ensureAppName()
      .then((resolved) => { if (alive) setName(resolved); })
      .catch(() => { /* keeps the last known name */ });
    const unsubscribe = subscribeAppName((next) => { if (alive) setName(next); });
    return () => { alive = false; unsubscribe(); };
  }, []);

  return name;
}
