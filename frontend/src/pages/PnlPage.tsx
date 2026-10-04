import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Columns3, Download, Minus, Plus } from 'lucide-react';
import { usePageRange } from '../lib/pageRange';
import DateRangePicker from '../components/DateRangePicker';
import PageHeader from '../components/PageHeader';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;
const INK = '#0A0A0B';
const SLATE_900 = '#0F172A';
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
const CORAL_50  = '#FFF7F5';
const CORAL_BG  = '#FFF1EF';
const GREEN     = '#047857';
const GREEN_BG  = '#ECFDF5';
const DIV_LITE   = '#F3F3F5';
const DIV_MED    = '#EDEDEF';
const DIV_STRONG = '#D4D4D8';

const SEGS = ['All', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
const COMPARISONS = ['None', 'Prior Year', 'Prior Period', 'Budget'] as const;
const CHANNELS = ['All channels', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
const VIEWS = ['Detailed', 'Expanded', 'Summary'] as const;
const GROUP_BY_OPTIONS = ['Customer', 'Channel', 'SKU', 'Category', 'Region', 'None'] as const;
type View = typeof VIEWS[number];

// 12 monthly periods — Jan 2026 through Dec 2026
const PERIODS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

// Channel scale
const CH_SCALE: Record<typeof CHANNELS[number], number> = {
  'All channels': 1, 'US Wholesale': 0.37, 'Distributors': 0.30, 'Retail': 0.026, 'Ecommerce': 0.26, 'Amazon': 0.045,
};

// Extend 10-month base arrays to 12 with Nov/Dec = 0 (future months)
const ext12 = (a10: number[]): number[] => [...a10, 0, 0];

// ─── Row model ─────────────────────────────────────────────────────────
type RowType = 'section' | 'subGroup' | 'line' | 'subGroupTotal' | 'subTotal' | 'keyTotal' | 'marginPct';
type Row = {
  name: string;
  code?: string;
  type: RowType;
  monthly: number[];
  level: 0 | 1 | 2;
  parent?: string;
};

function buildStatement(scale: number): Row[] {
  const g  = (b: number[]) => ext12(b.map((v) => Math.round(v * scale)));
  const gR = (b: number[]) => ext12(b.map((v) => Math.round(v * scale * 4)));
  const gC = (b: number[]) => ext12(b.map((v) => Math.round(v * scale * 3.3)));
  const gO = (b: number[]) => ext12(b.map((v) => Math.round(v * scale * 1.5)));
  const gT = (b: number[]) => ext12(b.map((v) => Math.round(v * scale * 3)));

  const salesDirect   = gR([0, 0, 0, 68_000, 0, 0, 0, 0, 0, 0]);
  const salesWhole    = gR([786_000, 257_000, 272_000, 395_000, 465_000, 582_000, 940_000, 1_120_000, 980_000, 820_000]);
  const salesSHI      = gR([18_000, 22_000, 28_000, 26_000, 32_000, 38_000, 44_000, 48_000, 52_000, 44_000]);
  const totalSales = salesDirect.map((_, i) => salesDirect[i] + salesWhole[i] + salesSHI[i]);

  const shipping = gR([8_000, 10_000, 12_000, 11_000, 14_000, 16_000, 18_000, 20_000, 22_000, 20_000]);
  const totalRevenue = totalSales.map((v, i) => v + shipping[i]);

  const discounts = gR([-42_000, -38_000, -48_000, -46_000, -52_000, -58_000, -72_000, -82_000, -78_000, -62_000]);
  const returns   = gR([-28_000, -24_000, -32_000, -30_000, -36_000, -42_000, -54_000, -62_000, -58_000, -46_000]);
  const totalContra = discounts.map((v, i) => v + returns[i]);

  const cogsBase    = gC([-32_000, -36_000, -42_000, -40_000, -48_000, -58_000, -72_000, -82_000, -78_000, -64_000]);
  const cogsProd    = gC([-120_000, -140_000, -180_000, -170_000, -210_000, -240_000, -290_000, -320_000, -310_000, -260_000]);
  const cogsFreight = gC([-18_000, -20_000, -26_000, -24_000, -30_000, -34_000, -42_000, -48_000, -44_000, -38_000]);
  const cogsImport  = gC([-12_000, -14_000, -18_000, -16_000, -22_000, -24_000, -30_000, -34_000, -32_000, -26_000]);
  const ppv         = gC([-4_000, -4_000, -6_000, -5_000, -7_000, -8_000, -10_000, -12_000, -11_000, -8_000]);
  const mpf         = gC([-8_000, -9_000, -11_000, -10_000, -13_000, -15_000, -18_000, -21_000, -20_000, -16_000]);
  const totalCogs = cogsBase.map((_, i) => cogsBase[i] + cogsProd[i] + cogsFreight[i] + cogsImport[i] + ppv[i] + mpf[i]);

  const grossProfit = totalRevenue.map((v, i) => v + totalContra[i] + totalCogs[i]);

  const marketing  = gO([-120_000, -130_000, -150_000, -140_000, -170_000, -190_000, -230_000, -260_000, -250_000, -200_000]);
  const ga         = gO([-80_000, -82_000, -88_000, -86_000, -92_000, -98_000, -108_000, -120_000, -116_000, -98_000]);
  const operations = gO([-60_000, -62_000, -68_000, -66_000, -72_000, -76_000, -88_000, -96_000, -94_000, -78_000]);
  const salaries   = gO([-180_000, -182_000, -188_000, -186_000, -192_000, -198_000, -210_000, -222_000, -218_000, -200_000]);
  const otherOpex  = gO([-22_000, -24_000, -28_000, -26_000, -32_000, -36_000, -42_000, -48_000, -44_000, -36_000]);
  const totalOpex = marketing.map((_, i) => marketing[i] + ga[i] + operations[i] + salaries[i] + otherOpex[i]);
  const operatingIncome = grossProfit.map((v, i) => v + totalOpex[i]);

  const intInc = g([8_000, 10_000, 12_000, 11_000, 14_000, 15_000, 16_000, 18_000, 18_000, 15_000]);
  const intExp = g([-12_000, -14_000, -18_000, -16_000, -22_000, -24_000, -28_000, -32_000, -30_000, -26_000]);
  const taxes  = gT([-62_000, -68_000, -80_000, -72_000, -98_000, -112_000, -140_000, -158_000, -152_000, -124_000]);
  const totalNonOp = intInc.map((_, i) => intInc[i] + intExp[i] + taxes[i]);
  const netIncome = operatingIncome.map((v, i) => v + totalNonOp[i]);

  const rows: Row[] = [
    // Revenue section
    { name: 'Revenue', code: '4000', type: 'section', level: 0, monthly: [], parent: 'Revenue' },
    { name: 'Sales', code: '4000', type: 'subGroup', level: 1, monthly: [], parent: 'Revenue' },
    { name: 'Sales — Direct',        code: '4000', type: 'line', level: 2, monthly: salesDirect, parent: 'Sales' },
    { name: 'Sales — Wholesale',     code: '4010', type: 'line', level: 2, monthly: salesWhole,  parent: 'Sales' },
    { name: 'Income — SHI Revenue',  code: '4020', type: 'line', level: 2, monthly: salesSHI,    parent: 'Sales' },
    { name: 'Total Sales', code: '4000', type: 'subGroupTotal', level: 1, monthly: totalSales, parent: 'Sales' },
    { name: 'Shipping Revenue', code: '4021', type: 'line', level: 1, monthly: shipping, parent: 'Revenue' },
    { name: 'Total Revenue', code: '4000', type: 'keyTotal', level: 0, monthly: totalRevenue, parent: 'Revenue' },

    // Contra Revenue
    { name: 'Contra Revenue', code: '4100', type: 'section', level: 0, monthly: [], parent: 'Contra Revenue' },
    { name: 'Discounts',         code: '4105', type: 'line', level: 1, monthly: discounts, parent: 'Contra Revenue' },
    { name: 'Returns / Refunds', code: '4106', type: 'line', level: 1, monthly: returns,   parent: 'Contra Revenue' },
    { name: 'Total Contra Revenue', code: '4100', type: 'subTotal', level: 0, monthly: totalContra, parent: 'Contra Revenue' },

    // COGS
    { name: 'Cost of Goods Sold', code: '5000', type: 'section', level: 0, monthly: [], parent: 'COGS' },
    { name: 'Cost of Goods Sold',       code: '5001', type: 'line', level: 1, monthly: cogsBase,    parent: 'COGS' },
    { name: 'COGS — Production',        code: '5002', type: 'line', level: 1, monthly: cogsProd,    parent: 'COGS' },
    { name: 'COGS — Freight',           code: '5003', type: 'line', level: 1, monthly: cogsFreight, parent: 'COGS' },
    { name: 'COGS — Import & Duties',   code: '5010', type: 'line', level: 1, monthly: cogsImport,  parent: 'COGS' },
    { name: 'Purchase Price Variance',  code: '5011', type: 'line', level: 1, monthly: ppv,         parent: 'COGS' },
    { name: 'Merchant Processing Fees', code: '5012', type: 'line', level: 1, monthly: mpf,         parent: 'COGS' },
    { name: 'Total COGS', code: '5000', type: 'subTotal', level: 0, monthly: totalCogs, parent: 'COGS' },

    { name: 'Gross Profit', type: 'keyTotal', level: 0, monthly: grossProfit, parent: 'Gross Profit' },

    // OpEx
    { name: 'Operating Expenses', code: '6000', type: 'section', level: 0, monthly: [], parent: 'OpEx' },
    { name: 'Marketing',           code: '6100', type: 'line', level: 1, monthly: marketing,  parent: 'OpEx' },
    { name: 'G&A',                 code: '6200', type: 'line', level: 1, monthly: ga,         parent: 'OpEx' },
    { name: 'Operations',          code: '6300', type: 'line', level: 1, monthly: operations, parent: 'OpEx' },
    { name: 'Salaries & Benefits', code: '6400', type: 'line', level: 1, monthly: salaries,   parent: 'OpEx' },
    { name: 'Other OpEx',          code: '6900', type: 'line', level: 1, monthly: otherOpex,  parent: 'OpEx' },
    { name: 'Total OpEx', code: '6000', type: 'subTotal', level: 0, monthly: totalOpex, parent: 'OpEx' },

    { name: 'Operating Income', type: 'keyTotal', level: 0, monthly: operatingIncome, parent: 'Operating Income' },

    // Non-Operating
    { name: 'Non-Operating', code: '7000', type: 'section', level: 0, monthly: [], parent: 'Non-Op' },
    { name: 'Interest Income',  code: '7100', type: 'line', level: 1, monthly: intInc, parent: 'Non-Op' },
    { name: 'Interest Expense', code: '7200', type: 'line', level: 1, monthly: intExp, parent: 'Non-Op' },
    { name: 'Taxes',            code: '7300', type: 'line', level: 1, monthly: taxes,  parent: 'Non-Op' },
    { name: 'Total Non-Operating', code: '7000', type: 'subTotal', level: 0, monthly: totalNonOp, parent: 'Non-Op' },

    { name: 'Net Income', type: 'keyTotal', level: 0, monthly: netIncome, parent: 'Net Income' },
  ];
  return rows;
}

// Pivot entities for Group by
const ENTITIES: Record<string, string[]> = {
  Channel:  ['US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'],
  Customer: ['Lids', 'Nordstrom', 'Buckle Inc.', 'Zumiez', 'Shopify DTC', 'Amazon Vendor Central', 'Industrias Mercury', 'Big Bear Supply Co'],
  SKU:      ['101-2450 Dean Vintage Trucker', '101-2510 Dusty Baker 5-Panel', '101-2470 Angler Mesh', '101-2615 Farmer Full Grain', '101-2452 Dean Washed'],
  Category: ['Flat Brims', 'Dad Hats', 'Classic Trucker', 'Cadet', 'Beanies', 'Visors'],
  Region:   ['West', 'East', 'South', 'Midwest', 'International'],
};

function pivotRows(mode: Exclude<typeof GROUP_BY_OPTIONS[number], 'None'>, totalRevenue: number[]): Row[] {
  const list = ENTITIES[mode] || [];
  const weights = list.map((_, i) => 1 / (i + 1.4));
  const totalW = weights.reduce((a, b) => a + b, 0);
  const entityRows: Row[] = list.map((name, i) => ({
    name,
    type: 'line',
    level: 1,
    monthly: totalRevenue.map((v) => Math.round(v * (weights[i] / totalW))),
    parent: mode,
  }));
  return [
    { name: mode, type: 'section', level: 0, monthly: [], parent: mode },
    ...entityRows,
    { name: `Total by ${mode}`, type: 'keyTotal', level: 0, monthly: totalRevenue.slice(), parent: mode },
  ];
}

// ─── Formatters ────────────────────────────────────────────────────────
const fmtDollar = (n: number): string => {
  const abs = Math.abs(n);
  const body = `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n < 0 ? `-${body}` : body;
};
const fmtDollarShort = (n: number): string => {
  const a = Math.abs(n);
  if (a === 0) return '$0';
  const body = a >= 1_000_000 ? `$${(a / 1_000_000).toFixed(2)}M` : a >= 1_000 ? `$${Math.round(a / 1_000)}K` : `$${Math.round(a)}`;
  return n < 0 ? `-${body}` : body;
};
const fmtDeltaPct = (cur: number, prev: number): string => {
  if (prev === 0) return '—';
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const sign = pct >= 0 ? '↑' : '↓';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
};

// Chart trend removed per product update — statement is the only data table.

function InlineDelta({ v }: { v: number }) {
  const positive = v >= 0;
  const Arrow = positive ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-medium" style={{ ...TABULAR, color: positive ? GREEN : CORAL_DK, background: positive ? GREEN_BG : CORAL_BG, padding: '3px 8px' }}>
      <Arrow size={10} strokeWidth={2.6} />{Math.abs(v).toFixed(1)}%
    </span>
  );
}

function ToolbarSelect({ label, value, onChange, options, testId }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; testId: string }) {
  return (
    <label className="pnl-export-btn inline-flex items-center" style={{ padding: '0 10px 0 12px', gap: 6, position: 'relative', cursor: 'pointer' }}>
      <span style={{ color: '#9A9A9E', fontWeight: 500 }}>{label}:</span>
      <span>{value}</span>
      <ChevronDown size={12} style={{ color: '#9A9A9E' }} />
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', border: 'none' }} data-testid={testId}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function ToastAutoClose({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return null;
}

function GroupByPopover({ value, onChange }: { value: typeof GROUP_BY_OPTIONS[number]; onChange: (v: typeof GROUP_BY_OPTIONS[number]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" style={{ flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pnl-export-btn inline-flex items-center"
        style={{ padding: '0 10px 0 12px', gap: 6 }}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="pnl-groupby-trigger"
      >
        <span style={{ color: '#9A9A9E', fontWeight: 500 }}>Group by:</span>
        <span>{value}</span>
        <ChevronDown size={12} style={{ color: '#9A9A9E' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, minWidth: 180, background: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(15,23,42,0.14), 0 0 0 1px rgba(15,23,42,0.06)', padding: 4 }} role="menu" data-testid="pnl-groupby-menu">
            {GROUP_BY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center justify-between transition-colors duration-150"
                style={{ height: 32, padding: '0 10px', background: 'transparent', color: opt === value ? INK : SLATE_700, fontSize: 13, fontWeight: opt === value ? 600 : 500, borderRadius: 6, textAlign: 'left', cursor: 'pointer', border: 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                role="menuitem"
                data-testid={`pnl-groupby-option-${opt.toLowerCase()}`}
              >
                {opt}
                {opt === value && <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function PnlPage() {
  const [seg, setSeg] = useState<string>('All');
  const [range, setRange] = usePageRange('pnl');
  const [comparison, setComparison] = useState<typeof COMPARISONS[number]>('None');
  const [view, setView] = useState<View>('Detailed');
  const [groupBy, setGroupBy] = useState<typeof GROUP_BY_OPTIONS[number]>('None');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleMonths, setVisibleMonths] = useState<Record<string, boolean>>(() => Object.fromEntries(PERIODS.map((p) => [p, true])));
  const [showYtd, setShowYtd] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const channelKey = (seg === 'All' ? 'All channels' : (seg as typeof CHANNELS[number]));
  const scale = CH_SCALE[channelKey];
  const statement = useMemo(() => buildStatement(scale), [scale]);
  const totalRevenueByMonth = useMemo(() => statement.find((r) => r.name === 'Total Revenue')!.monthly, [statement]);

  const activeRows = useMemo<Row[]>(() => {
    if (groupBy === 'None') return statement;
    return pivotRows(groupBy, totalRevenueByMonth);
  }, [statement, groupBy, totalRevenueByMonth]);

  // Auto-expand on Detailed; Summary default-collapses sub-groups + sections
  useEffect(() => { if (view === 'Detailed') setCollapsed({}); }, [view]);

  const periods = useMemo(() => PERIODS.filter((p) => visibleMonths[p]), [visibleMonths]);
  const currentPeriod = '2026-10'; // Oct snapshot
  const comparisonActive = comparison !== 'None';
  const PY_FACTOR = 0.88;

  // Determine row visibility per view mode
  const visibleRows = useMemo(() => {
    const rows = activeRows;
    if (view === 'Summary') {
      // Only key totals + section subtotals
      return rows.filter((r) => r.type === 'keyTotal' || r.type === 'subTotal');
    }
    if (view === 'Expanded') {
      // Hide line items under sub-groups; show subGroup rows + section + subTotal + keyTotal + direct lines under section (level 1)
      const out: Row[] = [];
      let skipLines = false;
      for (const r of rows) {
        if (r.type === 'subGroup') { out.push(r); skipLines = true; continue; }
        if (r.type === 'subGroupTotal') { out.push(r); skipLines = false; continue; }
        if (skipLines && r.type === 'line') continue;
        out.push(r);
      }
      return out;
    }
    // Detailed — all rows, honor collapsed state
    const out: Row[] = [];
    let skipParent: string | null = null;
    for (const r of rows) {
      // Skip rows whose parent/section is collapsed
      if (skipParent !== null) {
        if (r.type === 'subTotal' && r.parent === skipParent) { out.push(r); skipParent = null; continue; }
        if (r.type === 'keyTotal') { skipParent = null; out.push(r); continue; }
        if (r.parent === skipParent || r.type === 'subGroup' || r.type === 'subGroupTotal' || r.type === 'line') continue;
      }
      out.push(r);
      if (r.type === 'section' && collapsed[r.name]) skipParent = r.parent ?? r.name;
    }
    return out;
  }, [activeRows, view, collapsed]);

  // Line item count for footer
  const lineItemCount = useMemo(() => visibleRows.filter((r) => r.type === 'line').length, [visibleRows]);

  // KPI header totals
  const netRevenue = useMemo(() => statement.find((r) => r.name === 'Total Revenue')!.monthly.reduce((s, v) => s + v, 0), [statement]);
  const opInc = useMemo(() => statement.find((r) => r.name === 'Operating Income')!.monthly.reduce((s, v) => s + v, 0), [statement]);
  const netInc = useMemo(() => statement.find((r) => r.name === 'Net Income')!.monthly.reduce((s, v) => s + v, 0), [statement]);
  const opMarginPct = netRevenue ? (opInc / netRevenue) * 100 : 0;
  const netMarginPct = netRevenue ? (netInc / netRevenue) * 100 : 0;

  const ytdValue = (r: Row): number => periods.reduce((s, p) => {
    const idx = PERIODS.indexOf(p);
    return s + (r.monthly[idx] ?? 0);
  }, 0);

  // Determine per-row rendering style based on type
  const rowStyleFor = (r: Row) => {
    switch (r.type) {
      case 'section':
        return { height: 44, color: SLATE_900, weight: 500, fontSize: 14, borderTop: `1px solid ${DIV_STRONG}`, borderBottom: `1px solid ${DIV_STRONG}`, bg: '#FFFFFF' };
      case 'subGroup':
        return { height: 40, color: SLATE_800, weight: 500, fontSize: 14, borderTop: 'none', borderBottom: `1px solid ${DIV_LITE}`, bg: '#FFFFFF' };
      case 'subGroupTotal':
        return { height: 40, color: SLATE_900, weight: 600, fontSize: 14, borderTop: `1px solid ${DIV_STRONG}`, borderBottom: 'none', bg: '#FFFFFF' };
      case 'subTotal':
        return { height: 40, color: SLATE_900, weight: 600, fontSize: 14, borderTop: `1px solid ${DIV_STRONG}`, borderBottom: 'none', bg: '#FFFFFF' };
      case 'keyTotal':
        return { height: 44, color: SLATE_900, weight: 700, fontSize: 14.5, borderTop: `2px solid ${INK}`, borderBottom: `1px solid ${INK}`, bg: '#FFFFFF' };
      case 'line':
      default:
        return { height: 36, color: SLATE_700, weight: 400, fontSize: 13.5, borderTop: 'none', borderBottom: `1px solid ${DIV_LITE}`, bg: '#FFFFFF' };
    }
  };

  const indentFor = (r: Row): number => {
    // Account column padding-left based on level and type
    const base = 20;
    if (r.type === 'section' || r.type === 'subTotal' || r.type === 'keyTotal') return base;      // level 0
    if (r.type === 'subGroup' || r.type === 'subGroupTotal') return base + 20;                   // level 1
    if (r.type === 'line' && r.level === 1) return base + 20;                                     // directly under section
    return base + 40;                                                                             // level 2 line
  };

  return (
    <div className="min-h-full" data-testid="pnl-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        <PageHeader
          title="Profit & Loss"
          testIdPrefix="pnl"
          channels={SEGS}
          activeChannel={seg}
          onChannelChange={(v: string) => setSeg(v)}
          dateControl={<DateRangePicker value={range} onChange={setRange} testId="pnl-range" />}
        />

        {/* KPI hero */}
        <section className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="pnl-hero">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr_1px_1fr]">
            {[
              { eyebrow: 'Net Revenue · YTD',       value: fmtDollarShort(netRevenue), delta: 7.4, caption: 'After returns & discounts' },
              { eyebrow: 'Operating Income · YTD',  value: fmtDollarShort(opInc),      delta: 6.1, caption: `${opMarginPct.toFixed(1)}% operating margin` },
              { eyebrow: 'Net Income · YTD',        value: fmtDollarShort(netInc),     delta: 5.3, caption: `${netMarginPct.toFixed(1)}% net margin` },
            ].map((k, i, arr) => (
              <>
                <div key={k.eyebrow} className="px-6 py-6 md:px-8 md:py-7" data-testid={`pnl-kpi-${i}`}>
                  <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: SLATE_500 }}>{k.eyebrow}</span>
                  <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                    <p className="font-semibold" style={{ ...TABULAR, fontSize: 'clamp(36px, 3.6vw, 48px)', lineHeight: 1, letterSpacing: '-0.02em', color: INK, margin: 0 }}>{k.value}</p>
                    <InlineDelta v={k.delta} />
                  </div>
                  <p className="mt-2 text-[12px] font-medium" style={{ color: SLATE_500, margin: 0 }}>{k.caption}</p>
                </div>
                {i < arr.length - 1 && <div key={`d-${i}`} className="hidden md:block" style={{ background: SLATE_100 }} aria-hidden="true" />}
              </>
            ))}
          </div>
        </section>

        {/* Toolbar */}
        <div className="pnl-toolbar" data-testid="pnl-toolbar">
          <div className="pnl-toolbar-inner">
            <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }} role="tablist" aria-label="View mode">
              {VIEWS.map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className="ph-tab" data-active={view === v} data-testid={`pnl-view-${v.toLowerCase()}`}>{v}</button>
              ))}
            </div>
            <span className="ph-vdivider" aria-hidden="true" />
            <ToolbarSelect label="Compare" value={comparison} onChange={(v) => setComparison(v as any)} options={COMPARISONS as unknown as readonly string[]} testId="pnl-compare" />
            <span className="ph-vdivider" aria-hidden="true" />
            <GroupByPopover value={groupBy} onChange={setGroupBy} />
            <div style={{ flex: 1, minWidth: 12 }} />
            <div className="hidden md:flex items-center pnl-icon-row" style={{ gap: 2, flexShrink: 0 }}>
              <button type="button" onClick={() => setCollapsed({})} className="pnl-icon-btn" aria-label="Expand all" data-testid="pnl-expand-all"><Plus size={14} strokeWidth={2} /></button>
              <button type="button" onClick={() => { const next: Record<string, boolean> = {}; activeRows.filter((r) => r.type === 'section').forEach((r) => { next[r.name] = true; }); setCollapsed(next); }} className="pnl-icon-btn" aria-label="Collapse all" data-testid="pnl-collapse-all"><Minus size={14} strokeWidth={2} /></button>
              <div className="relative">
                <button type="button" onClick={() => setColumnsOpen((o) => !o)} className="pnl-icon-btn" aria-label="Columns" data-testid="pnl-columns-btn"><Columns3 size={14} strokeWidth={1.9} /></button>
                {columnsOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setColumnsOpen(false)} />
                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, minWidth: 220, background: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(15,23,42,0.14), 0 0 0 1px rgba(15,23,42,0.06)', padding: 10, maxHeight: 420, overflowY: 'auto' }} data-testid="pnl-columns-popover">
                      <p style={{ margin: '0 0 6px', fontSize: 10.5, fontWeight: 700, color: '#9A9A9E', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 4px' }}>Summary columns</p>
                      <label className="flex items-center gap-2" style={{ padding: '6px 4px', fontSize: 13, color: INK, cursor: 'pointer', borderRadius: 6 }}>
                        <input type="checkbox" checked={showYtd} onChange={(e) => setShowYtd(e.target.checked)} style={{ accentColor: CORAL }} data-testid="pnl-toggle-ytd" />
                        YTD
                      </label>
                      <div style={{ height: 1, background: SLATE_100, margin: '8px 0' }} />
                      <p style={{ margin: '0 0 6px', fontSize: 10.5, fontWeight: 700, color: '#9A9A9E', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 4px' }}>Months</p>
                      {PERIODS.map((p) => (
                        <label key={p} className="flex items-center gap-2" style={{ padding: '6px 4px', fontSize: 13, color: INK, cursor: 'pointer', borderRadius: 6 }}>
                          <input type="checkbox" checked={visibleMonths[p] ?? true} onChange={(e) => setVisibleMonths({ ...visibleMonths, [p]: e.target.checked })} style={{ accentColor: CORAL }} data-testid={`pnl-toggle-${p}`} />
                          {p}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <span className="ph-vdivider hidden md:inline-block" aria-hidden="true" />
            <button type="button" onClick={() => setToast('CSV export queued')} className="pnl-export-btn inline-flex items-center gap-1.5" data-testid="pnl-export"><Download size={13} strokeWidth={1.9} />Export</button>
          </div>
        </div>

        {/* Statement card */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white" style={{ paddingTop: 24, boxShadow: CARD_SHADOW }} data-testid="pnl-statement-card">
          <div style={{ overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
            <table style={{ ...TABULAR, borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }} data-testid="pnl-statement-table">
              <colgroup>
                <col style={{ width: 320 }} />
                {view === 'Detailed' && groupBy === 'None' && <col style={{ width: 90 }} />}
                {periods.map((p) => <col key={p} style={{ width: 128 }} />)}
                {showYtd && <col style={{ width: 140 }} />}
                {comparisonActive && <col style={{ width: 120 }} />}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: 320, minWidth: 320, padding: '0 12px 0 20px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E6E73', height: 44, textAlign: 'left', verticalAlign: 'middle', position: 'sticky', left: 0, background: '#FFFFFF', zIndex: 3, borderBottom: `1px solid ${DIV_MED}`, borderRight: `1px solid ${DIV_MED}`, boxSizing: 'border-box' }}>Account</th>
                  {view === 'Detailed' && groupBy === 'None' && (
                    <th style={{ width: 90, minWidth: 90, padding: '0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E6E73', height: 44, textAlign: 'left', verticalAlign: 'middle', position: 'sticky', left: 320, background: '#FFFFFF', zIndex: 3, borderBottom: `1px solid ${DIV_MED}`, borderRight: `1px solid ${DIV_MED}`, boxSizing: 'border-box' }}>Code</th>
                  )}
                  {periods.map((p) => (
                    <th key={p} style={{ width: 128, minWidth: 128, padding: '0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E6E73', height: 44, textAlign: 'right', verticalAlign: 'middle', background: '#FFFFFF', borderBottom: `1px solid ${DIV_MED}`, borderRight: `1px solid ${DIV_LITE}`, boxSizing: 'border-box' }}>{p}</th>
                  ))}
                  {showYtd && (
                    <th style={{ width: 140, minWidth: 140, padding: '0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK, height: 44, textAlign: 'right', verticalAlign: 'middle', background: '#FAFAFA', borderBottom: `1px solid ${DIV_MED}`, borderLeft: `1px solid ${DIV_MED}`, borderRight: comparisonActive ? `1px solid ${DIV_LITE}` : 'none', position: 'sticky', right: comparisonActive ? 120 : 0, zIndex: 3, boxSizing: 'border-box' }} data-testid="pnl-th-ytd">YTD</th>
                  )}
                  {comparisonActive && (
                    <th style={{ width: 120, minWidth: 120, padding: '0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK, height: 44, textAlign: 'right', verticalAlign: 'middle', background: '#FAFAFA', borderBottom: `1px solid ${DIV_MED}`, position: 'sticky', right: 0, zIndex: 3, boxSizing: 'border-box' }} data-testid="pnl-th-delta">Δ vs {comparison === 'Prior Year' ? 'PY' : comparison === 'Prior Period' ? 'PP' : 'Budget'}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r, ri) => {
                  const s = rowStyleFor(r);
                  const isSection = r.type === 'section';
                  const isCollapsible = isSection;
                  const chevron = isCollapsible ? (
                    <ChevronDown size={13} strokeWidth={2} style={{ color: '#94A3B8', transition: 'transform 120ms ease', transform: collapsed[r.name] ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                  ) : null;

                  const codeText = r.code || '';
                  const stickyBg = s.bg;
                  const stickyYtdBg = isSection ? s.bg : '#FAFAFA';

                  return (
                    <tr key={`${r.name}-${ri}`}
                      style={{ height: s.height }}
                      data-testid={`pnl-row-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                      <td style={{ width: 320, minWidth: 320, height: s.height, padding: `0 12px 0 ${indentFor(r)}px`, fontSize: s.fontSize, fontWeight: s.weight, color: s.color, textAlign: 'left', verticalAlign: 'middle', position: 'sticky', left: 0, background: stickyBg, zIndex: 2, whiteSpace: 'nowrap', cursor: isCollapsible ? 'pointer' : 'default', borderTop: s.borderTop, borderBottom: s.borderBottom, borderRight: `1px solid ${DIV_MED}`, boxSizing: 'border-box' }}
                          onClick={() => { if (isCollapsible) setCollapsed((c) => ({ ...c, [r.name]: !c[r.name] })); }}>
                        <span className="inline-flex items-center gap-1.5" style={{ verticalAlign: 'middle' }}>
                          {chevron}
                          <span>{r.name}</span>
                        </span>
                      </td>
                      {view === 'Detailed' && groupBy === 'None' && (
                        <td style={{ width: 90, minWidth: 90, height: s.height, padding: '0 12px', fontSize: 12, color: SLATE_500, textAlign: 'left', verticalAlign: 'middle', position: 'sticky', left: 320, background: stickyBg, zIndex: 2, borderTop: s.borderTop, borderBottom: s.borderBottom, borderRight: `1px solid ${DIV_MED}`, boxSizing: 'border-box' }}>
                          {codeText}
                        </td>
                      )}
                      {periods.map((p) => {
                        const idx = PERIODS.indexOf(p);
                        const v = r.monthly[idx];
                        const hasValue = typeof v === 'number' && !isSection;
                        const isZero = hasValue && v === 0;
                        const isNeg = hasValue && v < 0;
                        const cellColor = !hasValue ? 'transparent' : isZero ? SLATE_300 : isNeg ? CORAL_DK : s.color;
                        return (
                          <td key={p} style={{ width: 128, minWidth: 128, height: s.height, padding: '0 14px', fontSize: s.fontSize, fontWeight: s.weight, color: cellColor, textAlign: 'right', verticalAlign: 'middle', borderTop: s.borderTop, borderBottom: s.borderBottom, borderRight: `1px solid ${DIV_LITE}`, boxSizing: 'border-box' }}>
                            {hasValue ? fmtDollar(v) : ''}
                          </td>
                        );
                      })}
                      {showYtd && (() => {
                        if (isSection) return <td style={{ width: 140, minWidth: 140, height: s.height, padding: '0 14px', background: stickyYtdBg, position: 'sticky', right: comparisonActive ? 120 : 0, zIndex: 2, borderTop: s.borderTop, borderBottom: s.borderBottom, borderLeft: `1px solid ${DIV_MED}`, borderRight: comparisonActive ? `1px solid ${DIV_LITE}` : 'none', boxSizing: 'border-box' }} />;
                        const y = ytdValue(r);
                        const isZero = y === 0;
                        const isNeg = y < 0;
                        const cellColor = isZero ? SLATE_300 : isNeg ? CORAL_DK : s.color;
                        return (
                          <td style={{ width: 140, minWidth: 140, height: s.height, padding: '0 14px', fontSize: s.fontSize, fontWeight: r.type === 'keyTotal' ? 700 : 600, color: cellColor, textAlign: 'right', verticalAlign: 'middle', background: stickyYtdBg, position: 'sticky', right: comparisonActive ? 120 : 0, zIndex: 2, borderTop: s.borderTop, borderBottom: s.borderBottom, borderLeft: `1px solid ${DIV_MED}`, borderRight: comparisonActive ? `1px solid ${DIV_LITE}` : 'none', boxSizing: 'border-box' }} data-testid={`pnl-ytd-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                            {fmtDollar(y)}
                          </td>
                        );
                      })()}
                      {comparisonActive && (() => {
                        if (isSection) return <td style={{ width: 120, minWidth: 120, height: s.height, padding: '0 14px', background: stickyYtdBg, position: 'sticky', right: 0, zIndex: 2, borderTop: s.borderTop, borderBottom: s.borderBottom, boxSizing: 'border-box' }} />;
                        const cur = ytdValue(r);
                        const prev = cur * PY_FACTOR;
                        const positive = cur >= prev;
                        return (
                          <td style={{ width: 120, minWidth: 120, height: s.height, padding: '0 14px', fontSize: 12, fontWeight: 600, color: positive ? GREEN : CORAL_DK, textAlign: 'right', verticalAlign: 'middle', background: stickyYtdBg, position: 'sticky', right: 0, zIndex: 2, borderTop: s.borderTop, borderBottom: s.borderBottom, boxSizing: 'border-box' }}>
                            <span className="inline-flex items-center gap-0.5" style={{ verticalAlign: 'middle' }}>
                              {positive ? <ArrowUp size={10} strokeWidth={2.6} /> : <ArrowDown size={10} strokeWidth={2.6} />}
                              {fmtDeltaPct(cur, prev)}
                            </span>
                          </td>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between" style={{ padding: '10px 20px', background: SLATE_50, borderTop: `1px solid ${DIV_MED}`, gap: 8 }} data-testid="pnl-statement-footer">
            <span style={{ fontSize: 12, color: '#6E6E73' }}>Last updated · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            <span style={{ fontSize: 12, color: '#6E6E73' }} data-testid="pnl-footer-count">Includes {lineItemCount} line items</span>
          </div>
        </div>

        {toast && (
          <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 100, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: INK, color: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: 12.5, fontWeight: 500 }} data-testid="pnl-toast">
            <CheckCircle2 size={13} strokeWidth={2.2} />{toast}
            <ToastAutoClose onDone={() => setToast(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
