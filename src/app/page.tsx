"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./storefront.css";

type Dish = {
  id: string | number;
  slug?: string;
  name: string;
  cat: string;
  desc: string;
  price: number;
  image: string;
  tag: string;
  available?: boolean;
};

const fallbackDishes: Dish[] = [
  { id: "lasanha-frango", name: "Lasanha de frango", cat: "Lasanhas", desc: "900 g · Serve até 2 pessoas.", price: 54.9, image: "/pratos/lasanha-1.jpg", tag: "Lasanha", available: true },
  { id: "lasanha-carne", name: "Lasanha de carne", cat: "Lasanhas", desc: "900 g · Serve até 2 pessoas.", price: 59.9, image: "/pratos/lasanha-2.jpg", tag: "Lasanha", available: true },
  { id: "feijoada-completa", name: "Feijoada completa", cat: "Feijoadas", desc: "Serve 3 a 4 pessoas · Arroz, farofa, vinagrete, torresmo e laranja.", price: 64.9, image: "/pratos/feijoada-completa.jpg", tag: "Completa", available: true },
  { id: "meia-feijoada", name: "Meia feijoada", cat: "Feijoadas", desc: "Arroz, farofa, vinagrete, torresmo e laranja.", price: 59.9, image: "/pratos/meia-feijoada.png", tag: "Meia", available: true },
  { id: "galeto-completo", name: "Galeto completo", cat: "Galetos", desc: "Serve 3 a 4 pessoas · Arroz, feijão macassar, farofa e vinagrete.", price: 59.9, image: "/pratos/galeto-completo.jpg", tag: "Completo", available: true },
  { id: "meio-galeto", name: "Meio galeto", cat: "Galetos", desc: "Serve até 2 pessoas · Arroz, feijão macassar, farofa e vinagrete.", price: 39.99, image: "/pratos/meio-galeto-provisorio.png", tag: "Meio", available: true },
  { id: "galeto-sem-acompanhamentos", name: "Galeto sem acompanhamentos", cat: "Galetos", desc: "Acompanha farofa e vinagrete.", price: 34.99, image: "/pratos/galeto-embalado.jpg", tag: "Galeto", available: true },
  { id: "feijao-charqueado", name: "Feijão charqueado", cat: "Feijões", desc: "Serve 3 a 4 pessoas · Arroz, farofa e vinagrete.", price: 49.99, image: "/pratos/feijao-charqueado.jpg", tag: "Completo", available: true },
  { id: "meio-charqueado", name: "Meio charqueado", cat: "Feijões", desc: "Arroz, farofa e vinagrete.", price: 39.99, image: "/pratos/meio-charqueado.png", tag: "Meio", available: true },
];

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const keyOf = (id: string | number) => String(id);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function Home() {
  const [dishes, setDishes] = useState<Dish[]>(fallbackDishes);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", delivery: "delivery", street: "", number: "", neighborhood: "", complement: "", reference: "", payment: "pix", change: "", notes: "" });

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      window.location.replace(`/admin/reset-password${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("comedoria-cart");
        if (saved) setCart(JSON.parse(saved));
      } catch {
        localStorage.removeItem("comedoria-cart");
      }
      setCartLoaded(true);
    }, 0);

    fetch("/api/menu")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((remote: Dish[]) => {
        if (!Array.isArray(remote) || !remote.length) return;
        const enriched = remote.map((dish) => {
          const local = fallbackDishes.find((item) => normalize(item.name) === normalize(dish.name));
          return {
            ...local,
            ...dish,
            image: dish.image || local?.image || "/branding/logo-oficial.jpg",
            cat: dish.cat === "Pratos" && local ? local.cat : dish.cat,
            desc: dish.desc || local?.desc || "Receita caseira preparada com carinho.",
          } as Dish;
        });
        setDishes(enriched);
      })
      .catch(() => {});
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (cartLoaded) localStorage.setItem("comedoria-cart", JSON.stringify(cart));
  }, [cart, cartLoaded]);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(dishes.map((dish) => dish.cat)))], [dishes]);
  const filtered = useMemo(() => dishes.filter((dish) => {
    const matchesCategory = category === "Todos" || dish.cat === category;
    const haystack = normalize(`${dish.name} ${dish.cat} ${dish.desc}`);
    return matchesCategory && haystack.includes(normalize(query.trim()));
  }), [dishes, query, category]);
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const total = dishes.reduce((sum, dish) => sum + (cart[keyOf(dish.id)] || 0) * dish.price, 0);

  const changeQuantity = (dish: Dish, amount: number) => {
    if (dish.available === false) return;
    const key = keyOf(dish.id);
    setCart((current) => ({ ...current, [key]: Math.max(0, (current[key] || 0) + amount) }));
  };
  const setField = (field: string, value: string) => setCustomer((current) => ({ ...current, [field]: value }));

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items: Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id, quantity })) }),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || "Não foi possível registrar o pedido.");
      const lines = dishes.filter((dish) => cart[keyOf(dish.id)]).map((dish) => `• ${cart[keyOf(dish.id)]}x ${dish.name} — ${money(dish.price * cart[keyOf(dish.id)])}`);
      const payment = customer.payment === "pix" ? "PIX" : customer.payment === "cash" ? `Dinheiro${customer.change ? ` (troco para R$ ${customer.change})` : ""}` : "Cartão na entrega";
      const address = customer.delivery === "delivery" ? `📍 *Endereço:* ${customer.street}, ${customer.number}\n*Bairro:* ${customer.neighborhood}${customer.complement ? `\n*Complemento:* ${customer.complement}` : ""}${customer.reference ? `\n*Referência:* ${customer.reference}` : ""}` : "🏠 *Retirada no local*";
      const message = `🟠 *NOVO PEDIDO #${saved.code}*\n\n👤 *Cliente:* ${customer.name}\n📱 *Telefone:* ${customer.phone}\n\n${address}\n\n🍽️ *ITENS*\n${lines.join("\n")}\n\n💰 *Total: ${money(saved.totalCents / 100)}*\n💳 *Pagamento:* ${payment}${customer.notes ? `\n\n📝 *Observações:* ${customer.notes}` : ""}\n\nPedido enviado pelo cardápio da Comedoria da Tata.`;
      setCart({});
      window.location.href = `https://wa.me/5581992743126?text=${encodeURIComponent(message)}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao registrar o pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main id="top">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="Comedoria da Tata — início">
            <img src="/branding/logo-oficial.jpg" alt="" />
            <span><b>Comedoria da Tata</b><small>Sabor de casa em cada prato</small></span>
          </a>
          <div className="header-status glass"><span className="status-dot" /> <b>Aberto agora</b><span>30–45 min</span></div>
          <label className="header-search glass">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar prato ou ingrediente" aria-label="Buscar no cardápio" />
          </label>
          <button className="header-cart" onClick={() => setCartOpen(true)} aria-label={`Abrir sacola com ${count} itens`}>
            <span>Sacola</span><b>{count}</b>
          </button>
        </div>
      </header>

      <section className="hero" aria-label="Destaque da Comedoria da Tata">
        <div className="hero-photo" />
        <div className="hero-shade" />
        <div className="hero-content">
          <h1>Comedoria<br />da Tata</h1>
          <p className="hero-slogan">Sabor de casa em cada prato.</p>
          <div className="promo-card glass">
            <span className="promo-icon" aria-hidden="true">★</span>
            <div><small>Promoções</small><b>Confira as condições do dia</b><span>Fale com a Comedoria pelo WhatsApp.</span></div>
          </div>
        </div>
      </section>

      <section className="menu-section" id="cardapio">
        <div className="categories-panel glass-dark">
          <div className="categories-heading"><div><small>Navegue pelo cardápio</small><h2>Categorias</h2></div><span>{filtered.length} opções</span></div>
          <nav className="category-list" aria-label="Categorias de pratos">
            {categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
          </nav>
        </div>

        <div className="menu-heading">
          <div><p className="eyebrow">ESCOLHA SEUS PRATOS</p><h2>Nosso cardápio</h2><p>Escolha seus favoritos e monte seu pedido em poucos toques.</p></div>
        </div>

        {filtered.length ? <div className="dish-grid">
          {filtered.map((dish) => {
            const quantity = cart[keyOf(dish.id)] || 0;
            const unavailable = dish.available === false;
            return <article className={`dish-card${unavailable ? " unavailable" : ""}`} key={dish.id}>
              <div className="dish-photo"><img src={dish.image} alt={dish.name} loading="lazy" /><span>{unavailable ? "Esgotado" : dish.tag}</span></div>
              <div className="dish-info">
                <small>{dish.cat}</small><h3>{dish.name}</h3><p>{dish.desc}</p>
                <footer><strong>{money(dish.price)}</strong>{quantity > 0 ? <div className="stepper"><button onClick={() => changeQuantity(dish, -1)} aria-label={`Remover uma unidade de ${dish.name}`}>−</button><b>{quantity}</b><button onClick={() => changeQuantity(dish, 1)} aria-label={`Adicionar uma unidade de ${dish.name}`}>+</button></div> : <button className="add-button" disabled={unavailable} onClick={() => changeQuantity(dish, 1)}>{unavailable ? "Indisponível" : "Adicionar"}</button>}</footer>
              </div>
            </article>;
          })}
        </div> : <div className="empty-state"><b>Nenhum prato encontrado</b><span>Tente outra busca ou categoria.</span></div>}
      </section>

      <section className="promise"><div><p className="eyebrow">INFORMAÇÕES DO PEDIDO</p><h2>Peça pelo<br />cardápio online.</h2></div><div className="benefits"><p><b>01</b><span><strong>Porções e acompanhamentos</strong><small>Veja no cardápio o que acompanha cada prato e quantas pessoas ele serve.</small></span></p><p><b>02</b><span><strong>Pedido simples</strong><small>Escolha os pratos, confira a sacola e informe os dados de entrega.</small></span></p><p><b>03</b><span><strong>Envio pelo WhatsApp</strong><small>A mensagem é preparada com os itens e os dados informados no checkout.</small></span></p></div></section>
      <footer className="site-footer"><b>Comedoria da Tata</b><span>Delivery · Recife · (81) 99274-3126</span></footer>

      <a className="whatsapp-float" href="https://wa.me/5581992743126" target="_blank" rel="noreferrer" aria-label="Falar com a Comedoria no WhatsApp"><b>WhatsApp</b><span>Atendimento</span></a>
      {count > 0 && !cartOpen && !checkoutOpen && <button className="mobile-bag" onClick={() => setCartOpen(true)}><span><b>{count} {count === 1 ? "item" : "itens"}</b><small>Ver minha sacola</small></span><strong>{money(total)}</strong></button>}

      {cartOpen && <div className="overlay"><aside role="dialog" aria-modal="true" aria-label="Sua sacola"><button className="close" onClick={() => setCartOpen(false)} aria-label="Fechar sacola">×</button><p className="eyebrow">SEU PEDIDO</p><h2>Sacola</h2>{count === 0 ? <p className="empty-cart">Sua sacola está vazia.</p> : dishes.filter((dish) => cart[keyOf(dish.id)]).map((dish) => <div className="cart-line" key={dish.id}><span><b>{dish.name}</b><small>{money(dish.price)}</small></span><div><button onClick={() => changeQuantity(dish, -1)} aria-label={`Remover uma unidade de ${dish.name}`}>−</button><b>{cart[keyOf(dish.id)]}</b><button onClick={() => changeQuantity(dish, 1)} aria-label={`Adicionar uma unidade de ${dish.name}`}>+</button></div></div>)}<div className="cart-total"><span>Total</span><b>{money(total)}</b></div><button className="continue" disabled={!count} onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Continuar para entrega</button></aside></div>}

      {checkoutOpen && <div className="overlay checkout-overlay"><aside role="dialog" aria-modal="true" aria-label="Finalizar pedido"><button className="close" onClick={() => setCheckoutOpen(false)} aria-label="Fechar checkout">×</button><button className="back" type="button" onClick={() => { setCheckoutOpen(false); setCartOpen(true); }}>← Voltar à sacola</button><p className="eyebrow">FINALIZAR PEDIDO</p><h2>Seus dados</h2><form className="checkout-form" onSubmit={submitOrder}>
        <label>Nome completo<input required autoComplete="name" value={customer.name} onChange={(event) => setField("name", event.target.value)} placeholder="Digite seu nome" /></label>
        <label>Telefone<input required type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="(81) 99999-9999" /></label>
        <fieldset><legend>Como deseja receber?</legend><div className="choices"><label><input type="radio" name="delivery" checked={customer.delivery === "delivery"} onChange={() => setField("delivery", "delivery")} /> Entrega</label><label><input type="radio" name="delivery" checked={customer.delivery === "pickup"} onChange={() => setField("delivery", "pickup")} /> Retirada</label></div></fieldset>
        {customer.delivery === "delivery" && <div className="address-fields"><label className="wide">Rua / avenida<input required autoComplete="street-address" value={customer.street} onChange={(event) => setField("street", event.target.value)} placeholder="Nome da rua" /></label><label>Número<input required inputMode="numeric" value={customer.number} onChange={(event) => setField("number", event.target.value)} placeholder="Nº" /></label><label>Bairro<input required value={customer.neighborhood} onChange={(event) => setField("neighborhood", event.target.value)} placeholder="Seu bairro" /></label><label>Complemento<input value={customer.complement} onChange={(event) => setField("complement", event.target.value)} placeholder="Casa, apto, bloco" /></label><label className="wide">Ponto de referência<input value={customer.reference} onChange={(event) => setField("reference", event.target.value)} placeholder="Próximo a..." /></label></div>}
        <fieldset><legend>Forma de pagamento</legend><div className="payment-choices"><label><input type="radio" name="payment" checked={customer.payment === "pix"} onChange={() => setField("payment", "pix")} /> PIX</label><label><input type="radio" name="payment" checked={customer.payment === "card"} onChange={() => setField("payment", "card")} /> Cartão na entrega</label><label><input type="radio" name="payment" checked={customer.payment === "cash"} onChange={() => setField("payment", "cash")} /> Dinheiro</label></div></fieldset>
        {customer.payment === "cash" && <label>Troco para quanto?<input inputMode="decimal" value={customer.change} onChange={(event) => setField("change", event.target.value)} placeholder="Ex.: 100,00" /></label>}
        <label>Observações<textarea value={customer.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Ex.: retirar cebola, chamar no portão..." /></label>
        <div className="checkout-total"><span>Total do pedido</span><strong>{money(total)}</strong></div><button className="whatsapp-submit" type="submit" disabled={submitting}>{submitting ? "Registrando pedido..." : "Enviar pedido pelo WhatsApp"}</button><small className="form-note">Você poderá revisar a mensagem antes de enviá-la.</small>
      </form></aside></div>}
    </main>
  );
}
