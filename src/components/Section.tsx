import React from 'react';

export default function Section({
  title,
  className,
  children
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={['mt-6', className].filter(Boolean).join(' ')}>
      <h3 className="text-xl font-display text-brand-dark mb-3">{title}</h3>
      {children}
    </section>
  );
}
