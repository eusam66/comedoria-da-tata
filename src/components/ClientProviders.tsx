'use client';
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CartProvider } from './CartContext';

const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false });

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // register the service worker placed in /sw.js (generated during build)
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // registration succeeded
        // console.debug('SW registered', reg);
      }).catch((err) => {
        // console.warn('SW registration failed', err);
      });
    }
  }, []);

  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
