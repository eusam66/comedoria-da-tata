// script: seed.js
// Usage: node scripts/seed.js
// Requires env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require('@supabase/supabase-js');

async function main(){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key){
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env before running');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log('Seeding categories...');
  const categories = [
    { name: 'Pizzas' },
    { name: 'Massas' },
    { name: 'Saladas' },
    { name: 'Bebidas' },
    { name: 'Sobremesas' }
  ];
  for(const c of categories){
    await supabase.from('categories').upsert(c, { onConflict: 'name' });
  }

  console.log('Seeding dishes...');
  const dishes = [
    { code: 'PZ001', name: 'Pizza Margherita', slug: 'pizza-margherita', description: 'Tomate, mussarela e manjericão', price: 42.5, ingredients: 'tomate, mussarela, manjericão', servings:2 },
    { code: 'MS002', name: 'Spaghetti alla Carbonara', slug: 'spaghetti-alla-carbonara', description: 'Molho cremoso com pancetta', price: 39.0, ingredients: 'espaguete, pancetta, ovos', servings:1 },
    { code: 'SL003', name: 'Salada Caesar', slug: 'salada-caesar', description: 'Alface, croutons e molho especial', price: 28.0, ingredients: 'alface, croutons, parmesão', servings:1 },
    { code: 'SD004', name: 'Brownie de Doce de Leite', slug: 'brownie-doce-de-leite', description: 'Sobremesa quente com sorvete', price: 18.0, ingredients: 'chocolate, doce de leite', servings:1 }
  ];

  for(const d of dishes){
    await supabase.from('dishes').upsert(d, { onConflict: 'slug' });
  }

  console.log('Seeding banners...');
  const banners = [
    { title: 'Promoção do dia', subtitle: 'Frete grátis para pedidos acima de R$ 50' }
  ];
  for(const b of banners){ await supabase.from('banners').upsert(b, { onConflict: 'title' }); }

  console.log('Seeding restaurant_settings...');
  await supabase.from('restaurant_settings').upsert({ id: '00000000-0000-0000-0000-000000000001', name: 'Comedoria da Tata', phone: '(11) 99999-9999', address: 'Endereço fictício' }, { onConflict: 'id' });

  console.log('Seed finished');
}

main().catch((e)=>{ console.error(e); process.exit(1); });
