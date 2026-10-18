'use client';
import { useEffect, useState } from 'react';
// Restaura somente preferências de listagem desta sessão; nunca dados de formulários.
export function useAdminListContext(key: string, initial: string) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null) setValue(saved);
    } catch {
      /* Sessão privada. */
    }
  }, [key]);
  return [
    value,
    (next: string) => {
      setValue(next);
      try {
        sessionStorage.setItem(key, next);
      } catch {
        /* Sessão privada. */
      }
    },
  ] as const;
}
