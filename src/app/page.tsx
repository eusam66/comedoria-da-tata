import React from 'react';
import Header from '../components/layout/Header';
import Banner from '../components/Banner';
import Section from '../components/Section';
import DishCard from '../components/DishCard';
import WhatsAppButton from '../components/WhatsAppButton';
import Footer from '../components/layout/Footer';
import CategoryList from '../components/CategoryList';
import DishesBrowser from '../components/DishesBrowser';
import { getCategories, /* getBanners */ } from '../lib/api';
import { bannersRepo } from '../lib/repos/bannersRepo';

export default async function HomePage() {
  const open = true;
  const avgTime = '30-45 min';

  const categories = await getCategories();
  const banners = await bannersRepo.list().catch(()=>[]);

  return (
    <main className="min-h-screen flex flex-col">
      <Header open={open} avgTime={avgTime} />

      <div className="container mx-auto px-4 py-4 flex-1">
        <Banner banner={banners[0] || { id: 'b-placeholder', title: 'Promoção do dia', subtitle: 'Frete grátis' }} />

        <div className="mt-4">
          <div className="mb-3">
            {/* DishesBrowser é um componente cliente que se conecta a /api/dishes para busca/filtragem */}
            <DishesBrowser categories={categories} />
          </div>

          <h3 className="text-lg font-semibold mb-2">Categorias</h3>
          <CategoryList categories={categories} />
        </div>

        <Section title="Mais vendidos">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DishesBrowser handles lists; keep this section for SEO/future server rendering */}
            <div className="text-sm text-gray-600">Carregando...</div>
          </div>
        </Section>

      </div>

      <WhatsAppButton phone={'+5511999999999'} />
      <Footer />
    </main>
  );
}
