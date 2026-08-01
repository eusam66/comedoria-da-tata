import React from 'react';

export default function WhatsAppButton({ phone }: { phone: string }) {
  const href = `https://wa.me/${phone.replace(/\D/g, '')}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-3 rounded-full bg-brand-orange px-5 py-3 text-white shadow-[0_20px_60px_-30px_rgba(245,134,52,0.8)] transition hover:scale-[1.02] hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M20.52 3.48C18.41 1.37 15.6 0.4 12.78 0.85 8.49 1.55 5.04 5.01 4.35 9.3c-.45 2.82.52 5.63 2.63 7.74L3 21l3.2-1.98c2.44 1.34 5.52 1.32 7.93-.09 4.29-2.96 5.48-8.94 2.39-12.45z" fill="white" />
      </svg>
      <span className="text-sm font-semibold">Pedir pelo WhatsApp</span>
    </a>
  );
}
