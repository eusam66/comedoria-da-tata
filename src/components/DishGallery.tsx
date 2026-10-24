'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import type { DishPhoto } from '@/lib/dishMedia';
export function DishPhotoView({
  url,
  alt,
  className = '',
  priority = false,
}: {
  url: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span
      className={'photo-fallback ' + className}
      role="img"
      aria-label={alt + ' — fotografia indisponível'}
    >
      Fotografia indisponível
    </span>
  ) : (
    <Image
      src={url}
      alt={alt}
      width={1200}
      height={900}
      sizes="(max-width: 700px) 100vw, 50vw"
      loading={priority ? 'eager' : 'lazy'}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
export default function DishGallery({ photos, name }: { photos: DishPhoto[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  if (!photos.length) return <div className="dish-gallery-empty">Fotografia não cadastrada</div>;
  const index = Math.min(selected, photos.length - 1);
  const change = (step: number) => setSelected((index + step + photos.length) % photos.length);
  return (
    <section
      className="dish-gallery"
      aria-label={`Fotos de ${name}`}
      aria-roledescription="carrossel"
    >
      <div
        className="dish-gallery-main"
        onTouchStart={(e) => {
          start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          if (start.current !== null) {
            const diff = e.changedTouches[0].clientX - start.current.x;
            const vertical = e.changedTouches[0].clientY - start.current.y;
            if (Math.abs(diff) > 45 && Math.abs(diff) > Math.abs(vertical))
              change(diff < 0 ? 1 : -1);
            start.current = null;
          }
        }}
      >
        <DishPhotoView
          key={photos[index].url}
          url={photos[index].url}
          alt={photos[index].alt || name}
          priority={index === 0}
          className="gallery-photo"
        />
      </div>
      {photos.length > 1 && (
        <>
          <div className="gallery-controls">
            <button type="button" onClick={() => change(-1)} aria-label="Foto anterior">
              ←
            </button>
            <span role="status" aria-live="polite">
              Foto {index + 1} de {photos.length}
            </span>
            <button type="button" onClick={() => change(1)} aria-label="Próxima foto">
              →
            </button>
          </div>
          <div className="gallery-thumbnails">
            {photos.map((p, i) => (
              <button
                key={p.url}
                type="button"
                aria-label={`Ver foto ${i + 1} de ${name}`}
                aria-pressed={index === i}
                onClick={() => setSelected(i)}
              >
                <DishPhotoView url={p.url} alt={p.alt || `${name}, foto ${i + 1}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
