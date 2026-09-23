import type { Product } from './cart';

const img = (n: string) => `/products/${n}.webp`;

export const products: Product[] = [
  { id: 'p1', name: 'Lone Wolf Trucker', sku: '101-2449-VOI01-O/S', collection: 'The Farm', shape: 'Trucker', price: 16, msrp: 40, available: 4680, max: 50, image: img('lone-wolf'), images: 4, trending: true, recipe: true, createdAt: '2026-08-20' },
  { id: 'p2', name: 'Panther Trucker', sku: '101-2450-VOI01-O/S', collection: 'The Farm', shape: 'Trucker', price: 16, msrp: 40, available: 2350, max: 50, image: img('panther'), images: 4, trending: true, recipe: true, createdAt: '2026-08-18' },
  { id: 'p3', name: 'Black Sheep Trucker', sku: '101-2457-VOI01-O/S', collection: 'The Farm', shape: 'Trucker', price: 16, msrp: 40, available: 1643, max: 50, image: img('black-sheep'), images: 4, trending: true, recipe: true, createdAt: '2026-08-15' },
  { id: 'p4', name: 'Panther Trucker', sku: '101-2510-VOI01-O/S', collection: 'Core', shape: 'Trucker', price: 16, msrp: 40, available: 766, max: 50, image: img('panther'), images: 4, trending: true, recipe: true, createdAt: '2026-08-12' },
  { id: 'p5', name: 'Alpha Dog', sku: '101-0214-BLK-O/S', collection: 'Core', shape: 'Trucker', price: 16, msrp: 40, available: 1, max: 50, image: null, images: 0, createdAt: '2026-07-30' },
  { id: 'p6', name: 'Goat Beard', sku: '101-0328-BLK-O/S', collection: 'The Farm', shape: 'Trucker', price: 16, msrp: 40, available: 912, max: 50, image: img('goat'), images: 1, createdAt: '2026-07-22' },
  { id: 'p7', name: 'Goat Beard', sku: '101-0328-VOI01-O/S', collection: 'The Farm', shape: 'Trucker', price: 16, msrp: 40, available: 388, max: 50, image: img('goat'), images: 2, recipe: true, createdAt: '2026-07-20' },
  { id: 'p8', name: 'The Cock', sku: '101-0378-BLA01-O/S', collection: 'The Farm', shape: 'Trucker', price: 16, msrp: 40, available: 2210, max: 50, image: img('rooster'), images: 3, createdAt: '2026-07-14' },
  { id: 'p9', name: 'Lone Wolf Trucker', sku: '101-2449-BLK-O/S', collection: 'Core', shape: 'Trucker', price: 16, msrp: 40, available: 3120, max: 50, image: img('lone-wolf'), images: 2, createdAt: '2026-06-30' },
  { id: 'p10', name: 'Black Sheep Trucker', sku: '101-2457-BLK-O/S', collection: 'Core', shape: 'Trucker', price: 16, msrp: 40, available: 54, max: 50, image: img('black-sheep'), images: 2, createdAt: '2026-06-22' },
  { id: 'p11', name: 'The Cock', sku: '101-0378-WHI-O/S', collection: 'Heritage', shape: 'Trucker', price: 16, msrp: 40, available: 0, max: 50, image: img('rooster'), images: 1, createdAt: '2026-06-10' },
  { id: 'p13', name: 'The GOAT', sku: '101-0385-DEN01-O/S', collection: 'The Farm', shape: 'Trucker', price: 8.5, msrp: 42.5, available: 1200, max: 50, image: img('goat'), images: 2, createdAt: '2026-08-10' },
  { id: 'p14', name: 'The Gorilla', sku: '101-0386-BLK01-O/S', collection: 'The Farm', shape: 'Trucker', price: 8.5, msrp: 42.5, available: 860, max: 50, image: null, images: 0, createdAt: '2026-08-08' },
  { id: 'p12', name: 'Panther Snapback', sku: '101-2450-BLK-O/S', collection: 'Heritage', shape: 'Snapback', price: 18, msrp: 45, available: 640, max: 50, image: img('panther'), images: 1, createdAt: '2026-05-28' },
];

export const collections = ['All collections', ...Array.from(new Set(products.map((p) => p.collection)))];
export const shapes = ['All shapes', ...Array.from(new Set(products.map((p) => p.shape)))];
