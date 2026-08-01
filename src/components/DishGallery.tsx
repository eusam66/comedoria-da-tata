'use client';
import React, { useRef, useState } from 'react';
import Image from 'next/image';

export default function DishGallery({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startX = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current == null || !containerRef.current) return;
    const dx = e.clientX - startX.current;
    containerRef.current.style.transform = `translateX(${ -index * 100 + (dx / containerRef.current.clientWidth) * 100 }%)`;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (startX.current == null || !containerRef.current) return;
    const dx = e.clientX - startX.current;
    const threshold = containerRef.current.clientWidth * 0.15;
    if (dx > threshold && index > 0) setIndex((i) => i - 1);
    else if (dx < -threshold && index < images.length - 1) setIndex((i) => i + 1);
    startX.current = null;
    if (containerRef.current) containerRef.current.style.transform = `translateX(${-index * 100}%)`;
  }

  return (
    <div className="w-full overflow-hidden rounded-[2rem] border border-brand-brown/10 bg-white shadow-xl">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${-index * 100}%)` }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative h-72 w-full flex-shrink-0 bg-brand-beige/70 md:h-80">
            <Image src={src} alt={`Imagem ${i + 1}`} fill sizes="100vw" className="object-cover" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 p-4">
        {images.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir para imagem ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2.5 w-2.5 rounded-full ${i === index ? 'bg-brand-dark' : 'bg-brand-brown/40'}`}
          />
        ))}
      </div>
    </div>
  );
}
