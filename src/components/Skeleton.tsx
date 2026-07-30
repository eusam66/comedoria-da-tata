'use client';
import React from 'react';

type Props = { className?: string; lines?: number };

export default function Skeleton({ className = '', lines = 1 }: Props) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="bg-gray-200 rounded w-full h-4 animate-pulse" />
      ))}
    </div>
  );
}
