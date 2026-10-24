export type DishPhoto = { url: string; alt: string };
export type RelatedProduct = { id: string; type: 'dish' | 'beverage' };
export const MAX_DISH_PHOTOS = 5;
export function safeImageUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 2048 &&
    (/^\/(?!\/)/.test(value) || /^https:\/\//i.test(value))
  );
}
export function dishPhotos(gallery: unknown, image?: string | null, name = ''): DishPhoto[] {
  const photos = Array.isArray(gallery)
    ? gallery
        .filter((p) => p && safeImageUrl(p.url))
        .map((p) => ({ url: p.url, alt: typeof p.alt === 'string' ? p.alt : name }))
    : [];
  if (image && safeImageUrl(image) && !photos.some((p) => p.url === image))
    photos.unshift({ url: image, alt: name });
  return photos
    .filter((p, i) => photos.findIndex((x) => x.url === p.url) === i)
    .slice(0, MAX_DISH_PHOTOS);
}
export function validateGallery(value: unknown): DishPhoto[] {
  if (!Array.isArray(value) || value.length > MAX_DISH_PHOTOS)
    throw new Error('A galeria permite no máximo 5 imagens.');
  const photos = value.map((p) => {
    if (
      !p ||
      typeof p !== 'object' ||
      !safeImageUrl(p.url) ||
      (p.alt != null && typeof p.alt !== 'string')
    )
      throw new Error('Imagem da galeria inválida.');
    if (p.alt?.length > 160) throw new Error('Descrição da imagem deve ter até 160 caracteres.');
    return { url: p.url.trim(), alt: (p.alt || '').trim() };
  });
  if (new Set(photos.map((p) => p.url)).size !== photos.length)
    throw new Error('Não repita a mesma imagem na galeria.');
  return photos;
}
export function validateRelated(value: unknown, ownId?: string): RelatedProduct[] {
  if (!Array.isArray(value) || value.length > 6)
    throw new Error('Escolha até 6 produtos relacionados.');
  const rows = value.map((p) => {
    if (
      !p ||
      !['dish', 'beverage'].includes(p.type) ||
      typeof p.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id) ||
      (p.type === 'dish' && p.id === ownId)
    )
      throw new Error('Produto relacionado inválido.');
    return { id: p.id, type: p.type } as RelatedProduct;
  });
  if (new Set(rows.map((p) => p.type + p.id)).size !== rows.length)
    throw new Error('Não repita produtos relacionados.');
  return rows;
}
