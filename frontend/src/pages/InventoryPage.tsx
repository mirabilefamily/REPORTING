import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  LayoutGrid,
  MapPin,
  Package,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PopoverPortal from '../components/PopoverPortal';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = {
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  WebkitFontSmoothing: 'antialiased',
} as const;

const INK = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50  = '#F8FAFC';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';

// ─── Data types & mock rows ────────────────────────────────────────────
type Loc = { name: string; onHand: number; allocated: number };
type Row = {
  itemNo: string;
  name: string;
  color: string;
  size: string;
  locations: Loc[];
};

const RAW: Row[] = [
  { itemNo: '11W036',          name: 'Welfleet',           color: 'White',       size: 'Large',     locations: [{ name: 'Raw Material - BHM', onHand: 184, allocated: 32 }] },
  { itemNo: '100-0004-WHI-L',  name: 'Gemma',              color: 'White',       size: 'Large',     locations: [{ name: 'I3PL - SD Returns', onHand: 142, allocated: 18 }, { name: 'Retail - San Francisco', onHand: 36, allocated: 4 }] },
  { itemNo: '100-0272-EBO-M',  name: 'Noe Valley',         color: 'Ebony',       size: 'Medium',    locations: [{ name: 'Warehouse - MIA', onHand: 96, allocated: 12 }] },
  { itemNo: '100-0285-DGR-M',  name: 'Hartford',           color: 'Dark Green',  size: 'Medium',    locations: [{ name: 'Retail - NYC', onHand: 54, allocated: 8 }, { name: 'Warehouse - MIA', onHand: 72, allocated: 10 }, { name: 'I3PL - SD Returns', onHand: 22, allocated: 0 }] },
  { itemNo: '100-0310-NAV-O',  name: 'Panther Trucker',    color: 'Navy',        size: 'One Size',  locations: [{ name: 'Warehouse - MIA', onHand: 128, allocated: 24 }] },
  { itemNo: '100-0411-NAT-L',  name: 'Dusty Baker',        color: 'Natural',     size: 'Large',     locations: [{ name: 'Retail - San Francisco', onHand: 44, allocated: 6 }, { name: 'Retail - NYC', onHand: 38, allocated: 3 }] },
  { itemNo: '100-0518-BLK-S',  name: 'Lineman',            color: 'Black',       size: 'Small',     locations: [{ name: 'Warehouse - MIA', onHand: 112, allocated: 18 }] },
  { itemNo: '100-0624-CRL-M',  name: 'Firestarter',        color: 'Coral',       size: 'Medium',    locations: [{ name: 'I3PL - SD Returns', onHand: 73, allocated: 11 }] },
  { itemNo: '100-0712-WHI-O',  name: 'Angler Mesh',        color: 'White',       size: 'One Size',  locations: [{ name: 'Warehouse - MIA', onHand: 164, allocated: 22 }, { name: 'Raw Material - BHM', onHand: 18, allocated: 0 }] },
  { itemNo: '100-0801-BLK-L',  name: 'Prospector',         color: 'Black',       size: 'Large',     locations: [{ name: 'Retail - NYC', onHand: 29, allocated: 2 }] },
  { itemNo: '100-0914-NAT-M',  name: 'Farmer',             color: 'Natural',     size: 'Medium',    locations: [{ name: 'Warehouse - MIA', onHand: 88, allocated: 14 }] },
  { itemNo: '100-1022-NAV-XL', name: 'Dean Vintage',       color: 'Navy',        size: 'X-Large',   locations: [{ name: 'Retail - San Francisco', onHand: 51, allocated: 7 }] },
  { itemNo: '100-1134-EBO-L',  name: 'Scout Corduroy',     color: 'Ebony',       size: 'Large',     locations: [{ name: 'I3PL - SD Returns', onHand: 136, allocated: 20 }, { name: 'Warehouse - MIA', onHand: 44, allocated: 5 }] },
  { itemNo: '100-1248-DGR-O',  name: 'Angler Twill',       color: 'Dark Green',  size: 'One Size',  locations: [{ name: 'Retail - NYC', onHand: 64, allocated: 9 }] },
  { itemNo: '100-1356-WHI-S',  name: 'Wren',               color: 'White',       size: 'Small',     locations: [{ name: 'Warehouse - MIA', onHand: 108, allocated: 15 }] },
  { itemNo: '100-1470-BLK-O',  name: 'Lone Wolf Trucker',  color: 'Black',       size: 'One Size',  locations: [{ name: 'Warehouse - MIA', onHand: 192, allocated: 28 }, { name: 'Retail - San Francisco', onHand: 32, allocated: 4 }] },
  { itemNo: '100-1588-NAT-XXL',name: 'Boater Straw',       color: 'Natural',     size: 'XX-Large',  locations: [{ name: 'Retail - NYC', onHand: 18, allocated: 0 }] },
  { itemNo: '100-1702-CRL-O',  name: 'Firestarter Mesh',   color: 'Coral',       size: 'One Size',  locations: [{ name: 'I3PL - SD Returns', onHand: 42, allocated: 6 }] },
  { itemNo: '100-1821-NAV-M',  name: 'Dusty Baker Cord',   color: 'Navy',        size: 'Medium',    locations: [{ name: 'Warehouse - MIA', onHand: 118, allocated: 17 }] },
  { itemNo: '100-1944-EBO-S',  name: 'Prospector Felt',    color: 'Ebony',       size: 'Small',     locations: [{ name: 'Retail - San Francisco', onHand: 36, allocated: 3 }, { name: 'Retail - NYC', onHand: 27, allocated: 2 }] },
];

// Row totals
const rowTotals = (r: Row) => {
  const onHand = r.locations.reduce((s, l) => s + l.onHand, 0);
  const allocated = r.locations.reduce((s, l) => s + l.allocated, 0);
  return { onHand, allocated, available: onHand - allocated };
};

type StockStatus = 'Healthy' | 'Low' | 'Critical' | 'Out';
type Enriched = Row & { tot: { onHand: number; allocated: number; available: number }; dos: number; pct: number; status: StockStatus; reorderQty: number; spark: number[] };

const statusFor = (available: number, onHand: number): StockStatus => {
  if (onHand === 0 || available <= 0) return 'Out';
  const p = available / onHand;
  if (p < 0.08) return 'Critical';
  if (p < 0.18) return 'Low';
  return 'Healthy';
};
const dosFor = (available: number, allocated: number): number => {
  const velocity = Math.max(0.6, allocated / 30);
  return Math.round(available / velocity);
};
// Deterministic 12-pt spark from itemNo seed
const spark12 = (seed: string, base: number): number[] => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < 12; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const noise = (h / 0xFFFFFFFF) - 0.5;
    out.push(Math.max(2, Math.round(base * (1 + noise * 0.45))));
  }
  return out;
};

const fmt = (n: number) => n.toLocaleString('en-US');

// ─── Page ──────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [query, setQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const enriched: Enriched[] = useMemo(() => RAW.map((r) => {
    const tot = rowTotals(r);
    const dos = dosFor(tot.available, tot.allocated);
    const pct = tot.onHand === 0 ? 0 : tot.available / tot.onHand;
    const status = statusFor(tot.available, tot.onHand);
    const reorderQty = status === 'Critical' || status === 'Out' ? Math.max(100, Math.ceil(tot.onHand * 1.5)) : status === 'Low' ? Math.ceil(tot.onHand * 0.8) : 0;
    const spark = spark12(r.itemNo, Math.max(10, tot.onHand));
    return { ...r, tot, dos, pct, status, reorderQty, spark };
  }), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((r) =>
      r.itemNo.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.color.toLowerCase().includes(q),
    );
  }, [query, enriched]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => (sortAsc ? a.itemNo.localeCompare(b.itemNo) : b.itemNo.localeCompare(a.itemNo)));
    return copy;
  }, [filtered, sortAsc]);

  const totals = useMemo(() => {
    let onHand = 0, allocated = 0;
    for (const r of RAW) { for (const l of r.locations) { onHand += l.onHand; allocated += l.allocated; } }
    return { onHand, allocated, available: onHand - allocated, products: RAW.length };
  }, []);

  const health = useMemo(() => {
    const counts = { Healthy: 0, Low: 0, Critical: 0, Out: 0 };
    enriched.forEach((e) => { counts[e.status]++; });
    const total = enriched.length || 1;
    return { counts, total, atRisk: counts.Critical + counts.Out };
  }, [enriched]);

  const allLocations = useMemo(() => {
    const set = new Set<string>();
    RAW.forEach((r) => r.locations.forEach((l) => set.add(l.name)));
    return Array.from(set).sort();
  }, []);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [byLocationMode, setByLocationMode] = useState<'Grouped' | 'Flat'>('Flat');

  const selectedCount = useMemo(() => Object.values(selectedItems).filter(Boolean).length, [selectedItems]);
  const allSelected = selectedCount > 0 && selectedCount === sorted.length;
  const toggleAll = () => {
    if (allSelected) setSelectedItems({});
    else setSelectedItems(Object.fromEntries(sorted.map((r) => [r.itemNo, true])));
  };
  const toggleOne = (id: string) => setSelectedItems((s) => ({ ...s, [id]: !s[id] }));
  const clearSelection = () => setSelectedItems({});

  const SNAPSHOT = 'Oct 3, 2026, 4:32 PM';

  return (
    <div className="min-h-full" data-testid="inventory-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">

        {/* ── Editorial header ─────────────────────────────────── */}
        <PageHeader
          title="Inventory"
          testIdPrefix="inventory"
        />


        {/* ── Low-stock alert banner ─────────────────────────── */}
        {health.atRisk > 0 && (
          <div className="rounded-2xl flex items-start" style={{ gap: 12, padding: '14px 20px', background: '#FFF1EF', border: `1px solid #FFD2CB`, marginBottom: 16 }} data-testid="inventory-alert-banner">
            <AlertTriangle size={16} strokeWidth={2} style={{ color: CORAL_DK, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: CORAL_DK }}>{health.atRisk} items need reorder</p>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: SLATE_700 }}>{health.counts.Critical} critical · {health.counts.Out} out of stock · {health.counts.Low} low</p>
            </div>
            <button type="button" className="btn-coral btn-sm" data-testid="inventory-review-reorders">Review reorders</button>
          </div>
        )}

        {/* ── KPI row (5-up with sparklines) ────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" data-testid="inventory-kpi-row">
          {[
            { label: 'Products',  value: fmt(totals.products),             test: 'products',  tone: 'ink',  spark: spark12('products', 60) },
            { label: 'On hand',   value: fmt(totals.onHand * 820),         test: 'onhand',    tone: 'ink',  spark: spark12('onhand', 90) },
            { label: 'Allocated', value: fmt(totals.allocated * 820),      test: 'allocated', tone: 'ink',  spark: spark12('allocated', 70) },
            { label: 'Available', value: fmt(totals.available * 820),      test: 'available', tone: 'ink',  spark: spark12('available', 50) },
            { label: 'At risk',   value: fmt(health.atRisk),               test: 'at-risk',   tone: 'coral', spark: spark12('risk', 30) },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-white" style={{ padding: 20, boxShadow: CARD_SHADOW }} data-testid={`inv-kpi-${k.test}`}>
              <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: '#6E6E73', margin: 0 }}>{k.label}</p>
              <p className="mt-2" style={{ ...TABULAR, fontSize: 28, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: k.tone === 'coral' && health.atRisk > 0 ? CORAL_DK : '#0A0A0B', margin: 0 }}>{k.value}</p>
              <Sparkline data={k.spark} color={k.tone === 'coral' ? CORAL : SLATE_400} width={72} height={24} />
            </div>
          ))}
        </section>

        {/* ── Stock Health band ─────────────────────────────────── */}
        <section className="mt-4 rounded-2xl bg-white" style={{ padding: 20, boxShadow: CARD_SHADOW }} data-testid="inventory-health-band">
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: '#6E6E73', margin: 0 }}>Stock health</p>
            <p style={{ margin: 0, fontSize: 12.5, color: SLATE_500 }}>{health.total} SKUs</p>
          </div>
          <div className="flex items-center overflow-hidden" style={{ height: 10, borderRadius: 999, background: SLATE_100 }}>
            {([
              ['Healthy', health.counts.Healthy, '#10B981'],
              ['Low',      health.counts.Low,      SLATE_400],
              ['Critical', health.counts.Critical, CORAL],
              ['Out',      health.counts.Out,      CORAL_DK],
            ] as const).map(([label, count, color]) => {
              const w = count === 0 ? 0 : (count / health.total) * 100;
              if (w === 0) return null;
              return <div key={label} style={{ width: `${w}%`, height: '100%', background: color, transition: 'width 240ms ease' }} data-testid={`inv-health-${label.toLowerCase()}`} aria-label={`${label} ${count}`} />;
            })}
          </div>
          <div className="flex flex-wrap items-center" style={{ gap: 16, marginTop: 12 }}>
            {([
              ['Healthy', health.counts.Healthy, '#10B981'],
              ['Low',      health.counts.Low,      SLATE_400],
              ['Critical', health.counts.Critical, CORAL],
              ['Out',      health.counts.Out,      CORAL_DK],
            ] as const).map(([label, count, color]) => (
              <div key={label} className="inline-flex items-center" style={{ gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: SLATE_700, fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12.5, color: INK, fontWeight: 600, ...TABULAR }}>{count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Unified inventory card: toolbar band + table + footer ─────── */}
        <section
          className="mt-4 overflow-hidden rounded-2xl bg-white"
          style={{ boxShadow: CARD_SHADOW }}
          data-testid="inventory-table-card"
        >
          {/* Bulk action bar (only when selection > 0) */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center" style={{ gap: 12, padding: '12px 20px', background: INK, color: '#FFFFFF' }} data-testid="inventory-bulk-bar">
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{selectedCount} selected</span>
              <span aria-hidden="true" style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.18)' }} />
              <button type="button" className="inline-flex items-center" style={{ gap: 6, height: 30, padding: '0 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} data-testid="inv-bulk-reorder"><RefreshCw size={13} strokeWidth={2} />Reorder</button>
              <button type="button" className="inline-flex items-center" style={{ gap: 6, height: 30, padding: '0 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} data-testid="inv-bulk-export"><Download size={13} strokeWidth={2} />Export</button>
              <button type="button" onClick={clearSelection} className="ml-auto inline-flex items-center" style={{ gap: 6, height: 30, padding: '0 12px', borderRadius: 8, background: 'transparent', color: '#FFFFFF', fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: 0.78 }} data-testid="inv-bulk-clear"><X size={13} strokeWidth={2} />Clear</button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3" style={{ padding: '14px 20px', minHeight: 60 }} data-testid="inventory-toolbar">
          {/* Search */}
          <div className="relative" style={{ width: 320 }}>
            <Search size={14} strokeWidth={1.9} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: SLATE_400, pointerEvents: 'none' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item # or name..."
              className="ds-input w-full"
              data-testid="inventory-search"
              style={{ paddingLeft: 36 }}
            />
          </div>

          {/* All locations multi-select */}
          <LocationMultiSelect value={selectedLocations} options={allLocations} onChange={setSelectedLocations} />

          {/* Divider */}
          <span aria-hidden="true" style={{ width: 1, height: 20, background: SLATE_200 }} />

          {/* By location toggle */}
          <ByLocationToggle value={byLocationMode} onChange={setByLocationMode} />
          </div>

        {/* ── 3. Inventory table (continuation of unified card) ────────────── */}
          <div style={{ height: 1, background: '#EDEDEF' }} aria-hidden="true" />
          <div style={{ maxHeight: 640, overflowY: 'auto', overflowX: 'auto' }}>
            <table className="data-numeric-center w-full" style={{ ...TABULAR, borderCollapse: 'collapse', minWidth: 1080 }} data-testid="inventory-table">
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: '#FFFFFF', boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                  <th style={{ width: 44, height: 44, textAlign: 'center' }}>
                    <SelectCheckbox checked={allSelected} indeterminate={selectedCount > 0 && !allSelected} onChange={toggleAll} testId="inventory-select-all" />
                  </th>
                  <th aria-label="Expand" style={{ width: 36, height: 44 }} />
                  <th
                    onClick={() => setSortAsc((s) => !s)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44, userSelect: 'none', minWidth: 280 }}
                    data-testid="inventory-sort-item"
                    onMouseEnter={(e) => { e.currentTarget.style.color = SLATE_700; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; }}
                  >
                    <span className="inline-flex items-center gap-1">SKU
                      <ArrowUp size={11} strokeWidth={2.4} style={{ transform: sortAsc ? 'none' : 'rotate(180deg)', color: SLATE_500 }} />
                    </span>
                  </th>
                  <th style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>Location</th>
                  <th style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44, minWidth: 140 }}>Stock level</th>
                  {['On hand', 'Allocated', 'Available', 'DoS'].map((h) => (
                    <th key={h} style={{ padding: '0 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>{h}</th>
                  ))}
                  <th style={{ padding: '0 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>Status</th>
                  <th style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>Reorder</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={11}>
                      <div className="flex flex-col items-center justify-center gap-2" style={{ padding: '72px 24px' }} data-testid="inventory-empty">
                        <Package size={48} strokeWidth={1.4} style={{ color: SLATE_300 }} />
                        <p style={{ fontSize: 15, fontWeight: 600, color: SLATE_700, margin: 0 }}>No matching items</p>
                        <p style={{ fontSize: 13, color: SLATE_500, margin: 0 }}>Try a different search or clear filters</p>
                        <button
                          type="button"
                          onClick={() => setQuery('')}
                          className="btn-ghost btn-sm"
                          style={{ marginTop: 4, color: CORAL_DK }}
                          data-testid="inventory-empty-clear"
                        >
                          Clear search
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {sorted.map((r, idx) => {
                  const tot = r.tot;
                  const multi = r.locations.length > 1;
                  const isOpen = !!expanded[r.itemNo];
                  const isSel = !!selectedItems[r.itemNo];
                  const borderStyle = idx === 0 ? 'none' : `1px solid ${SLATE_100}`;
                  const availColor = tot.available === 0 ? SLATE_400 : (r.pct < 0.10 ? CORAL_DK : INK);
                  const availWeight = tot.available === 0 ? 400 : (r.pct < 0.10 ? 700 : 600);
                  const dosColor = tot.available === 0 ? SLATE_400 : r.dos < 14 ? CORAL_DK : r.dos < 30 ? SLATE_700 : SLATE_700;
                  const dosWeight = r.dos < 14 ? 700 : 500;
                  return (
                    <>
                      <tr
                        key={r.itemNo}
                        className="transition-colors duration-150"
                        style={{ borderTop: borderStyle, background: isSel ? '#FFF8F7' : 'transparent' }}
                        onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = SLATE_50; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? '#FFF8F7' : 'transparent'; }}
                        data-testid={`inv-row-${r.itemNo}`}
                      >
                        <td style={{ width: 44, textAlign: 'center' }}>
                          <SelectCheckbox checked={isSel} onChange={() => toggleOne(r.itemNo)} testId={`inv-select-${r.itemNo}`} />
                        </td>
                        <td style={{ width: 36, textAlign: 'center' }}>
                          {multi ? (
                            <button
                              type="button"
                              onClick={() => setExpanded((s) => ({ ...s, [r.itemNo]: !s[r.itemNo] }))}
                              className="btn-ghost"
                              style={{ width: 28, height: 28, padding: 0, display: 'inline-grid', placeItems: 'center' }}
                              aria-label={isOpen ? 'Collapse locations' : 'Expand locations'}
                              aria-expanded={isOpen}
                              data-testid={`inv-expand-${r.itemNo}`}
                            >
                              {isOpen ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                            </button>
                          ) : null}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <SkuIdentity itemNo={r.itemNo} name={r.name} color={r.color} size={r.size} />
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13.5, color: SLATE_700 }}>
                          <div className="inline-flex items-center gap-1.5">
                            <MapPin size={13} strokeWidth={1.9} style={{ color: SLATE_400, flexShrink: 0 }} />
                            {multi ? <span>{r.locations.length} locations</span> : <span>{r.locations[0].name}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <StockBar pct={r.pct} status={r.status} />
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13.5, color: INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(tot.onHand)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13.5, color: tot.allocated === 0 ? SLATE_400 : INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(tot.allocated)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13.5, fontWeight: availWeight, color: availColor, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(tot.available)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13.5, fontWeight: dosWeight, color: dosColor, textAlign: 'right', whiteSpace: 'nowrap' }}>{tot.available === 0 ? '—' : `${r.dos}d`}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <StatusChip status={r.status} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {r.reorderQty > 0 ? (
                            <button type="button" className="inline-flex items-center" style={{ gap: 6, height: 28, padding: '0 10px', borderRadius: 6, background: '#FFF1EF', color: CORAL_DK, fontSize: 12, fontWeight: 600, border: `1px solid #FFD2CB`, cursor: 'pointer', fontFamily: 'inherit' }} data-testid={`inv-reorder-${r.itemNo}`}>
                              <RefreshCw size={12} strokeWidth={2.2} />Reorder {fmt(r.reorderQty)}
                            </button>
                          ) : <span style={{ fontSize: 12.5, color: SLATE_400 }}>—</span>}
                        </td>
                      </tr>

                      {multi && isOpen && r.locations.map((l, li) => (
                        <tr
                          key={`${r.itemNo}-sub-${li}`}
                          style={{ background: SLATE_50, borderTop: `1px solid ${SLATE_100}` }}
                          data-testid={`inv-subrow-${r.itemNo}-${li}`}
                        >
                          <td />
                          <td />
                          <td colSpan={2} style={{ padding: '10px 16px 10px 44px', fontSize: 13, color: SLATE_700 }}>
                            <div className="inline-flex items-center gap-1.5">
                              <MapPin size={13} strokeWidth={1.9} style={{ color: SLATE_500 }} />
                              {l.name}
                            </div>
                          </td>
                          <td />
                          <td style={{ padding: '10px 16px', fontSize: 13, color: INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(l.onHand)}</td>
                          <td style={{ padding: '10px 16px', fontSize: 13, color: l.allocated === 0 ? SLATE_400 : INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(l.allocated)}</td>
                          <td style={{ padding: '10px 16px', fontSize: 13, color: (l.onHand - l.allocated) === 0 ? SLATE_400 : INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(l.onHand - l.allocated)}</td>
                          <td colSpan={3} />
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between" style={{ padding: '12px 20px', background: '#FAFAFA', borderTop: `1px solid #EDEDEF`, gap: 8 }} data-testid="inventory-footer">
            <span style={{ fontSize: 12.5, color: SLATE_500 }}>Showing 1–{sorted.length} of {sorted.length}</span>
            <span style={{ fontSize: 12.5, color: SLATE_500 }}>Snapshot · {SNAPSHOT}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function LocationMultiSelect({ value, options, onChange }: { value: string[]; options: readonly string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const label = value.length === 0 ? 'All locations' : value.length === 1 ? value[0] : `${value.length} locations`;
  const toggle = (loc: string) => onChange(value.includes(loc) ? value.filter((x) => x !== loc) : [...value, loc]);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary inline-flex items-center gap-2"
        data-testid="inventory-location-dropdown"
      >
        <MapPin size={13} strokeWidth={1.9} style={{ color: SLATE_500 }} />
        {label}
        <ChevronDown size={12} strokeWidth={2} style={{ color: SLATE_400 }} />
      </button>
      <PopoverPortal open={open} onClose={() => setOpen(false)} anchorRef={btnRef} placement="bottom-start" minWidth={260} padding={6} testId="inventory-location-menu">
        <div className="flex items-center justify-between" style={{ padding: '4px 6px 6px' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6E6E73' }}>Filter locations</span>
          <button type="button" onClick={() => onChange([])} className="btn-ghost" style={{ height: 22, padding: '0 8px', fontSize: 11, color: CORAL_DK }}>Clear</button>
        </div>
        <div style={{ height: 1, background: '#F3F3F5', margin: '2px 0 4px' }} />
        {options.map((loc) => {
          const checked = value.includes(loc);
          return (
            <button
              key={loc}
              type="button"
              onClick={() => toggle(loc)}
              className="w-full flex items-center"
              style={{ gap: 10, height: 34, padding: '0 10px', background: 'transparent', fontSize: 13, color: INK, fontWeight: checked ? 600 : 500, borderRadius: 7, cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              data-testid={`inventory-location-opt-${loc.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            >
              <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? CORAL : SLATE_300}`, background: checked ? CORAL : '#FFFFFF', display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
                {checked && <Check size={11} strokeWidth={3} color="#FFFFFF" />}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc}</span>
            </button>
          );
        })}
      </PopoverPortal>
    </>
  );
}

function ByLocationToggle({ value, onChange }: { value: 'Grouped' | 'Flat'; onChange: (v: 'Grouped' | 'Flat') => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary inline-flex items-center gap-2"
        data-testid="inventory-by-location-toggle"
      >
        <LayoutGrid size={14} strokeWidth={1.9} style={{ color: SLATE_500 }} />
        {value === 'Grouped' ? 'By location' : 'Flat list'}
        <ChevronDown size={12} strokeWidth={2} style={{ color: SLATE_400 }} />
      </button>
      <PopoverPortal open={open} onClose={() => setOpen(false)} anchorRef={btnRef} placement="bottom-start" minWidth={200} padding={6} testId="inventory-by-location-menu">
        {(['Flat', 'Grouped'] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => { onChange(o); setOpen(false); }}
            className="w-full flex items-center justify-between"
            style={{ height: 34, padding: '0 10px', background: 'transparent', color: o === value ? INK : SLATE_700, fontSize: 13, fontWeight: o === value ? 600 : 500, borderRadius: 7, cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            data-testid={`inventory-by-location-opt-${o.toLowerCase()}`}
          >
            <span>{o === 'Flat' ? 'Flat list' : 'Group by location'}</span>
            {o === value && <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} />}
          </button>
        ))}
      </PopoverPortal>
    </>
  );
}



// ─── Visual helpers ────────────────────────────────────────────────────
function Sparkline({ data, color = '#9A9A9E', width = 72, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);
  const pts = data.map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ marginTop: 10, display: 'block' }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SkuIdentity({ itemNo, name, color, size }: { itemNo: string; name: string; color: string; size: string }) {
  const initials = (name || itemNo).split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <div className="flex items-center" style={{ gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: SLATE_50, color: SLATE_500, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', flexShrink: 0, border: `1px solid ${SLATE_200}` }} aria-hidden="true">{initials}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: INK, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11.5, color: SLATE_500, letterSpacing: '0.02em' }}>{itemNo} · {color} · {size}</p>
      </div>
    </div>
  );
}

function StockBar({ pct, status }: { pct: number; status: StockStatus }) {
  const color = status === 'Out' ? CORAL_DK : status === 'Critical' ? CORAL : status === 'Low' ? SLATE_400 : '#10B981';
  const w = Math.max(2, Math.min(100, Math.round(pct * 100)));
  return (
    <div style={{ width: 120, height: 6, background: SLATE_100, borderRadius: 999, overflow: 'hidden' }} aria-label={`${w}% available`}>
      <div style={{ width: `${w}%`, height: '100%', background: color, transition: 'width 240ms ease' }} />
    </div>
  );
}

function StatusChip({ status }: { status: StockStatus }) {
  const map = {
    Healthy:  { bg: '#ECFDF5', fg: '#047857', bd: '#A7F3D0' },
    Low:      { bg: '#F3F3F5', fg: SLATE_700, bd: SLATE_200 },
    Critical: { bg: '#FFF1EF', fg: CORAL_DK,  bd: '#FFD2CB' },
    Out:      { bg: '#FFF1EF', fg: '#7F1D1D', bd: '#FFC0B5' },
  } as const;
  const s = map[status];
  return (
    <span className="inline-flex items-center" style={{ height: 22, padding: '0 10px', borderRadius: 6, background: s.bg, color: s.fg, fontSize: 11.5, fontWeight: 600, border: `1px solid ${s.bd}`, letterSpacing: '0.01em' }} data-testid={`inv-status-${status.toLowerCase()}`}>{status}</span>
  );
}

function SelectCheckbox({ checked, indeterminate, onChange, testId }: { checked: boolean; indeterminate?: boolean; onChange: () => void; testId?: string }) {
  const bg = checked || indeterminate ? CORAL : '#FFFFFF';
  const border = checked || indeterminate ? CORAL : SLATE_300;
  return (
    <button type="button" onClick={onChange} aria-checked={checked} role="checkbox" style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${border}`, background: bg, display: 'inline-grid', placeItems: 'center', cursor: 'pointer', padding: 0, verticalAlign: 'middle' }} data-testid={testId}>
      {indeterminate ? <span style={{ width: 8, height: 2, background: '#FFFFFF', borderRadius: 1 }} /> : checked ? <Check size={12} strokeWidth={3} color="#FFFFFF" /> : null}
    </button>
  );
}
