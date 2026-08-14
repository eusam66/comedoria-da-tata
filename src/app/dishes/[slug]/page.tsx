import React from 'react';
import { notFound } from 'next/navigation';
import { getDishBySlug } from '../../../lib/api';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import DishDetailClient from '../../../components/DishDetailClient';

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
    alternates: {
      canonical: `/dishes/${dish.slug}`
    },
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

  return (
    <main className="flex min-h-screen flex-col bg-brand-beige">
      <Header open avgTime="30-45 min" />
      <div className="container mx-auto flex-1 px-3 py-4 sm:px-4 sm:py-8">
        <DishDetailClient dish={dish} />
      </div>
      <Footer />
    </main>
  );
}
