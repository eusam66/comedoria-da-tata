import React from 'react';

export default function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-xl font-display text-brand-dark mb-3">{title}</h3>
      {children}
    </section>
  );
}
