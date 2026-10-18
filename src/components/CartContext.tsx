'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { cents, effectivePrice } from '../lib/pricing';
import { DishRow } from '../lib/types';
import { SelectedAddon, selectedAddonsKey, selectedAddonsTotal } from '../lib/addons';

export type CartItem = {
  id: string;
  dish: DishRow;
  qty: number;
  notes?: string;
  selectedAddons: SelectedAddon[];
  unitPrice: number;
};

type AddItemOptions = {
  notes?: string;
  selectedAddons?: SelectedAddon[];
  openCart?: boolean;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (dish: DishRow, qty?: number, options?: string | AddItemOptions) => void;
  updateQty: (id: string, qty: number) => void;
  updateNotes: (id: string, notes: string) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  applyQuote: (rows: Array<{ id: string; price: number; base_price: number; regular_price: number; promo_active: boolean; addons: SelectedAddon[] }>) => void;
  subtotal: number;
  total: number;
  itemCount: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        setItems(
          (parsed || []).map((item) => {
            const normalizedAddons = Array.isArray(item.selectedAddons)
              ? item.selectedAddons.filter((addon) => addon.qty > 0)
              : [];
            const basePrice = effectivePrice(item.dish);
            const unitPrice = (cents(basePrice) + cents(selectedAddonsTotal(normalizedAddons))) / 100;
            return {
              ...item,
              selectedAddons: normalizedAddons,
              unitPrice
            };
          })
        );
      }
    } catch (e) {
      console.warn('Failed to load cart from localStorage', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to persist cart to localStorage', e);
    }
  }, [items]);

  function addItem(dish: DishRow, qty = 1, options?: string | AddItemOptions) {
    const notes = typeof options === 'string' ? options : options?.notes;
    const selectedAddons = typeof options === 'string' ? [] : (options?.selectedAddons || []).filter((addon) => addon.qty > 0);
    const addonKey = selectedAddonsKey(selectedAddons);
    const notesKey = (notes || '').trim();
    const cartKey = `${dish.id}|${addonKey}|${notesKey}`;
    const unitPrice = (cents(effectivePrice(dish)) + cents(selectedAddonsTotal(selectedAddons))) / 100;

    setItems((prev) => {
      const existing = prev.find((p) => p.id === cartKey);
      if (existing) {
        return prev.map((p) => (p.id === cartKey ? { ...p, qty: p.qty + qty, notes: notes ?? p.notes } : p));
      }
      const newItem: CartItem = { id: cartKey, dish, qty, notes, selectedAddons, unitPrice };
      return [...prev, newItem];
    });
    if (typeof options === 'string' || options?.openCart !== false) setIsOpen(true);
  }

  function updateQty(id: string, qty: number) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, qty: Math.max(1, qty) } : p)));
  }

  function updateNotes(id: string, notes: string) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, notes } : p)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function clear() {
    setItems([]);
  }

  const subtotal = useMemo(() => items.reduce((s, it) => s + cents(it.unitPrice) * it.qty, 0) / 100, [items]);
  const total = subtotal; // taxes/fees can be added later
  const itemCount = useMemo(() => items.reduce((s, it) => s + it.qty, 0), [items]);

  const value: CartContextValue = {
    items,
    addItem,
    updateQty,
    updateNotes,
    removeItem,
    clear,
    applyQuote: (rows) => setItems(current => current.map((item, index) => {
      const row = rows[index];
      if (!row || row.id !== item.dish.id) return item;
      return { ...item, unitPrice: Number(row.price), selectedAddons: row.addons,
        dish: { ...item.dish, name: (row as any).name || item.dish.name, price: Number(row.regular_price),
          promo_price: row.promo_active ? Number(row.base_price) : item.dish.promo_price, promo_active: row.promo_active } };
    })),
    subtotal,
    total,
    itemCount,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
