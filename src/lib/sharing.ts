import { PUBLIC_SITE_URL } from './commercial';
export function dishShareData(name: string, slug: string, description: string | null = '') {
  const url = `${PUBLIC_SITE_URL}/dishes/${encodeURIComponent(slug)}`;
  const summary = typeof description === 'string' ? description.trim().slice(0, 180) : '';
  const text = `${name} — Comedoria da Tata${summary ? `\n${summary}` : ''}\n${url}`;
  return { url, text, title: `${name} — Comedoria da Tata` };
}
export function dishWhatsappShare(text: string, environment?: string) {
  return environment === 'homologacao' ? null : `https://wa.me/?text=${encodeURIComponent(text)}`;
}
