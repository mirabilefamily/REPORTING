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
  Trash2,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DsSelect from '../components/DsSelect';
import GroupsFilter from '../components/GroupsFilter';
import { SavedViewsPills, SaveViewControl, type SavedView } from '../components/SavedViewsBar';
import {
  LANES_SEED,
  PO_CUSTOMERS,
  PO_DESTINATIONS,
  PO_GLOBAL_TOTALS,
  PO_MODES,
  PO_ROWS,
  PO_ROW_STATUSES,
  PO_STATES,
  PO_STATUS_STRIP,
  PO_SUPPLIERS_LIST,
  PO_TODAY,
  type Lane,
  type LaneMode,
  type PoLine,
  type PoLineItemStatus,
  type PoLinkedSoStatus,
  type PoRowStatus,
} from '../mocks/openPurchaseOrders';
import { loadGroups, makeNewGroup, saveGroups, type Group } from '../mocks/groups';
import GroupEditorCard from '../components/GroupEditorCard';

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
const fmtUsd = (n: number) => `$${n.toLocaleString('en-US')}`;
const fmtMmddyyyy = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00Z`);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getUTCFullYear()}`;
};
const isPoOverdue = (eta: string | null, status: PoLine['status']) => {
  if (!eta) return false;
  if (status === 'Received') return false;
  return new Date(`${eta}T12:00:00Z`) < PO_TODAY;
};

// ─── Column schema ─────────────────────────────────────────────────────
type ColKey = 'poNo' | 'lines' | 'supplier' | 'reference' | 'memo' | 'itemNo' | 'product' | 'collection' | 'estShip' | 'eta' | 'launch' | 'season';
const ALL_COLUMNS: { key: ColKey; label: string; align?: 'left' | 'right'; width?: number; sortable?: boolean; field: keyof PoLine | null }[] = [
  { key: 'poNo',       label: 'PO #',           align: 'left',  width: 96 , sortable: true,  field: 'poNo' },
  { key: 'lines',      label: 'Lines',          align: 'right', width: 72 , sortable: true,  field: 'lines' },
  { key: 'supplier',   label: 'Supplier',       align: 'left',  width: 180, sortable: true,  field: 'supplier' },
  { key: 'reference',  label: 'Reference',      align: 'left',  width: 140, sortable: true,  field: 'reference' },
  { key: 'memo',       label: 'Memo',           align: 'left',  width: 110, sortable: false, field: 'memo' },
  { key: 'itemNo',     label: 'Item #',         align: 'left',  width: 160, sortable: true,  field: 'itemNo' },
  { key: 'product',    label: 'Product',        align: 'left',  width: 240, sortable: true,  field: 'product' },
  { key: 'collection', label: 'Collection',     align: 'left',  width: 150, sortable: true,  field: 'collection' },
  { key: 'estShip',    label: 'Est. ship date', align: 'left',  width: 120, sortable: true,  field: 'estShipDate' },
  { key: 'eta',        label: 'ETA',            align: 'left',  width: 110, sortable: true,  field: 'eta' },
  { key: 'launch',     label: 'Launch',         align: 'left',  width: 110, sortable: true,  field: 'launch' },
  { key: 'season',     label: 'Season',         align: 'left',  width: 90 , sortable: true,  field: 'season' },
];

type DisplayPrefs = {
  showProjectedEta: boolean;
  showPosNoSo: boolean;
  defaultSort: string;
  dateFormat: string;
};
const DEFAULT_PREFS: DisplayPrefs = {
  showProjectedEta: true,
  showPosNoSo: true,
  defaultSort: 'ETA, soonest first (missing last)',
  dateFormat: 'MM/DD/YYYY',
};
const DEFAULT_SORT_OPTS = [
  'ETA, soonest first (missing last)',
  'ETA, latest first',
  'PO #, ascending',
  'PO #, descending',
  'Supplier A→Z',
  'Supplier Z→A',
] as const;
const DATE_FMT_OPTS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as const;

// ─── Saved view filter shape ──────────────────────────────────────────
type OpoViewFilters = {
  tab: 'All' | 'Late' | 'Shipped' | 'No lead';
  query: string;
  stateFilter: string;
  supplierFilter: string;
  destFilter: string;
  modeFilter: string;
  statusFilter: string;
  customerFilter: string;
  selectedGroupIds: string[];
};
const OPO_SEED_VIEWS: SavedView<OpoViewFilters>[] = [
  { id: 'v_opo_late_ocean', name: 'Late + Ocean', pinned: true, createdAt: '2026-10-01T00:00:00Z',
    filters: { tab: 'Late', query: '', stateFilter: 'All PO states', supplierFilter: 'All suppliers', destFilter: 'All destinations', modeFilter: 'Ocean', statusFilter: 'All statuses', customerFilter: 'All customers', selectedGroupIds: [] } },
  { id: 'v_opo_asi_in',     name: 'ASI inbound',  pinned: true, createdAt: '2026-10-01T00:00:00Z',
    filters: { tab: 'All', query: '', stateFilter: 'All PO states', supplierFilter: 'ASI Global Limited (China)', destFilter: 'All destinations', modeFilter: 'All modes', statusFilter: 'All statuses', customerFilter: 'All customers', selectedGroupIds: [] } },
];

// Map a Group.dimension → PoLine field used for OR-filtering.
const OPO_DIMENSION_TO_FIELD: Record<string, keyof PoLine | undefined> = {
  Destination: 'destination',
  Supplier:    'supplier',
  Status:      'status',
  Mode:        'mode',
  Customer:    'customer',
  'PO State':  'state',
};

type SortDir = 'asc' | 'desc';
function defaultSortParams(label: string): { key: ColKey; dir: SortDir; nullsLast?: boolean } {
  switch (label) {
    case 'ETA, latest first':    return { key: 'eta', dir: 'desc' };
    case 'PO #, ascending':      return { key: 'poNo', dir: 'asc' };
    case 'PO #, descending':     return { key: 'poNo', dir: 'desc' };
    case 'Supplier A→Z':         return { key: 'supplier', dir: 'asc' };
    case 'Supplier Z→A':         return { key: 'supplier', dir: 'desc' };
    default:                     return { key: 'eta', dir: 'asc', nullsLast: true };
  }
}
function cmp(a: PoLine, b: PoLine, field: keyof PoLine, dir: SortDir, nullsLast?: boolean) {
  const av = a[field] as unknown;
  const bv = b[field] as unknown;
  const aNull = av === null || av === undefined || av === '';
  const bNull = bv === null || bv === undefined || bv === '';
  if (aNull && bNull) return 0;
  if (aNull) return nullsLast ? 1 : -1;
  if (bNull) return nullsLast ? -1 : 1;
  if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av;
  const as = String(av).toLowerCase();
  const bs = String(bv).toLowerCase();
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

// ─── Status chip (shared in drawer header + line items) ────────────────
function StatusChip({ s }: { s: PoRowStatus }) {
  const styles: Record<PoRowStatus, React.CSSProperties> = {
    'Received':      { background: EMERALD_BG, color: EMERALD },
    'Delayed':       { background: CORAL_BG,   color: CORAL_DK },
    'In Production': { background: SLATE_100,  color: SLATE_700 },
    'On-time':       { background: SLATE_100,  color: SLATE_700 },
    'Draft':         { background: SLATE_100,  color: SLATE_400 },
  };
  return (
    <span style={{ ...styles[s], padding: '3px 8px', fontSize: 11.5, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }}>
      {s}
    </span>
  );
}
function LineStatusChip({ s }: { s: PoLineItemStatus }) {
  const styles: Record<PoLineItemStatus, React.CSSProperties> = {
    Pending:  { background: SLATE_100,  color: SLATE_700 },
    Partial:  { background: AMBER_BG,   color: AMBER_FG },
    Received: { background: EMERALD_BG, color: EMERALD },
  };
  return <span style={{ ...styles[s], padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }}>{s}</span>;
}
function SoStatusChip({ s }: { s: PoLinkedSoStatus }) {
  const styles: Record<PoLinkedSoStatus, React.CSSProperties> = {
    'Open':          { background: SLATE_100,  color: SLATE_700 },
    'In Production': { background: SLATE_100,  color: SLATE_700 },
    'Ready to Ship': { background: AMBER_BG,   color: AMBER_FG },
    'Shipped':       { background: EMERALD_BG, color: EMERALD },
  };
  return <span style={{ ...styles[s], padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }}>{s}</span>;
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function OpenPurchaseOrdersPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'All' | 'Late' | 'Shipped' | 'No lead'>('All');
  const [stateFilter, setStateFilter] = useState<string>('All PO states');
  const [supplierFilter, setSupplierFilter] = useState<string>('All suppliers');
  const [destFilter, setDestFilter] = useState<string>('All destinations');
  const [modeFilter, setModeFilter] = useState<string>('All modes');
  const [statusFilter, setStatusFilter] = useState<string>('All statuses');
  const [customerFilter, setCustomerFilter] = useState<string>('All customers');

  const [colsOpen, setColsOpen] = useState(false);
  const colsBtnRef = useRef<HTMLButtonElement | null>(null);
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() =>
    ALL_COLUMNS.reduce((acc, c) => { acc[c.key] = true; return acc; }, {} as Record<ColKey, boolean>),
  );

  // Sort state (null = fall back to prefs.defaultSort)
  const [sortKey, setSortKey] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'Display' | 'Groups' | 'Lanes'>('Display');
  const [drawerPO, setDrawerPO] = useState<PoLine | null>(null);
  const [prefs, setPrefs] = useState<DisplayPrefs>(() => {
    try {
      const raw = localStorage.getItem('opoReportSettings');
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) as DisplayPrefs } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });
  const [prefsClean, setPrefsClean] = useState<DisplayPrefs>(prefs);
  const [lanes, setLanes] = useState<Lane[]>(() => {
    try {
      const raw = localStorage.getItem('opoLanes');
      return raw ? JSON.parse(raw) as Lane[] : LANES_SEED;
    } catch { return LANES_SEED; }
  });
  const [lanesClean, setLanesClean] = useState<Lane[]>(lanes);
  const [laneFilter, setLaneFilter] = useState('');
  const [groups, setGroups] = useState<Group[]>(() => loadGroups());
  const [groupsClean, setGroupsClean] = useState<Group[]>(groups);

  // Saved views + Groups filter
  const [views, setViews] = useState<SavedView<OpoViewFilters>[]>(() => {
    try {
      const raw = localStorage.getItem('opoSavedViews');
      return raw ? (JSON.parse(raw) as SavedView<OpoViewFilters>[]) : OPO_SEED_VIEWS;
    } catch { return OPO_SEED_VIEWS; }
  });
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  useEffect(() => {
    try { localStorage.setItem('opoSavedViews', JSON.stringify(views)); } catch { /* ignore */ }
  }, [views]);

  const dirty =
    JSON.stringify(prefs) !== JSON.stringify(prefsClean) ||
    JSON.stringify(lanes) !== JSON.stringify(lanesClean) ||
    JSON.stringify(groups) !== JSON.stringify(groupsClean);

  const tabCounts = useMemo(() => {
    const all = PO_ROWS.length;
    const late = PO_ROWS.filter((r) => isPoOverdue(r.eta, r.status)).length;
    const shipped = PO_ROWS.filter((r) => r.status === 'Received').length;
    const noLead = PO_ROWS.filter((r) => !r.eta).length;
    return { All: all, Late: late, Shipped: shipped, 'No lead': noLead };
  }, []);

  const rows = useMemo(() => {
    let out: PoLine[] = PO_ROWS.slice();
    if (tab === 'Late')     out = out.filter((r) => isPoOverdue(r.eta, r.status));
    if (tab === 'Shipped')  out = out.filter((r) => r.status === 'Received');
    if (tab === 'No lead')  out = out.filter((r) => !r.eta);
    if (stateFilter    !== 'All PO states')   out = out.filter((r) => r.state === stateFilter);
    if (supplierFilter !== 'All suppliers')   out = out.filter((r) => r.supplier === supplierFilter);
    if (destFilter     !== 'All destinations') out = out.filter((r) => r.destination === destFilter);
    if (modeFilter     !== 'All modes')       out = out.filter((r) => r.mode === modeFilter);
    if (statusFilter   !== 'All statuses')    out = out.filter((r) => r.status === statusFilter);
    if (customerFilter !== 'All customers')   out = out.filter((r) => r.customer === customerFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        r.poNo.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q) ||
        r.itemNo.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.memo.toLowerCase().includes(q),
      );
    }

    // Groups filter — OR across selected groups
    if (selectedGroupIds.length > 0) {
      const activeGroups = groups.filter((g) => selectedGroupIds.includes(g.id));
      if (activeGroups.length > 0) {
        out = out.filter((r) => activeGroups.some((g) => {
          const field = OPO_DIMENSION_TO_FIELD[g.dimension];
          if (!field) return false;
          return g.values.includes(String(r[field]));
        }));
      }
    }

    // Sort — explicit header-sort wins; else default from prefs
    if (sortKey && sortDir) {
      const col = ALL_COLUMNS.find((c) => c.key === sortKey);
      const field = col?.field;
      if (field) {
        const nullsLast = field === 'eta' || field === 'estShipDate' || field === 'launch';
        out = out.slice().sort((a, b) => cmp(a, b, field, sortDir, nullsLast));
      }
    } else {
      const dp = defaultSortParams(prefs.defaultSort);
      const col = ALL_COLUMNS.find((c) => c.key === dp.key);
      const field = col?.field;
      if (field) out = out.slice().sort((a, b) => cmp(a, b, field, dp.dir, dp.nullsLast));
    }
    return out;
  }, [tab, stateFilter, supplierFilter, destFilter, modeFilter, statusFilter, customerFilter, query, sortKey, sortDir, prefs.defaultSort, selectedGroupIds, groups]);

  const visibleColList = ALL_COLUMNS.filter((c) => visibleCols[c.key]);

  const activeFilterCount =
    (stateFilter    !== 'All PO states'   ? 1 : 0) +
    (supplierFilter !== 'All suppliers'   ? 1 : 0) +
    (destFilter     !== 'All destinations' ? 1 : 0) +
    (modeFilter     !== 'All modes'       ? 1 : 0) +
    (statusFilter   !== 'All statuses'    ? 1 : 0) +
    (customerFilter !== 'All customers'   ? 1 : 0) +
    (selectedGroupIds.length > 0          ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setStateFilter('All PO states');
    setSupplierFilter('All suppliers');
    setDestFilter('All destinations');
    setModeFilter('All modes');
    setStatusFilter('All statuses');
    setCustomerFilter('All customers');
    setSelectedGroupIds([]);
    setQuery('');
    setActiveViewId(null);
  };

  const getCurrentFilters = (): OpoViewFilters => ({
    tab, query, stateFilter, supplierFilter, destFilter, modeFilter, statusFilter, customerFilter, selectedGroupIds,
  });
  const applyView = (v: SavedView<OpoViewFilters>) => {
    const f = v.filters;
    setTab(f.tab); setQuery(f.query);
    setStateFilter(f.stateFilter); setSupplierFilter(f.supplierFilter);
    setDestFilter(f.destFilter); setModeFilter(f.modeFilter);
    setStatusFilter(f.statusFilter); setCustomerFilter(f.customerFilter);
    setSelectedGroupIds(f.selectedGroupIds || []);
    setActiveViewId(v.id);
  };
  const clearActiveView = () => setActiveViewId(null);

  const onHeaderClick = (key: ColKey) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    // third click → clear
    setSortKey(null); setSortDir(null);
  };

  const exportMock = () => { /* eslint-disable-next-line no-console */ console.log('[open-purchase-orders] export excel'); };

  const saveDrawer = () => {
    localStorage.setItem('opoReportSettings', JSON.stringify(prefs));
    localStorage.setItem('opoLanes', JSON.stringify(lanes));
    saveGroups(groups);
    setPrefsClean(prefs); setLanesClean(lanes); setGroupsClean(groups);
  };
  const discardDrawer = () => { setPrefs(prefsClean); setLanes(lanesClean); setGroups(groupsClean); };

  // Footer sums (visible rows)
  const sumOpenUnits = rows.reduce((s, r) => s + Math.max(0, r.qtyOrdered - r.qtyReceived), 0);
  const sumValue     = rows.reduce((s, r) => s + r.value, 0);

  // KPI deltas
  const kpiDeltas: Record<string, Delta> = {
    orders:    { tone: 'up',   text: '4.2%', emerald: true },
    openUnits: { tone: 'up',   text: '1.8%', emerald: true },
    fulfilled: { tone: 'down', text: '1.1pt', emerald: false },
    late:      { tone: 'up',   text: '3',    emerald: false },
    noLead:    { tone: 'down', text: '12',   emerald: true },
    onTime:    { tone: 'down', text: '2.5pt', emerald: false },
  };

  return (
    <div className="min-h-full" data-testid="purchase-orders-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        <PageHeader
          title="Open Purchase Orders"
          testIdPrefix="po"
          right={
            <div className="inline-flex items-center gap-2">
              <button type="button" onClick={() => setDrawerOpen(true)} className="btn-ghost btn-sm inline-flex items-center gap-1.5" data-testid="po-open-settings">
                <Settings size={13} strokeWidth={2} /> Settings
              </button>
              <button type="button" onClick={exportMock} className="btn-ghost btn-sm inline-flex items-center gap-1.5" data-testid="po-export">
                <Download size={13} strokeWidth={2} /> Excel
              </button>
            </div>
          }
        />
        <p style={{ margin: '-6px 0 0', fontSize: 13.5, color: SLATE_500 }} data-testid="po-subtitle">
          Open inbound lines from Fulfil, with ETAs, lead times and linked sales orders.
        </p>

        <div className="mt-6 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500 }} data-testid="po-section-label">
            All eligible purchase orders
          </span>
          <span style={{ fontSize: 12, color: SLATE_400, fontStyle: 'italic' }}>Global totals, not affected by filters below</span>
        </div>

        {/* ── KPI strip (6, now with delta chips) ────────────────── */}
        <section className="mt-2.5 overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #EDEDEF', padding: '20px 0' }} data-testid="po-kpi-strip">
          <div className="grid grid-cols-3 xl:grid-cols-6">
            <KpiCell label="Orders"       value={fmtInt(PO_GLOBAL_TOTALS.orders)}       foot="vs last week" delta={kpiDeltas.orders} />
            <KpiCell label="Open units"   value={fmtInt(PO_GLOBAL_TOTALS.openUnits)}    foot="vs last week" delta={kpiDeltas.openUnits} />
            <KpiCell label="Fulfilled"    value={`${PO_GLOBAL_TOTALS.fulfilledPct}%`}   foot="vs last week" delta={kpiDeltas.fulfilled} />
            <KpiCell label="Late"         value={fmtInt(PO_GLOBAL_TOTALS.late)}         foot="vs last week" delta={kpiDeltas.late}   valueColor={CORAL_DK} />
            <KpiCell label="No lead"      value={fmtInt(PO_GLOBAL_TOTALS.noLead)}       foot="vs last week" delta={kpiDeltas.noLead} valueColor={AMBER_FG} />
            <KpiCell label="On-time rate" value={`${PO_GLOBAL_TOTALS.onTimePct}%`}      foot="vs last week" delta={kpiDeltas.onTime} last />
          </div>
        </section>

        {/* ── Unified toolbar + table card ──────────────────────── */}
        <section className="mt-5 overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #EDEDEF' }} data-testid="po-table-card">
          <div style={{ padding: '16px 20px' }} data-testid="po-toolbar">
            <div className="flex items-center gap-3 flex-wrap" style={{ minHeight: 40 }}>
              <SavedViewsPills views={views} activeId={activeViewId} onApply={applyView} onClear={clearActiveView} testIdPrefix="po" />
              <div className="inline-flex items-center" role="tablist" style={{ gap: 2 }} data-testid="po-tabs">
                {(['All', 'Late', 'Shipped', 'No lead'] as const).map((t) => {
                  const active = tab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t)}
                      className="ph-tab inline-flex items-center"
                      data-active={active}
                      data-testid={`po-tab-${t.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {t}
                      <span style={{ ...TABULAR, fontSize: 11, color: active ? INK : SLATE_400, fontWeight: 600, marginLeft: 4 }}>{tabCounts[t]}</span>
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
                  placeholder="Search POs, SKUs, SOs, dates, notes"
                  className="ds-input w-full"
                  data-testid="po-search"
                  style={{ paddingLeft: 36 }}
                />
              </div>

              <div className="ml-auto flex items-center" style={{ gap: 12 }}>
                <SaveViewControl views={views} setViews={setViews} activeId={activeViewId} setActiveId={setActiveViewId} getCurrentFilters={getCurrentFilters} testIdPrefix="po" />
                {activeFilterCount > 0 && (
                  <div className="inline-flex items-center gap-2" data-testid="po-filter-status">
                    <span style={{ fontSize: 13, color: SLATE_500 }}>{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active</span>
                    <span aria-hidden="true" style={{ color: SLATE_300 }}>·</span>
                    <button
                      type="button"
                      onClick={clearFilters}
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: CORAL_DK, fontFamily: 'inherit' }}
                      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                      data-testid="po-clear-filters"
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
                    data-testid="po-columns-btn"
                  >
                    <Columns3 size={13} strokeWidth={2} /> Columns
                  </button>
                  {colsOpen && (
                    <div
                      className="absolute z-20 rounded-xl bg-white"
                      style={{ top: 36, right: 0, boxShadow: '0 0 0 1px rgba(15,23,42,0.08), 0 10px 24px rgba(15,23,42,0.10)', padding: 6, minWidth: 200 }}
                      onMouseLeave={() => setColsOpen(false)}
                      data-testid="po-columns-menu"
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
                            data-testid={`po-col-toggle-${c.key}`}
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center flex-wrap" style={{ minHeight: 40, gap: 8 }} data-testid="po-filters-row">
              <DsSelect value={stateFilter}    options={PO_STATES as unknown as string[]}         onChange={setStateFilter}    testId="po-state-dropdown"       minWidth={150} />
              <DsSelect value={supplierFilter} options={PO_SUPPLIERS_LIST as unknown as string[]} onChange={setSupplierFilter} testId="po-supplier-dropdown"    minWidth={160} />
              <DsSelect value={destFilter}     options={PO_DESTINATIONS as unknown as string[]}   onChange={setDestFilter}     testId="po-destination-dropdown" minWidth={170} />
              <DsSelect value={modeFilter}     options={PO_MODES as unknown as string[]}          onChange={setModeFilter}     testId="po-mode-dropdown"        minWidth={150} />
              <DsSelect value={statusFilter}   options={PO_ROW_STATUSES as unknown as string[]}   onChange={setStatusFilter}   testId="po-status-dropdown"      minWidth={150} />
              <DsSelect value={customerFilter} options={PO_CUSTOMERS as unknown as string[]}      onChange={setCustomerFilter} testId="po-customer-dropdown"    minWidth={160} />
              <GroupsFilter groups={groups} selectedIds={selectedGroupIds} onChange={setSelectedGroupIds} testId="po-groups-filter" minWidth={150} />
            </div>
          </div>

          <div aria-hidden="true" style={{ height: 1, background: '#EDEDEF' }} />

          <div style={{ maxHeight: 720, overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1400 }} data-testid="po-table">
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
                        data-testid={`po-header-${c.key}`}
                        data-sort-active={active || undefined}
                        data-sort-dir={active ? sortDir : undefined}
                      >
                        <span className="inline-flex items-center" style={{ gap: 4 }}>
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
                      <div className="flex flex-col items-center justify-center" style={{ padding: '64px 24px', gap: 6 }} data-testid="po-empty">
                        <p style={{ fontSize: 14, fontWeight: 600, color: SLATE_700, margin: 0 }}>No purchase orders match these filters.</p>
                        <p style={{ fontSize: 13, color: SLATE_500, margin: 0 }}>Try clearing a filter or search.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {rows.map((p, idx) => {
                  const overdue = isPoOverdue(p.eta, p.status);
                  return (
                    <tr
                      key={p.poNo + '-' + idx}
                      className="transition-colors duration-150 cursor-pointer"
                      style={{ borderTop: idx === 0 ? 'none' : '1px solid #F3F3F5' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => setDrawerPO(p)}
                      data-testid={`po-row-${p.poNo}`}
                    >
                      {visibleColList.map((c) => {
                        const align = c.align === 'right' ? 'right' : 'left';
                        const common: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: INK, textAlign: align, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: c.width };
                        if (c.key === 'poNo') return (
                          <td key={c.key} style={{ ...common, color: CORAL_DK, fontWeight: 500 }}>
                            <span style={{ cursor: 'pointer' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}>{p.poNo}</span>
                          </td>
                        );
                        if (c.key === 'lines')     return <td key={c.key} style={{ ...common, color: SLATE_700 }}>{p.lines}</td>;
                        if (c.key === 'supplier')  return <td key={c.key} style={common} title={p.supplier}>{p.supplier}</td>;
                        if (c.key === 'reference') return <td key={c.key} style={{ ...common, color: SLATE_700 }} title={p.reference}>{p.reference}</td>;
                        if (c.key === 'memo')      return <td key={c.key} style={{ ...common, color: p.memo === '—' ? SLATE_400 : SLATE_700 }} title={p.memo}>{p.memo}</td>;
                        if (c.key === 'itemNo')    return <td key={c.key} style={{ ...common, color: SLATE_700 }} title={p.itemNo}>{p.itemNo}</td>;
                        if (c.key === 'product')   return <td key={c.key} style={common} title={p.product}>{p.product}</td>;
                        if (c.key === 'collection')return <td key={c.key} style={{ ...common, color: SLATE_700 }} title={p.collection}>{p.collection}</td>;
                        if (c.key === 'estShip')   return <td key={c.key} style={{ ...common, color: p.estShipDate ? SLATE_700 : SLATE_400 }}>{fmtMmddyyyy(p.estShipDate)}</td>;
                        if (c.key === 'eta')       return (
                          <td key={c.key} style={{ ...common, color: overdue ? CORAL_DK : (p.eta ? SLATE_700 : SLATE_400), fontWeight: overdue ? 600 : 400 }}>{fmtMmddyyyy(p.eta)}</td>
                        );
                        if (c.key === 'launch')    return <td key={c.key} style={{ ...common, color: p.launch ? SLATE_700 : SLATE_400 }}>{fmtMmddyyyy(p.launch)}</td>;
                        if (c.key === 'season')    return (
                          <td key={c.key} style={common}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, background: SLATE_100, color: SLATE_700, fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em' }}>{p.season}</span>
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

          {/* Sticky summary footer (outside the scroll area, inside the same card) */}
          <div
            className="flex flex-wrap items-center justify-between"
            style={{ padding: '10px 20px', background: '#FAFAFA', borderTop: '1px solid #EDEDEF', gap: 8, minHeight: 40 }}
            data-testid="po-footer"
          >
            <div className="inline-flex items-center" style={{ gap: 16 }}>
              <span style={{ fontSize: 13, color: SLATE_500 }} data-testid="po-footer-count">
                Showing {fmtInt(rows.length)} of {fmtInt(PO_ROWS.length)} POs
              </span>
              <span aria-hidden="true" style={{ width: 1, height: 20, background: '#E5E7EB' }} />
              <span style={{ fontSize: 13, color: INK, fontWeight: 500 }} data-testid="po-footer-open-units">
                Open units: <span style={TABULAR}>{fmtInt(sumOpenUnits)}</span>
              </span>
              <span aria-hidden="true" style={{ width: 1, height: 20, background: '#E5E7EB' }} />
              <span style={{ fontSize: 13, color: INK, fontWeight: 500 }} data-testid="po-footer-value">
                Total value: <span style={TABULAR}>{fmtUsd(sumValue)}</span>
              </span>
            </div>
            <span style={{ fontSize: 11, color: SLATE_400 }} data-testid="po-footer-updated">
              Updated {PO_STATUS_STRIP.updatedAt}
            </span>
          </div>
        </section>
      </div>

      {/* ── Settings Drawer ─────────────────────────────────────── */}
      {drawerOpen && createPortal(
        <SettingsDrawer
          onClose={() => setDrawerOpen(false)}
          tab={drawerTab}
          setTab={setDrawerTab}
          prefs={prefs}
          setPrefs={setPrefs}
          lanes={lanes}
          setLanes={setLanes}
          groups={groups}
          setGroups={setGroups}
          laneFilter={laneFilter}
          setLaneFilter={setLaneFilter}
          dirty={dirty}
          onSave={saveDrawer}
          onDiscard={discardDrawer}
        />,
        document.body,
      )}

      {/* ── PO Detail Drawer ────────────────────────────────────── */}
      {drawerPO && createPortal(
        <PoDetailDrawer po={drawerPO} onClose={() => setDrawerPO(null)} />,
        document.body,
      )}
    </div>
  );
}

// ─── Atoms ─────────────────────────────────────────────────────────────
function KpiCell({ label, value, foot, valueColor, delta, last }: { label: string; value: string; foot: string; valueColor?: string; delta?: Delta; last?: boolean }) {
  return (
    <div style={{ padding: '0 20px', borderRight: last ? 'none' : '1px solid #F3F3F5' }} data-testid={`po-kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>{label}</p>
      <div className="flex items-baseline" style={{ gap: 8, margin: '8px 0 6px', flexWrap: 'wrap' }}>
        <p style={{ ...TABULAR, margin: 0, fontSize: 'clamp(28px, 2.5vw, 36px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: valueColor || '#0A0A0B' }}>{value}</p>
        {delta && <DeltaChip d={delta} />}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: SLATE_500 }}>{foot}</p>
    </div>
  );
}

// ─── PO Detail Drawer ──────────────────────────────────────────────────
function PoDetailDrawer({ po, onClose }: { po: PoLine; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalQty = po.lineItems.reduce((s, l) => s + l.qty, 0);
  const totalRecv = po.lineItems.reduce((s, l) => s + l.received, 0);
  const pctRecv = totalQty > 0 ? Math.round((totalRecv / totalQty) * 100) : 0;
  const etaOverdue = isPoOverdue(po.eta, po.status);

  // Timeline
  const step: number =
    po.status === 'Received'      ? 4 :
    po.status === 'In Production' ? 2 :
    po.status === 'Delayed'       ? 2 :
    po.status === 'On-time'       ? 1 :
    po.status === 'Draft'         ? 0 : 0;
  const milestones: { label: string; date: string | null }[] = [
    { label: 'Issued',        date: po.orderDate },
    { label: 'Confirmed',     date: po.orderDate },
    { label: 'In Production', date: po.estShipDate },
    { label: 'Shipped',       date: po.estShipDate },
    { label: 'Received',      date: po.eta },
  ];

  return (
    <div data-testid="po-detail-drawer" style={{ position: 'fixed', inset: 0, zIndex: 110 }}>
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
        {/* Header */}
        <div style={{ padding: '18px 24px 16px', borderBottom: '1px solid #EDEDEF' }}>
          <div className="flex items-start justify-between" style={{ gap: 10 }}>
            <div>
              <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>Purchase order</p>
              <div className="inline-flex items-center" style={{ gap: 10, marginTop: 4 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: INK, letterSpacing: '-0.01em', ...TABULAR }} data-testid="po-detail-pono">{po.poNo}</h2>
                <StatusChip s={po.status} />
              </div>
              <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 6, fontSize: 13 }}>
                <span style={{ color: INK, fontWeight: 500 }}>{po.supplier}</span>
                <span style={{ color: SLATE_300 }}>·</span>
                <span style={{ color: SLATE_500 }}>{po.lines} lines</span>
                <span style={{ color: SLATE_300 }}>·</span>
                <span style={{ color: SLATE_500 }}>{fmtInt(po.qtyOrdered)} units</span>
              </div>
            </div>
            <div className="inline-flex items-center" style={{ gap: 2 }}>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Open in new tab" onClick={() => { /* eslint-disable-next-line no-console */ console.log('[po-detail] open in new tab', po.poNo); }} data-testid="po-detail-newtab"><ArrowUpRight size={14} /></button>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="More" onClick={() => { /* eslint-disable-next-line no-console */ console.log('[po-detail] overflow', po.poNo); }} data-testid="po-detail-more"><MoreHorizontal size={14} /></button>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Close" onClick={onClose} data-testid="po-detail-close"><X size={15} /></button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Overview */}
          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="po-detail-overview">
            <SectionTitle>Overview</SectionTitle>
            <div className="grid grid-cols-2" style={{ gap: '12px 16px', marginTop: 10 }}>
              <KV label="Ordered"    value={fmtMmddyyyy(po.orderDate)} />
              <KV label="Est. ship"  value={fmtMmddyyyy(po.estShipDate)} />
              <KV label="ETA"        value={fmtMmddyyyy(po.eta)} valueColor={etaOverdue ? CORAL_DK : undefined} />
              <KV label="Launch"     value={fmtMmddyyyy(po.launch)} />
              <KV label="Reference"  value={po.reference} />
              <KV label="Memo"       value={po.memo === '—' ? '—' : po.memo} />
              <KV label="Season"     value={po.season} />
              <KV label="Collection" value={po.collection} />
            </div>
          </section>

          {/* Lines */}
          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="po-detail-lines">
            <SectionTitle>Lines</SectionTitle>
            <div className="mt-2 overflow-x-auto" style={{ border: '1px solid #EDEDEF', borderRadius: 10 }}>
              <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    <th style={thStyle()}>Item #</th>
                    <th style={thStyle()}>Product</th>
                    <th style={thStyle('right')}>Qty</th>
                    <th style={thStyle('right')}>Received</th>
                    <th style={thStyle()}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lineItems.map((l, i) => (
                    <tr key={l.itemNo + i} style={{ borderTop: '1px solid #F3F3F5' }}>
                      <td style={tdStyle()}>{l.itemNo}</td>
                      <td style={{ ...tdStyle(), maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.product}>{l.product}</td>
                      <td style={tdStyle('right')}>{fmtInt(l.qty)}</td>
                      <td style={tdStyle('right')}>{fmtInt(l.received)}</td>
                      <td style={tdStyle()}><LineStatusChip s={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: '10px 2px 0', fontSize: 12.5, color: SLATE_500 }}>
              Total <span style={{ color: INK, fontWeight: 500 }}>{fmtInt(totalQty)}</span> units · <span style={{ color: INK, fontWeight: 500 }}>{pctRecv}%</span> received
            </p>
          </section>

          {/* Linked SOs */}
          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="po-detail-linked-sos">
            <SectionTitle>Linked sales orders</SectionTitle>
            {po.linkedSOs.length === 0 ? (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: SLATE_500, fontStyle: 'italic' }}>No sales orders linked to this PO.</p>
            ) : (
              <div className="flex flex-col mt-2" style={{ gap: 6 }}>
                {po.linkedSOs.map((s) => (
                  <div key={s.soNo} className="flex items-center" style={{ gap: 12, padding: '8px 12px', border: '1px solid #EDEDEF', borderRadius: 10 }}>
                    <span style={{ fontSize: 13, color: CORAL_DK, fontWeight: 500, cursor: 'pointer' }}>{s.soNo}</span>
                    <span style={{ fontSize: 13, color: INK, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.customer}</span>
                    <span style={{ fontSize: 12.5, color: SLATE_500 }}>{fmtMmddyyyy(s.requiredShip)}</span>
                    <SoStatusChip s={s.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Timeline */}
          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="po-detail-timeline">
            <SectionTitle>Shipment timeline</SectionTitle>
            <div className="mt-3 flex flex-col" style={{ gap: 0 }}>
              {milestones.map((m, i) => {
                const done = i <= step;
                const last = i === milestones.length - 1;
                return (
                  <div key={m.label} className="flex items-start" style={{ gap: 12 }}>
                    <div className="flex flex-col items-center" style={{ width: 14 }}>
                      <span
                        style={{
                          width: 10, height: 10, borderRadius: 999,
                          background: done ? INK : '#FFFFFF',
                          border: done ? `2px solid ${INK}` : `2px solid ${SLATE_300}`,
                          marginTop: 4,
                        }}
                      />
                      {!last && (
                        <span style={{
                          width: 2, flex: 1, minHeight: 24,
                          background: done ? INK : 'transparent',
                          borderLeft: done ? 'none' : `2px dashed ${SLATE_300}`,
                          marginTop: 2,
                        }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: last ? 0 : 14 }}>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: done ? INK : SLATE_500 }}>{m.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>{fmtMmddyyyy(m.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Supplier notes */}
          <section style={{ padding: '20px 24px' }} data-testid="po-detail-notes">
            <div className="flex items-center justify-between" style={{ gap: 8 }}>
              <SectionTitle>Supplier notes</SectionTitle>
              <span style={{ fontSize: 11, color: SLATE_500, padding: '2px 8px', borderRadius: 999, background: SLATE_100, whiteSpace: 'nowrap' }}>Last updated {fmtMmddyyyy(po.orderDate)}</span>
            </div>
            <div style={{ marginTop: 10, padding: '14px 16px', background: SLATE_50, border: '1px solid #EDEDEF', borderRadius: 10, fontSize: 13, lineHeight: 1.55, color: SLATE_700, whiteSpace: 'pre-wrap' }}>
              {po.supplierNotes}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ padding: '12px 20px', borderTop: '1px solid #EDEDEF', background: '#FAFAFA' }}>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} data-testid="po-detail-footer-close">Close</button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            style={{ border: `1px solid ${SLATE_300}` }}
            onClick={() => { /* eslint-disable-next-line no-console */ console.log('[po-detail] mark received', po.poNo); }}
            data-testid="po-detail-mark-received"
          >
            Mark received
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

// ─── Settings Drawer ───────────────────────────────────────────────────
type DrawerProps = {
  onClose: () => void;
  tab: 'Display' | 'Groups' | 'Lanes';
  setTab: (t: 'Display' | 'Groups' | 'Lanes') => void;
  prefs: DisplayPrefs;
  setPrefs: (p: DisplayPrefs) => void;
  lanes: Lane[];
  setLanes: (l: Lane[]) => void;
  groups: Group[];
  setGroups: (g: Group[]) => void;
  laneFilter: string;
  setLaneFilter: (q: string) => void;
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

function SettingsDrawer({ onClose, tab, setTab, prefs, setPrefs, lanes, setLanes, groups, setGroups, laneFilter, setLaneFilter, dirty, onSave, onDiscard }: DrawerProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filteredLanes = lanes.filter((l) => {
    const q = laneFilter.trim().toLowerCase();
    if (!q) return true;
    return l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || l.suppliers.join(' ').toLowerCase().includes(q);
  });

  return (
    <div data-testid="po-settings-drawer" style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
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
          <button type="button" onClick={onClose} className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Close" data-testid="po-settings-close"><X size={15} /></button>
        </div>

        <div className="flex items-center" style={{ padding: '0 20px', borderBottom: '1px solid #EDEDEF', gap: 20 }}>
          {(['Display', 'Groups', 'Lanes'] as const).map((t) => {
            const active = tab === t;
            const count = t === 'Groups' ? groups.length : t === 'Lanes' ? lanes.length : null;
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
                data-testid={`po-settings-tab-${t.toLowerCase()}`}
              >
                {t}{count !== null && <span style={{ color: SLATE_400, fontSize: 12 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'Display' && (
            <div className="flex flex-col" style={{ gap: 18 }} data-testid="po-settings-display">
              <PrefCard
                checked={prefs.showProjectedEta}
                onChange={(v) => setPrefs({ ...prefs, showProjectedEta: v })}
                title="Show projected ETAs"
                desc="Display only. Status math always uses projected ETAs."
                testId="pref-show-proj-eta"
              />
              <PrefCard
                checked={prefs.showPosNoSo}
                onChange={(v) => setPrefs({ ...prefs, showPosNoSo: v })}
                title="Show POs with no linked SO"
                desc="Hide stock POs that have no sales order attached."
                testId="pref-show-no-so"
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
                  Every 60 minutes, scheduled by the server
                </div>
              </div>
            </div>
          )}

          {tab === 'Groups' && (
            <div data-testid="po-settings-groups">
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
                        testId={`po-group-${g.id}`}
                      />
                      <div className="flex justify-end mt-2">
                        <button type="button" onClick={() => setExpandedGroupId(null)} className="btn-ghost btn-sm" data-testid={`po-group-${g.id}-done`}>Done</button>
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
                data-testid="po-settings-group-add"
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New group
              </button>
            </div>
          )}

          {tab === 'Lanes' && (
            <div data-testid="po-settings-lanes">
              <p style={{ margin: '0 0 10px', fontSize: 13, color: SLATE_500 }}>
                Lanes are discovered automatically from open POs. Lead time drives projected ETAs when no supplier shipment date exists. Air uses 14 days.
              </p>
              <div className="flex items-center gap-2 mb-3">
                <div className="relative" style={{ flex: 1 }}>
                  <Search size={14} strokeWidth={1.9} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: SLATE_400, pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={laneFilter}
                    onChange={(e) => setLaneFilter(e.target.value)}
                    placeholder="Filter lanes"
                    className="ds-input w-full"
                    data-testid="po-lanes-filter"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
                <button type="button" className="btn-primary btn-sm inline-flex items-center gap-1" data-testid="po-lanes-add" onClick={() => { /* eslint-disable-next-line no-console */ console.log('new lane'); }}>
                  <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Lane
                </button>
              </div>

              <div className="flex flex-col" style={{ gap: 10 }}>
                {filteredLanes.map((l) => (
                  <LaneCard
                    key={l.id}
                    lane={l}
                    onChange={(next) => setLanes(lanes.map((x) => (x.id === l.id ? next : x)))}
                    onDelete={() => setLanes(lanes.filter((x) => x.id !== l.id))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between" style={{ padding: '12px 20px', borderTop: '1px solid #EDEDEF', background: '#FAFAFA' }}>
          <span style={{ fontSize: 12.5, color: dirty ? CORAL_DK : SLATE_500, fontWeight: 500 }} data-testid="po-settings-dirty">{dirty ? 'Unsaved changes' : 'Saved'}</span>
          <div className="inline-flex items-center gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={onDiscard} disabled={!dirty} data-testid="po-settings-discard">Discard</button>
            <button type="button" className="btn-primary btn-sm" onClick={onSave} disabled={!dirty} data-testid="po-settings-save">Save</button>
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

function LaneCard({ lane, onChange, onDelete }: { lane: Lane; onChange: (next: Lane) => void; onDelete: () => void }) {
  const noLead = lane.days === null || Number.isNaN(lane.days as number);
  return (
    <div className="rounded-xl" style={{ padding: 12, border: '1px solid #EDEDEF', background: '#FFFFFF' }} data-testid={`po-lane-${lane.id}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 999, background: SLATE_100, color: SLATE_700, fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em' }}>{lane.code}</span>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: INK, flex: 1 }}>{lane.name}</span>
        {noLead && (
          <span className="inline-flex items-center" style={{ padding: '2px 8px', background: AMBER_BG, color: AMBER_FG, fontSize: 11, fontWeight: 600, borderRadius: 999, letterSpacing: '0.04em' }}>NO LEAD</span>
        )}
        <button type="button" onClick={onDelete} className="btn-ghost" style={{ width: 28, height: 28, padding: 0 }} aria-label="Remove lane" data-testid={`po-lane-${lane.id}-delete`}><Trash2 size={13} /></button>
      </div>
      <p style={{ margin: '6px 0 10px', fontSize: 12.5, color: SLATE_500 }}>{lane.suppliers.join(', ')}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="number"
          value={lane.days ?? ''}
          onChange={(e) => onChange({ ...lane, days: e.target.value === '' ? null : Number(e.target.value) })}
          placeholder="Days"
          className="ds-input"
          style={{ width: 90 }}
          data-testid={`po-lane-${lane.id}-days`}
        />
        <DsSelect
          value={lane.mode}
          options={['ocean', 'air', 'truck']}
          onChange={(v) => onChange({ ...lane, mode: v as LaneMode })}
          testId={`po-lane-${lane.id}-mode`}
          minWidth={110}
        />
        <input
          type="text"
          value={lane.notes}
          onChange={(e) => onChange({ ...lane, notes: e.target.value })}
          placeholder="Notes"
          className="ds-input"
          style={{ flex: 1, minWidth: 120 }}
          data-testid={`po-lane-${lane.id}-notes`}
        />
      </div>
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
      data-testid={`po-group-row-${group.id}`}
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
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="btn-ghost btn-sm" data-testid={`po-group-row-${group.id}-edit`}>Edit</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Delete group" data-testid={`po-group-row-${group.id}-delete`}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
