import React from 'react';
import Header from '../components/layout/Header';
import Banner from '../components/Banner';
import Section from '../components/Section';
import WhatsAppButton from '../components/WhatsAppButton';
import Footer from '../components/layout/Footer';
import CategoryList from '../components/CategoryList';
import DishesBrowser from '../components/DishesBrowser';
import { getCategories } from '../lib/api';
import { bannersRepo } from '../lib/repos/bannersRepo';

export default async function HomePage() {
  const open = true;
  const avgTime = '30-45 min';

  const categories = await getCategories();
  const banners = await bannersRepo.list().catch(() => []);
  const promoBanner = banners[0]
    ? {
        ...banners[0],
        title: banners[0].title ?? 'Promoção do dia',
        subtitle: banners[0].subtitle ?? 'Frete grátis'
      }
    : { id: 'b-placeholder', title: 'Promoção do dia', subtitle: 'Frete grátis' };

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-brand-beige/20 to-white">
      <Header open={open} avgTime={avgTime} />

      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Hero */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-brand-brown to-brand-orange text-white p-8 relative">
              <div className="absolute inset-0 bg-[url('/icons/icon-512.png')] bg-top-right opacity-10 mix-blend-overlay pointer-events-none" />
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display mb-2">Comedoria da Tata</h1>
              <p className="mb-4 text-lg md:text-xl">Sabores caseiros, entregas rápidas. {avgTime}.</p>
              <div className="max-w-xl">
                <Banner banner={promoBanner} />
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3">
                {/* DishesBrowser é um componente cliente que se conecta a /api/dishes para busca/filtragem */}
                <DishesBrowser categories={categories} />
              </div>
            </div>
          </div>

          {/* Sidebar: categorias e CTA */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-4 shadow-lg sticky top-6">
              <h3 className="text-lg font-semibold mb-3">Categorias</h3>
              <CategoryList categories={categories} />
              <div className="mt-4">
                <button className="w-full bg-brand-brown text-white py-3 rounded-lg shadow hover:brightness-95 transition">Ver cardápio completo</button>
              </div>
            </div>
          </aside>
        </div>

        <Section title="Mais vendidos" className="mt-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="text-sm text-gray-600">Carregando...</div>
          </div>
        </Section>
      </section>

      <WhatsAppButton phone={'+5511999999999'} />
      <Footer />
    </main>
  );
}
