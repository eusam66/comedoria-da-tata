import React from 'react';
import { notFound } from 'next/navigation';
import { getDishBySlug } from '../../../lib/api';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import DishGallery from '../../../components/DishGallery';
import FloatingWhatsAppOrder from '../../../components/FloatingWhatsAppOrder';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const dish = await getDishBySlug(resolvedParams.slug);
  if (!dish) return { title: 'Prato não encontrado' };
  return {
    title: `${dish.name} — Comedoria da Tata`,
    description: dish.description ?? ''
  };
}

export default async function DishPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const dish = await getDishBySlug(resolvedParams.slug);
  if (!dish) return notFound();

  const whatsappMessage = encodeURIComponent(`Pedido: ${dish.code} - ${dish.name}\nPreço: R$ ${dish.price.toFixed(2)}\nServe: ${dish.servings ?? 1} pessoa(s)`);
  const whatsappHref = `https://wa.me/5511999999999?text=${whatsappMessage}`;

  const open = true;
  const avgTime = '30-45 min';

  return (
    <main className="min-h-screen flex flex-col">
      <Header open={open} avgTime={avgTime} />
      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3">
              {dish.image ? (
                // @ts-ignore - DishGallery is a client component
                              <DishGallery images={[dish.image]} />
              ) : (
                <div className="h-64 bg-brand-beige rounded-md flex items-center justify-center">Imagem</div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-display text-brand-dark">{dish.name}</h1>
              <p className="text-sm text-gray-600 mt-2">{dish.description}</p>

              <div className="mt-4">
                <div className="text-lg font-bold text-brand-brown">R$ {dish.price.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Serve: {dish.servings ?? 1} pessoa(s)</div>
                <div className="text-sm text-gray-600 mt-2">Ingredientes: {(dish.ingredients || []).join(', ')}</div>
              </div>

              <div className="mt-6 flex gap-3">
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-4 py-2 rounded-md">Pedir pelo WhatsApp</a>
                <button type="button" className="bg-brand-orange text-white px-4 py-2 rounded-md">Adicionar ao carrinho</button>
              </div>
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
