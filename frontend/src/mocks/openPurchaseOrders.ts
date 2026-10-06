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

export type PoLineItemStatus = 'Pending' | 'Partial' | 'Received';
export type PoLineItem = {
  itemNo: string;
  product: string;
  qty: number;
  received: number;
  status: PoLineItemStatus;
};
export type PoLinkedSoStatus = 'Open' | 'In Production' | 'Ready to Ship' | 'Shipped';
export type PoLinkedSO = {
  soNo: string;
  customer: string;
  requiredShip: string;
  status: PoLinkedSoStatus;
};

export type PoLine = {
  poNo: string;
  lines: number;
  supplier: string;
  reference: string;
  memo: string;
  itemNo: string;
  product: string;
  collection: string;
  orderDate: string;
  estShipDate: string | null;
  eta: string | null;
  launch: string | null;
  season: string;
  state: PoState;
  status: PoRowStatus;
  destination: PoDestination;
  mode: PoMode;
  customer: PoCustomer;
  qtyOrdered: number;
  qtyReceived: number;
  value: number;
  supplierNotes: string;
  lineItems: PoLineItem[];
  linkedSOs: PoLinkedSO[];
};

export const PO_TODAY = new Date('2026-10-05T19:26:00Z');

export const PO_STATES = ['All PO states', 'Open', 'Partial', 'Closed', 'Cancelled'] as const;
export const PO_SUPPLIERS_LIST = [
  'All suppliers',
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
  'All destinations',
  'I3PL - DTC',
  'I3PL - Cross Dock',
  'I3PL - Cross Dock Lids Canada',
  'Port Warehouse',
  'Signal Hill DC',
  'Memphis DC',
] as const;
export const PO_MODES = ['All modes', 'Ocean', 'Air', 'Truck', 'Rail'] as const;
export const PO_ROW_STATUSES = ['All statuses', 'On-time', 'Delayed', 'Received', 'In Production', 'Draft'] as const;
export const PO_CUSTOMERS = ['All customers', 'DTC', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;

const SUPPLIERS_WITHOUT_ALL = PO_SUPPLIERS_LIST.filter((s) => s !== 'All suppliers') as string[];
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
const DESTS_WITHOUT_ALL = PO_DESTINATIONS.filter((d) => d !== 'All destinations') as PoDestination[];
const MODES_WITHOUT_ALL = PO_MODES.filter((m) => m !== 'All modes') as PoMode[];
const CUSTOMERS_WITHOUT_ALL = PO_CUSTOMERS.filter((c) => c !== 'All customers') as PoCustomer[];
const STATES_CYCLE: PoState[] = ['Open', 'Open', 'Open', 'Partial', 'Open', 'Closed', 'Open', 'Open'];
const STATUS_CYCLE: PoRowStatus[] = ['On-time', 'On-time', 'Delayed', 'In Production', 'Draft', 'Received', 'On-time', 'In Production'];

const SO_CUSTOMERS = ['Nordstrom', 'Zumiez', 'West Marine', "Dick's Sporting Goods", 'REI Co-op', 'Buckle Inc.', 'PacSun', 'Journeys'];
const SO_STATES_CYCLE: PoLinkedSoStatus[] = ['Open', 'In Production', 'Ready to Ship', 'Shipped'];

const SUPPLIER_NOTES_SEED = [
  'Factory confirms production remains on original schedule. Dyelot approval received for the trucker crowns; stitching tolerance is within spec. Expect bulk ship window to align with the booked ETA.\n\nQuality control pass flagged minor label mis-print on 42 units; replacements already in rework and will not affect the master ship date.',
  'Export documentation finalized this week. Container booked on second rotation; a secondary vessel is on hold in case port congestion worsens. No surcharges anticipated at this time.\n\nSupplier has requested a two-day grace on the launch window pending inland transit. We have accepted provisionally pending confirmation from logistics.',
  'Rework complete on felt crown deformation issue reported on the prior PO. Current PO built on refreshed tooling, dimensional variance now at ±1.2mm. Supplier recommends we add inspection photo capture to shipment manifest going forward.',
  'All raw materials received at factory. Production commenced this week; cutting operation ~60% complete. Supplier reports no sub-supplier delays. Shipping documents will be released once QC sign-off happens on final 20% of run.',
  'Containers consolidated with secondary PO at origin warehouse. Combined booking shaves 4 days off blended ETA. Please confirm receipt approval at destination so unloading sequence can be planned by cross-dock team.',
  'No active notes from supplier. Order remains in queue; next status check scheduled Friday. If no update is received by Monday, escalate via account manager.',
];

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
  const lines = 1 + (idx % 14);
  const orderDate = iso(addDays(PO_TODAY, -(20 + (idx * 3) % 60)));

  // Line items
  const lineItems: PoLineItem[] = Array.from({ length: lines }, (_, i) => {
    const seed = PRODUCTS_SEED[(idx + i) % PRODUCTS_SEED.length];
    const qty = 100 + ((idx * 7 + i * 23) % 1200);
    let liStatus: PoLineItemStatus;
    if (status === 'Received') liStatus = 'Received';
    else if (state === 'Partial' && i % 2 === 0) liStatus = 'Partial';
    else if (state === 'Closed') liStatus = 'Received';
    else liStatus = 'Pending';
    const received = liStatus === 'Received' ? qty : liStatus === 'Partial' ? Math.floor(qty * 0.5) : 0;
    return { itemNo: seed.item, product: seed.product, qty, received, status: liStatus };
  });
  const qtyOrdered = lineItems.reduce((s, l) => s + l.qty, 0);
  const qtyReceived = lineItems.reduce((s, l) => s + l.received, 0);
  const value = qtyOrdered * 25;

  // Linked SOs — ~60% of POs
  const linkedCount = idx % 10 < 6 ? 1 + (idx % 4) : 0;
  const linkedSOs: PoLinkedSO[] = Array.from({ length: linkedCount }, (_, i) => ({
    soNo: `SO-${10483 + idx * 3 + i}`,
    customer: SO_CUSTOMERS[(idx + i) % SO_CUSTOMERS.length],
    requiredShip: iso(addDays(PO_TODAY, 5 + i * 5 + (idx % 7))),
    status: SO_STATES_CYCLE[(idx + i) % SO_STATES_CYCLE.length],
  }));

  return {
    poNo: `P0${1385 + idx}`,
    lines,
    supplier,
    reference: REFERENCES[idx % REFERENCES.length],
    memo: MEMOS[idx % MEMOS.length],
    itemNo: prod.item,
    product: prod.product,
    collection: COLLECTIONS[idx % COLLECTIONS.length],
    orderDate,
    estShipDate: noLead ? null : iso(addDays(PO_TODAY, (etaDays! - 10))),
    eta: noLead ? null : iso(addDays(PO_TODAY, etaDays!)),
    launch: noLead ? null : iso(addDays(PO_TODAY, launchDays!)),
    season: SEASONS[idx % SEASONS.length],
    state,
    status,
    destination: DESTS_WITHOUT_ALL[idx % DESTS_WITHOUT_ALL.length],
    mode: MODES_WITHOUT_ALL[idx % MODES_WITHOUT_ALL.length],
    customer: CUSTOMERS_WITHOUT_ALL[idx % CUSTOMERS_WITHOUT_ALL.length],
    qtyOrdered,
    qtyReceived,
    value,
    supplierNotes: SUPPLIER_NOTES_SEED[idx % SUPPLIER_NOTES_SEED.length],
    lineItems,
    linkedSOs,
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
