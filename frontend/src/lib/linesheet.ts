
export type LsItem = { id: string; name: string; color: string; size: string; sku: string; style: string; collection: string; shape: string; season: string; colors: string[]; base: number; msrp: number; image: string | null; moq: number; delivery: string };
export type PriceList = { id: string; name: string; mult: number; note: string };
export type LsCustomer = { id: string; num: string; name: string; priceList: string; contact: string };

export const PRICE_LISTS: PriceList[] = [
  { id: 'usw', name: 'US Wholesale', mult: 1, note: 'Standard wholesale · Net 30' },
  { id: 'key', name: 'Key Account', mult: 0.92, note: 'Volume tier · Net 60' },
  { id: 'dist', name: 'Distributor', mult: 0.55, note: 'FOB factory · prepay 50%' },
  { id: 'intl', name: 'International EUR', mult: 1.08, note: 'EUR equivalent · DDP' },
];

export const LS_CUSTOMERS: LsCustomer[] = [
  { id: 'c1', num: '70057', name: 'Mirabile Distribution', priceList: 'dist', contact: 'Ryan M' },
  { id: 'c2', num: '70012', name: 'Lids', priceList: 'key', contact: 'Buying team' },
  { id: 'c3', num: '70019', name: 'Buckle Inc., The', priceList: 'key', contact: 'Merch dept' },
  { id: 'c4', num: '70088', name: 'SASAtrend', priceList: 'dist', contact: 'Ling Zhao' },
  { id: 'c5', num: '70091', name: 'Grupo Gardea SA DE CV', priceList: 'dist', contact: 'Diego R' },
  { id: 'c6', num: '70103', name: 'Hat Club', priceList: 'usw', contact: 'Store ops' },
  { id: 'c7', num: '70110', name: 'Urban Outfitters', priceList: 'key', contact: 'Accessories buyer' },
  { id: 'c8', num: '70115', name: '3 Potrillos Ww', priceList: 'usw', contact: '—' },
  { id: 'c9', num: '70121', name: '3j Shops', priceList: 'usw', contact: '—' },
  { id: 'c10', num: '70124', name: '74 Man Store', priceList: 'usw', contact: '—' },
  { id: 'c11', num: '70130', name: 'Zumiez', priceList: 'key', contact: 'Category buyer' },
  { id: 'c12', num: '70136', name: 'Manhattan International Concepts', priceList: 'dist', contact: 'Import desk' },
];

export const SEASONS = ['SS27', 'FW26', 'Core'];
const DELIVERY: Record<string, string> = { SS27: 'Jan 15 – Feb 28, 2027', FW26: 'Jul 15 – Aug 30, 2026', Core: 'At once · ATS' };
const IMG: Record<string, string | null> = { GOAT: '/products/goat.webp', Panther: '/products/panther.webp', Sheep: '/products/black-sheep.webp', Wolf: '/products/lone-wolf.webp', Cock: '/products/rooster.webp' };
const NAMES: [string, string, string, string][] = [
  ['The GOAT', 'GOAT', '101-0385', 'The Farm'], ['The Gorilla', 'x', '101-0386', 'The Farm'], ['The Koala', 'x', '101-0443', 'The Farm'], ['The Fox', 'x', '101-0528', 'The Farm'], ['The Suede Spider', 'x', '101-1747', 'Suede'],
  ['The Cuddly Bear', 'x', '101-1793', 'The Farm'], ['The Suede Panther', 'Panther', '101-1813', 'Suede'], ['The Suede Cheetah', 'x', '101-1848', 'Suede'], ['The Defense Bear', 'x', '101-1985', 'The Farm'], ['The Wiener Dog', 'x', '101-2053', 'The Farm'],
  ['Lone Wolf', 'Wolf', '101-2449', 'The Farm'], ['Panther', 'Panther', '101-2450', 'Core'], ['Black Sheep', 'Sheep', '101-2457', 'The Farm'], ['The Cock', 'Cock', '101-0378', 'Heritage'], ['Gone Fishin\'', 'x', '101-2121', 'Heritage'],
  ['Suede Goat', 'GOAT', '101-2126', 'Suede'], ['The Cancelled Skull', 'x', '101-2392', 'Core'], ['Papa Core', 'x', '101-2437', 'Core'], ['Dean the Butcher', 'x', '100-4983', 'Fedoras'], ['Crush', 'x', '101-0175', 'Core'],
  ['Floater', 'x', '101-0330', 'Core'], ['The Deer Rack', 'x', '101-0398', 'The Farm'], ['The Frenchie Bulldog', 'x', '101-1668', 'The Farm'], ['The Guard Dog', 'x', '101-1767', 'The Farm'], ['John Sr.', 'x', '100-1273', 'Fedoras'],
];
const COLORWAYS: [string, string][] = [['Void Black', 'BLK01'], ['Dark Denim', 'DEN01'], ['Gloss Gray', 'GRY02'], ['Olive Green', 'GRN04'], ['Dust White', 'WHT02'], ['Edge Navy', 'NVY01'], ['Khaki Tan', 'TAN07'], ['Whiskey', 'WKY'], ['Oil Gray', 'OIL01'], ['Blush', 'BLU01']];
const SIZES = ['One Size', 'One Size', 'One Size', 'Medium', 'Large', 'X-Large'];

export const CATALOG: LsItem[] = NAMES.flatMap(([name, imgKey, style, collection], n) => {
  const cw = COLORWAYS.slice((n * 3) % 7, ((n * 3) % 7) + (n % 4 === 0 ? 3 : 2));
  return cw.map(([color, code], k) => {
    const i = n * 3 + k; const season = i % 5 === 0 ? 'Core' : i % 3 === 0 ? 'FW26' : 'SS27';
    const size = collection === 'Fedoras' ? SIZES[3 + (k % 3)] : 'One Size';
    const base = collection === 'Fedoras' ? 42 : collection === 'Suede' ? 22 : season === 'Core' ? 14 : 16;
    return { id: `${style}-${code}`, name, color, size, sku: `${style}-${code}-${size === 'One Size' ? 'O/S' : size.slice(0, 1) === 'X' ? 'XL' : size.slice(0, 1)}`, style, collection, shape: collection === 'Fedoras' ? 'Fedora' : collection === 'Core' ? 'Baseball' : 'Trucker',
      season, colors: [color], base, msrp: Math.round(base * 2.5), image: k === 0 || n % 2 === 0 ? (IMG[imgKey] ?? Object.values(IMG)[(n + k) % 5]) : null, moq: 6, delivery: DELIVERY[season] };
  });
});

export const priceFor = (item: LsItem, list: PriceList) => Math.round(item.base * list.mult * 100) / 100;
export const fmt = (n: number, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur === 'EUR' ? 'EUR' : 'USD' }).format(n);
