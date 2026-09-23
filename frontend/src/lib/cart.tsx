import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Product = {
  id: string;
  name: string;
  sku: string;
  collection: string;
  shape: string;
  price: number;
  msrp: number;
  available: number;
  max: number;
  image: string | null;
  images: number;
  trending?: boolean;
  recipe?: boolean;
  createdAt: string;
};

export type CartLine = { product: Product; qty: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  total: number;
  reservedUntil: number | null;
  add: (p: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const RESERVE_MS = 15 * 60 * 1000;

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [reservedUntil, setReservedUntil] = useState<number | null>(null);

  useEffect(() => {
    if (lines.length === 0) setReservedUntil(null);
    else if (!reservedUntil) setReservedUntil(Date.now() + RESERVE_MS);
  }, [lines.length, reservedUntil]);

  const add = useCallback((p: Product, qty = 1) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.product.id === p.id);
      if (i === -1) return [...ls, { product: p, qty: Math.min(qty, p.max) }];
      const next = [...ls];
      next[i] = { ...next[i], qty: Math.min(next[i].qty + qty, p.max) };
      return next;
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.product.id !== id) : ls.map((l) => (l.product.id === id ? { ...l, qty: Math.min(qty, l.product.max) } : l))));
  }, []);

  const remove = useCallback((id: string) => setLines((ls) => ls.filter((l) => l.product.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => ({
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    total: lines.reduce((s, l) => s + l.qty * l.product.price, 0),
    reservedUntil,
    add,
    setQty,
    remove,
    clear,
  }), [lines, reservedUntil, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function useCountdown(until: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return null;
  const s = Math.max(0, Math.floor((until - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
