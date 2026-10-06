import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Download,
  MoreHorizontal,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import PageHeader from './components/PageHeader';
import DsSelect from './components/DsSelect';
import ColumnsPopover from './components/ColumnsPopover';
import GroupEditorCard from './components/GroupEditorCard';
import GroupsFilter from './components/GroupsFilter';
import SecondaryButton from './components/SecondaryButton';
import { SavedViewsPills, SaveViewControl, type SavedView } from './components/SavedViewsBar';
import { loadGroups, makeNewGroup, saveGroups, type Group } from './mocks/groups';
import {
  SO_CHANNELS,
  SO_CUSTOMERS,
  SO_GLOBAL_TOTALS,
  SO_PRIORITIES,
  SO_ROWS,
  SO_SHIP_LANES_SEED,
  SO_SHIP_WINDOWS,
  SO_SNAPSHOT,
  SO_STATUSES,
  SO_TODAY,
  SO_WAREHOUSES,
  type Lane,
  type LaneMode,
  type SalesOrder,
  type SoLineItemStatus,
  type SoLinkedPoStatus,
  type SoPriority,
  type SoStatus,
} from './mocks/openSalesOrders';

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
const isOverdueShip = (iso: string, status: SoStatus) => {
  if (status === 'Shipped' || status === 'Cancelled') return false;
  return new Date(`${iso}T12:00:00Z`) < SO_TODAY;
};
const daysBetween = (iso: string) => {
  const t = new Date(`${iso}T12:00:00Z`).getTime();
  return Math.round((t - SO_TODAY.getTime()) / 86_400_000);
};

// ─── Column schema ─────────────────────────────────────────────────────
type ColKey = 'soNo' | 'lines' | 'customer' | 'channel' | 'orderDate' | 'requiredShip' | 'shipWindow' | 'status' | 'priority' | 'qty' | 'value' | 'csr';
const ALL_COLUMNS: { key: ColKey; label: string; align?: 'left' | 'right'; width?: number; sortable?: boolean; pinned?: boolean; field: keyof SalesOrder | null }[] = [
  { key: 'soNo',         label: 'SO #',           align: 'left',  width: 110, sortable: true,  pinned: true, field: 'soNo' },
  { key: 'lines',        label: 'Lines',          align: 'right', width: 72,  sortable: true,  field: 'lines' },
  { key: 'customer',     label: 'Customer',       align: 'left',  width: 180, sortable: true,  field: 'customer' },
  { key: 'channel',      label: 'Channel',        align: 'left',  width: 130, sortable: true,  field: 'channel' },
  { key: 'orderDate',    label: 'Order date',     align: 'left',  width: 120, sortable: true,  field: 'orderDate' },
  { key: 'requiredShip', label: 'Required ship',  align: 'left',  width: 130, sortable: true,  field: 'requiredShip' },
  { key: 'shipWindow',   label: 'Ship window',    align: 'left',  width: 150, sortable: false, field: 'shipWindow' },
  { key: 'status',       label: 'Status',         align: 'left',  width: 140, sortable: true,  field: 'status' },
  { key: 'priority',     label: 'Priority',       align: 'left',  width: 110, sortable: true,  field: 'priority' },
  { key: 'qty',          label: 'Qty',            align: 'right', width: 90,  sortable: true,  field: 'qty' },
  { key: 'value',        label: 'Value',          align: 'right', width: 110, sortable: true,  field: 'value' },
  { key: 'csr',          label: 'CSR',            align: 'left',  width: 150, sortable: true,  field: 'csr' },
];

type DisplayPrefs = {
  showProjectedShip: boolean;
  showNoCoverage: boolean;
  defaultSort: string;
  dateFormat: string;
};
const DEFAULT_PREFS: DisplayPrefs = {
  showProjectedShip: true,
  showNoCoverage: true,
  defaultSort: 'Required ship, soonest first',
  dateFormat: 'MM/DD/YYYY',
};
const DEFAULT_SORT_OPTS = [
  'Required ship, soonest first',
  'Required ship, latest first',
  'SO #, ascending',
  'SO #, descending',
  'Customer A→Z',
  'Customer Z→A',
] as const;
const DATE_FMT_OPTS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as const;

type SortDir = 'asc' | 'desc';
function defaultSortParams(label: string): { key: ColKey; dir: SortDir } {
  switch (label) {
    case 'Required ship, latest first': return { key: 'requiredShip', dir: 'desc' };
    case 'SO #, ascending':              return { key: 'soNo', dir: 'asc' };
    case 'SO #, descending':             return { key: 'soNo', dir: 'desc' };
    case 'Customer A→Z':                 return { key: 'customer', dir: 'asc' };
    case 'Customer Z→A':                 return { key: 'customer', dir: 'desc' };
    default:                             return { key: 'requiredShip', dir: 'asc' };
  }
}
function cmp(a: SalesOrder, b: SalesOrder, field: keyof SalesOrder, dir: SortDir) {
  const av = a[field] as unknown;
  const bv = b[field] as unknown;
  if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av;
  const as = String(av ?? '').toLowerCase();
  const bs = String(bv ?? '').toLowerCase();
  if (as < bs) return dir === 'asc' ? -1 : 1;
  if (as > bs) return dir === 'asc' ? 1 : -1;
  return 0;
}

// ─── Saved view filter shape ──────────────────────────────────────────
type OsoTab = 'All' | 'Behind SLA' | 'Backordered' | 'Shipped today' | 'On hold';
type OsoViewFilters = {
  tab: OsoTab;
  query: string;
  statusFilter: string;
  channelFilter: string;
  customerFilter: string;
  warehouseFilter: string;
  priorityFilter: string;
  shipWindowFilter: string;
  selectedGroupIds: string[];
};
const OSO_SEED_VIEWS: SavedView<OsoViewFilters>[] = [];
const OSO_LEGACY_VIEW_IDS = ['v_oso_sla_rush', 'v_oso_dtc_week'];
// Group.dimension → SalesOrder field
const OSO_DIMENSION_TO_FIELD: Record<string, keyof SalesOrder | undefined> = {
  Customer: 'customer',
  Status:   'status',
};

// ─── Delta chip for KPIs ───────────────────────────────────────────────
type Delta = { tone: 'up' | 'down'; text: string; emerald: boolean };
function DeltaChip({ d }: { d: Delta }) {
  const Icon = d.tone === 'up' ? ArrowUp : ArrowDown;
  const fg = d.emerald ? EMERALD : CORAL_DK;
  const bg = d.emerald ? EMERALD_BG : CORAL_BG;
  return (
    <span className="inline-flex items-center" style={{ gap: 2, padding: '2px 6px', borderRadius: 999, background: bg, color: fg, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      <Icon size={11} strokeWidth={2.4} />
      {d.text}
    </span>
  );
}

// ─── Status / Priority chips ──────────────────────────────────────────
function StatusBadge({ s }: { s: SoStatus }) {
  const styles: Record<SoStatus, React.CSSProperties> = {
    'Open':          { background: SLATE_100, color: INK },
    'In Production': { background: SLATE_100, color: INK },
    'Ready to Ship': { background: SLATE_100, color: INK },
    'Shipped':       { background: EMERALD_BG, color: EMERALD },
    'Delayed':       { background: CORAL_BG, color: CORAL_DK },
    'Backordered':   { background: AMBER_BG, color: AMBER_FG },
    'On hold':       { background: SLATE_100, color: SLATE_700 },
    'Cancelled':     { background: SLATE_100, color: SLATE_400 },
  };
  return (
    <span style={{ ...styles[s], padding: '3px 8px', fontSize: 11.5, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }} data-testid={`so-status-${s.toLowerCase().replace(/\s+/g, '-')}`}>
      {s}
    </span>
  );
}
function PriorityBadge({ p }: { p: SoPriority }) {
  const styles: Record<SoPriority, React.CSSProperties> = {
    Standard: { background: SLATE_100, color: SLATE_700 },
    Rush:     { background: AMBER_BG,  color: AMBER_FG },
    VIP:      { background: CORAL_BG,  color: CORAL_DK },
  };
  return <span style={{ ...styles[p], padding: '3px 8px', fontSize: 11.5, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }}>{p}</span>;
}
function LineStatusChip({ s }: { s: SoLineItemStatus }) {
  const styles: Record<SoLineItemStatus, React.CSSProperties> = {
    Allocated:   { background: EMERALD_BG, color: EMERALD },
    Partial:     { background: AMBER_BG,   color: AMBER_FG },
    Backordered: { background: CORAL_BG,   color: CORAL_DK },
  };
  return <span style={{ ...styles[s], padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }}>{s}</span>;
}
function LinkedPoStatusChip({ s }: { s: SoLinkedPoStatus }) {
  const styles: Record<SoLinkedPoStatus, React.CSSProperties> = {
    'On-time':       { background: SLATE_100,  color: SLATE_700 },
    'In Production': { background: SLATE_100,  color: SLATE_700 },
    'Delayed':       { background: CORAL_BG,   color: CORAL_DK },
  };
  return <span style={{ ...styles[s], padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }}>{s}</span>;
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<OsoTab>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All statuses');
  const [channelFilter, setChannelFilter] = useState<string>('All channels');
  const [customerFilter, setCustomerFilter] = useState<string>('All customers');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('All warehouses');
  const [priorityFilter, setPriorityFilter] = useState<string>('All priority');
  const [shipWindowFilter, setShipWindowFilter] = useState<string>('All ship windows');

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() =>
    ALL_COLUMNS.reduce((acc, c) => { acc[c.key] = true; return acc; }, {} as Record<ColKey, boolean>),
  );

  const [sortKey, setSortKey] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir | null>(null);

  // Settings drawer state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'Display' | 'Groups' | 'Lanes'>('Display');
  const [drawerSO, setDrawerSO] = useState<SalesOrder | null>(null);

  const [prefs, setPrefs] = useState<DisplayPrefs>(() => {
    try {
      const raw = localStorage.getItem('osoReportSettings');
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) as DisplayPrefs } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });
  const [prefsClean, setPrefsClean] = useState<DisplayPrefs>(prefs);
  const [shipLanes, setShipLanes] = useState<Lane[]>(() => {
    try {
      const raw = localStorage.getItem('osoShipLanes');
      return raw ? JSON.parse(raw) as Lane[] : SO_SHIP_LANES_SEED;
    } catch { return SO_SHIP_LANES_SEED; }
  });
  const [shipLanesClean, setShipLanesClean] = useState<Lane[]>(shipLanes);
  const [laneFilter, setLaneFilter] = useState('');
  const [groups, setGroups] = useState<Group[]>(() => loadGroups());
  const [groupsClean, setGroupsClean] = useState<Group[]>(groups);

  // Saved views + Groups filter
  const [views, setViews] = useState<SavedView<OsoViewFilters>[]>(() => {
    try {
      const raw = localStorage.getItem('osoSavedViews');
      if (!raw) return OSO_SEED_VIEWS;
      const parsed = JSON.parse(raw) as SavedView<OsoViewFilters>[];
      return parsed.filter((v) => !OSO_LEGACY_VIEW_IDS.includes(v.id));
    } catch { return OSO_SEED_VIEWS; }
  });
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  useEffect(() => {
    try { localStorage.setItem('osoSavedViews', JSON.stringify(views)); } catch { /* ignore */ }
  }, [views]);

  const dirty =
    JSON.stringify(prefs) !== JSON.stringify(prefsClean) ||
    JSON.stringify(shipLanes) !== JSON.stringify(shipLanesClean) ||
    JSON.stringify(groups) !== JSON.stringify(groupsClean);

  const tabCounts = useMemo(() => ({
    All: SO_ROWS.length,
    'Behind SLA': SO_ROWS.filter((r) => isOverdueShip(r.requiredShip, r.status)).length,
    Backordered: SO_ROWS.filter((r) => r.status === 'Backordered').length,
    'Shipped today': SO_ROWS.filter((r) => r.status === 'Shipped').length,
    'On hold': SO_ROWS.filter((r) => r.status === 'On hold').length,
  }), []);

  const rows = useMemo(() => {
    let out: SalesOrder[] = SO_ROWS.slice();
    if (tab === 'Behind SLA')      out = out.filter((r) => isOverdueShip(r.requiredShip, r.status));
    if (tab === 'Backordered')     out = out.filter((r) => r.status === 'Backordered');
    if (tab === 'Shipped today')   out = out.filter((r) => r.status === 'Shipped');
    if (tab === 'On hold')         out = out.filter((r) => r.status === 'On hold');
    if (statusFilter     !== 'All statuses')     out = out.filter((r) => r.status === statusFilter);
    if (channelFilter    !== 'All channels')     out = out.filter((r) => r.channel === channelFilter);
    if (customerFilter   !== 'All customers')    out = out.filter((r) => r.customer === customerFilter);
    if (warehouseFilter  !== 'All warehouses')   out = out.filter((r) => r.warehouse === warehouseFilter);
    if (priorityFilter   !== 'All priority')     out = out.filter((r) => r.priority === priorityFilter);
    if (shipWindowFilter !== 'All ship windows') {
      out = out.filter((r) => {
        const d = daysBetween(r.requiredShip);
        if (shipWindowFilter === 'Overdue')      return isOverdueShip(r.requiredShip, r.status);
        if (shipWindowFilter === 'Next 7 days')  return d >= 0 && d <= 7;
        if (shipWindowFilter === 'Next 30 days') return d >= 0 && d <= 30;
        if (shipWindowFilter === 'This Quarter') return d >= 0 && d <= 90;
        return true;
      });
    }
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((r) =>
      r.soNo.toLowerCase().includes(q) ||
      r.customer.toLowerCase().includes(q) ||
      r.csr.toLowerCase().includes(q),
    );
    // Groups OR filter
    if (selectedGroupIds.length > 0) {
      const activeGroups = groups.filter((g) => selectedGroupIds.includes(g.id));
      if (activeGroups.length > 0) {
        out = out.filter((r) => activeGroups.some((g) => {
          const field = OSO_DIMENSION_TO_FIELD[g.dimension];
          if (!field) return false;
          return g.values.includes(String(r[field]));
        }));
      }
    }
    // Sort
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
  }, [tab, statusFilter, channelFilter, customerFilter, warehouseFilter, priorityFilter, shipWindowFilter, query, sortKey, sortDir, prefs.defaultSort, selectedGroupIds, groups]);

  const visibleColList = ALL_COLUMNS.filter((c) => visibleCols[c.key]);

  const activeFilterCount =
    (statusFilter      !== 'All statuses'     ? 1 : 0) +
    (channelFilter     !== 'All channels'     ? 1 : 0) +
    (customerFilter    !== 'All customers'    ? 1 : 0) +
    (warehouseFilter   !== 'All warehouses'   ? 1 : 0) +
    (priorityFilter    !== 'All priority'     ? 1 : 0) +
    (shipWindowFilter  !== 'All ship windows' ? 1 : 0) +
    (selectedGroupIds.length > 0              ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('All statuses');
    setChannelFilter('All channels');
    setCustomerFilter('All customers');
    setWarehouseFilter('All warehouses');
    setPriorityFilter('All priority');
    setShipWindowFilter('All ship windows');
    setSelectedGroupIds([]);
    setQuery('');
    setActiveViewId(null);
  };

  const onHeaderClick = (key: ColKey) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null); setSortDir(null);
  };

  const getCurrentFilters = (): OsoViewFilters => ({
    tab, query, statusFilter, channelFilter, customerFilter, warehouseFilter, priorityFilter, shipWindowFilter, selectedGroupIds,
  });
  const applyView = (v: SavedView<OsoViewFilters>) => {
    const f = v.filters;
    setTab(f.tab); setQuery(f.query);
    setStatusFilter(f.statusFilter); setChannelFilter(f.channelFilter);
    setCustomerFilter(f.customerFilter); setWarehouseFilter(f.warehouseFilter);
    setPriorityFilter(f.priorityFilter); setShipWindowFilter(f.shipWindowFilter);
    setSelectedGroupIds(f.selectedGroupIds || []);
    setActiveViewId(v.id);
  };
  const clearActiveView = () => setActiveViewId(null);
  const unpinView = (id: string) => {
    setViews(views.filter((v) => v.id !== id));
    if (activeViewId === id) setActiveViewId(null);
  };

  const getFilterSummary = (): string[] => {
    const chips: string[] = [];
    if (tab !== 'All') chips.push(tab);
    if (statusFilter     !== 'All statuses')     chips.push(`Status: ${statusFilter}`);
    if (channelFilter    !== 'All channels')     chips.push(`Channel: ${channelFilter}`);
    if (customerFilter   !== 'All customers')    chips.push(`Customer: ${customerFilter}`);
    if (warehouseFilter  !== 'All warehouses')   chips.push(`WH: ${warehouseFilter}`);
    if (priorityFilter   !== 'All priority')     chips.push(`Priority: ${priorityFilter}`);
    if (shipWindowFilter !== 'All ship windows') chips.push(`Ship: ${shipWindowFilter}`);
    if (selectedGroupIds.length > 0) chips.push(`${selectedGroupIds.length} group${selectedGroupIds.length === 1 ? '' : 's'}`);
    if (query.trim()) chips.push(`Search: "${query.trim()}"`);
    return chips;
  };

  const exportMock = () => { /* eslint-disable-next-line no-console */ console.log('[open-sales-orders] export excel'); };
  const saveDrawer = () => {
    localStorage.setItem('osoReportSettings', JSON.stringify(prefs));
    localStorage.setItem('osoShipLanes', JSON.stringify(shipLanes));
    saveGroups(groups);
    setPrefsClean(prefs); setShipLanesClean(shipLanes); setGroupsClean(groups);
  };
  const discardDrawer = () => { setPrefs(prefsClean); setShipLanes(shipLanesClean); setGroups(groupsClean); };

  // Footer sums
  const sumUnits = rows.reduce((s, r) => s + r.qty, 0);
  const sumValue = rows.reduce((s, r) => s + r.value, 0);

  // KPI deltas
  const kpiDeltas: Record<string, Delta> = {
    orders:       { tone: 'up',   text: '3.6%', emerald: true },
    unitsToShip:  { tone: 'up',   text: '2.1%', emerald: true },
    shippedToday: { tone: 'up',   text: '12',   emerald: true },
    behindSLA:    { tone: 'up',   text: '4',    emerald: false },
    backordered:  { tone: 'down', text: '18',   emerald: true },
    onTimeRate:   { tone: 'up',   text: '1.2pt', emerald: true },
  };

  return (
    <div className="min-h-full" data-testid="orders-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        <PageHeader
          title="Open Sales Orders"
          testIdPrefix="orders"
          right={
            <div className="inline-flex items-center gap-2">
              <SecondaryButton onClick={exportMock} icon={<Download size={14} strokeWidth={2} />} data-testid="orders-export">Excel</SecondaryButton>
            </div>
          }
        />
        <p style={{ margin: '-6px 0 0', fontSize: 13.5, color: SLATE_500 }} data-testid="orders-subtitle">
          Open outbound orders — fulfillment status, shipment windows, and customer POs
        </p>

        <div className="mt-6 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500 }} data-testid="orders-section-label">
            All eligible sales orders
          </span>
          <span style={{ fontSize: 12, color: SLATE_400, fontStyle: 'italic' }}>Global totals, not affected by filters below</span>
        </div>

        {/* ── KPI strip (6, with delta chips) ────────────────────── */}
        <section className="mt-2.5 overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #EDEDEF', padding: '20px 0' }} data-testid="orders-kpi-strip">
          <div className="grid grid-cols-3 xl:grid-cols-6">
            <KpiCell label="Orders"        value={fmtInt(SO_GLOBAL_TOTALS.orders)}       foot="vs last week" delta={kpiDeltas.orders} />
            <KpiCell label="Units to ship" value={fmtInt(SO_GLOBAL_TOTALS.unitsToShip)}  foot="vs last week" delta={kpiDeltas.unitsToShip} />
            <KpiCell label="Shipped today" value={fmtInt(SO_GLOBAL_TOTALS.shippedToday)} foot="vs last week" delta={kpiDeltas.shippedToday} />
            <KpiCell label="Behind SLA"    value={fmtInt(SO_GLOBAL_TOTALS.behindSLA)}    foot="vs last week" delta={kpiDeltas.behindSLA}    valueColor={CORAL_DK} />
            <KpiCell label="Backordered"   value={fmtInt(SO_GLOBAL_TOTALS.backordered)}  foot="vs last week" delta={kpiDeltas.backordered}  valueColor={AMBER_FG} />
            <KpiCell label="On-time rate"  value={`${SO_GLOBAL_TOTALS.onTimePct}%`}      foot="vs last week" delta={kpiDeltas.onTimeRate} last />
          </div>
        </section>

        {/* ── Unified toolbar + table card ──────────────────────── */}
        <section className="mt-5 overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #EDEDEF' }} data-testid="orders-table-card">
          <div style={{ padding: '16px 20px' }} data-testid="orders-toolbar">
            <div className="flex items-center gap-3 flex-wrap" style={{ minHeight: 40 }}>
              <SavedViewsPills views={views} activeId={activeViewId} onApply={applyView} onClear={clearActiveView} onUnpin={unpinView} testIdPrefix="orders" />
              <div className="inline-flex items-center" role="tablist" style={{ gap: 2 }} data-testid="orders-tabs">
                {(['All', 'Behind SLA', 'Backordered', 'Shipped today', 'On hold'] as const).map((t) => {
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
                      data-testid={`orders-tab-${t.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {t}
                      <span style={{ ...TABULAR, fontSize: 11, color: active ? INK : SLATE_400, fontWeight: 600, marginLeft: 4 }}>{tabCounts[t]}</span>
                    </button>
                  );
                })}
              </div>

              <span aria-hidden="true" style={{ width: 1, height: 20, background: '#EDEDEF' }} />

              <div className="relative" style={{ width: 300 }}>
                <Search size={14} strokeWidth={1.9} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: SLATE_400, pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search SOs, customers, SKUs, POs, dates"
                  className="ds-input w-full"
                  data-testid="orders-search"
                  style={{ paddingLeft: 36 }}
                />
              </div>

              <div className="ml-auto flex items-center" style={{ gap: 0 }}>
                {activeFilterCount > 0 && (
                  <>
                    <div className="inline-flex items-center gap-2" data-testid="orders-filter-status" style={{ marginRight: 12 }}>
                      <span style={{ fontSize: 13, color: SLATE_500 }}>{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active</span>
                      <span aria-hidden="true" style={{ color: SLATE_300 }}>·</span>
                      <button
                        type="button"
                        onClick={clearFilters}
                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: CORAL_DK, fontFamily: 'inherit' }}
                        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                        data-testid="orders-clear-filters"
                      >
                        Clear all
                      </button>
                    </div>
                    <span aria-hidden="true" style={{ width: 1, height: 20, background: '#EDEDEF', marginRight: 12 }} />
                  </>
                )}
                <div className="inline-flex items-center" style={{ gap: 6 }}>
                  <ColumnsPopover columns={ALL_COLUMNS} visibleCols={visibleCols as Record<string, boolean>} setVisibleCols={(next) => setVisibleCols(next as Record<ColKey, boolean>)} testIdPrefix="orders" />
                  <SaveViewControl views={views} setViews={setViews} setActiveId={setActiveViewId} getCurrentFilters={getCurrentFilters} getFilterSummary={getFilterSummary} testIdPrefix="orders" />
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center flex-wrap" style={{ minHeight: 40, gap: 8 }} data-testid="orders-filters-row">
              <DsSelect value={statusFilter}     options={SO_STATUSES as unknown as string[]}      onChange={setStatusFilter}     testId="orders-status-dropdown"     minWidth={150} />
              <DsSelect value={channelFilter}    options={SO_CHANNELS as unknown as string[]}      onChange={setChannelFilter}    testId="orders-channel-dropdown"    minWidth={150} />
              <DsSelect value={customerFilter}   options={SO_CUSTOMERS as unknown as string[]}     onChange={setCustomerFilter}   testId="orders-customer-dropdown"   minWidth={170} />
              <DsSelect value={warehouseFilter}  options={SO_WAREHOUSES as unknown as string[]}    onChange={setWarehouseFilter}  testId="orders-warehouse-dropdown"  minWidth={150} />
              <DsSelect value={priorityFilter}   options={SO_PRIORITIES as unknown as string[]}    onChange={setPriorityFilter}   testId="orders-priority-dropdown"   minWidth={150} />
              <DsSelect value={shipWindowFilter} options={SO_SHIP_WINDOWS as unknown as string[]}  onChange={setShipWindowFilter} testId="orders-shipwindow-dropdown" minWidth={160} />
              <GroupsFilter groups={groups} selectedIds={selectedGroupIds} onChange={setSelectedGroupIds} testId="orders-groups-filter" minWidth={150} />
            </div>
          </div>

          <div aria-hidden="true" style={{ height: 1, background: '#EDEDEF' }} />

          <div style={{ maxHeight: 720, overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1400 }} data-testid="orders-table">
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
                          color: active ? INK : SLATE_500, height: 44, width: c.width, whiteSpace: 'nowrap',
                          cursor: sortable ? 'pointer' : 'default', userSelect: 'none', transition: 'background-color 120ms',
                        }}
                        data-testid={`orders-header-${c.key}`}
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
                      <div className="flex flex-col items-center justify-center" style={{ padding: '64px 24px', gap: 6 }} data-testid="orders-empty">
                        <p style={{ fontSize: 14, fontWeight: 600, color: SLATE_700, margin: 0 }}>No sales orders match these filters.</p>
                        <p style={{ fontSize: 13, color: SLATE_500, margin: 0 }}>Try clearing a filter or search.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {rows.map((o, idx) => {
                  const overdue = isOverdueShip(o.requiredShip, o.status);
                  return (
                    <tr
                      key={o.soNo + '-' + idx}
                      className="transition-colors duration-150 cursor-pointer"
                      style={{ borderTop: idx === 0 ? 'none' : '1px solid #F3F3F5' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => setDrawerSO(o)}
                      data-testid={`orders-row-${o.soNo}`}
                    >
                      {visibleColList.map((c) => {
                        const align = c.align === 'right' ? 'right' : 'left';
                        const common: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: INK, textAlign: align, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: c.width };
                        if (c.key === 'soNo') return (
                          <td key={c.key} style={{ ...common, color: CORAL_DK, fontWeight: 500 }}>
                            <span
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
                            >
                              {o.soNo}
                            </span>
                          </td>
                        );
                        if (c.key === 'lines')     return <td key={c.key} style={{ ...common, color: SLATE_700 }}>{o.lines}</td>;
                        if (c.key === 'customer')  return <td key={c.key} style={common} title={o.customer}>{o.customer}</td>;
                        if (c.key === 'channel')   return (
                          <td key={c.key} style={common}>
                            <span style={{ padding: '3px 8px', background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{o.channel}</span>
                          </td>
                        );
                        if (c.key === 'orderDate')    return <td key={c.key} style={{ ...common, color: SLATE_700 }}>{fmtMmddyyyy(o.orderDate)}</td>;
                        if (c.key === 'requiredShip') return <td key={c.key} style={{ ...common, color: overdue ? CORAL_DK : SLATE_700, fontWeight: overdue ? 600 : 400 }}>{fmtMmddyyyy(o.requiredShip)}</td>;
                        if (c.key === 'shipWindow')   return <td key={c.key} style={{ ...common, color: SLATE_700 }} title={o.shipWindow}>{o.shipWindow}</td>;
                        if (c.key === 'status')       return <td key={c.key} style={common}><StatusBadge s={o.status} /></td>;
                        if (c.key === 'priority')     return <td key={c.key} style={common}><PriorityBadge p={o.priority} /></td>;
                        if (c.key === 'qty')          return <td key={c.key} style={{ ...common, color: INK }}>{fmtInt(o.qty)}</td>;
                        if (c.key === 'value')        return <td key={c.key} style={{ ...common, color: INK, fontWeight: 500 }}>{fmtUsd(o.value)}</td>;
                        if (c.key === 'csr')          return <td key={c.key} style={{ ...common, color: SLATE_700 }} title={o.csr}>{o.csr}</td>;
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
            data-testid="orders-footer"
          >
            <div className="inline-flex items-center" style={{ gap: 16 }}>
              <span style={{ fontSize: 13, color: SLATE_500 }} data-testid="orders-footer-count">
                Showing {fmtInt(rows.length)} of {fmtInt(SO_ROWS.length)} SOs
              </span>
              <span aria-hidden="true" style={{ width: 1, height: 20, background: '#E5E7EB' }} />
              <span style={{ fontSize: 13, color: INK, fontWeight: 500 }} data-testid="orders-footer-units">
                Units to ship: <span style={TABULAR}>{fmtInt(sumUnits)}</span>
              </span>
              <span aria-hidden="true" style={{ width: 1, height: 20, background: '#E5E7EB' }} />
              <span style={{ fontSize: 13, color: INK, fontWeight: 500 }} data-testid="orders-footer-value">
                Open value: <span style={TABULAR}>{fmtUsd(sumValue)}</span>
              </span>
            </div>
            <span style={{ fontSize: 11, color: SLATE_400 }} data-testid="orders-footer-updated">Updated {SO_SNAPSHOT}</span>
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
          lanes={shipLanes}
          setLanes={setShipLanes}
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

      {drawerSO && createPortal(
        <SoDetailDrawer so={drawerSO} onClose={() => setDrawerSO(null)} />,
        document.body,
      )}
    </div>
  );
}

// ─── KPI atom ──────────────────────────────────────────────────────────
function KpiCell({ label, value, foot, valueColor, delta, last }: { label: string; value: string; foot: string; valueColor?: string; delta?: Delta; last?: boolean }) {
  return (
    <div style={{ padding: '0 20px', borderRight: last ? 'none' : '1px solid #F3F3F5' }} data-testid={`orders-kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>{label}</p>
      <div className="flex items-baseline" style={{ gap: 8, margin: '8px 0 6px', flexWrap: 'wrap' }}>
        <p style={{ ...TABULAR, margin: 0, fontSize: 'clamp(28px, 2.5vw, 36px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: valueColor || '#0A0A0B' }}>{value}</p>
        {delta && <DeltaChip d={delta} />}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: SLATE_500 }}>{foot}</p>
    </div>
  );
}

// ─── SO Detail Drawer ──────────────────────────────────────────────────
function SoDetailDrawer({ so, onClose }: { so: SalesOrder; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalQty = so.lineItems.reduce((s, l) => s + l.qty, 0);
  const totalAlloc = so.lineItems.reduce((s, l) => s + l.allocated, 0);
  const allocPct = totalQty > 0 ? Math.round((totalAlloc / totalQty) * 100) : 0;
  const requiredOverdue = isOverdueShip(so.requiredShip, so.status);

  // Timeline step: Received → Allocated → Picked → Packed → Shipped
  const step: number =
    so.status === 'Shipped'       ? 4 :
    so.status === 'Ready to Ship' ? 3 :
    so.status === 'In Production' ? 1 :
    so.status === 'Delayed'       ? 1 :
    0;
  const milestones: { label: string; date: string | null }[] = [
    { label: 'Received',  date: so.orderDate },
    { label: 'Allocated', date: so.orderDate },
    { label: 'Picked',    date: so.requiredShip },
    { label: 'Packed',    date: so.requiredShip },
    { label: 'Shipped',   date: so.status === 'Shipped' ? so.requiredShip : null },
  ];

  return (
    <div data-testid="orders-detail-drawer" style={{ position: 'fixed', inset: 0, zIndex: 110 }}>
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
              <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>Sales order</p>
              <div className="inline-flex items-center" style={{ gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: INK, letterSpacing: '-0.01em', ...TABULAR }} data-testid="orders-detail-sono">{so.soNo}</h2>
                <StatusBadge s={so.status} />
              </div>
              <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 6, fontSize: 13 }}>
                <span style={{ color: INK, fontWeight: 500 }}>{so.customer}</span>
                <span style={{ color: SLATE_300 }}>·</span>
                <span style={{ color: SLATE_500 }}>{so.channel}</span>
                <span style={{ color: SLATE_300 }}>·</span>
                <span style={{ color: SLATE_500 }}>{so.lines} lines</span>
                <span style={{ color: SLATE_300 }}>·</span>
                <span style={{ color: SLATE_500 }}>{fmtInt(so.qty)} units</span>
              </div>
            </div>
            <div className="inline-flex items-center" style={{ gap: 2 }}>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Open in new tab" onClick={() => { /* eslint-disable-next-line no-console */ console.log('[so-detail] open in new tab', so.soNo); }} data-testid="orders-detail-newtab"><ArrowUpRight size={14} /></button>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="More" onClick={() => { /* eslint-disable-next-line no-console */ console.log('[so-detail] overflow', so.soNo); }} data-testid="orders-detail-more"><MoreHorizontal size={14} /></button>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Close" onClick={onClose} data-testid="orders-detail-close"><X size={15} /></button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="orders-detail-overview">
            <SectionTitle>Overview</SectionTitle>
            <div className="grid grid-cols-2" style={{ gap: '12px 16px', marginTop: 10 }}>
              <KV label="Ordered"       value={fmtMmddyyyy(so.orderDate)} />
              <KV label="Required ship" value={fmtMmddyyyy(so.requiredShip)} valueColor={requiredOverdue ? CORAL_DK : undefined} />
              <KV label="Ship window"   value={so.shipWindow} />
              <KV label="Priority"      value={so.priority} />
              <KV label="Warehouse"     value={so.warehouse} />
              <KV label="Customer PO"   value={so.customerPO} />
              <KV label="Payment terms" value={so.paymentTerms} />
              <KV label="CSR"           value={so.csr} />
            </div>
          </section>

          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="orders-detail-lines">
            <SectionTitle>Lines</SectionTitle>
            <div className="mt-2 overflow-x-auto" style={{ border: '1px solid #EDEDEF', borderRadius: 10 }}>
              <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    <th style={thStyle()}>SKU</th>
                    <th style={thStyle()}>Product</th>
                    <th style={thStyle('right')}>Qty</th>
                    <th style={thStyle('right')}>Allocated</th>
                    <th style={thStyle('right')}>Backordered</th>
                    <th style={thStyle()}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {so.lineItems.map((l, i) => (
                    <tr key={l.sku + i} style={{ borderTop: '1px solid #F3F3F5' }}>
                      <td style={tdStyle()}>{l.sku}</td>
                      <td style={{ ...tdStyle(), maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.product}>{l.product}</td>
                      <td style={tdStyle('right')}>{fmtInt(l.qty)}</td>
                      <td style={tdStyle('right')}>{fmtInt(l.allocated)}</td>
                      <td style={{ ...tdStyle('right'), color: l.backordered > 0 ? CORAL_DK : INK, fontWeight: l.backordered > 0 ? 600 : 400 }}>{fmtInt(l.backordered)}</td>
                      <td style={tdStyle()}><LineStatusChip s={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: '10px 2px 0', fontSize: 12.5, color: SLATE_500 }}>
              Total <span style={{ color: INK, fontWeight: 500 }}>{fmtInt(totalQty)}</span> units · <span style={{ color: INK, fontWeight: 500 }}>{allocPct}%</span> allocated
            </p>
          </section>

          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="orders-detail-linked-pos">
            <SectionTitle>Linked purchase orders</SectionTitle>
            {so.linkedPOs.length === 0 ? (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: SLATE_500, fontStyle: 'italic' }}>No POs linked to this SO.</p>
            ) : (
              <div className="flex flex-col mt-2" style={{ gap: 6 }}>
                {so.linkedPOs.map((p) => {
                  const overdue = p.eta && new Date(`${p.eta}T12:00:00Z`) < SO_TODAY;
                  return (
                    <div key={p.poNo} className="flex items-center" style={{ gap: 12, padding: '8px 12px', border: '1px solid #EDEDEF', borderRadius: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: CORAL_DK, fontWeight: 500, cursor: 'pointer' }}>{p.poNo}</span>
                      <span style={{ fontSize: 13, color: INK, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.supplier}</span>
                      <span style={{ fontSize: 12.5, color: overdue ? CORAL_DK : SLATE_500, fontWeight: overdue ? 600 : 400 }}>{fmtMmddyyyy(p.eta)}</span>
                      <span style={{ ...TABULAR, fontSize: 12.5, color: INK, fontWeight: 500 }}>{fmtInt(p.qty)}</span>
                      <LinkedPoStatusChip s={p.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ padding: '20px 24px', borderBottom: '1px solid #F3F3F5' }} data-testid="orders-detail-timeline">
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

          <section style={{ padding: '20px 24px' }} data-testid="orders-detail-notes">
            <div className="flex items-center justify-between" style={{ gap: 8 }}>
              <SectionTitle>Customer notes</SectionTitle>
              <span style={{ fontSize: 11, color: SLATE_500, padding: '2px 8px', borderRadius: 999, background: SLATE_100, whiteSpace: 'nowrap' }}>Last updated {fmtMmddyyyy(so.orderDate)}</span>
            </div>
            <div style={{ marginTop: 10, padding: '14px 16px', background: SLATE_50, border: '1px solid #EDEDEF', borderRadius: 10, fontSize: 13, lineHeight: 1.55, color: SLATE_700, whiteSpace: 'pre-wrap' }}>
              {so.customerNotes}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between" style={{ padding: '12px 20px', borderTop: '1px solid #EDEDEF', background: '#FAFAFA' }}>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} data-testid="orders-detail-footer-close">Close</button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            style={{ border: `1px solid ${SLATE_300}` }}
            onClick={() => { /* eslint-disable-next-line no-console */ console.log('[so-detail] mark shipped', so.soNo); }}
            data-testid="orders-detail-mark-shipped"
          >
            Mark shipped
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

// ─── Settings drawer ──────────────────────────────────────────────────
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
    <div data-testid="orders-settings-drawer" style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
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
          <button type="button" onClick={onClose} className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Close" data-testid="orders-settings-close"><X size={15} /></button>
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
                data-testid={`orders-settings-tab-${t.toLowerCase()}`}
              >
                {t}{count !== null && <span style={{ color: SLATE_400, fontSize: 12 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'Display' && (
            <div className="flex flex-col" style={{ gap: 18 }} data-testid="orders-settings-display">
              <PrefCard
                checked={prefs.showProjectedShip}
                onChange={(v) => setPrefs({ ...prefs, showProjectedShip: v })}
                title="Show projected ship dates"
                desc="Display only. Status math always uses projected dates."
                testId="pref-show-proj-ship"
              />
              <PrefCard
                checked={prefs.showNoCoverage}
                onChange={(v) => setPrefs({ ...prefs, showNoCoverage: v })}
                title="Show SOs without linked PO coverage"
                desc="Hide fully covered orders if you only want to review at-risk lines."
                testId="pref-show-no-coverage"
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
            <div data-testid="orders-settings-groups">
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
                        testId={`orders-group-${g.id}`}
                      />
                      <div className="flex justify-end mt-2">
                        <button type="button" onClick={() => setExpandedGroupId(null)} className="btn-ghost btn-sm" data-testid={`orders-group-${g.id}-done`}>Done</button>
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
                data-testid="orders-settings-group-add"
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New group
              </button>
            </div>
          )}

          {tab === 'Lanes' && (
            <div data-testid="orders-settings-lanes">
              <p style={{ margin: '0 0 10px', fontSize: 13, color: SLATE_500 }}>
                Ship lanes are discovered automatically from open sales orders. Lead time drives projected ship dates when no supplier shipment date exists. Air uses 14 days.
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
                    data-testid="orders-lanes-filter"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
                <button type="button" className="btn-primary btn-sm inline-flex items-center gap-1" data-testid="orders-lanes-add" onClick={() => { /* eslint-disable-next-line no-console */ console.log('new ship lane'); }}>
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
          <span style={{ fontSize: 12.5, color: dirty ? CORAL_DK : SLATE_500, fontWeight: 500 }} data-testid="orders-settings-dirty">{dirty ? 'Unsaved changes' : 'Saved'}</span>
          <div className="inline-flex items-center gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={onDiscard} disabled={!dirty} data-testid="orders-settings-discard">Discard</button>
            <button type="button" className="btn-primary btn-sm" onClick={onSave} disabled={!dirty} data-testid="orders-settings-save">Save</button>
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
    <div className="rounded-xl" style={{ padding: 12, border: '1px solid #EDEDEF', background: '#FFFFFF' }} data-testid={`orders-lane-${lane.id}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 999, background: SLATE_100, color: SLATE_700, fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em' }}>{lane.code}</span>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: INK, flex: 1 }}>{lane.name}</span>
        {noLead && (
          <span className="inline-flex items-center" style={{ padding: '2px 8px', background: AMBER_BG, color: AMBER_FG, fontSize: 11, fontWeight: 600, borderRadius: 999, letterSpacing: '0.04em' }}>NO LEAD</span>
        )}
        <button type="button" onClick={onDelete} className="btn-ghost" style={{ width: 28, height: 28, padding: 0 }} aria-label="Remove lane" data-testid={`orders-lane-${lane.id}-delete`}><Trash2 size={13} /></button>
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
          data-testid={`orders-lane-${lane.id}-days`}
        />
        <DsSelect
          value={lane.mode}
          options={['ocean', 'air', 'truck']}
          onChange={(v) => onChange({ ...lane, mode: v as LaneMode })}
          testId={`orders-lane-${lane.id}-mode`}
          minWidth={110}
        />
        <input
          type="text"
          value={lane.notes}
          onChange={(e) => onChange({ ...lane, notes: e.target.value })}
          placeholder="Notes"
          className="ds-input"
          style={{ flex: 1, minWidth: 120 }}
          data-testid={`orders-lane-${lane.id}-notes`}
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
      data-testid={`orders-group-row-${group.id}`}
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
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="btn-ghost btn-sm" data-testid={`orders-group-row-${group.id}-edit`}>Edit</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Delete group" data-testid={`orders-group-row-${group.id}-delete`}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
