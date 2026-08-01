import React from 'react';

export default function Banner({ banner }: { banner: { id: string; title: string; subtitle?: string } }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-brand-dark/5 backdrop-blur-xl transition hover:bg-white/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-brand-dark/50">Promoção</p>
          <h2 className="mt-2 text-2xl font-display font-semibold text-brand-dark">{banner.title}</h2>
          <p className="mt-2 max-w-xl text-sm text-brand-brown/80">{banner.subtitle}</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-orange text-white text-2xl shadow-lg shadow-brand-orange/20">★</div>
      </div>
    </div>
  );
}
