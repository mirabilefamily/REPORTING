import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Columns3,
  Download,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import PageHeader from './components/PageHeader';
import DsSelect from './components/DsSelect';
import GroupEditorCard from './components/GroupEditorCard';
import { loadGroups, makeNewGroup, saveGroups, type Group } from './mocks/groups';
import {
  SO_CHANNELS,
  SO_CUSTOMERS,
  SO_GLOBAL_TOTALS,
  SO_PRIORITIES,
  SO_ROWS,
  SO_SHIP_LANES_SEED,
  SO_SHIP_WINDOWS,
  SO_STATUSES,
  SO_TODAY,
  SO_WAREHOUSES,
  type Lane,
  type LaneMode,
  type SalesOrder,
  type SoPriority,
  type SoStatus,
} from './mocks/openSalesOrders';

// ─── Tokens ────────────────────────────────────────────────────────────
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;

const INK       = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
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
const ALL_COLUMNS: { key: ColKey; label: string; align?: 'left' | 'right'; width?: number }[] = [
  { key: 'soNo',         label: 'SO #',           align: 'left',  width: 110 },
  { key: 'lines',        label: 'Lines',          align: 'right', width: 72  },
  { key: 'customer',     label: 'Customer',       align: 'left',  width: 180 },
  { key: 'channel',      label: 'Channel',        align: 'left',  width: 130 },
  { key: 'orderDate',    label: 'Order date',     align: 'left',  width: 120 },
  { key: 'requiredShip', label: 'Required ship',  align: 'left',  width: 130 },
  { key: 'shipWindow',   label: 'Ship window',    align: 'left',  width: 150 },
  { key: 'status',       label: 'Status',         align: 'left',  width: 140 },
  { key: 'priority',     label: 'Priority',       align: 'left',  width: 110 },
  { key: 'qty',          label: 'Qty',            align: 'right', width: 90  },
  { key: 'value',        label: 'Value',          align: 'right', width: 110 },
  { key: 'csr',          label: 'CSR',            align: 'left',  width: 150 },
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
    <span
      style={{ ...styles[s], padding: '3px 8px', fontSize: 11.5, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }}
      data-testid={`so-status-${s.toLowerCase().replace(/\s+/g, '-')}`}
    >
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
  return (
    <span
      style={{ ...styles[p], padding: '3px 8px', fontSize: 11.5, fontWeight: 600, borderRadius: 999, whiteSpace: 'nowrap' }}
      data-testid={`so-priority-${p.toLowerCase()}`}
    >
      {p}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  // Toolbar state
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'All' | 'Behind SLA' | 'Backordered' | 'Shipped today' | 'On hold'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All statuses');
  const [channelFilter, setChannelFilter] = useState<string>('All channels');
  const [customerFilter, setCustomerFilter] = useState<string>('All customers');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('All warehouses');
  const [priorityFilter, setPriorityFilter] = useState<string>('All priority');
  const [shipWindowFilter, setShipWindowFilter] = useState<string>('All ship windows');

  // Columns menu
  const [colsOpen, setColsOpen] = useState(false);
  const colsBtnRef = useRef<HTMLButtonElement | null>(null);
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() =>
    ALL_COLUMNS.reduce((acc, c) => { acc[c.key] = true; return acc; }, {} as Record<ColKey, boolean>),
  );

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'Display' | 'Groups' | 'Lanes'>('Display');
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
  const dirty =
    JSON.stringify(prefs) !== JSON.stringify(prefsClean) ||
    JSON.stringify(shipLanes) !== JSON.stringify(shipLanesClean) ||
    JSON.stringify(groups) !== JSON.stringify(groupsClean);

  const tabCounts = useMemo(() => {
    return {
      All: SO_ROWS.length,
      'Behind SLA': SO_ROWS.filter((r) => isOverdueShip(r.requiredShip, r.status)).length,
      Backordered: SO_ROWS.filter((r) => r.status === 'Backordered').length,
      'Shipped today': SO_ROWS.filter((r) => r.status === 'Shipped').length,
      'On hold': SO_ROWS.filter((r) => r.status === 'On hold').length,
    };
  }, []);

  const rows = useMemo(() => {
    let out: SalesOrder[] = SO_ROWS.slice();
    if (tab === 'Behind SLA')      out = out.filter((r) => isOverdueShip(r.requiredShip, r.status));
    if (tab === 'Backordered')     out = out.filter((r) => r.status === 'Backordered');
    if (tab === 'Shipped today')   out = out.filter((r) => r.status === 'Shipped');
    if (tab === 'On hold')         out = out.filter((r) => r.status === 'On hold');
    if (statusFilter    !== 'All statuses')     out = out.filter((r) => r.status === statusFilter);
    if (channelFilter   !== 'All channels')     out = out.filter((r) => r.channel === channelFilter);
    if (customerFilter  !== 'All customers')    out = out.filter((r) => r.customer === customerFilter);
    if (warehouseFilter !== 'All warehouses')   out = out.filter((r) => r.warehouse === warehouseFilter);
    if (priorityFilter  !== 'All priority')     out = out.filter((r) => r.priority === priorityFilter);
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
    return out;
  }, [tab, statusFilter, channelFilter, customerFilter, warehouseFilter, priorityFilter, shipWindowFilter, query]);

  const visibleColList = ALL_COLUMNS.filter((c) => visibleCols[c.key]);

  const activeFilterCount =
    (statusFilter      !== 'All statuses'     ? 1 : 0) +
    (channelFilter     !== 'All channels'     ? 1 : 0) +
    (customerFilter    !== 'All customers'    ? 1 : 0) +
    (warehouseFilter   !== 'All warehouses'   ? 1 : 0) +
    (priorityFilter    !== 'All priority'     ? 1 : 0) +
    (shipWindowFilter  !== 'All ship windows' ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('All statuses');
    setChannelFilter('All channels');
    setCustomerFilter('All customers');
    setWarehouseFilter('All warehouses');
    setPriorityFilter('All priority');
    setShipWindowFilter('All ship windows');
    setQuery('');
  };

  const onRowClick = (so: SalesOrder) => { /* eslint-disable-next-line no-console */ console.log('open SO drawer', so.soNo); };
  const exportMock  = () => { /* eslint-disable-next-line no-console */ console.log('[open-sales-orders] export excel'); };
  const saveDrawer = () => {
    localStorage.setItem('osoReportSettings', JSON.stringify(prefs));
    localStorage.setItem('osoShipLanes', JSON.stringify(shipLanes));
    saveGroups(groups);
    setPrefsClean(prefs); setShipLanesClean(shipLanes); setGroupsClean(groups);
  };
  const discardDrawer = () => { setPrefs(prefsClean); setShipLanes(shipLanesClean); setGroups(groupsClean); };

  return (
    <div className="min-h-full" data-testid="orders-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        <PageHeader
          title="Open Sales Orders"
          testIdPrefix="orders"
          right={
            <div className="inline-flex items-center gap-2">
              <button type="button" onClick={() => setDrawerOpen(true)} className="btn-ghost btn-sm inline-flex items-center gap-1.5" data-testid="orders-open-settings">
                <Settings size={13} strokeWidth={2} /> Settings
              </button>
              <button type="button" onClick={exportMock} className="btn-ghost btn-sm inline-flex items-center gap-1.5" data-testid="orders-export">
                <Download size={13} strokeWidth={2} /> Excel
              </button>
            </div>
          }
        />
        <p style={{ margin: '-6px 0 0', fontSize: 13.5, color: SLATE_500 }} data-testid="orders-subtitle">
          Open outbound orders — fulfillment status, shipment windows, and customer POs
        </p>

        {/* ── Section header ────────────────────────────────────── */}
        <div className="mt-6 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500 }} data-testid="orders-section-label">
            All eligible sales orders
          </span>
          <span style={{ fontSize: 12, color: SLATE_400, fontStyle: 'italic' }}>Global totals, not affected by filters below</span>
        </div>

        {/* ── KPI strip (6) ─────────────────────────────────────── */}
        <section className="mt-2.5 overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #EDEDEF', padding: '20px 0' }} data-testid="orders-kpi-strip">
          <div className="grid grid-cols-3 xl:grid-cols-6">
            <KpiCell label="Orders"        value={fmtInt(SO_GLOBAL_TOTALS.orders)}       foot="Open SOs" />
            <KpiCell label="Units to ship" value={fmtInt(SO_GLOBAL_TOTALS.unitsToShip)}  foot="Across open lines" />
            <KpiCell label="Shipped today" value={fmtInt(SO_GLOBAL_TOTALS.shippedToday)} foot="By 4pm PT" />
            <KpiCell label="Behind SLA"    value={fmtInt(SO_GLOBAL_TOTALS.behindSLA)}    foot="Orders" valueColor={CORAL_DK} />
            <KpiCell label="Backordered"   value={fmtInt(SO_GLOBAL_TOTALS.backordered)}  foot="Lines" valueColor={AMBER_FG} />
            <KpiCell label="On-time rate"  value={`${SO_GLOBAL_TOTALS.onTimePct}%`}      foot="Rolling 30d" last />
          </div>
        </section>

        {/* ── Unified toolbar + table card ──────────────────────── */}
        <section className="mt-5 overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #EDEDEF' }} data-testid="orders-table-card">
          <div style={{ padding: '16px 20px' }} data-testid="orders-toolbar">
            {/* Row 1 */}
            <div className="flex items-center gap-3 flex-wrap" style={{ minHeight: 40 }}>
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

              <div className="relative" style={{ width: 360 }}>
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

              <div className="ml-auto flex items-center" style={{ gap: 12 }}>
                {activeFilterCount > 0 && (
                  <div className="inline-flex items-center gap-2" data-testid="orders-filter-status">
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
                )}
                <div className="relative">
                  <button
                    ref={colsBtnRef}
                    type="button"
                    onClick={() => setColsOpen((v) => !v)}
                    className="btn-ghost btn-sm inline-flex items-center gap-1.5"
                    data-testid="orders-columns-btn"
                  >
                    <Columns3 size={13} strokeWidth={2} /> Columns
                  </button>
                  {colsOpen && (
                    <div
                      className="absolute z-20 rounded-xl bg-white"
                      style={{ top: 36, right: 0, boxShadow: '0 0 0 1px rgba(15,23,42,0.08), 0 10px 24px rgba(15,23,42,0.10)', padding: 6, minWidth: 200 }}
                      onMouseLeave={() => setColsOpen(false)}
                      data-testid="orders-columns-menu"
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
                            data-testid={`orders-col-toggle-${c.key}`}
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="mt-2 flex items-center flex-wrap" style={{ minHeight: 40, gap: 8 }} data-testid="orders-filters-row">
              <DsSelect value={statusFilter}     options={SO_STATUSES as unknown as string[]}      onChange={setStatusFilter}     testId="orders-status-dropdown"     minWidth={150} />
              <DsSelect value={channelFilter}    options={SO_CHANNELS as unknown as string[]}      onChange={setChannelFilter}    testId="orders-channel-dropdown"    minWidth={150} />
              <DsSelect value={customerFilter}   options={SO_CUSTOMERS as unknown as string[]}     onChange={setCustomerFilter}   testId="orders-customer-dropdown"   minWidth={170} />
              <DsSelect value={warehouseFilter}  options={SO_WAREHOUSES as unknown as string[]}    onChange={setWarehouseFilter}  testId="orders-warehouse-dropdown"  minWidth={150} />
              <DsSelect value={priorityFilter}   options={SO_PRIORITIES as unknown as string[]}    onChange={setPriorityFilter}   testId="orders-priority-dropdown"   minWidth={150} />
              <DsSelect value={shipWindowFilter} options={SO_SHIP_WINDOWS as unknown as string[]}  onChange={setShipWindowFilter} testId="orders-shipwindow-dropdown" minWidth={160} />
            </div>
          </div>

          <div aria-hidden="true" style={{ height: 1, background: '#EDEDEF' }} />

          <div style={{ maxHeight: 720, overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1400 }} data-testid="orders-table">
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: '#FFFFFF', boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                  {visibleColList.map((c) => (
                    <th
                      key={c.key}
                      style={{
                        padding: '0 14px',
                        textAlign: c.align === 'right' ? 'right' : 'left',
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: SLATE_500, height: 44, width: c.width, whiteSpace: 'nowrap',
                      }}
                    >
                      {c.label}
                    </th>
                  ))}
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
                      onClick={() => onRowClick(o)}
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
          <div className="flex flex-wrap items-center justify-between" style={{ padding: '12px 20px', background: '#FAFAFA', borderTop: '1px solid #EDEDEF', gap: 8 }} data-testid="orders-footer">
            <span style={{ fontSize: 12.5, color: SLATE_500 }}>Showing 1–{rows.length} of {rows.length}</span>
            <span style={{ fontSize: 12.5, color: SLATE_500 }}>Snapshot · Oct 5, 7:26 PM</span>
          </div>
        </section>
      </div>

      {drawerOpen && createPortal(
        <SalesSettingsDrawer
          onClose={() => setDrawerOpen(false)}
          tab={drawerTab}
          setTab={setDrawerTab}
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
    </div>
  );
}

// ─── KPI atom ──────────────────────────────────────────────────────────
function KpiCell({ label, value, foot, valueColor, last }: { label: string; value: string; foot: string; valueColor?: string; last?: boolean }) {
  return (
    <div style={{ padding: '0 20px', borderRight: last ? 'none' : '1px solid #F3F3F5' }} data-testid={`orders-kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>{label}</p>
      <p style={{ ...TABULAR, margin: '8px 0 6px', fontSize: 'clamp(28px, 2.5vw, 36px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: valueColor || '#0A0A0B' }}>{value}</p>
      <p style={{ margin: 0, fontSize: 12.5, color: SLATE_500 }}>{foot}</p>
    </div>
  );
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

function SalesSettingsDrawer({ onClose, tab, setTab, prefs, setPrefs, lanes, setLanes, groups, setGroups, laneFilter, setLaneFilter, dirty, onSave, onDiscard }: DrawerProps) {
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
