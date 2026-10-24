import React, { cache } from 'react';
import { dishMetadata, dishSchema, jsonLd } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { getDishBySlug } from '../../../lib/api';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import DishDetailClient from '../../../components/DishDetailClient';

export const dynamic = 'force-dynamic';
const getDish = cache(getDishBySlug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const dish = await getDish(resolvedParams.slug);
  if (!dish) return { title: 'Prato não encontrado' };

  return dishMetadata(dish);
}

export default async function DishPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const dish = await getDish(resolvedParams.slug);
  if (!dish) return notFound();

  return (
    <main className="flex min-h-screen flex-col bg-brand-beige">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(dishSchema(dish)) }}
      />
      <div className="container mx-auto flex-1 px-3 py-4 sm:px-4 sm:py-8">
        <DishDetailClient dish={dish} />
      </div>
      <Footer />
    </main>
  );
}
