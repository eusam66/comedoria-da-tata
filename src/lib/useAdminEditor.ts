'use client';
import { useEffect, useRef, useState } from 'react';

// O destino existe após o commit do React. Foco no título evita abrir o teclado móvel.
export function useAdminEditor(editing: string | null, snapshot: string) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const origin = useRef<string | null>(null);
  const baseline = useRef(snapshot);
  const [destination, setDestination] = useState<{ id: string | null; edit: boolean } | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  useEffect(() => {
    if (!destination) return;
    if (destination.edit) baseline.current = snapshot;
    const frame = requestAnimationFrame(() => {
      const node = destination.edit
        ? headingRef.current
        : destination.id
        ? document.querySelector<HTMLElement>(`[data-admin-item="${CSS.escape(destination.id)}"]`)
        : null;
      const target = node || document.querySelector<HTMLElement>('[data-admin-list]');
      if (target) {
        target.focus({ preventScroll: true });
        target.scrollIntoView({
          block: 'start',
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
      }
      if (!destination.edit) setHighlighted(destination.id);
    });
    return () => cancelAnimationFrame(frame);
    // Somente uma intenção explícita inicia movimento; digitar não reposiciona a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);
  const dirty = editing !== null && snapshot !== baseline.current;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (snapshot !== baseline.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, snapshot]);
  function canDiscard() {
    return (
      !(editing !== null && snapshot !== baseline.current) ||
      window.confirm('Descartar as alterações não salvas?')
    );
  }
  return {
    headingRef,
    highlighted,
    busy,
    begin(id: string) {
      if (!canDiscard()) return false;
      origin.current = id;
      setDestination({ id, edit: true });
      setHighlighted(null);
      return true;
    },
    removed(id: string) {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-admin-item]'));
      const index = cards.findIndex((card) => card.dataset.adminItem === id);
      const next = cards[index + 1] || cards[index - 1];
      setDestination({ id: next?.dataset.adminItem ?? null, edit: false });
    },
    finish(id = origin.current) {
      setDestination({ id, edit: false });
    },
    cancel(reset: () => void) {
      if (canDiscard()) {
        reset();
        setDestination({ id: origin.current, edit: false });
      }
    },
    async run(task: () => Promise<void>) {
      if (locked.current) return;
      locked.current = true;
      setBusy(true);
      try {
        await task();
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
  };
}
