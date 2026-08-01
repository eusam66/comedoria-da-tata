'use client';
import React from 'react';

export default function FloatingWhatsAppOrder({ phone, message }: { phone: string; message: string }) {
  const href = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 md:bottom-8">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-brand-orange px-5 py-4 text-sm font-semibold text-white shadow-[0_24px_80px_-32px_rgba(245,134,52,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_90px_-38px_rgba(245,134,52,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/30"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M20.52 3.48C18.41 1.37 15.6 0.4 12.78 0.85 8.49 1.55 5.04 5.01 4.35 9.3c-.45 2.82.52 5.63 2.63 7.74L3 21l3.2-1.98c2.44 1.34 5.52 1.32 7.93-.09 4.29-2.96 5.48-8.94 2.39-12.45z" fill="white" />
        </svg>
        <span>Pedir pelo WhatsApp</span>
      </a>
    </div>
  );
}
