export function slugify(text: string) {
  return text
    .toString()
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
