export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export function imageSignatureMatches(type: string, bytes: Uint8Array) {
  const starts = (values: number[]) => values.every((v, i) => bytes[i] === v);
  if (type === 'image/jpeg') return starts([255, 216, 255]);
  if (type === 'image/png') return starts([137, 80, 78, 71, 13, 10, 26, 10]);
  if (type === 'image/gif')
    return String.fromCharCode(...bytes.slice(0, 6)).match(/^GIF8[79]a$/) !== null;
  if (type === 'image/webp')
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    );
  return false;
}
export function validateSourceImage(file: Pick<File, 'type' | 'size'>) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Use uma imagem JPEG, PNG, WebP ou GIF.');
  if (file.size <= 0 || file.size > 20 * 1024 * 1024)
    throw new Error('A imagem original deve ter até 20 MB.');
}
