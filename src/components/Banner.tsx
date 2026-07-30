import React from 'react';

export default function Banner({ banner }: { banner: { id: string; title: string; subtitle?: string } }) {
  return (
    <div className="w-full rounded-lg overflow-hidden bg-brand-brown text-white p-6 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-display">{banner.title}</h2>
        <p className="mt-1">{banner.subtitle}</p>
      </div>
      <div className="hidden md:block w-40 h-24 bg-white/10 rounded-md flex items-center justify-center">Banner</div>
    </div>
  );
}
