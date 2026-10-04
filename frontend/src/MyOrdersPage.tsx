import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  MoreHorizontal,
  Package,
  Search,
} from 'lucide-react';
import { SEG_COLORS } from './DashboardPage';
import PageHeader from './components/PageHeader';
import PopoverPortal from './components/PopoverPortal';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = {
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  WebkitFontSmoothing: 'antialiased',
} as const;

const INK       = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50  = '#F8FAFC';
const EMERALD   = '#047857';
const EMERALD_BG = '#ECFDF5';
const EMERALD_200 = '#A7F3D0';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';
const CORAL_BG  = '#FFF1EF';
const CORAL_200 = '#FFD2CB';

type Status = 'In Production' | 'Ready to Ship' | 'Shipped' | 'Delayed' | 'Backordered';
type Channel = 'US Wholesale' | 'Distributors' | 'Retail' | 'Ecommerce' | 'Amazon';
type LineItem = { sku: string; name: string; units: number; value: number };
type Order = {
  orderNo: string;
  customer: string;
  city: string;
  channel: Channel;
  po: string;
  status: Status;
  orderDate: string;   // ISO yyyy-mm-dd
  expectedShip: string;
  units: number;
  value: number;
  lines: LineItem[];
};

// Snapshot timestamp
const SNAPSHOT = 'Oct 3, 2026, 4:32 PM';
const TODAY = new Date('2026-10-03');

// ─── Mock orders ───────────────────────────────────────────────────────
const RAW: Order[] = [
  { orderNo: 'O-10431', customer: 'Lids',                     city: 'Chicago, IL',    channel: 'US Wholesale', po: 'PO-889245', status: 'In Production', orderDate: '2026-09-28', expectedShip: '2026-10-12', units: 420, value: 24_120, lines: [
    { sku: '101-2450', name: 'Dean Vintage Trucker',  units: 180, value: 10_080 },
    { sku: '101-2510', name: 'Dusty Baker 5-Panel',   units: 140, value:  8_120 },
    { sku: '101-2470', name: 'Angler Mesh Snapback',  units: 100, value:  5_920 },
  ] },
  { orderNo: 'O-10430', customer: 'Hat Cult Boutique',        city: 'Austin, TX',     channel: 'Retail',       po: 'PO-889244', status: 'Ready to Ship', orderDate: '2026-09-27', expectedShip: '2026-10-05', units:  48, value:  3_120, lines: [] },
  { orderNo: 'O-10429', customer: 'Nordstrom Accounts Payable', city: 'Seattle, WA',  channel: 'US Wholesale', po: 'PO-889243', status: 'In Production', orderDate: '2026-09-27', expectedShip: '2026-10-14', units: 310, value: 18_410, lines: [
    { sku: '101-2615', name: 'Farmer Full Grain',    units: 180, value: 11_040 },
    { sku: '101-2452', name: 'Dean Washed Trucker',  units: 130, value:  7_370 },
  ] },
  { orderNo: 'O-10428', customer: 'Industrias Mercury, S.A.', city: 'Guadalajara, MX',channel: 'Distributors', po: 'PO-889225', status: 'Ready to Ship', orderDate: '2026-09-26', expectedShip: '2026-10-02', units: 820, value: 36_540, lines: [
    { sku: '101-2450', name: 'Dean Vintage Trucker', units: 420, value: 18_900 },
    { sku: '101-2510', name: 'Dusty Baker 5-Panel',  units: 400, value: 17_640 },
  ] },
  { orderNo: 'O-10427', customer: 'Big Bear Supply Co',       city: 'Boise, ID',      channel: 'US Wholesale', po: 'PO-889221', status: 'In Production', orderDate: '2026-09-24', expectedShip: '2026-10-08', units: 240, value: 14_200, lines: [] },
  { orderNo: 'O-10426', customer: 'SASAtrend',                city: 'Paris, FR',      channel: 'Distributors', po: 'PO-889212', status: 'Shipped',       orderDate: '2026-09-22', expectedShip: '2026-09-30', units: 1_240, value: 58_280, lines: [] },
  { orderNo: 'O-10425', customer: 'Buckle Inc., The',         city: 'Kearney, NE',    channel: 'US Wholesale', po: 'PO-889208', status: 'Delayed',       orderDate: '2026-09-20', expectedShip: '2026-09-29', units: 220, value: 12_980, lines: [
    { sku: '101-2470', name: 'Angler Mesh Snapback', units: 120, value:  7_080 },
    { sku: '101-2452', name: 'Dean Washed Trucker',  units: 100, value:  5_900 },
  ] },
  { orderNo: 'O-10424', customer: 'Shopify DTC',              city: 'Online',         channel: 'Ecommerce',    po: '—',          status: 'Ready to Ship', orderDate: '2026-09-19', expectedShip: '2026-10-04', units:  12, value:    820, lines: [] },
  { orderNo: 'O-10423', customer: 'Amazon Vendor Central',    city: 'Online',         channel: 'Amazon',       po: 'PO-AZ-4421',status: 'In Production', orderDate: '2026-09-18', expectedShip: '2026-10-11', units: 180, value: 10_440, lines: [] },
  { orderNo: 'O-10422', customer: 'Panther Trading Co',       city: 'Atlanta, GA',    channel: 'Distributors', po: 'PO-889104', status: 'Delayed',       orderDate: '2026-09-15', expectedShip: '2026-09-29', units: 1_200, value: 42_600, lines: [
    { sku: '101-2615', name: 'Farmer Full Grain',    units: 500, value: 20_000 },
    { sku: '101-2450', name: 'Dean Vintage Trucker', units: 400, value: 13_200 },
    { sku: '101-2510', name: 'Dusty Baker 5-Panel',  units: 300, value:  9_400 },
  ] },
  { orderNo: 'O-10421', customer: 'Zumiez Inc.',              city: 'Lynnwood, WA',   channel: 'US Wholesale', po: 'PO-889096', status: 'Shipped',       orderDate: '2026-09-12', expectedShip: '2026-09-24', units: 340, value: 19_720, lines: [] },
  { orderNo: 'O-10420', customer: 'Shopify DTC',              city: 'Online',         channel: 'Ecommerce',    po: '—',          status: 'Shipped',       orderDate: '2026-09-10', expectedShip: '2026-09-18', units:   8, value:    540, lines: [] },
  { orderNo: 'O-10419', customer: 'Backcountry Ski Co',       city: 'Park City, UT',  channel: 'Retail',       po: 'PO-889041', status: 'Backordered',   orderDate: '2026-09-08', expectedShip: '2026-09-28', units:  64, value:  4_120, lines: [
    { sku: '101-2615', name: 'Farmer Full Grain',    units: 40, value: 2_820 },
    { sku: '101-2452', name: 'Dean Washed Trucker',  units: 24, value: 1_300 },
  ] },
  { orderNo: 'O-10418', customer: 'Lids',                     city: 'Chicago, IL',    channel: 'US Wholesale', po: 'PO-889038', status: 'Shipped',       orderDate: '2026-09-05', expectedShip: '2026-09-15', units: 480, value: 27_320, lines: [] },
  { orderNo: 'O-10417', customer: 'Amazon Vendor Central',    city: 'Online',         channel: 'Amazon',       po: 'PO-AZ-4388',status: 'Delayed',       orderDate: '2026-09-03', expectedShip: '2026-09-22', units: 220, value: 12_060, lines: [] },
  { orderNo: 'O-10416', customer: 'Country Threads',          city: 'Nashville, TN',  channel: 'Retail',       po: 'PO-888971', status: 'Backordered',   orderDate: '2026-08-30', expectedShip: '2026-09-20', units: 112, value:  7_040, lines: [] },
  { orderNo: 'O-10415', customer: 'Shopify DTC',              city: 'Online',         channel: 'Ecommerce',    po: '—',          status: 'Shipped',       orderDate: '2026-08-28', expectedShip: '2026-09-04', units:  14, value:    980, lines: [] },
  { orderNo: 'O-10414', customer: 'Industrias Mercury, S.A.', city: 'Guadalajara, MX',channel: 'Distributors', po: 'PO-888962', status: 'Shipped',       orderDate: '2026-08-25', expectedShip: '2026-09-10', units: 940, value: 41_880, lines: [] },
  { orderNo: 'O-10413', customer: 'Freewheel Outfitters',     city: 'Jackson, WY',    channel: 'US Wholesale', po: 'PO-888950', status: 'Shipped',       orderDate: '2026-08-21', expectedShip: '2026-09-02', units: 160, value:  9_240, lines: [] },
  { orderNo: 'O-10412', customer: 'Amazon Vendor Central',    city: 'Online',         channel: 'Amazon',       po: 'PO-AZ-4321',status: 'Shipped',       orderDate: '2026-08-18', expectedShip: '2026-09-01', units: 420, value: 22_680, lines: [] },
];

const CHANNELS = ['All channels', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
const STATUSES = ['All statuses', 'In Production', 'Ready to Ship', 'Shipped', 'Delayed', 'Backordered'] as const;

// ─── Formatters ────────────────────────────────────────────────────────
const fmtInt = (n: number) => n.toLocaleString('en-US');
const fmtUsd = (n: number) => `$${n.toLocaleString('en-US')}`;
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const isOverdue = (iso: string, status: Status) => status !== 'Shipped' && new Date(`${iso}T12:00:00Z`) < TODAY;

// ─── Atoms ─────────────────────────────────────────────────────────────
function CountStat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5" data-testid={`count-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span style={{ fontSize: 11, fontWeight: 500, color: SLATE_500 }}>{label}</span>
      <span style={{ ...TABULAR, fontSize: 13, fontWeight: 600, color: warn ? CORAL_DK : INK }}>{value}</span>
    </div>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const map: Record<Status, { cls: 'chip-neutral' | 'chip-coral' | 'chip-emerald'; icon?: typeof Clock }> = {
    'In Production':  { cls: 'chip-neutral' },
    'Ready to Ship':  { cls: 'chip-emerald' },
    'Shipped':        { cls: 'chip-neutral' },
    'Delayed':        { cls: 'chip-coral', icon: Clock },
    'Backordered':    { cls: 'chip-coral' },
  };
  const t = map[s];
  const Icon = t.icon;
  return (
    <span className={t.cls} style={{ whiteSpace: 'nowrap' }} data-testid={`status-${s.toLowerCase().replace(/\s+/g, '-')}`}>
      {Icon && <Icon size={12} strokeWidth={2} />}
      {s}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<typeof STATUSES[number]>('All statuses');
  const [channelFilter, setChannelFilter] = useState<typeof CHANNELS[number]>('All channels');
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    let rows = RAW;
    if (statusFilter !== 'All statuses') rows = rows.filter((r) => r.status === statusFilter);
    if (channelFilter !== 'All channels') rows = rows.filter((r) => r.channel === channelFilter);
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((r) =>
      r.orderNo.toLowerCase().includes(q) ||
      r.customer.toLowerCase().includes(q) ||
      r.po.toLowerCase().includes(q),
    );
    return rows;
  }, [query, statusFilter, channelFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => sortDesc ? b.orderDate.localeCompare(a.orderDate) : a.orderDate.localeCompare(b.orderDate));
    return copy;
  }, [filtered, sortDesc]);

  const totals = useMemo(() => {
    const nonShipped = filtered.filter((r) => r.status !== 'Shipped');
    return {
      orders: filtered.length,
      units: filtered.reduce((s, r) => s + r.units, 0),
      value: nonShipped.reduce((s, r) => s + r.value, 0),
      behindSLA: filtered.filter((r) => isOverdue(r.expectedShip, r.status)).length,
    };
  }, [filtered]);

  const clearFilters = () => {
    setQuery(''); setStatusFilter('All statuses'); setChannelFilter('All channels');
  };

  return (
    <div className="min-h-full" data-testid="orders-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">

        {/* ── Editorial header ─────────────────────────────────── */}
        <PageHeader
          title="Open Orders"
          testIdPrefix="orders"
        />

        {/* ── KPI strip ────────────────────────────────────────── */}
        <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="orders-kpi-row">
          {[
            { label: 'Open value', value: fmtUsd(totals.value), test: 'open-value', support: 'Not yet shipped' },
            { label: 'Orders', value: fmtInt(totals.orders), test: 'orders', support: 'Active in pipeline' },
            { label: 'Units', value: fmtInt(totals.units), test: 'units', support: 'Across all orders' },
            { label: 'Behind SLA', value: fmtInt(totals.behindSLA), test: 'behind-sla', support: 'Past expected ship', warn: totals.behindSLA > 0 },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-white" style={{ padding: 20, boxShadow: CARD_SHADOW }} data-testid={`orders-kpi-${k.test}`}>
              <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: '#6E6E73', margin: 0 }}>{k.label}</p>
              <p className="mt-2" style={{ ...TABULAR, fontSize: 28, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: k.warn ? CORAL_DK : '#0A0A0B', margin: 0 }}>{k.value}</p>
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: SLATE_500 }}>{k.support}</p>
            </div>
          ))}
        </section>

        {/* ── Unified table card: toolbar band + table + footer ───── */}
        <section
          className="mt-4 overflow-hidden rounded-2xl bg-white"
          style={{ boxShadow: CARD_SHADOW }}
          data-testid="orders-table-card"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3" style={{ padding: '14px 20px', minHeight: 60 }} data-testid="orders-toolbar">
          <div className="relative" style={{ width: 320 }}>
            <Search size={14} strokeWidth={1.9} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: SLATE_400, pointerEvents: 'none' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order #, customer, PO..."
              className="ds-input w-full"
              data-testid="orders-search"
              style={{ paddingLeft: 36 }}
            />
          </div>

          {/* Status dropdown */}
          <OrdersFilterSelect
            value={statusFilter}
            options={STATUSES}
            onChange={setStatusFilter}
            testId="orders-status-dropdown"
          />

          <span aria-hidden="true" style={{ width: 1, height: 20, background: SLATE_200 }} />

          {/* Channel dropdown */}
          <OrdersFilterSelect
            value={channelFilter}
            options={CHANNELS}
            onChange={setChannelFilter}
            testId="orders-channel-dropdown"
            renderOption={(c) => (
              <span className="inline-flex items-center gap-2">
                {c !== 'All channels' && <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEG_COLORS[c] || SLATE_500 }} />}
                {c}
              </span>
            )}
          />

          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="orders-count-strip">
            <CountStat label="Orders" value={fmtInt(totals.orders)} />
            <span aria-hidden="true" style={{ width: 1, height: 16, background: SLATE_200 }} />
            <CountStat label="Units" value={fmtInt(totals.units)} />
            <span aria-hidden="true" style={{ width: 1, height: 16, background: SLATE_200 }} />
            <CountStat label="Open value" value={fmtUsd(totals.value)} />
            <span aria-hidden="true" style={{ width: 1, height: 16, background: SLATE_200 }} />
            <CountStat label="Behind SLA" value={fmtInt(totals.behindSLA)} warn={totals.behindSLA > 0} />
          </div>
          </div>

        {/* ── Orders table (continuation of unified card) ───────────────── */}
          <div style={{ height: 1, background: '#EDEDEF' }} aria-hidden="true" />
          <div style={{ maxHeight: 680, overflowY: 'auto', overflowX: 'auto' }}>
            <table className="data-numeric-center" style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1280 }} data-testid="orders-table">
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: '#FFFFFF', boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                  <th aria-label="Expand" style={{ width: 44, height: 44 }} />
                  <th
                    onClick={() => setSortDesc((s) => !s)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44, userSelect: 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = SLATE_700; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; }}
                    data-testid="orders-sort-date"
                  >
                    <span className="inline-flex items-center gap-1">
                      Order #
                      {sortDesc ? <ArrowDown size={11} strokeWidth={2.4} /> : <ArrowUp size={11} strokeWidth={2.4} />}
                    </span>
                  </th>
                  {['Customer', 'Channel', 'PO #', 'Status', 'Order date'].map((h) => (
                    <th key={h} style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>{h}</th>
                  ))}
                  {['Units', '$ Value'].map((h) => (
                    <th key={h} style={{ padding: '0 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>{h}</th>
                  ))}
                  <th style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>Expected ship</th>
                  <th style={{ padding: '0 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44, width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={11}>
                      <div className="flex flex-col items-center justify-center gap-2" style={{ padding: '72px 24px' }} data-testid="orders-empty">
                        <Package size={48} strokeWidth={1.4} style={{ color: SLATE_300 }} />
                        <p style={{ fontSize: 15, fontWeight: 600, color: SLATE_700, margin: 0 }}>No open orders match your filters</p>
                        <p style={{ fontSize: 13, color: SLATE_500, margin: 0 }}>Try a different filter or search</p>
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="btn-ghost btn-sm"
                          style={{ marginTop: 4, color: CORAL_DK }}
                          data-testid="orders-empty-clear"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {sorted.map((o, idx) => {
                  const overdue = isOverdue(o.expectedShip, o.status);
                  const hasLines = o.lines.length > 0;
                  const isOpen = !!expanded[o.orderNo];
                  const borderStyle = idx === 0 ? 'none' : `1px solid ${SLATE_100}`;
                  return (
                    <>
                      <tr
                        key={o.orderNo}
                        className="transition-colors duration-150"
                        style={{ borderTop: borderStyle }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        data-testid={`order-row-${o.orderNo}`}
                      >
                        <td style={{ width: 44, textAlign: 'center' }}>
                          {hasLines ? (
                            <button
                              type="button"
                              onClick={() => setExpanded((s) => ({ ...s, [o.orderNo]: !s[o.orderNo] }))}
                              className="btn-ghost"
                              style={{ width: 32, height: 32, padding: 0, display: 'inline-grid', placeItems: 'center' }}
                              aria-label={isOpen ? 'Collapse line items' : 'Expand line items'}
                              aria-expanded={isOpen}
                              data-testid={`order-expand-${o.orderNo}`}
                            >
                              {isOpen ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                            </button>
                          ) : null}
                        </td>
                        <td style={{ padding: '16px', fontSize: 14, color: '#0A0A0B', letterSpacing: '0.02em', whiteSpace: 'nowrap', fontWeight: 600 }}>{o.orderNo}</td>
                        <td style={{ padding: '16px' }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK }}>{o.customer}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>{o.city}</p>
                        </td>
                        <td style={{ padding: '16px', fontSize: 14, color: SLATE_700 }}>
                          <span className="inline-flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SEG_COLORS[o.channel] || SLATE_500 }} />
                            {o.channel}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: 13, color: SLATE_700, whiteSpace: 'nowrap' }}>{o.po}</td>
                        <td style={{ padding: '16px' }}><StatusBadge s={o.status} /></td>
                        <td style={{ padding: '16px', fontSize: 13, color: SLATE_700, whiteSpace: 'nowrap' }}>{fmtDate(o.orderDate)}</td>
                        <td style={{ padding: '16px', fontSize: 14, color: INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtInt(o.units)}</td>
                        <td style={{ padding: '16px', fontSize: 14, fontWeight: 500, color: INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtUsd(o.value)}</td>
                        <td style={{ padding: '16px', fontSize: 13, color: overdue ? CORAL_DK : SLATE_700, whiteSpace: 'nowrap', fontWeight: overdue ? 600 : 400 }}>
                          <span className="inline-flex items-center gap-1">
                            {overdue && <Clock size={13} strokeWidth={2} style={{ color: CORAL_DK }} />}
                            {fmtDate(o.expectedShip)}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`View ${o.orderNo}`}
                              className="btn-ghost"
                              style={{ width: 32, height: 32, padding: 0 }}
                              data-testid={`order-view-${o.orderNo}`}
                            >
                              <Eye size={14} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              aria-label={`More options ${o.orderNo}`}
                              className="btn-ghost"
                              style={{ width: 32, height: 32, padding: 0 }}
                              data-testid={`order-more-${o.orderNo}`}
                            >
                              <MoreHorizontal size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {hasLines && isOpen && o.lines.map((l, li) => (
                        <tr
                          key={`${o.orderNo}-line-${li}`}
                          style={{ background: SLATE_50, borderTop: `1px solid ${SLATE_100}` }}
                          data-testid={`order-line-${o.orderNo}-${li}`}
                        >
                          <td />
                          <td colSpan={6} style={{ padding: '12px 16px 12px 44px', fontSize: 13, color: SLATE_700 }}>
                            <span style={{ fontWeight: 500, color: INK, marginRight: 8 }}>{l.name}</span>
                            <span style={{ color: SLATE_500 }}>{l.sku}</span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: INK, textAlign: 'right' }}>{fmtInt(l.units)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: INK, textAlign: 'right' }}>{fmtUsd(l.value)}</td>
                          <td colSpan={2} />
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between" style={{ padding: '12px 20px', background: '#FAFAFA', borderTop: `1px solid #EDEDEF`, gap: 8 }} data-testid="orders-footer">
            <span style={{ fontSize: 12.5, color: SLATE_500 }}>Showing 1–{sorted.length} of {sorted.length}</span>
            <span style={{ fontSize: 12.5, color: SLATE_500 }}>Snapshot · {SNAPSHOT}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function OrdersFilterSelect<T extends string>({ value, options, onChange, testId, renderOption }: { value: T; options: readonly T[]; onChange: (v: T) => void; testId: string; renderOption?: (opt: T) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary inline-flex items-center gap-2"
        data-testid={testId}
      >
        {value}
        <ChevronDown size={12} strokeWidth={2} style={{ color: SLATE_400 }} />
      </button>
      <PopoverPortal open={open} onClose={() => setOpen(false)} anchorRef={btnRef} placement="bottom-start" minWidth={180} padding={6} testId={`${testId}-menu`}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => { onChange(o); setOpen(false); }}
            className="w-full flex items-center justify-between"
            style={{ height: 34, padding: '0 10px', background: 'transparent', color: o === value ? INK : SLATE_700, fontSize: 13, fontWeight: o === value ? 600 : 500, borderRadius: 7, cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            data-testid={`${testId}-opt-${o.toString().toLowerCase().replace(/\s+/g, '-')}`}
          >
            {renderOption ? renderOption(o) : o}
            {o === value && <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL, flexShrink: 0 }} />}
          </button>
        ))}
      </PopoverPortal>
    </>
  );
}
