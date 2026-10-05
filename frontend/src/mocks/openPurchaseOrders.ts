// Mock data for Open Purchase Orders page.
// Snapshot aligned to the demo today = 2026-10-05.

export type PoState = 'Open' | 'Partial' | 'Closed' | 'Cancelled';
export type PoRowStatus = 'On-time' | 'Delayed' | 'Received' | 'In Production' | 'Draft';
export type PoMode = 'Ocean' | 'Air' | 'Truck' | 'Rail';
export type PoDestination =
  | 'I3PL - DTC'
  | 'I3PL - Cross Dock'
  | 'I3PL - Cross Dock Lids Canada'
  | 'Port Warehouse'
  | 'Signal Hill DC'
  | 'Memphis DC';
export type PoCustomer = 'DTC' | 'US Wholesale' | 'Distributors' | 'Retail' | 'Ecommerce' | 'Amazon';

export type PoLine = {
  poNo: string;
  lines: number;
  supplier: string;
  reference: string;
  memo: string;
  itemNo: string;
  product: string;
  collection: string;
  estShipDate: string | null;
  eta: string | null;
  launch: string | null;
  season: string;
  state: PoState;
  status: PoRowStatus;
  destination: PoDestination;
  mode: PoMode;
  customer: PoCustomer;
};

export const PO_TODAY = new Date('2026-10-05T19:26:00Z');

export const PO_STATES = ['All', 'Open', 'Partial', 'Closed', 'Cancelled'] as const;
export const PO_SUPPLIERS_LIST = [
  'All',
  'ASI Global Limited (China)',
  'ASI Global Limited (Vietnam)',
  'Boldhatmakers (BHM)',
  'Bollman Hat Company',
  'U-Jump (China)',
  'Pacific Textile Mills',
  'Milan Brim Studio',
  'Hanoi Stitch House',
] as const;
export const PO_DESTINATIONS = [
  'All',
  'I3PL - DTC',
  'I3PL - Cross Dock',
  'I3PL - Cross Dock Lids Canada',
  'Port Warehouse',
  'Signal Hill DC',
  'Memphis DC',
] as const;
export const PO_MODES = ['All', 'Ocean', 'Air', 'Truck', 'Rail'] as const;
export const PO_ROW_STATUSES = ['All', 'On-time', 'Delayed', 'Received', 'In Production', 'Draft'] as const;
export const PO_CUSTOMERS = ['All', 'DTC', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;

const SUPPLIERS_WITHOUT_ALL = PO_SUPPLIERS_LIST.filter((s) => s !== 'All') as string[];
const COLLECTIONS = ['Limited Circulation', 'Patch Packs', 'Tropical Series', 'Core Essentials', 'Signature Felt', 'Wax Finish'];
const SEASONS = ['SS26', 'SS27', 'FW26', 'FW27'];
const REFERENCES = [
  'SS27 DTC - Bl…',
  'DTC Patch Cor…',
  '[R5962] Epoxy Roo…',
  'FW26 Cross Dock…',
  '— Core refills',
  'Lids CA bulk…',
  'Signal Hill rebuy',
  'Memphis replen…',
  'Tropical restock',
];
const MEMOS = ['—', '—', 'Priority rush', '—', '—', 'Hold for QC', '—', 'Combine with 24110', '—'];
const PRODUCTS_SEED = [
  { item: '101-3397-PNK02-O/S', product: '[101-3397-PNK02-O/S] Signature Wool Felt Fedora' },
  { item: '101-2450-VOI01-O/S', product: '[101-2450-VOI01-O/S] Panther Trucker' },
  { item: '101-2615-DUS02-O/S', product: '[101-2615-DUS02-O/S] Farmer Full Grain Leather' },
  { item: '101-2510-BLK01-O/S', product: '[101-2510-BLK01-O/S] Dusty Baker 5-Panel' },
  { item: '101-3849-WHT02-O/S', product: '[101-3849-WHT02-O/S] Suede Colorful Rooster' },
  { item: '101-2457-VOI01-O/S', product: '[101-2457-VOI01-O/S] Black Sheep Trucker' },
  { item: '101-1666-VOI01-O/S', product: '[101-1666-VOI01-O/S] The Alpha Dog' },
  { item: '101-2470-GRN01-O/S', product: '[101-2470-GRN01-O/S] Angler Mesh Snapback' },
  { item: '101-2961-DUS02-O/S', product: '[101-2961-DUS02-O/S] Suede Black Panther' },
];
const DESTS_WITHOUT_ALL = PO_DESTINATIONS.filter((d) => d !== 'All') as PoDestination[];
const MODES_WITHOUT_ALL = PO_MODES.filter((m) => m !== 'All') as PoMode[];
const CUSTOMERS_WITHOUT_ALL = PO_CUSTOMERS.filter((c) => c !== 'All') as PoCustomer[];
const STATES_CYCLE: PoState[] = ['Open', 'Open', 'Open', 'Partial', 'Open', 'Closed', 'Open', 'Open'];
const STATUS_CYCLE: PoRowStatus[] = ['On-time', 'On-time', 'Delayed', 'In Production', 'Draft', 'Received', 'On-time', 'In Production'];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function makePo(idx: number): PoLine {
  const supplier = SUPPLIERS_WITHOUT_ALL[idx % SUPPLIERS_WITHOUT_ALL.length];
  const noLead = idx % 4 === 0;
  const overdue = !noLead && idx % 7 === 0;
  const etaDays = noLead ? null : (overdue ? -(2 + (idx % 5)) : (2 + (idx * 3) % 85));
  const launchDays = noLead ? null : (etaDays! + 10 + (idx % 14));
  const prod = PRODUCTS_SEED[idx % PRODUCTS_SEED.length];
  const state = STATES_CYCLE[idx % STATES_CYCLE.length];
  const status: PoRowStatus = overdue ? 'Delayed' : STATUS_CYCLE[idx % STATUS_CYCLE.length];
  return {
    poNo: `P0${1385 + idx}`,
    lines: 1 + (idx % 14),
    supplier,
    reference: REFERENCES[idx % REFERENCES.length],
    memo: MEMOS[idx % MEMOS.length],
    itemNo: prod.item,
    product: prod.product,
    collection: COLLECTIONS[idx % COLLECTIONS.length],
    estShipDate: noLead ? null : iso(addDays(PO_TODAY, (etaDays! - 10))),
    eta: noLead ? null : iso(addDays(PO_TODAY, etaDays!)),
    launch: noLead ? null : iso(addDays(PO_TODAY, launchDays!)),
    season: SEASONS[idx % SEASONS.length],
    state,
    status,
    destination: DESTS_WITHOUT_ALL[idx % DESTS_WITHOUT_ALL.length],
    mode: MODES_WITHOUT_ALL[idx % MODES_WITHOUT_ALL.length],
    customer: CUSTOMERS_WITHOUT_ALL[idx % CUSTOMERS_WITHOUT_ALL.length],
  };
}

export const PO_ROWS: PoLine[] = Array.from({ length: 42 }, (_, i) => makePo(i));

// ─── Lanes ────────────────────────────────────────────────────────────
export type LaneMode = 'ocean' | 'air' | 'truck';
export type Lane = {
  id: string;
  code: string;
  name: string;
  suppliers: string[];
  days: number | null;
  mode: LaneMode;
  notes: string;
};

export const LANES_SEED: Lane[] = [
  { id: 'l-us-20', code: 'US-20', name: 'USA domestic → Signal Hill DC',       suppliers: ['Pacific Textile Mills'],                                           days: null, mode: 'truck', notes: '' },
  { id: 'l-cn-28', code: 'CN-28', name: 'China → I3PL - Cross Dock',           suppliers: ['ASI Global Limited (China)', 'U-Jump (China)'],                    days: null, mode: 'ocean', notes: '' },
  { id: 'l-vn-28', code: 'VN-28', name: 'Vietnam → I3PL - Cross Dock',         suppliers: ['ASI Global Limited (Vietnam)'],                                    days: null, mode: 'ocean', notes: '' },
  { id: 'l-vn-96', code: 'VN-96', name: 'Vietnam → Port Warehouse',            suppliers: ['ASI Global Limited (Vietnam)', 'Hanoi Stitch House'],              days: null, mode: 'ocean', notes: '' },
  { id: 'l-cn-96', code: 'CN-96', name: 'China → Port Warehouse',              suppliers: ['ASI Global Limited (China)', 'U-Jump (China)'],                    days: null, mode: 'ocean', notes: '' },
  { id: 'l-cn-52', code: 'CN-52', name: 'China → I3PL - Cross Dock Lids CA',   suppliers: ['Boldhatmakers (BHM)'],                                             days: null, mode: 'ocean', notes: '' },
  { id: 'l-it-14', code: 'IT-14', name: 'Italy → Memphis DC',                  suppliers: ['Milan Brim Studio'],                                               days: 28,   mode: 'air',   notes: 'Air freight only' },
  { id: 'l-us-30', code: 'US-30', name: 'USA domestic → Memphis DC',           suppliers: ['Bollman Hat Company'],                                             days: 35,   mode: 'truck', notes: '' },
  { id: 'l-cn-11', code: 'CN-11', name: 'China → I3PL - DTC',                  suppliers: ['ASI Global Limited (China)'],                                      days: 42,   mode: 'ocean', notes: 'Expedite requested' },
  { id: 'l-vn-11', code: 'VN-11', name: 'Vietnam → I3PL - DTC',                suppliers: ['ASI Global Limited (Vietnam)'],                                    days: null, mode: 'ocean', notes: '' },
  { id: 'l-us-24', code: 'US-24', name: 'USA domestic → I3PL - Cross Dock',    suppliers: ['Pacific Textile Mills', 'Bollman Hat Company'],                    days: null, mode: 'truck', notes: '' },
  { id: 'l-cn-96b',code: 'CN-96', name: 'China → I3PL - DTC',                  suppliers: ['U-Jump (China)'],                                                  days: null, mode: 'ocean', notes: '' },
];

export const PO_STATUS_STRIP = {
  freshness: 'Fresh',
  updatedAgo: '9m ago',
  updatedAt: 'Oct 5, 7:26 PM',
  nextAuto: 'in 51m',
  cooldown: 'in 1m',
  rev: '4',
  cooling: true,
};

export const PO_GLOBAL_TOTALS = {
  orders: 806,
  openUnits: 714_134,
  fulfilledPct: 5,
  late: 9,
  noLead: 806,
  onTimePct: 31,
};
