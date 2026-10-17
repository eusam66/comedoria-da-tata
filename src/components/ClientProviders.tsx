'use client';
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CartProvider } from './CartContext';

const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false });

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then(registration => registration.update())
        .catch(() => { /* O cardápio continua online sem suporte a PWA. */ });
    }
  }, []);

  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
