import "../styles/globals.css";
import React from 'react';
import ClientProviders from '../components/ClientProviders';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  title: 'Comedoria da Tata',
  description: 'Comida caseira com carinho e entrega rápida diretamente da cozinha da Tata.',
  metadataBase: new URL(siteUrl),
  themeColor: '#2A140F',
  openGraph: {
    title: 'Comedoria da Tata',
    description: 'Comida caseira com carinho e entrega rápida diretamente da cozinha da Tata.',
    type: 'website',
    url: siteUrl,
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Comedoria da Tata'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comedoria da Tata',
    description: 'Comida caseira com carinho e entrega rápida diretamente da cozinha da Tata.',
    images: ['/icons/icon-512.png']
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2A140F" />
        <link rel="icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* iOS splash (fallback general) */}
        <meta name="apple-mobile-web-app-title" content="Comedoria da Tata" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512.png" />
      </head>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
