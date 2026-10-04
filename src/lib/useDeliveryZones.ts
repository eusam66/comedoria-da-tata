'use client';
import { useCallback, useEffect, useState } from 'react';
import type { DeliveryZone } from './deliveryZones';

export function useDeliveryZones(enabled: boolean) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((current) => current + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/delivery-zones', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as localizações.');
        if (!Array.isArray(data)) throw new Error('Não foi possível carregar as localizações.');
        if (!controller.signal.aborted) setZones(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setZones([]);
          setError(err instanceof Error ? err.message : 'Não foi possível carregar as localizações.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, revision]);

  return { zones, loading, error, refresh };
}
