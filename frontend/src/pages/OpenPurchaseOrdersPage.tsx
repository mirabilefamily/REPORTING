import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowDownToLine,
  Columns3,
  Download,
  RefreshCcw,
  Search,
  Settings,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DsSelect from '../components/DsSelect';
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
} from '../mocks/openPurchaseOrders';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;

const INK       = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';
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
const AMBER_FG  = '#B4791A';
const AMBER_BG  = '#FFF7E6';

// ─── Formatters ────────────────────────────────────────────────────────
const fmtInt = (n: number) => n.toLocaleString('en-US');
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
const ALL_COLUMNS: { key: ColKey; label: string; align?: 'left' | 'right'; width?: number }[] = [
  { key: 'poNo',       label: 'PO #',           align: 'left',  width: 96  },
  { key: 'lines',      label: 'Lines',          align: 'right', width: 72  },
  { key: 'supplier',   label: 'Supplier',       align: 'left',  width: 180 },
  { key: 'reference',  label: 'Reference',      align: 'left',  width: 140 },
  { key: 'memo',       label: 'Memo',           align: 'left',  width: 110 },
  { key: 'itemNo',     label: 'Item #',         align: 'left',  width: 160 },
  { key: 'product',    label: 'Product',        align: 'left',  width: 240 },
  { key: 'collection', label: 'Collection',     align: 'left',  width: 150 },
  { key: 'estShip',    label: 'Est. ship date', align: 'left',  width: 120 },
  { key: 'eta',        label: 'ETA',            align: 'left',  width: 110 },
  { key: 'launch',     label: 'Launch',         align: 'left',  width: 110 },
  { key: 'season',     label: 'Season',         align: 'left',  width: 90  },
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

// ─── Page ──────────────────────────────────────────────────────────────
export default function OpenPurchaseOrdersPage() {
  // Toolbar state
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'All' | 'Late' | 'Shipped' | 'No lead'>('All');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [supplierFilter, setSupplierFilter] = useState<string>('All');
  const [destFilter, setDestFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [customerFilter, setCustomerFilter] = useState<string>('All');

  // Column visibility (mock menu)
  const [colsOpen, setColsOpen] = useState(false);
  const colsBtnRef = useRef<HTMLButtonElement | null>(null);
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() =>
    ALL_COLUMNS.reduce((acc, c) => { acc[c.key] = true; return acc; }, {} as Record<ColKey, boolean>),
  );

  // Drawer state (persisted)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'Display' | 'Groups' | 'Lanes'>('Display');
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
  const dirty = JSON.stringify(prefs) !== JSON.stringify(prefsClean) || JSON.stringify(lanes) !== JSON.stringify(lanesClean);

  // Row counts for pill tabs (computed off all rows, mirrors reference labels)
  const tabCounts = useMemo(() => {
    const all = PO_ROWS.length;
    const late = PO_ROWS.filter((r) => isPoOverdue(r.eta, r.status)).length;
    const shipped = PO_ROWS.filter((r) => r.status === 'Received').length;
    const noLead = PO_ROWS.filter((r) => !r.eta).length;
    return { All: all, Late: late, Shipped: shipped, 'No lead': noLead };
  }, []);

  // Filtered rows
  const rows = useMemo(() => {
    let out: PoLine[] = PO_ROWS.slice();
    // tab filters
    if (tab === 'Late')     out = out.filter((r) => isPoOverdue(r.eta, r.status));
    if (tab === 'Shipped')  out = out.filter((r) => r.status === 'Received');
    if (tab === 'No lead')  out = out.filter((r) => !r.eta);
    // dropdowns
    if (stateFilter    !== 'All') out = out.filter((r) => r.state === stateFilter);
    if (supplierFilter !== 'All') out = out.filter((r) => r.supplier === supplierFilter);
    if (destFilter     !== 'All') out = out.filter((r) => r.destination === destFilter);
    if (modeFilter     !== 'All') out = out.filter((r) => r.mode === modeFilter);
    if (statusFilter   !== 'All') out = out.filter((r) => r.status === statusFilter);
    if (customerFilter !== 'All') out = out.filter((r) => r.customer === customerFilter);
    // search
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
    return out;
  }, [tab, stateFilter, supplierFilter, destFilter, modeFilter, statusFilter, customerFilter, query]);

  const visibleColList = ALL_COLUMNS.filter((c) => visibleCols[c.key]);

  const onRowClick = (po: PoLine) => {
    // eslint-disable-next-line no-console
    console.log('open PO drawer', po.poNo);
  };
  const exportMock = () => {
    // eslint-disable-next-line no-console
    console.log('[open-purchase-orders] export excel');
  };

  const saveDrawer = () => {
    localStorage.setItem('opoReportSettings', JSON.stringify(prefs));
    localStorage.setItem('opoLanes', JSON.stringify(lanes));
    setPrefsClean(prefs);
    setLanesClean(lanes);
  };
  const discardDrawer = () => {
    setPrefs(prefsClean);
    setLanes(lanesClean);
  };

  return (
    <div className="min-h-full" data-testid="purchase-orders-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        {/* Breadcrumb eyebrow */}
        <div className="inline-flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 500, color: SLATE_500, marginBottom: 6 }} data-testid="po-breadcrumb">
          <Truck size={13} strokeWidth={1.9} />
          <span>Open Purchase Orders</span>
        </div>

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

        {/* ── Status strip ────────────────────────────────────── */}
        <section className="mt-4 rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: '14px 20px' }} data-testid="po-status-strip">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center flex-wrap" style={{ columnGap: 24, rowGap: 8 }}>
              <StripBit label="FRESHNESS" value={PO_STATUS_STRIP.freshness} dotColor={EMERALD} />
              <StripBit label="UPDATED" value={PO_STATUS_STRIP.updatedAgo} />
              <StripBit label="AT"      value={PO_STATUS_STRIP.updatedAt} />
              <StripBit label="NEXT AUTO" value={PO_STATUS_STRIP.nextAuto} />
              <StripBit label="COOLDOWN" value={PO_STATUS_STRIP.cooldown} />
              <StripBit label="REV"     value={PO_STATUS_STRIP.rev} />
            </div>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ padding: '5px 12px', border: `1px solid ${SLATE_200}`, color: SLATE_600, fontSize: 12.5, fontWeight: 500, borderRadius: 999, background: '#FFFFFF' }}
              data-testid="po-cooling-chip"
            >
              <RefreshCcw size={12} strokeWidth={2} /> Cooling down
            </span>
          </div>
        </section>

        {/* ── Warnings card ─────────────────────────────────────── */}
        <section className="mt-4 rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: '6px 0' }} data-testid="po-warnings">
          {[
            'Purchase line 9883: blank received quantity with no stock movements; counted as zero received.',
            'Product enrichment unavailable; cached product metadata retained where available.',
            'Sales-order enrichment unavailable; cached matching/window information retained where available.',
          ].map((msg, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5"
              style={{ padding: '12px 20px', borderTop: i === 0 ? 'none' : '1px solid #F3F3F5' }}
            >
              <AlertTriangle size={14} strokeWidth={2} style={{ color: AMBER_FG, flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 13.5, color: SLATE_700 }}>{msg}</p>
            </div>
          ))}
        </section>

        {/* ── Section header ────────────────────────────────────── */}
        <div className="mt-5 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500 }} data-testid="po-section-label">
            All eligible purchase orders
          </span>
          <span style={{ fontSize: 12, color: SLATE_400, fontStyle: 'italic' }}>Global totals, not affected by filters below</span>
        </div>

        {/* ── KPI strip (6) ─────────────────────────────────────── */}
        <section className="mt-3 overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="po-kpi-strip">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            <KpiCell label="Orders"      value={fmtInt(PO_GLOBAL_TOTALS.orders)}         foot="Open POs" />
            <KpiCell label="Open units"  value={fmtInt(PO_GLOBAL_TOTALS.openUnits)}      foot="Not yet received" />
            <KpiCell label="Fulfilled"   value={`${PO_GLOBAL_TOTALS.fulfilledPct}%`}     foot="Includes cancellations" />
            <KpiCell label="Late"        value={fmtInt(PO_GLOBAL_TOTALS.late)}           foot="POs" valueColor={CORAL_DK} />
            <KpiCell label="No lead"     value={fmtInt(PO_GLOBAL_TOTALS.noLead)}         foot="POs" valueColor={AMBER_FG} />
            <KpiCell label="On-time rate" value={`${PO_GLOBAL_TOTALS.onTimePct}%`}       foot="Across visible POs" last />
          </div>
        </section>

        {/* ── Toolbar ───────────────────────────────────────────── */}
        <section className="mt-4 rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: '14px 20px' }} data-testid="po-toolbar">
          <div className="flex items-center gap-3 flex-wrap">
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
                    className="ph-tab inline-flex items-center gap-1.5"
                    data-active={active}
                    data-testid={`po-tab-${t.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {t}
                    <span style={{ ...TABULAR, fontSize: 11, color: active ? INK : SLATE_500, fontWeight: 600 }}>{tabCounts[t]}</span>
                  </button>
                );
              })}
            </div>

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

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <DsSelect value={stateFilter}    options={PO_STATES as unknown as string[]}         onChange={setStateFilter}    testId="po-state-dropdown"       minWidth={110} />
              <DsSelect value={supplierFilter} options={PO_SUPPLIERS_LIST as unknown as string[]} onChange={setSupplierFilter} testId="po-supplier-dropdown"    minWidth={130} />
              <DsSelect value={destFilter}     options={PO_DESTINATIONS as unknown as string[]}   onChange={setDestFilter}     testId="po-destination-dropdown" minWidth={140} />
              <DsSelect value={modeFilter}     options={PO_MODES as unknown as string[]}          onChange={setModeFilter}     testId="po-mode-dropdown"        minWidth={100} />
              <DsSelect value={statusFilter}   options={PO_ROW_STATUSES as unknown as string[]}   onChange={setStatusFilter}   testId="po-status-dropdown"      minWidth={120} />
              <DsSelect value={customerFilter} options={PO_CUSTOMERS as unknown as string[]}      onChange={setCustomerFilter} testId="po-customer-dropdown"    minWidth={120} />
            </div>
          </div>

          {/* Second toolbar row */}
          <div className="mt-3 relative">
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
                style={{ top: 36, left: 0, boxShadow: '0 0 0 1px rgba(15,23,42,0.08), 0 10px 24px rgba(15,23,42,0.10)', padding: 6, minWidth: 200 }}
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
        </section>

        {/* ── Table ─────────────────────────────────────────────── */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="po-table-card">
          <div style={{ maxHeight: 720, overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1400 }} data-testid="po-table">
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: '#FFFFFF', boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                  {visibleColList.map((c) => (
                    <th
                      key={c.key}
                      style={{
                        padding: '0 14px',
                        textAlign: c.align === 'right' ? 'right' : 'left',
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: SLATE_500, height: 44,
                        width: c.width,
                        whiteSpace: 'nowrap',
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
                      onClick={() => onRowClick(p)}
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
          <div className="flex flex-wrap items-center justify-between" style={{ padding: '12px 20px', background: '#FAFAFA', borderTop: '1px solid #EDEDEF', gap: 8 }} data-testid="po-footer">
            <span style={{ fontSize: 12.5, color: SLATE_500 }}>Showing 1–{rows.length} of {rows.length}</span>
            <span style={{ fontSize: 12.5, color: SLATE_500 }}>Snapshot · {PO_STATUS_STRIP.updatedAt}</span>
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

// ─── Atoms ─────────────────────────────────────────────────────────────
function StripBit({ label, value, dotColor }: { label: string; value: string; dotColor?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      {dotColor && <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />}
      <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.12em', color: SLATE_500 }}>{label}</span>
      <span style={{ fontSize: 13.5, color: INK, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function KpiCell({ label, value, foot, valueColor, last }: { label: string; value: string; foot: string; valueColor?: string; last?: boolean }) {
  return (
    <div style={{ padding: '18px 20px', borderRight: last ? 'none' : `1px solid ${SLATE_100}` }} data-testid={`po-kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>{label}</p>
      <p style={{ ...TABULAR, margin: '6px 0 4px', fontSize: 'clamp(28px, 2.6vw, 38px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: valueColor || '#0A0A0B' }}>{value}</p>
      <p style={{ margin: 0, fontSize: 12.5, color: SLATE_500 }}>{foot}</p>
    </div>
  );
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
  laneFilter: string;
  setLaneFilter: (q: string) => void;
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

function SettingsDrawer({ onClose, tab, setTab, prefs, setPrefs, lanes, setLanes, laneFilter, setLaneFilter, dirty, onSave, onDiscard }: DrawerProps) {
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
        {/* Drawer header */}
        <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid #EDEDEF' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>Report settings</h2>
          <button type="button" onClick={onClose} className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} aria-label="Close" data-testid="po-settings-close"><X size={15} /></button>
        </div>

        {/* Tabs */}
        <div className="flex items-center" style={{ padding: '0 20px', borderBottom: '1px solid #EDEDEF', gap: 20 }}>
          {(['Display', 'Groups', 'Lanes'] as const).map((t) => {
            const active = tab === t;
            const count = t === 'Groups' ? 0 : t === 'Lanes' ? lanes.length : null;
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

        {/* Body */}
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
            <div className="rounded-xl" style={{ background: SLATE_50, padding: 24, border: '1px dashed #E2E8F0', textAlign: 'center' }} data-testid="po-settings-groups">
              <p style={{ margin: 0, fontSize: 14, color: SLATE_700, fontWeight: 500 }}>No groups yet.</p>
              <p style={{ margin: '4px 0 12px', fontSize: 13, color: SLATE_500 }}>Create a group to bundle lanes or suppliers.</p>
              <button type="button" className="btn-ghost btn-sm" data-testid="po-settings-group-add" onClick={() => { /* eslint-disable-next-line no-console */ console.log('new group'); }}>+ Group</button>
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

        {/* Footer */}
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

// Silence unused for lucide icons kept for future use
void ArrowDownToLine;
