'use client';
import { useEffect, useState } from 'react';
import type { StoreStatus } from './storeHours';

export function useStoreStatus() {
  const [status, setStatus] = useState<StoreStatus | null>(null);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    const refresh = async () => {
      clearTimeout(timer);
      controller?.abort();
      const request = new AbortController();
      controller = request;
      let delay = 10000;
      try {
        const response = await fetch('/api/store-status', { cache: 'no-store', signal: request.signal });
        if (!response.ok) throw new Error('Status indisponível');
        const value: StoreStatus = await response.json();
        if (active && !request.signal.aborted) {
          setStatus(value);
          if (value.expiresAt) delay = Math.min(delay, Math.max(100, Date.parse(value.expiresAt) - Date.now()));
        }
      } catch {
        if (active && !request.signal.aborted) setStatus(null);
      } finally {
        if (active && !request.signal.aborted) timer = setTimeout(refresh, delay);
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('order-operations-updated', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('order-operations-updated', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return status;
}
