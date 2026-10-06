// Mock data for Open Sales Orders page.
// Snapshot aligned to the demo today = 2026-10-05.

import type { Lane, LaneMode } from './openPurchaseOrders';
export type { Lane, LaneMode };

export type SoStatus = 'Open' | 'In Production' | 'Ready to Ship' | 'Shipped' | 'Delayed' | 'Backordered' | 'On hold' | 'Cancelled';
export type SoChannel = 'DTC' | 'US Wholesale' | 'Distributors' | 'Retail' | 'Ecommerce' | 'Amazon';
export type SoPriority = 'Standard' | 'Rush' | 'VIP';
export type SoWarehouse = 'Signal Hill DC' | 'Memphis DC' | 'Rotterdam EU';

export type SoLineItemStatus = 'Allocated' | 'Partial' | 'Backordered';
export type SoLineItem = {
  sku: string;
  product: string;
  qty: number;
  allocated: number;
  backordered: number;
  status: SoLineItemStatus;
};
export type SoLinkedPoStatus = 'On-time' | 'Delayed' | 'In Production';
export type SoLinkedPO = {
  poNo: string;
  supplier: string;
  eta: string | null;
  qty: number;
  status: SoLinkedPoStatus;
};

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
  customerPO: string;
  paymentTerms: string;
  customerNotes: string;
  lineItems: SoLineItem[];
  linkedPOs: SoLinkedPO[];
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
const SUPPLIERS = ['ASI Global Limited (China)', 'ASI Global Limited (Vietnam)', 'Boldhatmakers (BHM)', 'Bollman Hat Company', 'U-Jump (China)', 'Pacific Textile Mills'];
const SKU_COLORS = ['PNK', 'BLK', 'NAV', 'WHT', 'GRN', 'TAN', 'RED', 'BLU'];
const SKU_SIZES = ['S', 'M', 'L', 'XL', 'O/S'];
const PRODUCT_NAMES = [
  'Signature Wool Felt Fedora', 'Panther Trucker', 'Farmer Full Grain Leather',
  'Dusty Baker 5-Panel', 'Suede Colorful Rooster', 'Black Sheep Trucker',
  'The Alpha Dog', 'Angler Mesh Snapback', 'Suede Black Panther',
  'Lone Wolf Trucker', 'Prospector Felt', 'Firestarter Mesh',
];
const PAYMENT_TERMS = ['Net 30', 'Net 60', 'Net 15', 'COD', 'Prepaid'];
const CUSTOMER_NOTES_SEED = [
  'Account manager flagged this order as part of a larger seasonal rollout. All pieces must land on the floor the same week to support the in-store merchandising reset. Please confirm consolidated shipment with the destination warehouse before scheduling.\n\nBuyer requested packing slip reflects their internal PO code (included in the Customer PO field).',
  'Standard replenishment order. No special routing requirements. Buyer will handle in-store allocation after receipt.\n\nIf short-shipped, allocate the smaller sizes first; the retailer sells those out fastest at this location.',
  'Customer has asked that this order ship complete whenever possible. If any lines slip past the required ship date, hold the entire shipment and notify the CSR before releasing. Partial shipments only with explicit buyer approval.',
  'Rush DTC flash drop. Must be in the destination 3PL by the ship window to support the launch email. Expedite freight is pre-approved up to the carrier tier noted on the account.\n\nSocial launch is tied to this release — any delay affects a marketing calendar outside our system.',
  'No specific notes from the buyer. CSR to leave a routine check-in before pack-out.',
];

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
  const orderOffset = -(60 - (idx * 2) % 60);
  const orderDate = addDays(SO_TODAY, orderOffset);
  const baseStatus = STATUS_SEQUENCE[idx % STATUS_SEQUENCE.length];
  const isOverdueRow = (idx % 7 === 0) && baseStatus !== 'Shipped' && baseStatus !== 'Cancelled';
  const status: SoStatus = (isOverdueRow && baseStatus !== 'Delayed') ? 'Delayed' : baseStatus;
  const requiredShipOffset = isOverdueRow ? -(2 + (idx % 5)) : (1 + (idx * 2) % 70);
  const requiredShip = addDays(SO_TODAY, requiredShipOffset);
  const shipWindowEnd = addDays(requiredShip, 6);
  const customer = CUSTOMERS[idx % CUSTOMERS.length];
  const channel: SoChannel = CHANNELS_RAW[idx % CHANNELS_RAW.length];
  const warehouse = WAREHOUSES_RAW[idx % WAREHOUSES_RAW.length];
  const priority = PRIORITY_SEQUENCE[idx % PRIORITY_SEQUENCE.length];
  const lines = 1 + (idx % 18);
  const csr = CSR_NAMES[idx % CSR_NAMES.length];

  // Line items generation
  const lineItems: SoLineItem[] = Array.from({ length: lines }, (_, i) => {
    const sku = `101-${(3200 + idx * 7 + i * 11).toString().padStart(4, '0')}-${SKU_COLORS[(idx + i) % SKU_COLORS.length]}-${SKU_SIZES[(idx + i) % SKU_SIZES.length]}`;
    const product = PRODUCT_NAMES[(idx + i) % PRODUCT_NAMES.length];
    const liQty = 20 + (idx * 13 + i * 29) % 480;
    let allocated = 0; let backordered = 0;
    if (status === 'Shipped' || status === 'Ready to Ship')     { allocated = liQty; backordered = 0; }
    else if (status === 'Backordered')                          { allocated = Math.floor(liQty * 0.3); backordered = liQty - allocated; }
    else if (status === 'In Production')                        { allocated = Math.floor(liQty * 0.6); backordered = 0; }
    else if (status === 'Delayed')                              { allocated = Math.floor(liQty * 0.5); backordered = 0; }
    else                                                        { allocated = (idx + i) % 3 === 0 ? Math.floor(liQty * 0.5) : liQty; backordered = 0; }
    const liStatus: SoLineItemStatus = backordered > 0 ? 'Backordered' : (allocated < liQty ? 'Partial' : 'Allocated');
    return { sku, product, qty: liQty, allocated, backordered, status: liStatus };
  });
  const totalQty = lineItems.reduce((s, l) => s + l.qty, 0);
  const value = totalQty * (22 + (idx % 18));

  // Linked POs (~70%)
  const nPO = idx % 10 < 7 ? 1 + (idx % 3) : 0;
  const linkedPOs: SoLinkedPO[] = Array.from({ length: nPO }, (_, i) => {
    const overdue = (idx + i) % 11 === 0;
    const etaOffset = overdue ? -(2 + idx % 4) : 5 + i * 7 + (idx % 30);
    return {
      poNo: `P0${1385 + (idx * 3 + i) % 42}`,
      supplier: SUPPLIERS[(idx + i) % SUPPLIERS.length],
      eta: iso(addDays(SO_TODAY, etaOffset)),
      qty: 200 + (idx * 41 + i * 27) % 2800,
      status: overdue ? 'Delayed' : ((idx + i) % 3 === 0 ? 'In Production' : 'On-time'),
    };
  });

  return {
    soNo: `SO-${10483 + idx}`,
    lines,
    customer,
    channel,
    orderDate: iso(orderDate),
    requiredShip: iso(requiredShip),
    shipWindow: fmtRange(requiredShip, shipWindowEnd),
    status,
    priority,
    qty: totalQty,
    value,
    csr,
    warehouse,
    customerPO: `${customer.split(' ')[0].slice(0, 4).toUpperCase()}-${(50000 + idx * 173) % 99999}`,
    paymentTerms: PAYMENT_TERMS[idx % PAYMENT_TERMS.length],
    customerNotes: CUSTOMER_NOTES_SEED[idx % CUSTOMER_NOTES_SEED.length],
    lineItems,
    linkedPOs,
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

export const SO_SNAPSHOT = 'Oct 5, 7:26 PM';

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
