import { useEffect, useState } from 'react';

export type Terms = 'invoiced' | 'card';
const KEY = 'goorin.terms';
const EVT = 'goorin:terms';

export const termsLabel: Record<Terms, string> = { invoiced: '50% Prepay, 50% Net 60', card: 'Credit card · Pay in full' };
export const cardOnFile = { brand: 'Visa', last4: '4242', exp: '08/28', name: 'Ryan Mirabile' };

const read = (): Terms => ((typeof window !== 'undefined' && (localStorage.getItem(KEY) as Terms)) || 'card');

export function useTerms(): [Terms, (t: Terms) => void] {
  const [terms, set] = useState<Terms>(read);
  useEffect(() => {
    const sync = () => set(read());
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);
  const update = (t: Terms) => { localStorage.setItem(KEY, t); window.dispatchEvent(new Event(EVT)); };
  return [terms, update];
}
