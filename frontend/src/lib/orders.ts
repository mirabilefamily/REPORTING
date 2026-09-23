export type OrderLine = { sku: string; name: string; upc: string; qty: number; price: number; msrp: number; image: string | null };
export type Order = {
  id: string; ref: string; date: string; shipStart: string; shipEnd: string; estimated: boolean; factory: string; shipment: string | null;
  status: 'Open' | 'Invoiced' | 'Shipped' | 'Delivered' | 'Cancelled'; payment: 'Paid in full' | 'Partially Paid' | 'Not invoiced' | 'Refunded'; lines: OrderLine[];
};

const goat: OrderLine = { sku: '101-0385-DEN01-O/S', name: 'The GOAT', upc: '090625433895', qty: 1, price: 8.5, msrp: 42.5, image: '/products/goat.webp' };
const gorilla: OrderLine = { sku: '101-0386-BLK01-O/S', name: 'The Gorilla', upc: '090625340896', qty: 1, price: 8.5, msrp: 42.5, image: null };
const wolf = (qty: number): OrderLine => ({ sku: '101-2449-VOI01-O/S', name: 'Lone Wolf Trucker', upc: '090625440012', qty, price: 16, msrp: 40, image: '/products/lone-wolf.webp' });
const sheep = (qty: number): OrderLine => ({ sku: '101-2457-VOI01-O/S', name: 'Black Sheep Trucker', upc: '090625440043', qty, price: 16, msrp: 40, image: '/products/black-sheep.webp' });
const F = 'ASI Global Limited (China)';

export const orders: Order[] = [
  { id: 'SO58739', ref: 'SS27 | Drop 3 | Mirabile Distribution', date: '2026-09-02', shipStart: '2027-01-06', shipEnd: '2027-01-13', estimated: true, factory: F, shipment: 'IS-0012', status: 'Open', payment: 'Not invoiced', lines: [goat, gorilla] },
  { id: 'SO57017', ref: 'SS27 | Drop 3 | Mirabile Distribution', date: '2026-08-27', shipStart: '2027-01-06', shipEnd: '2027-01-13', estimated: true, factory: F, shipment: null, status: 'Invoiced', payment: 'Partially Paid', lines: [goat, gorilla] },
  { id: 'SO56680', ref: 'SS27 | Drop 3 | Mirabile Distribution', date: '2026-08-25', shipStart: '2026-08-25', shipEnd: '2026-09-01', estimated: false, factory: F, shipment: 'IS-0009', status: 'Shipped', payment: 'Paid in full', lines: [goat, gorilla] },
  { id: 'SO55912', ref: 'Core | Replenishment', date: '2026-07-14', shipStart: '2026-07-19', shipEnd: '2026-07-22', estimated: false, factory: F, shipment: 'IS-0007', status: 'Delivered', payment: 'Paid in full', lines: [wolf(12), sheep(12)] },
  { id: 'SO55340', ref: 'Core | Replenishment', date: '2026-06-03', shipStart: '2026-06-09', shipEnd: '2026-06-12', estimated: false, factory: F, shipment: 'IS-0005', status: 'Delivered', payment: 'Paid in full', lines: [wolf(6), sheep(6)] },
  { id: 'SO54102', ref: 'Core | Replenishment', date: '2026-03-11', shipStart: '2026-03-15', shipEnd: '2026-03-18', estimated: false, factory: F, shipment: null, status: 'Cancelled', payment: 'Refunded', lines: [wolf(3), sheep(3)] },
];

export const orderTotal = (o: Order) => o.lines.reduce((s, l) => s + l.qty * l.price, 0);
export const orderUnits = (o: Order) => o.lines.reduce((s, l) => s + l.qty, 0);
