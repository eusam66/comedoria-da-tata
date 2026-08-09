import { permanentRedirect } from 'next/navigation';

const PUBLIC_STOREFRONT_URL =
  'https://comedoria-da-tata.samuelalvesgato-jose.chatgpt.site';

export default function HomePage() {
  permanentRedirect(PUBLIC_STOREFRONT_URL);
}
