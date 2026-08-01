import React from 'react';
import Header from '../components/layout/Header';
import Banner from '../components/Banner';
import Section from '../components/Section';
import WhatsAppButton from '../components/WhatsAppButton';
import Footer from '../components/layout/Footer';
import CategoryList from '../components/CategoryList';
import DishesBrowser from '../components/DishesBrowser';
import DishCard from '../components/DishCard';
import { getCategories, getDishes } from '../lib/api';
import { bannersRepo } from '../lib/repos/bannersRepo';

export const revalidate = 60;

export const metadata = {
  title: 'Comedoria da Tata | Cardápio Digital',
  description: 'Descubra pratos caseiros, delivery rápido e ofertas especiais direto da Comedoria da Tata.',
  openGraph: {
    title: 'Comedoria da Tata | Cardápio Digital',
    description: 'Descubra pratos caseiros, delivery rápido e ofertas especiais direto da Comedoria da Tata.',
    type: 'website',
    images: ['/icons/icon-512.png']
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comedoria da Tata | Cardápio Digital',
    description: 'Descubra pratos caseiros, delivery rápido e ofertas especiais direto da Comedoria da Tata.',
    images: ['/icons/icon-512.png']
  }
};

export default async function HomePage() {
  const open = true;
  const avgTime = '30-45 min';

  const [categories, dishes] = await Promise.all([getCategories(), getDishes()]);
  const banners = await bannersRepo.list().catch(() => []);
  const promoBanner = banners[0]
    ? {
        ...banners[0],
        title: banners[0].title ?? 'Promoção do dia',
        subtitle: banners[0].subtitle ?? 'Frete grátis acima de R$ 60'
      }
    : { id: 'b-placeholder', title: 'Promoção do dia', subtitle: 'Frete grátis' };

  const featuredDishes = dishes.filter((dish) => dish.popular).slice(0, 4);
  const newDishes = dishes.filter((dish) => dish.isNew).slice(0, 4);

  return (
    <main className="min-h-screen flex flex-col bg-[#f7efe4]">
      <Header open={open} avgTime={avgTime} />

      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.8fr] gap-6 items-start">
          <div>
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-brown via-brand-brown to-brand-orange p-8 text-white shadow-[0_30px_90px_-40px_rgba(42,20,15,0.65)]">
              <div className="absolute inset-0 bg-[url('/icons/icon-512.png')] bg-top-right opacity-10 mix-blend-overlay pointer-events-none" />
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl">Comedoria da Tata</h1>
              <p className="mt-3 max-w-2xl text-lg text-white/90">Sabores caseiros, pratos feitos com carinho e entrega rápida. {avgTime}.</p>
              <div className="mt-6 max-w-xl">
                <Banner banner={promoBanner} />
              </div>
            </div>

            <div className="mt-8">
              <Section title="Cardápio" description="Busque por nome, categoria ou ingrediente e descubra o prato ideal para o seu pedido.">
                <DishesBrowser categories={categories} />
              </Section>
            </div>
          </div>

          <aside className="lg:sticky lg:top-6">
            <div className="rounded-[2rem] border border-brand-brown/10 bg-white/90 p-5 shadow-[0_25px_80px_-40px_rgba(42,20,15,0.55)]">
              <h3 className="text-lg font-semibold text-brand-dark">Categorias</h3>
              <div className="mt-4">
                <CategoryList categories={categories} />
              </div>
              <div className="mt-5 rounded-[1.5rem] border border-brand-orange/20 bg-brand-orange/10 p-4 text-sm text-brand-brown/80">
                <p className="font-semibold text-brand-dark">Pratos feitos para delivery</p>
                <p className="mt-2">Acesse o cardápio completo e peça direto pelo WhatsApp.</p>
              </div>
            </div>
          </aside>
        </div>

        <Section title="Mais vendidos" description="Os pratos mais pedidos da semana" className="mt-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featuredDishes.map((dish) => (
              <DishCard key={dish.id} dish={dish as any} />
            ))}
          </div>
        </Section>

        <Section title="Novidades" description="Novos sabores para experimentar" className="mt-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {newDishes.map((dish) => (
              <DishCard key={dish.id} dish={dish as any} />
            ))}
          </div>
        </Section>
      </section>

      <WhatsAppButton phone={'+5511999999999'} />
      <Footer />
    </main>
  );
}
