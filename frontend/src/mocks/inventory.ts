// Mock data for Inventory page.
// Snapshot aligned to the demo today = 2026-10-05.

export type InvCategory = 'Lifestyle' | 'Core' | 'Trucker' | 'Fitted' | 'Snapback' | 'Beanie';
export type InvChannel = 'DTC' | 'US Wholesale' | 'Distributors' | 'Retail' | 'Ecommerce' | 'Amazon';
export type InvWarehouse = 'Signal Hill DC' | 'Memphis DC' | 'Rotterdam EU';
export type InvSeason = 'SS26' | 'SS27' | 'FW26' | 'FW27' | 'Core';
export type InvCollection = 'Limited Circulation' | 'Patch Packs' | 'Tropical Series' | 'Core Essentials' | 'Signature Felt' | 'Wax Finish';
export type InvStatus = 'In stock' | 'Low stock' | 'Out of stock' | 'Overstocked' | 'Dead stock';

export type WarehouseBreakdown = {
  warehouse: InvWarehouse;
  onHand: number;
  onOrder: number;
  reserved: number;
  available: number;
};
export type MovementKind = 'Receipt' | 'Sale' | 'Transfer' | 'Adjustment' | 'Return';
export type Movement = {
  date: string;
  kind: MovementKind;
  delta: number;
  note: string;
};
export type LinkedOpenPo = {
  poNo: string;
  supplier: string;
  eta: string | null;
  qty: number;
  status: 'On-time' | 'Delayed' | 'In Production';
};
export type InventoryRow = {
  sku: string;
  product: string;
  category: InvCategory;
  channel: InvChannel;
  warehouse: InvWarehouse;
  season: InvSeason;
  collection: InvCollection;
  onHand: number;
  onOrder: number;
  available: number;
  reorderPoint: number;
  weeksOnHand: number;
  status: InvStatus;
  sellThrough30d: number; // percent
  avgDailyUnits: number;
  leadTime: number; // days
  warehouseBreakdown: WarehouseBreakdown[];
  movements: Movement[];
  linkedPOs: LinkedOpenPo[];
};

export const INV_TODAY = new Date('2026-10-05T19:26:00Z');

export const INV_CATEGORIES   = ['All categories', 'Lifestyle', 'Core', 'Trucker', 'Fitted', 'Snapback', 'Beanie'] as const;
export const INV_CHANNELS     = ['All channels', 'DTC', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
export const INV_WAREHOUSES   = ['All warehouses', 'Signal Hill DC', 'Memphis DC', 'Rotterdam EU'] as const;
export const INV_SEASONS      = ['All seasons', 'SS26', 'SS27', 'FW26', 'FW27', 'Core'] as const;
export const INV_COLLECTIONS  = ['All collections', 'Limited Circulation', 'Patch Packs', 'Tropical Series', 'Core Essentials', 'Signature Felt', 'Wax Finish'] as const;
export const INV_STATUSES     = ['All stock states', 'In stock', 'Low stock', 'Out of stock', 'Overstocked', 'Dead stock'] as const;

const CATS: InvCategory[]     = ['Lifestyle', 'Core', 'Trucker', 'Fitted', 'Snapback', 'Beanie'];
const CHANNELS: InvChannel[]  = ['DTC', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'];
const WHS: InvWarehouse[]     = ['Signal Hill DC', 'Memphis DC', 'Rotterdam EU'];
const SEASONS: InvSeason[]    = ['SS26', 'SS27', 'FW26', 'FW27', 'Core'];
const COLLECTIONS: InvCollection[] = ['Limited Circulation', 'Patch Packs', 'Tropical Series', 'Core Essentials', 'Signature Felt', 'Wax Finish'];
const COLORS = ['PNK', 'BLK', 'NAV', 'WHT', 'GRN', 'TAN', 'RED', 'BLU', 'OLV', 'CRM'];
const SIZES = ['S', 'M', 'L', 'XL', 'O/S'];
const PRODUCT_NAMES = [
  'Signature Wool Felt Fedora', 'Panther Trucker', 'Farmer Full Grain Leather',
  'Dusty Baker 5-Panel', 'Suede Colorful Rooster', 'Black Sheep Trucker',
  'The Alpha Dog', 'Angler Mesh Snapback', 'Suede Black Panther',
  'Lone Wolf Trucker', 'Prospector Felt', 'Firestarter Mesh',
  'Boater Straw', 'Dean Vintage', 'Scout Corduroy',
  'Welfleet', 'Gemma', 'Noe Valley', 'Hartford', 'Wren',
];
const SUPPLIERS = ['ASI Global Limited (China)', 'ASI Global Limited (Vietnam)', 'Boldhatmakers (BHM)', 'Bollman Hat Company', 'U-Jump (China)', 'Pacific Textile Mills'];

// Status distribution across 60 rows (70/12/5/8/5 ≈ 42/7/3/5/3 = 60)
const STATUS_SEQUENCE: InvStatus[] = [
  ...Array<InvStatus>(42).fill('In stock'),
  ...Array<InvStatus>(7).fill('Low stock'),
  ...Array<InvStatus>(3).fill('Out of stock'),
  ...Array<InvStatus>(5).fill('Overstocked'),
  ...Array<InvStatus>(3).fill('Dead stock'),
];

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(base: Date, days: number) { const d = new Date(base); d.setDate(d.getDate() + days); return d; }

function makeRow(idx: number): InventoryRow {
  const status = STATUS_SEQUENCE[idx % STATUS_SEQUENCE.length];
  const category = CATS[idx % CATS.length];
  const channel  = CHANNELS[idx % CHANNELS.length];
  const primaryWh = WHS[idx % WHS.length];
  const season = SEASONS[idx % SEASONS.length];
  const collection = COLLECTIONS[idx % COLLECTIONS.length];
  const colorCode = COLORS[idx % COLORS.length];
  const sizeCode  = SIZES[idx % SIZES.length];
  const sku = `101-${(3200 + idx * 17).toString().padStart(4, '0')}-${colorCode}-${sizeCode}`;
  const product = PRODUCT_NAMES[idx % PRODUCT_NAMES.length];
  const reorderPoint = 50 + (idx * 29) % 750;

  // onHand by status bucket
  let onHand: number;
  if (status === 'Out of stock')      onHand = 0;
  else if (status === 'Low stock')    onHand = 20 + (idx * 23) % Math.max(60, reorderPoint - 10);
  else if (status === 'Overstocked')  onHand = 4000 + (idx * 311) % 8400;
  else if (status === 'Dead stock')   onHand = 180 + (idx * 97) % 1500;
  else                                onHand = Math.max(reorderPoint + 60, 300 + (idx * 183) % 3500);

  const allocated = Math.floor(onHand * (0.08 + (idx % 5) * 0.06));
  const available = Math.max(status === 'Out of stock' ? 0 : (idx % 29 === 0 ? -1 * ((idx % 20) + 2) : onHand - allocated), 0 - ((idx % 29 === 0) ? ((idx % 20) + 2) : 0));
  // Weeks on hand per status
  let weeksOnHand: number;
  if (status === 'Out of stock')      weeksOnHand = 0;
  else if (status === 'Low stock')    weeksOnHand = 1 + (idx % 4);
  else if (status === 'Overstocked')  weeksOnHand = 22 + (idx % 10);
  else if (status === 'Dead stock')   weeksOnHand = 36 + (idx % 20);
  else                                weeksOnHand = 4 + (idx % 9);

  const onOrder = status === 'Overstocked' || status === 'Dead stock'
    ? 0
    : (idx % 7 === 0 ? 0 : 250 + (idx * 71) % 8200);

  const avgDailyUnits = Math.max(1, Math.floor(onHand / Math.max(14, weeksOnHand * 7 + 1)));
  const sellThrough30d = Math.min(96, 12 + (idx * 7) % 80);
  const leadTime = [28, 35, 42, 56][idx % 4];

  // Warehouse breakdown: distribute onHand across 2-3 warehouses
  const nWh = 1 + (idx % 3);
  const breakdown: WarehouseBreakdown[] = Array.from({ length: nWh }, (_, i) => {
    const w = WHS[(idx + i) % WHS.length];
    const share = i === 0 ? 0.55 : i === 1 ? 0.3 : 0.15;
    const bOnHand = Math.round(onHand * share);
    const bOnOrder = Math.round(onOrder * share);
    const bReserved = Math.round(bOnHand * 0.1);
    return {
      warehouse: w,
      onHand: bOnHand,
      onOrder: bOnOrder,
      reserved: bReserved,
      available: Math.max(0, bOnHand - bReserved),
    };
  });

  // Movements (5 events)
  const movementKinds: MovementKind[] = ['Receipt', 'Sale', 'Sale', 'Transfer', 'Adjustment'];
  const movements: Movement[] = movementKinds.map((k, i) => {
    const d = addDays(INV_TODAY, -(1 + i * 3 + (idx % 4)));
    let delta: number;
    let note: string;
    if (k === 'Receipt')     { delta = 200 + (idx * 13 + i * 37) % 500; note = `PO P01${385 + ((idx + i) % 42)} from ${SUPPLIERS[(idx + i) % SUPPLIERS.length]}`; }
    else if (k === 'Sale')   { delta = -(10 + (idx * 7 + i * 11) % 90); note = `SO-${10483 + idx * 2 + i} shipped`; }
    else if (k === 'Transfer') { delta = -(50 + (idx * 5 + i * 9) % 80); note = `Transferred to ${WHS[(idx + i + 1) % WHS.length]}`; }
    else if (k === 'Adjustment') { delta = (idx + i) % 2 === 0 ? 12 : -8; note = 'Cycle count adjustment'; }
    else                     { delta = 4 + (idx + i) % 10; note = 'Customer return'; }
    return { date: iso(d), kind: k, delta, note };
  });

  // Linked open POs (~50%)
  const nPO = idx % 2 === 0 && status !== 'Overstocked' && status !== 'Dead stock' ? 1 + (idx % 2) : 0;
  const linkedPOs: LinkedOpenPo[] = Array.from({ length: nPO }, (_, i) => {
    const overdue = (idx + i) % 11 === 0;
    const etaOffset = overdue ? -(2 + (idx % 4)) : 7 + (idx % 40) + i * 8;
    return {
      poNo: `P0${1385 + (idx * 2 + i) % 42}`,
      supplier: SUPPLIERS[(idx + i) % SUPPLIERS.length],
      eta: iso(addDays(INV_TODAY, etaOffset)),
      qty: 300 + (idx * 51 + i * 37) % 3200,
      status: overdue ? 'Delayed' : (idx % 3 === 0 ? 'In Production' : 'On-time'),
    };
  });

  return {
    sku,
    product,
    category,
    channel,
    warehouse: primaryWh,
    season,
    collection,
    onHand,
    onOrder,
    available: available === 0 && idx % 29 === 0 ? -((idx % 20) + 2) : (onHand - allocated),
    reorderPoint,
    weeksOnHand,
    status,
    sellThrough30d,
    avgDailyUnits,
    leadTime,
    warehouseBreakdown: breakdown,
    movements,
    linkedPOs,
  };
}

export const INV_ROWS: InventoryRow[] = Array.from({ length: 60 }, (_, i) => makeRow(i));

export const INV_GLOBAL_TOTALS = {
  skus: 1_842,
  onHand: 1_260_000,         // 1.26M
  onOrder: 714_000,          // 714K
  lowStock: 148,
  outOfStock: 42,
  weeksOnHand: 9.4,
};

export const INV_TAB_COUNTS = {
  lowStock: 148,
  outOfStock: 42,
  overstocked: 86,
  deadStock: 24,
};

export const INV_SNAPSHOT = 'Oct 5, 7:26 PM';

export type InventoryThresholds = {
  lowStockWeeks: number;
  outOfStockUnits: number;
  overstockedWeeks: number;
  deadStockDays: number;
};
export const DEFAULT_THRESHOLDS: InventoryThresholds = {
  lowStockWeeks: 4,
  outOfStockUnits: 0,
  overstockedWeeks: 20,
  deadStockDays: 90,
};
