// Mock data for Open Sales Orders page.
// Snapshot aligned to the demo today = 2026-10-05.

import type { Lane, LaneMode } from './openPurchaseOrders';
export type { Lane, LaneMode };

export type SoStatus = 'Open' | 'In Production' | 'Ready to Ship' | 'Shipped' | 'Delayed' | 'Backordered' | 'On hold' | 'Cancelled';
export type SoChannel = 'DTC' | 'US Wholesale' | 'Distributors' | 'Retail' | 'Ecommerce' | 'Amazon';
export type SoPriority = 'Standard' | 'Rush' | 'VIP';
export type SoWarehouse = 'Signal Hill DC' | 'Memphis DC' | 'Rotterdam EU';

export type SalesOrder = {
  soNo: string;
  lines: number;
  customer: string;
  channel: SoChannel;
  orderDate: string;
  requiredShip: string;
  shipWindow: string;
  status: SoStatus;
  priority: SoPriority;
  qty: number;
  value: number;
  csr: string;
  warehouse: SoWarehouse;
};

export const SO_TODAY = new Date('2026-10-05T19:26:00Z');

export const SO_STATUSES = ['All statuses', 'Open', 'In Production', 'Ready to Ship', 'Shipped', 'Delayed', 'Backordered', 'On hold', 'Cancelled'] as const;
export const SO_CHANNELS = ['All channels', 'DTC', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
export const SO_CUSTOMERS = [
  'All customers',
  'Nordstrom', 'Zumiez', 'West Marine', 'Lids Canada', 'REI Co-op',
  "Dick's Sporting Goods", 'Amazon.com', 'Buckle Inc.', 'Scheels',
  "Tilly's", 'PacSun', 'Journeys',
] as const;
export const SO_WAREHOUSES = ['All warehouses', 'Signal Hill DC', 'Memphis DC', 'Rotterdam EU'] as const;
export const SO_PRIORITIES = ['All priority', 'Standard', 'Rush', 'VIP'] as const;
export const SO_SHIP_WINDOWS = ['All ship windows', 'Overdue', 'Next 7 days', 'Next 30 days', 'This Quarter'] as const;

const CUSTOMERS = SO_CUSTOMERS.filter((c) => c !== 'All customers') as string[];
const CHANNELS_RAW: SoChannel[] = ['DTC', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'];
const WAREHOUSES_RAW: SoWarehouse[] = ['Signal Hill DC', 'Memphis DC', 'Rotterdam EU'];
const CSR_NAMES = ['Avery Chen', 'Marcus Diaz', 'Priya Kapoor', 'Jordan Lee', 'Taylor Reyes'];

// Target distributions ~ 16 Open/In-Production, 8 Ready-to-Ship, 6 Shipped, 4 Delayed, 3 Backordered, 2 On hold, 1 Cancelled → 40 rows
const STATUS_SEQUENCE: SoStatus[] = [
  'Open','Open','Open','Open','In Production','In Production','In Production','In Production',
  'Open','Open','Open','Open','In Production','In Production','In Production','In Production',
  'Ready to Ship','Ready to Ship','Ready to Ship','Ready to Ship','Ready to Ship','Ready to Ship','Ready to Ship','Ready to Ship',
  'Shipped','Shipped','Shipped','Shipped','Shipped','Shipped',
  'Delayed','Delayed','Delayed','Delayed',
  'Backordered','Backordered','Backordered',
  'On hold','On hold',
  'Cancelled',
];

const PRIORITY_SEQUENCE: SoPriority[] = [
  ...Array<SoPriority>(28).fill('Standard'),
  ...Array<SoPriority>(8).fill('Rush'),
  ...Array<SoPriority>(4).fill('VIP'),
];

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(base: Date, days: number) { const d = new Date(base); d.setDate(d.getDate() + days); return d; }
function fmtRange(a: Date, b: Date) {
  const mo = (d: Date) => d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${mo(a)} ${a.getUTCDate()} – ${mo(b)} ${b.getUTCDate()}`;
}

function makeSo(idx: number): SalesOrder {
  // Spread order dates across Sep-Oct 2026 and required ship dates across next 60 days
  // Make ~15% overdue (status not Shipped/Cancelled)
  const orderOffset = -(60 - (idx * 2) % 60); // -60..0 days from today
  const orderDate = addDays(SO_TODAY, orderOffset);
  const status = STATUS_SEQUENCE[idx % STATUS_SEQUENCE.length];
  const isOverdueRow = (idx % 7 === 0) && status !== 'Shipped' && status !== 'Cancelled';
  const requiredShipOffset = isOverdueRow ? -(2 + (idx % 5)) : (1 + (idx * 2) % 70);
  const requiredShip = addDays(SO_TODAY, requiredShipOffset);
  const shipWindowEnd = addDays(requiredShip, 6);
  const customer = CUSTOMERS[idx % CUSTOMERS.length];
  const channel: SoChannel = CHANNELS_RAW[idx % CHANNELS_RAW.length];
  const warehouse = WAREHOUSES_RAW[idx % WAREHOUSES_RAW.length];
  const priority = PRIORITY_SEQUENCE[idx % PRIORITY_SEQUENCE.length];
  const qty = 50 + (idx * 211) % 8450;
  const value = 2_000 + (idx * 5417) % 218_000;
  const csr = CSR_NAMES[idx % CSR_NAMES.length];
  return {
    soNo: `SO-${10483 + idx}`,
    lines: 1 + (idx % 18),
    customer,
    channel,
    orderDate: iso(orderDate),
    requiredShip: iso(requiredShip),
    shipWindow: fmtRange(requiredShip, shipWindowEnd),
    status: (isOverdueRow && status !== 'Delayed') ? 'Delayed' : status,
    priority,
    qty,
    value,
    csr,
    warehouse,
  };
}

export const SO_ROWS: SalesOrder[] = Array.from({ length: 40 }, (_, i) => makeSo(i));

export const SO_GLOBAL_TOTALS = {
  orders: 1_284,
  unitsToShip: 428_910,
  shippedToday: 96,
  behindSLA: 37,
  backordered: 142,
  onTimePct: 92,
};

export const SO_SHIP_LANES_SEED: Lane[] = [
  { id: 'sl-us-dtc',   code: 'US-DTC',    name: 'Signal Hill → West Coast DTC',   suppliers: ['Signal Hill DC'],  days: 2,  mode: 'truck', notes: '' },
  { id: 'sl-us-ecom',  code: 'US-ECOM',   name: 'Memphis → National Ecommerce',   suppliers: ['Memphis DC'],      days: 3,  mode: 'truck', notes: '' },
  { id: 'sl-us-whl',   code: 'US-WHL',    name: 'Signal Hill → US Wholesale',     suppliers: ['Signal Hill DC'],  days: 5,  mode: 'truck', notes: '' },
  { id: 'sl-ca-lids',  code: 'CA-LIDS',   name: 'Memphis → Lids Canada',          suppliers: ['Memphis DC'],      days: 7,  mode: 'truck', notes: '' },
  { id: 'sl-eu-whl',   code: 'EU-WHL',    name: 'Rotterdam → EU Wholesale',       suppliers: ['Rotterdam EU'],    days: 10, mode: 'truck', notes: '' },
  { id: 'sl-amz-fba',  code: 'AMZ-FBA',   name: 'Signal Hill → Amazon FBA West',  suppliers: ['Signal Hill DC'],  days: 4,  mode: 'truck', notes: '' },
  { id: 'sl-amz-e',    code: 'AMZ-E',     name: 'Memphis → Amazon FBA East',      suppliers: ['Memphis DC'],      days: 3,  mode: 'truck', notes: '' },
  { id: 'sl-dist-us',  code: 'DIST-US',   name: 'Signal Hill → US Distributors',  suppliers: ['Signal Hill DC'],  days: 6,  mode: 'truck', notes: '' },
  { id: 'sl-int-apac', code: 'INT-APAC',  name: 'LAX → APAC Distributors',        suppliers: ['Signal Hill DC'],  days: 18, mode: 'air',   notes: 'Air freight only' },
  { id: 'sl-int-lat',  code: 'INT-LATAM', name: 'Memphis → LATAM Distributors',   suppliers: ['Memphis DC'],      days: 14, mode: 'air',   notes: '' },
];
