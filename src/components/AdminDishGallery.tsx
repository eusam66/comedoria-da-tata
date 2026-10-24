'use client';
import { useEffect, useState } from 'react';
import { DishPhotoView } from './DishGallery';
import { validateSourceImage } from '@/lib/imageUpload';
export type GalleryDraft = { key: string; url?: string; file?: File; alt: string };
function Preview({ photo }: { photo: GalleryDraft }) {
  const [url, setUrl] = useState(photo.url || '');
  useEffect(() => {
    if (!photo.file) {
      setUrl(photo.url || '');
      return;
    }
    const value = URL.createObjectURL(photo.file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [photo.file, photo.url]);
  return url ? (
    <DishPhotoView key={url} url={url} alt={photo.alt || 'Prévia da fotografia'} />
  ) : null;
}
export default function AdminDishGallery({
  value,
  onChange,
}: {
  value: GalleryDraft[];
  onChange: (value: GalleryDraft[]) => void;
}) {
  const [error, setError] = useState('');
  function add(files: FileList | null) {
    if (!files) return;
    try {
      const next = Array.from(files);
      if (value.length + next.length > 5) throw new Error('A galeria permite até 5 fotos.');
      next.forEach(validateSourceImage);
      const tokens = [
        ...value
          .filter((p) => p.file)
          .map((p) => `${p.file!.name}:${p.file!.size}:${p.file!.lastModified}`),
        ...next.map((f) => `${f.name}:${f.size}:${f.lastModified}`),
      ];
      if (new Set(tokens).size !== tokens.length) throw new Error('Essa foto já está selecionada.');
      onChange([...value, ...next.map((file) => ({ key: crypto.randomUUID(), file, alt: '' }))]);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Imagem inválida.');
    }
  }
  function move(from: number, to: number) {
    const rows = [...value];
    rows.splice(to, 0, rows.splice(from, 1)[0]);
    onChange(rows);
  }
  return (
    <section className="admin-dish-gallery" aria-labelledby="gallery-editor-title">
      <h3 id="gallery-editor-title">Galeria do prato</h3>
      <p>Até 5 fotos. A primeira é a foto principal. Os arquivos são enviados ao salvar.</p>
      <label className="block rounded border p-3">
        Adicionar fotos
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={value.length >= 5}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      <ol>
        {value.map((photo, i) => (
          <li key={photo.key} className="gallery-draft-row">
            <Preview photo={photo} />
            <div>
              <b>{i === 0 ? 'Foto principal' : `Foto ${i + 1}`}</b>
              <label>
                Descrição da foto
                <input
                  value={photo.alt}
                  maxLength={160}
                  onChange={(e) =>
                    onChange(
                      value.map((p) => (p.key === photo.key ? { ...p, alt: e.target.value } : p))
                    )
                  }
                />
              </label>
              <div className="gallery-draft-actions">
                <button type="button" disabled={i === 0} onClick={() => move(i, 0)}>
                  Tornar principal
                </button>
                <button
                  type="button"
                  aria-label={`Mover foto ${i + 1} para cima`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Mover foto ${i + 1} para baixo`}
                  disabled={i === value.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  ↓
                </button>
                <label className="gallery-replace">
                  Substituir
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        try {
                          validateSourceImage(file);
                          onChange(
                            value.map((p) =>
                              p.key === photo.key ? { key: p.key, file, alt: p.alt } : p
                            )
                          );
                          setError('');
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Imagem inválida.');
                        }
                      e.target.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((p) => p.key !== photo.key))}
                >
                  Remover foto {i + 1}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
