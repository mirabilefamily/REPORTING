import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Columns3,
  Download,
  MoreHorizontal,
  Search,
  Settings,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DsSelect from '../components/DsSelect';
import GroupEditorCard from '../components/GroupEditorCard';
import { loadGroups, makeNewGroup, saveGroups, type Group } from '../mocks/groups';
import {
  DEFAULT_THRESHOLDS,
  INV_CATEGORIES,
  INV_CHANNELS,
  INV_COLLECTIONS,
  INV_GLOBAL_TOTALS,
  INV_ROWS,
  INV_SEASONS,
  INV_SNAPSHOT,
  INV_STATUSES,
  INV_TAB_COUNTS,
  INV_WAREHOUSES,
  type InvStatus,
  type InventoryRow,
  type InventoryThresholds,
  type Movement,
  type MovementKind,
} from '../mocks/inventory';

// ─── Tokens ────────────────────────────────────────────────────────────
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;

const INK       = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_100 = '#F1F5F9';
const SLATE_50  = '#F8FAFC';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';
const CORAL_BG  = '#FFF1EF';
const EMERALD   = '#047857';
const EMERALD_BG = '#ECFDF5';
const AMBER_FG  = '#B4791A';
const AMBER_BG  = '#FFF7E6';

// ─── Formatters ────────────────────────────────────────────────────────
const fmtInt = (n: number) => n.toLocaleString('en-US');
const fmtInt1 = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
};
const fmtMmddyyyy = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00Z`);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getUTCFullYear()}`;
};
const fmtMonDay = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

// ─── Column schema ─────────────────────────────────────────────────────
type ColKey = 'sku' | 'product' | 'category' | 'channel' | 'warehouse' | 'onHand' | 'onOrder' | 'available' | 'weeksOnHand' | 'reorderPoint' | 'status' | 'season';
const ALL_COLUMNS: { key: ColKey; label: string; align?: 'left' | 'right'; width?: number; sortable?: boolean; field: keyof InventoryRow | null }[] = [
  { key: 'sku',          label: 'SKU',            align: 'left',  width: 170, sortable: true,  field: 'sku' },
  { key: 'product',      label: 'Product',        align: 'left',  width: 220, sortable: true,  field: 'product' },
  { key: 'category',     label: 'Category',       align: 'left',  width: 120, sortable: true,  field: 'category' },
  { key: 'channel',      label: 'Channel',        align: 'left',  width: 130, sortable: true,  field: 'channel' },
  { key: 'warehouse',    label: 'Warehouse',      align: 'left',  width: 160, sortable: true,  field: 'warehouse' },
  { key: 'onHand',       label: 'On hand',        align: 'right', width: 100, sortable: true,  field: 'onHand' },
  { key: 'onOrder',      label: 'On order',       align: 'right', width: 100, sortable: true,  field: 'onOrder' },
  { key: 'available',    label: 'Available',      align: 'right', width: 110, sortable: true,  field: 'available' },
  { key: 'weeksOnHand',  label: 'Weeks on hand',  align: 'right', width: 130, sortable: true,  field: 'weeksOnHand' },
  { key: 'reorderPoint', label: 'Reorder point',  align: 'right', width: 120, sortable: true,  field: 'reorderPoint' },
  { key: 'status',       label: 'Status',         align: 'left',  width: 130, sortable: true,  field: 'status' },
  { key: 'season',       label: 'Season',         align: 'left',  width: 90,  sortable: true,  field: 'season' },
];

// ─── Prefs ─────────────────────────────────────────────────────────────
type DisplayPrefs = {
  showReserved: boolean;
  hideInactive: boolean;
  defaultSort: string;
  dateFormat: string;
  thresholds: InventoryThresholds;
};
const DEFAULT_PREFS: DisplayPrefs = {
  showReserved: true,
  hideInactive: true,
  defaultSort: 'Weeks on hand, lowest first',
  dateFormat: 'MM/DD/YYYY',
  thresholds: DEFAULT_THRESHOLDS,
};
const DEFAULT_SORT_OPTS = [
  'Weeks on hand, lowest first',
  'Available, lowest first',
  'SKU ascending',
  'SKU descending',
  'Product A→Z',
] as const;
const DATE_FMT_OPTS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as const;

type SortDir = 'asc' | 'desc';
function defaultSortParams(label: string): { key: ColKey; dir: SortDir } {
  switch (label) {
    case 'Available, lowest first': return { key: 'available', dir: 'asc' };
    case 'SKU ascending':           return { key: 'sku', dir: 'asc' };
    case 'SKU descending':          return { key: 'sku', dir: 'desc' };
    case 'Product A→Z':             return { key: 'product', dir: 'asc' };
    default:                        return { key: 'weeksOnHand', dir: 'asc' };
  }
}
function cmp(a: InventoryRow, b: InventoryRow, field: keyof InventoryRow, dir: SortDir) {
  const av = a[field] as unknown;
  const bv = b[field] as unknown;
  if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av;
  const as = String(av ?? '').toLowerCase();
  const bs = String(bv ?? '').toLowerCase();
  if (as < bs) return dir === 'asc' ? -1 : 1;
  if (as > bs) return dir === 'asc' ? 1 : -1;
  return 0;
}

// ─── Delta chip for KPIs ───────────────────────────────────────────────
type Delta = { tone: 'up' | 'down'; text: string; emerald: boolean };
function DeltaChip({ d }: { d: Delta }) {
  const Icon = d.tone === 'up' ? ArrowUp : ArrowDown;
  const fg = d.emerald ? EMERALD : CORAL_DK;
  const bg = d.emerald ? EMERALD_BG : CORAL_BG;
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: 2, padding: '2px 6px', borderRadius: 999, background: bg, color: fg, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
    >
      <Icon size={11} strokeWidth={2.4} />
      {d.text}
    </span>
  );
}

// ─── Status / Movement chips ──────────────────────────────────────────
function StatusChip({ s }: { s: InvStatus }) {
  const styles: Record<InvStatus, React.CSSProperties> = {
    'In stock':     { background: SLATE_100,  color: INK },
    'Low stock':    { background: AMBER_BG,   color: AMBER_FG },
    'Out of stock': { background: CORAL_BG,   color: CORAL_DK },
    'Overstocked':  { background: SLATE_100,  color: SLATE_500 },
    'Dead stock':   { background: SLATE_100,  color: SLATE_400 },
  };
  return (
    <span style={{ ...styles[s], padding: '3px 8px', fontSize: 11.5, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }} data-testid={`inv-status-${s.toLowerCase().replace(/\s+/g, '-')}`}>
      {s}
    </span>
  );
}
function MovementChip({ k }: { k: MovementKind }) {
  const styles: Record<MovementKind, React.CSSProperties> = {
    Receipt:    { background: EMERALD_BG, color: EMERALD },
    Sale:       { background: SLATE_100,  color: INK },
    Transfer:   { background: SLATE_100,  color: SLATE_700 },
    Adjustment: { background: AMBER_BG,   color: AMBER_FG },
    Return:     { background: AMBER_BG,   color: AMBER_FG },
  };
  return <span style={{ ...styles[k], padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }}>{k}</span>;
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'All' | 'Low stock' | 'Out of stock' | 'Overstocked' | 'Dead stock'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All categories');
  const [channelFilter, setChannelFilter] = useState<string>('All channels');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('All warehouses');
  const [seasonFilter, setSeasonFilter] = useState<string>('All seasons');
  const [collectionFilter, setCollectionFilter] = useState<string>('All collections');
  const [statusFilter, setStatusFilter] = useState<string>('All stock states');

  const [colsOpen, setColsOpen] = useState(false);
  const colsBtnRef = useRef<HTMLButtonElement | null>(null);
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() =>
    ALL_COLUMNS.reduce((acc, c) => { acc[c.key] = true; return acc; }, {} as Record<ColKey, boolean>),
  );

  const [sortKey, setSortKey] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir | null>(null);

  // Drawers
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'Display' | 'Groups' | 'Thresholds'>('Display');
  const [drawerSku, setDrawerSku] = useState<InventoryRow | null>(null);

  const [prefs, setPrefs] = useState<DisplayPrefs>(() => {
    try {
      const raw = localStorage.getItem('inventoryReportSettings');
      if (!raw) return DEFAULT_PREFS;
      const saved = JSON.parse(raw) as Partial<DisplayPrefs>;
      return { ...DEFAULT_PREFS, ...saved, thresholds: { ...DEFAULT_THRESHOLDS, ...(saved.thresholds || {}) } };
    } catch { return DEFAULT_PREFS; }
  });
  const [prefsClean, setPrefsClean] = useState<DisplayPrefs>(prefs);
  const [groups, setGroups] = useState<Group[]>(() => loadGroups());
  const [groupsClean, setGroupsClean] = useState<Group[]>(groups);
  const dirty =
    JSON.stringify(prefs) !== JSON.stringify(prefsClean) ||
    JSON.stringify(groups) !== JSON.stringify(groupsClean);

  const rows = useMemo(() => {
    let out: InventoryRow[] = INV_ROWS.slice();
    if (tab === 'Low stock')     out = out.filter((r) => r.status === 'Low stock');
    if (tab === 'Out of stock')  out = out.filter((r) => r.status === 'Out of stock');
    if (tab === 'Overstocked')   out = out.filter((r) => r.status === 'Overstocked');
    if (tab === 'Dead stock')    out = out.filter((r) => r.status === 'Dead stock');
    if (categoryFilter   !== 'All categories')  out = out.filter((r) => r.category === categoryFilter);
    if (channelFilter    !== 'All channels')    out = out.filter((r) => r.channel === channelFilter);
    if (warehouseFilter  !== 'All warehouses')  out = out.filter((r) => r.warehouse === warehouseFilter);
    if (seasonFilter     !== 'All seasons')     out = out.filter((r) => r.season === seasonFilter);
    if (collectionFilter !== 'All collections') out = out.filter((r) => r.collection === collectionFilter);
    if (statusFilter     !== 'All stock states') out = out.filter((r) => r.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        r.sku.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.collection.toLowerCase().includes(q),
      );
    }
    if (sortKey && sortDir) {
      const col = ALL_COLUMNS.find((c) => c.key === sortKey);
      const field = col?.field;
      if (field) out = out.slice().sort((a, b) => cmp(a, b, field, sortDir));
    } else {
      const dp = defaultSortParams(prefs.defaultSort);
      const col = ALL_COLUMNS.find((c) => c.key === dp.key);
      const field = col?.field;
      if (field) out = out.slice().sort((a, b) => cmp(a, b, field, dp.dir));
    }
    return out;
  }, [tab, categoryFilter, channelFilter, warehouseFilter, seasonFilter, collectionFilter, statusFilter, query, sortKey, sortDir, prefs.defaultSort]);

  const visibleColList = ALL_COLUMNS.filter((c) => visibleCols[c.key]);

  const activeFilterCount =
    (categoryFilter    !== 'All categories'   ? 1 : 0) +
    (channelFilter     !== 'All channels'     ? 1 : 0) +
    (warehouseFilter   !== 'All warehouses'   ? 1 : 0) +
    (seasonFilter      !== 'All seasons'      ? 1 : 0) +
    (collectionFilter  !== 'All collections'  ? 1 : 0) +
    (statusFilter      !== 'All stock states' ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setCategoryFilter('All categories');
    setChannelFilter('All channels');
    setWarehouseFilter('All warehouses');
    setSeasonFilter('All seasons');
    setCollectionFilter('All collections');
    setStatusFilter('All stock states');
    setQuery('');
  };

  const onHeaderClick = (key: ColKey) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null); setSortDir(null);
  };

  const exportMock = () => { /* eslint-disable-next-line no-console */ console.log('[inventory] export excel'); };

  const saveDrawer = () => {
    localStorage.setItem('inventoryReportSettings', JSON.stringify(prefs));
    saveGroups(groups);
    setPrefsClean(prefs); setGroupsClean(groups);
  };
  const discardDrawer = () => { setPrefs(prefsClean); setGroups(groupsClean); };

  // Footer sums (visible rows)
  const sumOnHand = rows.reduce((s, r) => s + r.onHand, 0);
  const sumOnOrder = rows.reduce((s, r) => s + r.onOrder, 0);

  // KPI deltas (static mock)
  const kpiDeltas: Record<string, Delta> = {
    skus:        { tone: 'up',   text: '2.1%', emerald: true },
    onHand:      { tone: 'down', text: '3.4%', emerald: false },
    onOrder:     { tone: 'up',   text: '8.2%', emerald: true },
    lowStock:    { tone: 'up',   text: '11',   emerald: false },
    outOfStock:  { tone: 'down', text: '6',    emerald: true },
    weeksOnHand: { tone: 'down', text: '0.7',  emerald: false },
  };

  return (
    <div className="min-h-full" data-testid="inventory-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        <PageHeader
          title="Inventory"
          testIdPrefix="inventory"
          right={
            <div className="inline-flex items-center gap-2">
              <button type="button" onClick={() => setSettingsOpen(true)} className="btn-ghost btn-sm inline-flex items-center gap-1.5" data-testid="inventory-open-settings">
                <Settings size={13} strokeWidth={2} /> Settings
              </button>
              <button type="button" onClick={exportMock} className="btn-ghost btn-sm inline-flex items-center gap-1.5" data-testid="inventory-export">
                <Download size={13} strokeWidth={2} /> Excel
              </button>
            </div>
          }
        />
        <p style={{ margin: '-6px 0 0', fontSize: 13.5, color: SLATE_500 }} data-testid="inventory-subtitle">
          On-hand, on-order, and sell-through across warehouses and channels
        </p>

        <div className="mt-6 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500 }} data-testid="inventory-section-label">
            All eligible SKUs
          </span>
          <span style={{ fontSize: 12, color: SLATE_400, fontStyle: 'italic' }}>Global totals, not affected by filters below</span>
        </div>

        {/* ── KPI strip (6) ─────────────────────────────────────── */}
        <section className="mt-2.5 overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #EDEDEF', padding: '20px 0' }} data-testid="inventory-kpi-strip">
          <div className="grid grid-cols-3 xl:grid-cols-6">
            <KpiCell label="SKUs"          value={fmtInt(INV_GLOBAL_TOTALS.skus)}         foot="Active"                 delta={kpiDeltas.skus} />
            <KpiCell label="On hand"       value={fmtCompact(INV_GLOBAL_TOTALS.onHand)}   foot="Units across all DCs"   delta={kpiDeltas.onHand} />
            <KpiCell label="On order"      value={fmtCompact(INV_GLOBAL_TOTALS.onOrder)}  foot="Inbound POs"            delta={kpiDeltas.onOrder} />
            <KpiCell label="Low stock"     value={fmtInt(INV_GLOBAL_TOTALS.lowStock)}     foot="SKUs below reorder"     delta={kpiDeltas.lowStock}    valueColor={CORAL_DK} />
            <KpiCell label="Out of stock"  value={fmtInt(INV_GLOBAL_TOTALS.outOfStock)}   foot="SKUs at zero"           delta={kpiDeltas.outOfStock}  valueColor={AMBER_FG} />
            <KpiCell label="Weeks on hand" value={fmtInt1(INV_GLOBAL_TOTALS.weeksOnHand)} foot="Weighted avg"           delta={kpiDeltas.weeksOnHand} last />
          </div>
        </section>

        {/* ── Unified toolbar + table card ──────────────────────── */}
        <section className="mt-5 overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #EDEDEF' }} data-testid="inventory-table-card">
          <div style={{ padding: '16px 20px' }} data-testid="inventory-toolbar">
            <div className="flex items-center gap-3 flex-wrap" style={{ minHeight: 40 }}>
              <div className="inline-flex items-center" role="tablist" style={{ gap: 2 }} data-testid="inventory-tabs">
                {([
                  { key: 'All',           label: 'All',           count: INV_ROWS.length,           color: null },
                  { key: 'Low stock',     label: 'Low stock',     count: INV_TAB_COUNTS.lowStock,    color: CORAL_DK },
                  { key: 'Out of stock',  label: 'Out of stock',  count: INV_TAB_COUNTS.outOfStock,  color: AMBER_FG },
                  { key: 'Overstocked',   label: 'Overstocked',   count: INV_TAB_COUNTS.overstocked, color: null },
                  { key: 'Dead stock',    label: 'Dead stock',    count: INV_TAB_COUNTS.deadStock,   color: null },
                ] as const).map((t) => {
                  const active = tab === t.key;
                  const countColor = active ? INK : (t.color || SLATE_400);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t.key as typeof tab)}
                      className="ph-tab inline-flex items-center"
                      data-active={active}
                      data-testid={`inventory-tab-${t.key.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {t.label}
                      <span style={{ ...TABULAR, fontSize: 11, color: countColor, fontWeight: 600, marginLeft: 4 }}>{t.count}</span>
                    </button>
                  );
                })}
              </div>

              <span aria-hidden="true" style={{ width: 1, height: 20, background: '#EDEDEF' }} />

              <div className="relative" style={{ width: 360 }}>
                <Search size={14} strokeWidth={1.9} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: SLATE_400, pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search SKU, product, collection, lot"
                  className="ds-input w-full"
                  data-testid="inventory-search"
                  style={{ paddingLeft: 36 }}
                />
              </div>

              <div className="ml-auto flex items-center" style={{ gap: 12 }}>
                {activeFilterCount > 0 && (
                  <div className="inline-flex items-center gap-2" data-testid="inventory-filter-status">
                    <span style={{ fontSize: 13, color: SLATE_500 }}>{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active</span>
                    <span aria-hidden="true" style={{ color: SLATE_300 }}>·</span>
                    <button
                      type="button"
                      onClick={clearFilters}
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: CORAL_DK, fontFamily: 'inherit' }}
                      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                      data-testid="inventory-clear-filters"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                <div className="relative">
                  <button
                    ref={colsBtnRef}
                    type="button"
                    onClick={() => setColsOpen((v) => !v)}
                    className="btn-ghost btn-sm inline-flex items-center gap-1.5"
                    data-testid="inventory-columns-btn"
                  >
                    <Columns3 size={13} strokeWidth={2} /> Columns
                  </button>
                  {colsOpen && (
                    <div
                      className="absolute z-20 rounded-xl bg-white"
                      style={{ top: 36, right: 0, boxShadow: '0 0 0 1px rgba(15,23,42,0.08), 0 10px 24px rgba(15,23,42,0.10)', padding: 6, minWidth: 200 }}
                      onMouseLeave={() => setColsOpen(false)}
                      data-testid="inventory-columns-menu"
                    >
                      {ALL_COLUMNS.map((c) => (
                        <label
                          key={c.key}
                          className="flex items-center gap-2 cursor-pointer"
                          style={{ padding: '7px 10px', fontSize: 13, color: SLATE_700, borderRadius: 6 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <input
                            type="checkbox"
                            checked={visibleCols[c.key]}
                            onChange={(e) => setVisibleCols((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                            style={{ accentColor: CORAL }}
                            data-testid={`inventory-col-toggle-${c.key}`}
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center flex-wrap" style={{ minHeight: 40, gap: 8 }} data-testid="inventory-filters-row">
              <DsSelect value={categoryFilter}   options={INV_CATEGORIES as unknown as string[]}  onChange={setCategoryFilter}   testId="inventory-category-dropdown"   minWidth={160} />
              <DsSelect value={channelFilter}    options={INV_CHANNELS as unknown as string[]}    onChange={setChannelFilter}    testId="inventory-channel-dropdown"    minWidth={150} />
              <DsSelect value={warehouseFilter}  options={INV_WAREHOUSES as unknown as string[]}  onChange={setWarehouseFilter}  testId="inventory-warehouse-dropdown"  minWidth={160} />
              <DsSelect value={seasonFilter}     options={INV_SEASONS as unknown as string[]}     onChange={setSeasonFilter}     testId="inventory-season-dropdown"     minWidth={140} />
              <DsSelect value={collectionFilter} options={INV_COLLECTIONS as unknown as string[]} onChange={setCollectionFilter} testId="inventory-collection-dropdown" minWidth={170} />
              <DsSelect value={statusFilter}     options={INV_STATUSES as unknown as string[]}    onChange={setStatusFilter}     testId="inventory-status-dropdown"     minWidth={160} />
            </div>
          </div>

          <div aria-hidden="true" style={{ height: 1, background: '#EDEDEF' }} />

          <div style={{ maxHeight: 720, overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1500 }} data-testid="inventory-table">
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: '#FFFFFF', boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                  {visibleColList.map((c) => {
                    const sortable = !!c.sortable;
                    const active = sortKey === c.key && sortDir !== null;
                    const Chevron = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : null;
                    return (
                      <th
                        key={c.key}
                        onClick={() => onHeaderClick(c.key)}
                        onMouseEnter={(e) => { if (sortable) (e.currentTarget as HTMLElement).style.background = SLATE_100; }}
                        onMouseLeave={(e) => { if (sortable) (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; }}
                        style={{
                          padding: '0 14px',
                          textAlign: c.align === 'right' ? 'right' : 'left',
                          fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                          color: active ? INK : SLATE_500, height: 44, width: c.width,
                          whiteSpace: 'nowrap', cursor: sortable ? 'pointer' : 'default',
                          userSelect: 'none', transition: 'background-color 120ms',
                        }}
                        data-testid={`inventory-header-${c.key}`}
                        data-sort-active={active || undefined}
                        data-sort-dir={active ? sortDir : undefined}
                      >
                        <span className="inline-flex items-center" style={{ gap: 4, justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start' }}>
                          {c.label}
                          {Chevron && <Chevron size={12} strokeWidth={2.4} color={SLATE_600} />}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={visibleColList.length}>
                      <div className="flex flex-col items-center justify-center" style={{ padding: '64px 24px', gap: 6 }} data-testid="inventory-empty">
                        <p style={{ fontSize: 14, fontWeight: 600, color: SLATE_700, margin: 0 }}>No SKUs match these filters.</p>
                        <p style={{ fontSize: 13, color: SLATE_500, margin: 0 }}>Try clearing a filter or search.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {rows.map((r, idx) => {
                  // Available color rules
                  let availColor = INK;
                  let availWeight: number = 400;
                  if (r.available < 0)                   { availColor = CORAL_DK; availWeight = 600; }
                  else if (r.available <= r.reorderPoint) { availColor = AMBER_FG; availWeight = 600; }
                  // Weeks on hand color rules
                  let wohColor = INK;
                  if (r.weeksOnHand < 4)        wohColor = CORAL_DK;
                  else if (r.weeksOnHand <= 6)  wohColor = AMBER_FG;
                  else if (r.weeksOnHand <= 12) wohColor = INK;
                  else                          wohColor = SLATE_500;
                  return (
                    <tr
                      key={r.sku + '-' + idx}
                      className="transition-colors duration-150 cursor-pointer"
                      style={{ borderTop: idx === 0 ? 'none' : '1px solid #F3F3F5' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => setDrawerSku(r)}
                      data-testid={`inv-row-${r.sku}`}
                    >
                      {visibleColList.map((c) => {
                        const align = c.align === 'right' ? 'right' : 'left';
                        const common: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: INK, textAlign: align, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: c.width };
                        if (c.key === 'sku') return (
                          <td key={c.key} style={{ ...common, color: CORAL_DK, fontWeight: 500 }}>
                            <span
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
                            >
                              {r.sku}
                            </span>
                          </td>
                        );
                        if (c.key === 'product')      return <td key={c.key} style={common} title={r.product}>{r.product}</td>;
                        if (c.key === 'category')     return (
                          <td key={c.key} style={common}>
                            <span style={{ padding: '2px 8px', background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.category}</span>
                          </td>
                        );
                        if (c.key === 'channel')      return (
                          <td key={c.key} style={common}>
                            <span style={{ padding: '2px 8px', background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.channel}</span>
                          </td>
                        );
                        if (c.key === 'warehouse')    return <td key={c.key} style={{ ...common, color: SLATE_700 }} title={r.warehouse}>{r.warehouse}</td>;
                        if (c.key === 'onHand')       return <td key={c.key} style={{ ...common, color: INK }}>{fmtInt(r.onHand)}</td>;
                        if (c.key === 'onOrder')      return <td key={c.key} style={{ ...common, color: r.onOrder === 0 ? SLATE_400 : INK }}>{fmtInt(r.onOrder)}</td>;
                        if (c.key === 'available')    return <td key={c.key} style={{ ...common, color: availColor, fontWeight: availWeight }}>{fmtInt(r.available)}</td>;
                        if (c.key === 'weeksOnHand')  return <td key={c.key} style={{ ...common, color: wohColor, fontWeight: r.weeksOnHand < 4 ? 600 : 400 }}>{r.weeksOnHand.toFixed(1)}</td>;
                        if (c.key === 'reorderPoint') return <td key={c.key} style={{ ...common, color: SLATE_700 }}>{fmtInt(r.reorderPoint)}</td>;
                        if (c.key === 'status')       return <td key={c.key} style={common}><StatusChip s={r.status} /></td>;
                        if (c.key === 'season')       return (
                          <td key={c.key} style={common}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, background: SLATE_100, color: SLATE_700, fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em' }}>{r.season}</span>
                          </td>
                        );
                        return <td key={c.key} style={common} />;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className="flex flex-wrap items-center justify-between"
            style={{ padding: '10px 20px', background: '#FAFAFA', borderTop: '1px solid #EDEDEF', gap: 8, minHeight: 40 }}
            data-testid="inventory-footer"
          >
            <div className="inline-flex items-center" style={{ gap: 16 }}>
              <span style={{ fontSize: 13, color: SLATE_500 }} data-testid="inventory-footer-count">
                Showing {fmtInt(rows.length)} of {fmtInt(INV_ROWS.length)} SKUs
              </span>
              <span aria-hidden="true" style={{ width: 1, height: 20, background: '#E5E7EB' }} />
              <span style={{ fontSize: 13, color: INK, fontWeight: 500 }} data-testid="inventory-footer-onhand">
                On hand: <span style={TABULAR}>{fmtInt(sumOnHand)}</span> units
              </span>
              <span aria-hidden="true" style={{ width: 1, height: 20, background: '#E5E7EB' }} />
              <span style={{ fontSize: 13, color: INK, fontWeight: 500 }} data-testid="inventory-footer-onorder">
                On order: <span style={TABULAR}>{fmtInt(sumOnOrder)}</span> units
              </span>
            </div>
            <span style={{ fontSize: 11, color: SLATE_400 }} data-testid="inventory-footer-updated">Updated {INV_SNAPSHOT}</span>
          </div>
        </section>
      </div>

      {settingsOpen && createPortal(
        <SettingsDrawer
          onClose={() => setSettingsOpen(false)}
          tab={settingsTab}
          setTab={setSettingsTab}
          prefs={prefs}
          setPrefs={setPrefs}
          groups={groups}
          setGroups={setGroups}
          dirty={dirty}
          onSave={saveDrawer}
          onDiscard={discardDrawer}
        />,
        document.body,
      )}

      {drawerSku && createPortal(
        <SkuDetailDrawer row={drawerSku} onClose={() => setDrawerSku(null)} />,
        document.body,
      )}
    </div>
  );
}

// ─── Atoms ─────────────────────────────────────────────────────────────
function KpiCell({ label, value, foot, valueColor, delta, last }: { label: string; value: string; foot: string; valueColor?: string; delta?: Delta; last?: boolean }) {
  return (
    <div style={{ padding: '0 20px', borderRight: last ? 'none' : '1px solid #F3F3F5' }} data-testid={`inventory-kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>{label}</p>
      <div className="flex items-baseline" style={{ gap: 8, margin: '8px 0 6px', flexWrap: 'wrap' }}>
        <p style={{ ...TABULAR, margin: 0, fontSize: 'clamp(28px, 2.5vw, 36px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: valueColor || '#0A0A0B' }}>{value}</p>
        {delta && <DeltaChip d={delta} />}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: SLATE_500 }}>{foot}</p>
    </div>
  );
}

// ─── SKU Detail Drawer ─────────────────────────────────────────────────
function SkuDetailDrawer({ row, onClose }: { row: InventoryRow; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const safetyStock = Math.round(row.avgDailyUnits * 7);
  const suggestedOrder = Math.max(0, row.avgDailyUnits * row.leadTime + safetyStock - row.available - row.onOrder);

  return (
    <div data-testid="inventory-detail-drawer" style={{ position: 'fixed', inset: 0, zIndex: 110 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)' }} />
      <aside
        style={{
          position: 'absolute', top: 0, right: 0, height: '100vh',
          width: 560, maxWidth: '92vw', background: '#FFFFFF',
          boxShadow: '-24px 0 48px rgba(15,23,42,0.14)',
          display: 'flex', flexDirection: 'column',
          ...INTER,
        }}
      >
        <div style={{ padding: '18px 24px 16px', borderBottom: '1px solid #EDEDEF' }}>
          <div className="flex items-start justify-between" style={{ gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>SKU</p>
              <div className="inline-flex items-center" style={{ gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: INK, letterSpacing: '-0.01em', ...TABULAR }} data-testid="inventory-detail-sku">{row.sku}</h2>
                <StatusChip s={row.status} />
              </div>
              <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 6, fontSize: 13 }}>
                <span style={{ color: INK, fontWeight: 500 }}>{row.product}</span>
                <span style={{ color: SLATE_300 }}>·</span>
                <span style={{ color: SLATE_500 }}>Category: {row.category}</span>
                <span style={{ color: SLATE_300 }}>·</span>
                <span style={{ color: SLATE_500 }}>Season: {row.season}</span>
              </div>
            </div>
            <div className="inline-flex items-center" style={{ gap: 2 }}>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Open in new tab" onClick={() => { /* eslint-disable-next-line no-console */ console.log('[inventory] open in new tab', row.sku); }} data-testid="inventory-detail-newtab"><ArrowUpRight size={14} /></button>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="More" onClick={() => { /* eslint-disable-next-line no-console */ console.log('[inventory] overflow', row.sku); }} data-testid="inventory-detail-more"><MoreHorizontal size={14} /></button>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Close" onClick={onClose} data-testid="inventory-detail-close"><X size={15} /></button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Overview */}
          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="inventory-detail-overview">
            <SectionTitle>Overview</SectionTitle>
            <div className="grid grid-cols-2" style={{ gap: '12px 16px', marginTop: 10 }}>
              <KV label="On hand"        value={fmtInt(row.onHand)} />
              <KV label="On order"       value={fmtInt(row.onOrder)} />
              <KV label="Available"      value={fmtInt(row.available)} valueColor={row.available < 0 ? CORAL_DK : row.available <= row.reorderPoint ? AMBER_FG : INK} />
              <KV label="Reorder point"  value={fmtInt(row.reorderPoint)} />
              <KV label="Weeks on hand"  value={row.weeksOnHand.toFixed(1)} valueColor={row.weeksOnHand < 4 ? CORAL_DK : row.weeksOnHand <= 6 ? AMBER_FG : INK} />
              <KV label="Sell-through 30d" value={`${row.sellThrough30d}%`} />
              <KV label="Avg daily units" value={fmtInt(row.avgDailyUnits)} />
              <KV label="Lead time"      value={`${row.leadTime} days`} />
            </div>
          </section>

          {/* Warehouse breakdown */}
          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="inventory-detail-warehouse">
            <SectionTitle>Warehouse breakdown</SectionTitle>
            <div className="mt-2 overflow-x-auto" style={{ border: '1px solid #EDEDEF', borderRadius: 10 }}>
              <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    <th style={thStyle()}>Warehouse</th>
                    <th style={thStyle('right')}>On Hand</th>
                    <th style={thStyle('right')}>On Order</th>
                    <th style={thStyle('right')}>Reserved</th>
                    <th style={thStyle('right')}>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {row.warehouseBreakdown.map((w, i) => (
                    <tr key={w.warehouse + i} style={{ borderTop: '1px solid #F3F3F5' }}>
                      <td style={tdStyle()}>{w.warehouse}</td>
                      <td style={tdStyle('right')}>{fmtInt(w.onHand)}</td>
                      <td style={tdStyle('right')}>{fmtInt(w.onOrder)}</td>
                      <td style={tdStyle('right')}>{fmtInt(w.reserved)}</td>
                      <td style={tdStyle('right')}>{fmtInt(w.available)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent movements */}
          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="inventory-detail-movements">
            <SectionTitle>Recent movements</SectionTitle>
            <div className="mt-3 flex flex-col" style={{ gap: 0 }}>
              {row.movements.map((m: Movement, i: number) => {
                const last = i === row.movements.length - 1;
                const deltaColor = m.delta > 0 ? EMERALD : CORAL_DK;
                return (
                  <div key={i} className="flex items-start" style={{ gap: 12 }}>
                    <div className="flex flex-col items-center" style={{ width: 14 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: INK, border: `2px solid ${INK}`, marginTop: 4 }} />
                      {!last && <span style={{ width: 2, flex: 1, minHeight: 24, background: SLATE_300, marginTop: 2 }} />}
                    </div>
                    <div style={{ paddingBottom: last ? 0 : 14, flex: 1, minWidth: 0 }}>
                      <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                        <span style={{ fontSize: 12.5, color: SLATE_500, fontWeight: 500 }}>{fmtMonDay(m.date)}</span>
                        <MovementChip k={m.kind} />
                        <span style={{ ...TABULAR, fontSize: 13, color: deltaColor, fontWeight: 600 }}>{m.delta > 0 ? '+' : ''}{fmtInt(m.delta)}</span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 12.5, color: SLATE_500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.note}>{m.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Replenishment */}
          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="inventory-detail-replenishment">
            <SectionTitle>Replenishment</SectionTitle>
            <div className="mt-2 rounded-xl flex items-center" style={{ padding: '14px 16px', border: '1px solid #EDEDEF', background: '#FFFFFF', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ margin: 0, fontSize: 11.5, color: SLATE_500, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Suggested order qty</p>
                <p style={{ ...TABULAR, margin: '4px 0 0', fontSize: 20, fontWeight: 600, color: INK }}>{fmtInt(suggestedOrder)} units</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>Based on avg daily units × lead time + safety stock</p>
              </div>
              <button
                type="button"
                className="btn-ghost btn-sm"
                style={{ border: `1px solid ${SLATE_300}` }}
                onClick={() => { /* eslint-disable-next-line no-console */ console.log('[inventory] create po', row.sku); }}
                data-testid="inventory-detail-create-po"
              >
                Create PO
              </button>
            </div>
          </section>

          {/* Linked open POs */}
          <section style={{ padding: '20px 24px' }} data-testid="inventory-detail-linked-pos">
            <SectionTitle>Linked open POs</SectionTitle>
            {row.linkedPOs.length === 0 ? (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: SLATE_500, fontStyle: 'italic' }}>No open POs for this SKU.</p>
            ) : (
              <div className="flex flex-col mt-2" style={{ gap: 6 }}>
                {row.linkedPOs.map((p) => {
                  const overdue = p.eta && new Date(`${p.eta}T12:00:00Z`) < new Date('2026-10-05T19:26:00Z');
                  return (
                    <div key={p.poNo} className="flex items-center" style={{ gap: 12, padding: '8px 12px', border: '1px solid #EDEDEF', borderRadius: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: CORAL_DK, fontWeight: 500, cursor: 'pointer' }}>{p.poNo}</span>
                      <span style={{ fontSize: 13, color: INK, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.supplier}</span>
                      <span style={{ fontSize: 12.5, color: overdue ? CORAL_DK : SLATE_500, fontWeight: overdue ? 600 : 400 }}>{fmtMmddyyyy(p.eta)}</span>
                      <span style={{ ...TABULAR, fontSize: 12.5, color: INK, fontWeight: 500 }}>{fmtInt(p.qty)}</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: p.status === 'Delayed' ? CORAL_BG : SLATE_100,
                          color: p.status === 'Delayed' ? CORAL_DK : SLATE_700,
                          borderRadius: 999, fontSize: 11, fontWeight: 600,
                        }}
                      >
                        {p.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between" style={{ padding: '12px 20px', borderTop: '1px solid #EDEDEF', background: '#FAFAFA' }}>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} data-testid="inventory-detail-footer-close">Close</button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            style={{ border: `1px solid ${SLATE_300}` }}
            onClick={() => { /* eslint-disable-next-line no-console */ console.log('[inventory] adjust stock', row.sku); }}
            data-testid="inventory-detail-adjust"
          >
            Adjust stock
          </button>
        </div>
      </aside>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>{children}</p>;
}
function KV({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11.5, color: SLATE_500, fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 13.5, color: valueColor || INK, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
    </div>
  );
}
function thStyle(align?: 'right'): React.CSSProperties {
  return { padding: '8px 12px', textAlign: align ?? 'left', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, fontWeight: 600 };
}
function tdStyle(align?: 'right'): React.CSSProperties {
  return { padding: '8px 12px', textAlign: align ?? 'left', fontSize: 13, color: INK };
}

// ─── Settings Drawer ──────────────────────────────────────────────────
type DrawerProps = {
  onClose: () => void;
  tab: 'Display' | 'Groups' | 'Thresholds';
  setTab: (t: 'Display' | 'Groups' | 'Thresholds') => void;
  prefs: DisplayPrefs;
  setPrefs: (p: DisplayPrefs) => void;
  groups: Group[];
  setGroups: (g: Group[]) => void;
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

function SettingsDrawer({ onClose, tab, setTab, prefs, setPrefs, groups, setGroups, dirty, onSave, onDiscard }: DrawerProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div data-testid="inventory-settings-drawer" style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)' }} />
      <aside
        style={{
          position: 'absolute', top: 0, right: 0, height: '100vh',
          width: 480, maxWidth: '92vw', background: '#FFFFFF',
          boxShadow: '-24px 0 48px rgba(15,23,42,0.14)',
          display: 'flex', flexDirection: 'column',
          ...INTER,
        }}
      >
        <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid #EDEDEF' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>Report settings</h2>
          <button type="button" onClick={onClose} className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Close" data-testid="inventory-settings-close"><X size={15} /></button>
        </div>

        <div className="flex items-center" style={{ padding: '0 20px', borderBottom: '1px solid #EDEDEF', gap: 20 }}>
          {(['Display', 'Groups', 'Thresholds'] as const).map((t) => {
            const active = tab === t;
            const count = t === 'Groups' ? groups.length : null;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="inline-flex items-center gap-1.5"
                style={{
                  background: 'transparent', border: 'none', padding: '12px 0',
                  color: active ? INK : SLATE_500,
                  fontSize: 13.5, fontWeight: active ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  borderBottom: active ? `2px solid ${CORAL}` : '2px solid transparent',
                }}
                data-testid={`inventory-settings-tab-${t.toLowerCase()}`}
              >
                {t}{count !== null && <span style={{ color: SLATE_400, fontSize: 12 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'Display' && (
            <div className="flex flex-col" style={{ gap: 18 }} data-testid="inventory-settings-display">
              <PrefCard
                checked={prefs.showReserved}
                onChange={(v) => setPrefs({ ...prefs, showReserved: v })}
                title="Show reserved units separately"
                desc="Display only. Does not affect allocation math."
                testId="pref-show-reserved"
              />
              <PrefCard
                checked={prefs.hideInactive}
                onChange={(v) => setPrefs({ ...prefs, hideInactive: v })}
                title="Hide inactive SKUs"
                desc="Exclude archived or discontinued SKUs from the list."
                testId="pref-hide-inactive"
              />

              <div>
                <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: '0 0 8px' }}>Default sort</p>
                <DsSelect value={prefs.defaultSort} options={DEFAULT_SORT_OPTS as unknown as string[]} onChange={(v) => setPrefs({ ...prefs, defaultSort: v })} testId="pref-default-sort" minWidth={240} />
                <p style={{ margin: '6px 0 0', fontSize: 12, color: SLATE_500 }}>Clicking a column header overrides this until cleared.</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: '0 0 8px' }}>Date format</p>
                <DsSelect value={prefs.dateFormat} options={DATE_FMT_OPTS as unknown as string[]} onChange={(v) => setPrefs({ ...prefs, dateFormat: v })} testId="pref-date-format" minWidth={180} />
                <p style={{ margin: '6px 0 0', fontSize: 12, color: SLATE_500 }}>Excel exports always use ISO dates.</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: '0 0 8px' }}>Automatic refresh</p>
                <div className="rounded-xl" style={{ background: SLATE_50, padding: '12px 14px', border: '1px solid #EDEDEF', fontSize: 13, color: SLATE_700 }}>
                  Every 30 minutes, scheduled by the server
                </div>
              </div>
            </div>
          )}

          {tab === 'Groups' && (
            <div data-testid="inventory-settings-groups">
              <p style={{ margin: '0 0 14px', fontSize: 13, color: SLATE_500 }}>
                Shared with everyone. Values match exactly. Selected groups combine with OR.
              </p>
              <div className="flex flex-col" style={{ gap: 10 }}>
                {groups.map((g) => (
                  expandedGroupId === g.id ? (
                    <div key={g.id}>
                      <GroupEditorCard
                        group={g}
                        onChange={(next) => setGroups(groups.map((x) => (x.id === g.id ? next : x)))}
                        onDelete={() => { setGroups(groups.filter((x) => x.id !== g.id)); setExpandedGroupId(null); }}
                        testId={`inventory-group-${g.id}`}
                      />
                      <div className="flex justify-end mt-2">
                        <button type="button" onClick={() => setExpandedGroupId(null)} className="btn-ghost btn-sm" data-testid={`inventory-group-${g.id}-done`}>Done</button>
                      </div>
                    </div>
                  ) : (
                    <GroupSummaryRow
                      key={g.id}
                      group={g}
                      onEdit={() => setExpandedGroupId(g.id)}
                      onDelete={() => setGroups(groups.filter((x) => x.id !== g.id))}
                    />
                  )
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const g = makeNewGroup(groups.map((x) => x.color));
                  setGroups([...groups, g]);
                  setExpandedGroupId(g.id);
                }}
                className="btn-ghost btn-sm inline-flex items-center gap-1 mt-3"
                data-testid="inventory-settings-group-add"
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New group
              </button>
            </div>
          )}

          {tab === 'Thresholds' && (
            <div data-testid="inventory-settings-thresholds">
              <p style={{ margin: '0 0 14px', fontSize: 13, color: SLATE_500 }}>
                Set when a SKU is flagged Low, Out, Overstocked, or Dead.
              </p>
              <div className="flex flex-col" style={{ gap: 10 }}>
                <ThresholdCard
                  label="Low stock"
                  prefix="≤"
                  value={prefs.thresholds.lowStockWeeks}
                  suffix="weeks on hand"
                  desc="SKUs under this will be flagged Low."
                  onChange={(n) => setPrefs({ ...prefs, thresholds: { ...prefs.thresholds, lowStockWeeks: n } })}
                  testId="threshold-low-stock"
                />
                <ThresholdCard
                  label="Out of stock"
                  prefix="≤"
                  value={prefs.thresholds.outOfStockUnits}
                  suffix="units available"
                  desc="SKUs at or below this are flagged Out."
                  onChange={(n) => setPrefs({ ...prefs, thresholds: { ...prefs.thresholds, outOfStockUnits: n } })}
                  testId="threshold-out-of-stock"
                />
                <ThresholdCard
                  label="Overstocked"
                  prefix="≥"
                  value={prefs.thresholds.overstockedWeeks}
                  suffix="weeks on hand"
                  desc="SKUs over this coverage are flagged Overstocked."
                  onChange={(n) => setPrefs({ ...prefs, thresholds: { ...prefs.thresholds, overstockedWeeks: n } })}
                  testId="threshold-overstocked"
                />
                <ThresholdCard
                  label="Dead stock"
                  prefix="No sales in last"
                  value={prefs.thresholds.deadStockDays}
                  suffix="days"
                  desc="SKUs with no outbound movement over this window are flagged Dead."
                  onChange={(n) => setPrefs({ ...prefs, thresholds: { ...prefs.thresholds, deadStockDays: n } })}
                  testId="threshold-dead-stock"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between" style={{ padding: '12px 20px', borderTop: '1px solid #EDEDEF', background: '#FAFAFA' }}>
          <span style={{ fontSize: 12.5, color: dirty ? CORAL_DK : SLATE_500, fontWeight: 500 }} data-testid="inventory-settings-dirty">{dirty ? 'Unsaved changes' : 'Saved'}</span>
          <div className="inline-flex items-center gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={onDiscard} disabled={!dirty} data-testid="inventory-settings-discard">Discard</button>
            <button type="button" className="btn-primary btn-sm" onClick={onSave} disabled={!dirty} data-testid="inventory-settings-save">Save</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function PrefCard({ checked, onChange, title, desc, testId }: { checked: boolean; onChange: (v: boolean) => void; title: string; desc: string; testId: string }) {
  return (
    <label className="rounded-xl flex items-start gap-3 cursor-pointer transition-colors duration-150" style={{ padding: 14, border: `1px solid ${checked ? CORAL : '#EDEDEF'}`, background: checked ? CORAL_BG : '#FFFFFF' }} data-testid={testId}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: CORAL, marginTop: 2 }} />
      <div>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: INK }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: SLATE_500 }}>{desc}</p>
      </div>
    </label>
  );
}

function ThresholdCard({ label, prefix, value, suffix, desc, onChange, testId }: { label: string; prefix: string; value: number; suffix: string; desc: string; onChange: (n: number) => void; testId: string }) {
  return (
    <div className="rounded-xl" style={{ padding: 14, border: '1px solid #EDEDEF', background: '#FFFFFF' }} data-testid={testId}>
      <p style={{ margin: 0, fontSize: 11.5, color: SLATE_500, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
      <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 13, color: INK, fontWeight: 500 }}>{prefix}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="ds-input"
          style={{ width: 100 }}
          data-testid={`${testId}-input`}
        />
        <span style={{ fontSize: 13, color: SLATE_700 }}>{suffix}</span>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: SLATE_500 }}>{desc}</p>
    </div>
  );
}

function GroupSummaryRow({ group, onEdit, onDelete }: { group: Group; onEdit: () => void; onDelete: () => void }) {
  const preview = group.values.slice(0, 3);
  const extra = Math.max(0, group.values.length - 3);
  return (
    <div
      className="rounded-xl flex items-center gap-3 cursor-pointer transition-colors duration-150"
      style={{ padding: '12px 14px', background: '#FFFFFF', border: '1px solid #EDEDEF' }}
      onClick={onEdit}
      onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
      data-testid={`inventory-group-row-${group.id}`}
    >
      <span className="inline-block rounded-full shrink-0" style={{ width: 10, height: 10, background: group.color }} />
      <span style={{ fontSize: 14.5, fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>{group.name}</span>
      <span style={{ padding: '2px 8px', background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>{group.dimension}</span>
      <span style={{ fontSize: 12.5, color: SLATE_500, whiteSpace: 'nowrap' }}>{group.values.length} value{group.values.length === 1 ? '' : 's'}</span>
      <div className="flex items-center min-w-0" style={{ gap: 4, overflow: 'hidden' }}>
        {preview.map((v) => (
          <span key={v} className="inline-flex items-center" style={{ padding: '2px 6px', background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 11.5, fontWeight: 500, maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
        ))}
        {extra > 0 && <span style={{ fontSize: 11.5, color: SLATE_500, fontWeight: 500, whiteSpace: 'nowrap' }}>+{extra} more</span>}
      </div>
      <div className="ml-auto inline-flex items-center shrink-0" style={{ gap: 2 }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="btn-ghost btn-sm" data-testid={`inventory-group-row-${group.id}-edit`}>Edit</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Delete group" data-testid={`inventory-group-row-${group.id}-delete`}>×</button>
      </div>
    </div>
  );
}
