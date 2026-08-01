import React from 'react';

export default function Section({
  title,
  description,
  className,
  children
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={['mt-8', className].filter(Boolean).join(' ')}>
      <div className="mb-4">
        <h3 className="text-xl font-display text-brand-dark">{title}</h3>
        {description ? <p className="mt-2 text-sm text-brand-brown/80 max-w-2xl">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
