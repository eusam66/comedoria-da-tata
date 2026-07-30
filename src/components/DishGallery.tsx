'use client';
import React, { useRef, useState } from 'react';

export default function DishGallery({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startX = useRef<number | null>(null);
  const translate = useRef(0);

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
    else {
      // reset
    }
    startX.current = null;
    if (containerRef.current) containerRef.current.style.transform = `translateX(${-index * 100}%)`;
  }

  return (
    <div className="w-full overflow-hidden rounded-md">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${-index * 100}%)` }}
      >
        {images.map((src, i) => (
          <div key={i} className="w-full flex-shrink-0 h-64 bg-gray-100 flex items-center justify-center">
            <img src={src} alt={`Imagem ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mt-2">
        {images.map((_, i) => (
          <button key={i} aria-label={`Ir para imagem ${i + 1}`} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full ${i === index ? 'bg-brand-dark' : 'bg-gray-300'}`} />
        ))}
      </div>
    </div>
  );
}
