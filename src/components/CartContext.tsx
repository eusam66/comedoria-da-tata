'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DishRow } from '../lib/types';

export type CartItem = {
  id: string; // dish id
  dish: DishRow;
  qty: number;
  notes?: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (dish: DishRow, qty?: number, notes?: string) => void;
  updateQty: (id: string, qty: number) => void;
  updateNotes: (id: string, notes: string) => void;
  removeItem: (id: string) => void;
  clear: () => void;
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
        setItems(JSON.parse(raw));
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

  function addItem(dish: DishRow, qty = 1, notes?: string) {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === dish.id);
      if (existing) {
        return prev.map((p) => (p.id === dish.id ? { ...p, qty: p.qty + qty, notes: notes ?? p.notes } : p));
      }
      const newItem: CartItem = { id: dish.id, dish, qty, notes };
      return [...prev, newItem];
    });
    setIsOpen(true);
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

  const subtotal = useMemo(() => items.reduce((s, it) => s + Number(it.dish.price || 0) * it.qty, 0), [items]);
  const total = subtotal; // taxes/fees can be added later
  const itemCount = useMemo(() => items.reduce((s, it) => s + it.qty, 0), [items]);

  const value: CartContextValue = {
    items,
    addItem,
    updateQty,
    updateNotes,
    removeItem,
    clear,
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
