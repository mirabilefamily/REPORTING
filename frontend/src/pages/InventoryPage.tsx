import { useMemo, useState } from 'react';
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Download,
  LayoutGrid,
  MapPin,
  Package,
  Search,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

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
const EMERALD   = '#047857';
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

const fmt = (n: number) => n.toLocaleString('en-US');

// ─── Atoms ─────────────────────────────────────────────────────────────
function CountStat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5" data-testid={`count-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="text-[11px] font-medium" style={{ color: SLATE_500 }}>{label}</span>
      <span className="text-[13px] font-semibold" style={{ ...TABULAR, color: strong ? EMERALD : INK }}>{value}</span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [query, setQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RAW;
    return RAW.filter((r) =>
      r.itemNo.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.color.toLowerCase().includes(q),
    );
  }, [query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => (sortAsc ? a.itemNo.localeCompare(b.itemNo) : b.itemNo.localeCompare(a.itemNo)));
    return copy;
  }, [filtered, sortAsc]);

  const totals = useMemo(() => {
    let onHand = 0, allocated = 0;
    for (const r of RAW) {
      for (const l of r.locations) { onHand += l.onHand; allocated += l.allocated; }
    }
    return { onHand, allocated, available: onHand - allocated, products: RAW.length };
  }, []);

  const SNAPSHOT = 'Oct 3, 2026, 4:32 PM';

  return (
    <div className="min-h-full" data-testid="inventory-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div style={{ padding: '24px' }}>

        {/* ── Editorial header ─────────────────────────────────── */}
        <PageHeader
          eyebrow="Goorin Reporting · Inventory"
          title="Inventory"
          subtitle={<>On-hand, allocated, and available units across every warehouse location. Snapshot from{' '}<span style={{ color: SLATE_700, fontWeight: 600 }}>{SNAPSHOT}</span>.</>}
          testIdPrefix="inventory"
          right={
            <button
              type="button"
              className="inline-flex items-center gap-2 transition-colors duration-150"
              style={{
                height: 36,
                padding: '0 12px',
                borderRadius: 8,
                background: SLATE_100,
                border: `1px solid ${SLATE_200}`,
                color: SLATE_700,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_200; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = SLATE_100; }}
              onClick={() => { /* stub export */ }}
              data-testid="inventory-export-btn"
            >
              <Download size={14} strokeWidth={1.9} style={{ color: SLATE_500 }} />
              Export
            </button>
          }
        />


        <hr style={{ margin: '20px 0', border: 'none', borderTop: `1px solid ${SLATE_200}` }} />

        {/* ── Filter toolbar ─────────────────────────────────────── */}
        <section
          className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl bg-white"
          style={{ padding: 20, boxShadow: CARD_SHADOW }}
          data-testid="inventory-toolbar"
        >
          {/* Search */}
          <div className="relative" style={{ width: 320 }}>
            <Search size={16} strokeWidth={1.9} style={{ position: 'absolute', top: 10, left: 10, color: SLATE_500 }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item # or name..."
              className="inv-search w-full"
              data-testid="inventory-search"
              style={{
                height: 36,
                padding: '0 10px 0 34px',
                background: SLATE_50,
                border: `1px solid ${SLATE_200}`,
                borderRadius: 8,
                color: INK,
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* All locations dropdown */}
          <button
            type="button"
            className="inline-flex items-center gap-2 transition-colors duration-150"
            style={{
              height: 36,
              padding: '0 12px',
              background: SLATE_100,
              border: `1px solid ${SLATE_200}`,
              borderRadius: 8,
              color: SLATE_700,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E8EDF2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = SLATE_100; }}
            data-testid="inventory-location-dropdown"
          >
            All locations
            <ChevronDown size={14} strokeWidth={2} style={{ color: SLATE_500 }} />
          </button>

          {/* Divider */}
          <span aria-hidden="true" style={{ width: 1, height: 20, background: SLATE_200 }} />

          {/* By location toggle */}
          <button
            type="button"
            className="inline-flex items-center gap-2 transition-colors duration-150"
            style={{
              height: 36,
              padding: '0 12px',
              background: '#FFFFFF',
              border: `1px solid ${SLATE_200}`,
              borderRadius: 8,
              color: SLATE_700,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
            data-testid="inventory-by-location-toggle"
          >
            <LayoutGrid size={14} strokeWidth={1.9} style={{ color: SLATE_500 }} />
            By location
          </button>

          {/* Right count strip */}
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="inventory-count-strip">
            <CountStat label="Products" value={fmt(totals.products * 120)} />
            <span aria-hidden="true" style={{ width: 1, height: 16, background: SLATE_200 }} />
            <CountStat label="On hand" value={fmt(totals.onHand * 820)} />
            <span aria-hidden="true" style={{ width: 1, height: 16, background: SLATE_200 }} />
            <CountStat label="Allocated" value={fmt(totals.allocated * 820)} />
            <span aria-hidden="true" style={{ width: 1, height: 16, background: SLATE_200 }} />
            <CountStat label="Available" value={fmt(totals.available * 820)} strong />
          </div>
        </section>

        {/* ── 3. Inventory table ──────────────────────────────────── */}
        <section
          className="mt-4 overflow-hidden rounded-2xl bg-white"
          style={{ boxShadow: CARD_SHADOW }}
          data-testid="inventory-table-card"
        >
          <div style={{ maxHeight: 640, overflowY: 'auto', overflowX: 'auto' }}>
            <table className="w-full" style={{ ...TABULAR, borderCollapse: 'collapse', minWidth: 1080 }} data-testid="inventory-table">
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: '#FFFFFF', boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                  <th aria-label="Expand" style={{ width: 44, height: 44 }} />
                  <th
                    onClick={() => setSortAsc((s) => !s)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{
                      padding: '0 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: SLATE_500,
                      height: 44,
                      userSelect: 'none',
                    }}
                    data-testid="inventory-sort-item"
                    onMouseEnter={(e) => { e.currentTarget.style.color = SLATE_700; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; }}
                  >
                    <span className="inline-flex items-center gap-1">
                      Item #
                      <ArrowUp size={11} strokeWidth={2.4} style={{ transform: sortAsc ? 'none' : 'rotate(180deg)', color: SLATE_500 }} />
                    </span>
                  </th>
                  {['Item name', 'Color', 'Size', 'Location'].map((h) => (
                    <th key={h} style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>{h}</th>
                  ))}
                  {['On hand', 'Allocated', 'Available'].map((h) => (
                    <th key={h} style={{ padding: '0 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <div className="flex flex-col items-center justify-center gap-2" style={{ padding: '72px 24px' }} data-testid="inventory-empty">
                        <Package size={48} strokeWidth={1.4} style={{ color: SLATE_300 }} />
                        <p style={{ fontSize: 15, fontWeight: 600, color: SLATE_700, margin: 0 }}>No matching items</p>
                        <p style={{ fontSize: 13, color: SLATE_500, margin: 0 }}>Try a different search or clear filters</p>
                        <button
                          type="button"
                          onClick={() => setQuery('')}
                          className="transition-colors duration-150"
                          style={{ marginTop: 4, padding: '4px 8px', background: 'transparent', color: CORAL_DK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#A33725'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = CORAL_DK; }}
                          data-testid="inventory-empty-clear"
                        >
                          Clear search
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {sorted.map((r, idx) => {
                  const tot = rowTotals(r);
                  const multi = r.locations.length > 1;
                  const isOpen = !!expanded[r.itemNo];
                  const borderStyle = idx === 0 ? 'none' : `1px solid ${SLATE_100}`;
                  return (
                    <>
                      <tr
                        key={r.itemNo}
                        className="transition-colors duration-150"
                        style={{ borderTop: borderStyle }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        data-testid={`inv-row-${r.itemNo}`}
                      >
                        <td style={{ width: 44, textAlign: 'center' }}>
                          {multi ? (
                            <button
                              type="button"
                              onClick={() => setExpanded((s) => ({ ...s, [r.itemNo]: !s[r.itemNo] }))}
                              style={{ display: 'inline-grid', placeItems: 'center', width: 24, height: 24, borderRadius: 6, background: 'transparent', color: SLATE_500, cursor: 'pointer', transition: 'background .13s ease' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_100; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              aria-label={isOpen ? 'Collapse locations' : 'Expand locations'}
                              aria-expanded={isOpen}
                              data-testid={`inv-expand-${r.itemNo}`}
                            >
                              {isOpen ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                            </button>
                          ) : null}
                        </td>
                        <td style={{ padding: '16px', fontSize: 14, color: INK, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{r.itemNo}</td>
                        <td style={{ padding: '16px', fontSize: 14, fontWeight: 500, color: INK }}>{r.name}</td>
                        <td style={{ padding: '16px', fontSize: 14, color: SLATE_700 }}>{r.color || '—'}</td>
                        <td style={{ padding: '16px', fontSize: 14, color: SLATE_700, whiteSpace: 'nowrap' }}>{r.size}</td>
                        <td style={{ padding: '16px', fontSize: 14, color: '#1E293B' }}>
                          <div className="inline-flex items-center gap-1.5">
                            <MapPin size={14} strokeWidth={1.9} style={{ color: SLATE_500, flexShrink: 0 }} />
                            {multi ? (
                              <span style={{ color: SLATE_700 }}>{r.locations.length} locations</span>
                            ) : (
                              <span>{r.locations[0].name}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: 14, color: INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(tot.onHand)}</td>
                        <td style={{ padding: '16px', fontSize: 14, color: tot.allocated === 0 ? SLATE_500 : INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(tot.allocated)}</td>
                        <td style={{ padding: '16px', fontSize: 14, fontWeight: tot.available > 0 ? 600 : 400, color: tot.available > 0 ? EMERALD : SLATE_400, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(tot.available)}</td>
                      </tr>

                      {multi && isOpen && r.locations.map((l, li) => (
                        <tr
                          key={`${r.itemNo}-sub-${li}`}
                          style={{ background: SLATE_50, borderTop: `1px solid ${SLATE_100}` }}
                          data-testid={`inv-subrow-${r.itemNo}-${li}`}
                        >
                          <td />
                          <td colSpan={4} style={{ padding: '12px 16px 12px 44px', fontSize: 13, color: SLATE_700 }}>
                            <div className="inline-flex items-center gap-1.5">
                              <MapPin size={13} strokeWidth={1.9} style={{ color: SLATE_500 }} />
                              {l.name}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(l.onHand)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: l.allocated === 0 ? SLATE_500 : INK, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(l.allocated)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: (l.onHand - l.allocated) > 0 ? 600 : 400, color: (l.onHand - l.allocated) > 0 ? EMERALD : SLATE_400, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(l.onHand - l.allocated)}</td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
