import React from 'react';

export default function Banner({ banner }: { banner: { id: string; title: string; subtitle?: string } }) {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm text-white p-6 flex items-center justify-between shadow-md">
      <div>
        <h2 className="text-xl md:text-2xl font-display">{banner.title}</h2>
        <p className="mt-1 text-sm md:text-base opacity-90">{banner.subtitle}</p>
      </div>
      <div className="hidden md:flex items-center gap-3">
        <div className="w-14 h-14 bg-white/10 rounded-md flex items-center justify-center">📣</div>
      </div>
    </div>
  );
}
