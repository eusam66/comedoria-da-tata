'use client';
import { useState } from 'react';
import { dishShareData, dishWhatsappShare } from '@/lib/sharing';
export default function ShareDish({
  name,
  slug,
  description,
}: {
  name: string;
  slug: string;
  description?: string | null;
}) {
  const [open, setOpen] = useState(false),
    [status, setStatus] = useState('');
  const { url, text, title } = dishShareData(name, slug, description);
  const href = dishWhatsappShare(text, process.env.NEXT_PUBLIC_APP_ENV);
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description?.slice(0, 180), url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    setOpen(true);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Link do prato copiado.');
    } catch {
      setOpen(true);
      setStatus('Selecione e copie o link abaixo.');
    }
  }
  return (
    <div className="share-dish">
      <button type="button" onClick={share} aria-expanded={open}>
        Compartilhar prato
      </button>
      {open && (
        <div className="share-options">
          <button type="button" onClick={copy}>
            Copiar link
          </button>
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              Compartilhar no WhatsApp
            </a>
          ) : (
            <span>Compartilhamento externo desabilitado na homologação.</span>
          )}
          <label>
            Link direto do prato
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
          </label>
          <button type="button" onClick={() => setOpen(false)}>
            Fechar opções
          </button>
        </div>
      )}
      <span role="status">{status}</span>
    </div>
  );
}
