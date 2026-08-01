'use client';
import React from 'react';

type Props = { className?: string; lines?: number };

export default function Skeleton({ className = '', lines = 1 }: Props) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded-full bg-brand-beige/70 animate-pulse" />
      ))}
    </div>
  );
}
