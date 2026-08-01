import "../styles/globals.css";
import React from 'react';
import ClientProviders from '../components/ClientProviders';

export const metadata = {
  title: 'Comedoria da Tata',
  description: 'Comida caseira com carinho',
  openGraph: {
    title: 'Comedoria da Tata',
    description: 'Comida caseira com carinho',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://comedoria-da-tata.example',
    images: ['/icons/icon-512.png']
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2A140F" />
        <link rel="icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
