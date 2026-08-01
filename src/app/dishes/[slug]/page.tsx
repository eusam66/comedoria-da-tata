import React from 'react';
import { notFound } from 'next/navigation';
import { getDishBySlug } from '../../../lib/api';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import DishDetailClient from '../../../components/DishDetailClient';
import FloatingWhatsAppOrder from '../../../components/FloatingWhatsAppOrder';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const dish = await getDishBySlug(resolvedParams.slug);
  if (!dish) return { title: 'Prato não encontrado' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const imageUrl = dish.image ? new URL(dish.image, siteUrl).href : `${siteUrl}/icons/icon-512.png`;

  return {
    title: `${dish.name} — Comedoria da Tata`,
    description: dish.description ?? 'Prato especial da Comedoria da Tata',
    openGraph: {
      title: `${dish.name} — Comedoria da Tata`,
      description: dish.description ?? 'Prato especial da Comedoria da Tata',
      type: 'article',
      url: `${siteUrl}/dishes/${dish.slug}`,
      images: [
        {
          url: imageUrl,
          alt: dish.name,
          width: 1200,
          height: 630
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${dish.name} — Comedoria da Tata`,
      description: dish.description ?? 'Prato especial da Comedoria da Tata',
      images: [imageUrl]
    }
  };
}

export default async function DishPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const dish = await getDishBySlug(resolvedParams.slug);
  if (!dish) return notFound();

  const open = true;
  const avgTime = '30-45 min';

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <Header open={open} avgTime={avgTime} />
      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex flex-col gap-6">
            <div>
              {/* DishDetailClient is a client component handling qty, notes and add-to-cart */}
              {/* @ts-ignore */}
              <DishDetailClient dish={dish} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
      {/* Floating quick WhatsApp (pre-filled) */}
      {/* @ts-ignore */}
      <FloatingWhatsAppOrder phone={'+5511999999999'} message={`Pedido: ${dish.code} - ${dish.name} (%0A) Preço: R$ ${dish.price.toFixed(2)} (%0A) Serve: ${dish.servings ?? 1} pessoa(s)`} />
    </main>
  );
}
