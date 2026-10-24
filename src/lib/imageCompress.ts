import { validateSourceImage } from './imageUpload';
// Decodificação moderna respeita EXIF; canvas elimina metadata e limita ambos os eixos.
export async function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
  validateSourceImage(file);
  let image: ImageBitmap | HTMLImageElement;
  let sourceUrl: string | undefined;
  if (typeof createImageBitmap === 'function') {
    try {
      image = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      image = await fallback();
    }
  } else image = await fallback();
  async function fallback(): Promise<HTMLImageElement> {
    sourceUrl = URL.createObjectURL(file);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        URL.revokeObjectURL(sourceUrl!);
        reject(new Error('Não foi possível ler a imagem.'));
      };
      img.src = sourceUrl!;
    });
  }
  try {
    const w = image.width,
      h = image.height;
    if (!w || !h || w * h > 60000000)
      throw new Error('Dimensões da imagem inválidas ou muito grandes.');
    const ratio = Math.min(1, maxWidth / w, maxWidth / h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * ratio));
    canvas.height = Math.max(1, Math.round(h * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível.');
    context.fillStyle = '#FFF9F3';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Não foi possível comprimir a imagem.'))),
        'image/jpeg',
        quality
      )
    );
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if ('close' in image) image.close();
  }
}
