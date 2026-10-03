import { useEffect, useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Columns3, Download, Minus, Plus } from 'lucide-react';
import { usePageRange } from '../lib/pageRange';
import DateRangePicker from '../components/DateRangePicker';
import PageHeader from '../components/PageHeader';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;
const INK = '#0F172A';
const SLATE_900 = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50  = '#F8FAFC';
const DIV_KEY   = '#D4D4D8';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';
const CORAL_50  = '#FFF7F5';
const CORAL_WASH = '#FFFBFA';
const CORAL_BG  = '#FFF1EF';
const GREEN     = '#047857';
const GREEN_BG  = '#ECFDF5';

const SEGS = ['All', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
const COMPARISONS = ['None', 'Prior Year', 'Prior Period', 'Budget'] as const;
const CHANNELS = ['All channels', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
const VIEWS = ['Summary', 'Expanded', 'Detailed'] as const;
const GROUP_BY_OPTIONS = ['None', 'Channel', 'Customer', 'SKU', 'Category', 'Region'] as const;
type View = typeof VIEWS[number];

// Monthly period labels (Jan–Oct 2026, actuals through Oct 3 snapshot)
const PERIODS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMonth = (p: string) => { const [y, m] = p.split('-'); return `${MONTH_SHORT[Number(m) - 1]} '${y.slice(2)}`; };

// Channel scale (filters statement values)
const CH_SCALE: Record<typeof CHANNELS[number], number> = {
  'All channels': 1, 'US Wholesale': 0.37, 'Distributors': 0.30, 'Retail': 0.026, 'Ecommerce': 0.26, 'Amazon': 0.045,
};

// Row model
type Row = { code?: string; name: string; monthly: number[]; level: 0 | 1 | 2; total?: boolean; neg?: boolean; isGroup?: boolean; isGrand?: boolean; subrow?: boolean; isPct?: boolean };

// Build full statement
function buildStatement(scale: number): Row[] {
  const gRev  = (base: number[]) => base.map((v) => Math.round(v * scale * 4));
  const gCogs = (base: number[]) => base.map((v) => Math.round(v * scale * 3.3));
  const gOpex = (base: number[]) => base.map((v) => Math.round(v * scale * 1.5));
  const gTax  = (base: number[]) => base.map((v) => Math.round(v * scale * 3));
  const g     = (base: number[]) => base.map((v) => Math.round(v * scale));

  const sales4000 = gRev([0, 0, 0, 68_000, 0, 0, 0, 0, 0, 0]);
  const sales4010 = gRev([786_000, 257_000, 272_000, 395_000, 465_000, 582_000, 940_000, 1_120_000, 980_000, 820_000]);
  const sales4020 = gRev([18_000, 22_000, 28_000, 26_000, 32_000, 38_000, 44_000, 48_000, 52_000, 44_000]);
  const totalSales = sales4000.map((_, i) => sales4000[i] + sales4010[i] + sales4020[i]);

  const shipping = gRev([8_000, 10_000, 12_000, 11_000, 14_000, 16_000, 18_000, 20_000, 22_000, 20_000]);
  const totalRevenue = totalSales.map((v, i) => v + shipping[i]);

  const discounts = gRev([-42_000, -38_000, -48_000, -46_000, -52_000, -58_000, -72_000, -82_000, -78_000, -62_000]);
  const returns   = gRev([-28_000, -24_000, -32_000, -30_000, -36_000, -42_000, -54_000, -62_000, -58_000, -46_000]);
  const totalContra = discounts.map((v, i) => v + returns[i]);

  const cogsBase    = gCogs([-32_000, -36_000, -42_000, -40_000, -48_000, -58_000, -72_000, -82_000, -78_000, -64_000]);
  const cogsProd    = gCogs([-120_000, -140_000, -180_000, -170_000, -210_000, -240_000, -290_000, -320_000, -310_000, -260_000]);
  const cogsFreight = gCogs([-18_000, -20_000, -26_000, -24_000, -30_000, -34_000, -42_000, -48_000, -44_000, -38_000]);
  const cogsImport  = gCogs([-12_000, -14_000, -18_000, -16_000, -22_000, -24_000, -30_000, -34_000, -32_000, -26_000]);
  const ppv         = gCogs([-4_000, -4_000, -6_000, -5_000, -7_000, -8_000, -10_000, -12_000, -11_000, -8_000]);
  const mpf         = gCogs([-8_000, -9_000, -11_000, -10_000, -13_000, -15_000, -18_000, -21_000, -20_000, -16_000]);
  const totalCogs = cogsBase.map((_, i) => cogsBase[i] + cogsProd[i] + cogsFreight[i] + cogsImport[i] + ppv[i] + mpf[i]);

  const grossProfit = totalRevenue.map((v, i) => v + totalContra[i] + totalCogs[i]);
  const grossMarginPct = grossProfit.map((v, i) => totalRevenue[i] === 0 ? 0 : (v / totalRevenue[i]) * 100);

  const marketing = gOpex([-120_000, -130_000, -150_000, -140_000, -170_000, -190_000, -230_000, -260_000, -250_000, -200_000]);
  const ga        = gOpex([-80_000, -82_000, -88_000, -86_000, -92_000, -98_000, -108_000, -120_000, -116_000, -98_000]);
  const operations = gOpex([-60_000, -62_000, -68_000, -66_000, -72_000, -76_000, -88_000, -96_000, -94_000, -78_000]);
  const salaries  = gOpex([-180_000, -182_000, -188_000, -186_000, -192_000, -198_000, -210_000, -222_000, -218_000, -200_000]);
  const otherOpex = gOpex([-22_000, -24_000, -28_000, -26_000, -32_000, -36_000, -42_000, -48_000, -44_000, -36_000]);
  const totalOpex = marketing.map((_, i) => marketing[i] + ga[i] + operations[i] + salaries[i] + otherOpex[i]);

  const operatingIncome = grossProfit.map((v, i) => v + totalOpex[i]);
  const opMargin = operatingIncome.map((v, i) => totalRevenue[i] === 0 ? 0 : (v / totalRevenue[i]) * 100);

  const intInc = g([8_000, 10_000, 12_000, 11_000, 14_000, 15_000, 16_000, 18_000, 18_000, 15_000]);
  const intExp = g([-12_000, -14_000, -18_000, -16_000, -22_000, -24_000, -28_000, -32_000, -30_000, -26_000]);
  const taxes  = gTax([-62_000, -68_000, -80_000, -72_000, -98_000, -112_000, -140_000, -158_000, -152_000, -124_000]);
  const totalOther = intInc.map((_, i) => intInc[i] + intExp[i] + taxes[i]);
  const netIncome = operatingIncome.map((v, i) => v + totalOther[i]);
  const netMarginPct = netIncome.map((v, i) => totalRevenue[i] === 0 ? 0 : (v / totalRevenue[i]) * 100);

  return [
    { name: 'Revenue', monthly: [], level: 0, isGroup: true },
    { code: '4000', name: 'Sales — Direct',          monthly: sales4000, level: 2 },
    { code: '4010', name: 'Sales — Wholesale',       monthly: sales4010, level: 2 },
    { code: '4020', name: 'Income — SHI Revenue',    monthly: sales4020, level: 2 },
    { code: '4021', name: 'Shipping Revenue',        monthly: shipping,  level: 2 },
    { name: 'Total Revenue', monthly: totalRevenue, level: 0, total: true },

    { name: 'Contra Revenue', monthly: [], level: 0, isGroup: true },
    { code: '4105', name: 'Discounts',          monthly: discounts, level: 2, neg: true },
    { code: '4106', name: 'Returns / Refunds',  monthly: returns,   level: 2, neg: true },
    { name: 'Total Contra Revenue', monthly: totalContra, level: 0, total: true, neg: true },

    { name: 'Cost of Goods Sold', monthly: [], level: 0, isGroup: true },
    { code: '5001', name: 'Cost of Goods Sold',       monthly: cogsBase,    level: 2, neg: true },
    { code: '5002', name: 'COGS — Production',        monthly: cogsProd,    level: 2, neg: true },
    { code: '5003', name: 'COGS — Freight',           monthly: cogsFreight, level: 2, neg: true },
    { code: '5010', name: 'COGS — Import & Duties',   monthly: cogsImport,  level: 2, neg: true },
    { code: '5011', name: 'Purchase Price Variance',  monthly: ppv,         level: 2, neg: true },
    { code: '5012', name: 'Merchant Processing Fees', monthly: mpf,         level: 2, neg: true },
    { name: 'Total COGS', monthly: totalCogs, level: 0, total: true, neg: true },

    { name: 'Gross Profit',     monthly: grossProfit,   level: 0, total: true, isGrand: true },
    { name: 'Gross Margin %',   monthly: grossMarginPct, level: 1, subrow: true, isPct: true },

    { name: 'Operating Expenses', monthly: [], level: 0, isGroup: true },
    { name: 'Marketing',           monthly: marketing,  level: 2, neg: true },
    { name: 'G&A',                 monthly: ga,         level: 2, neg: true },
    { name: 'Operations',          monthly: operations, level: 2, neg: true },
    { name: 'Salaries & Benefits', monthly: salaries,   level: 2, neg: true },
    { name: 'Other OpEx',          monthly: otherOpex,  level: 2, neg: true },
    { name: 'Total OpEx', monthly: totalOpex, level: 0, total: true, neg: true },

    { name: 'Operating Income', monthly: operatingIncome, level: 0, total: true, isGrand: true },
    { name: 'Operating Margin %', monthly: opMargin, level: 1, subrow: true, isPct: true },

    { name: 'Non-Operating', monthly: [], level: 0, isGroup: true },
    { name: 'Interest Income',  monthly: intInc, level: 2 },
    { name: 'Interest Expense', monthly: intExp, level: 2, neg: true },
    { name: 'Taxes',            monthly: taxes,  level: 2, neg: true },
    { name: 'Total Non-Operating', monthly: totalOther, level: 0, total: true, neg: true },

    { name: 'Net Income',    monthly: netIncome, level: 0, total: true, isGrand: true },
    { name: 'Net Margin %',  monthly: netMarginPct, level: 1, subrow: true, isPct: true },
  ];
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
    level: 2,
    monthly: totalRevenue.map((v) => Math.round(v * (weights[i] / totalW))),
  }));
  const total = totalRevenue.slice();
  return [
    { name: mode, monthly: [], level: 0, isGroup: true },
    ...entityRows,
    { name: `Total by ${mode}`, monthly: total, level: 0, total: true, isGrand: true },
  ];
}

const SUMMARY_LABELS = ['Total Revenue', 'Total Contra Revenue', 'Total COGS', 'Gross Profit', 'Total OpEx', 'Operating Income', 'Net Income'];

// Formatters
const fmtM = (n: number) => {
  const a = Math.abs(n);
  if (a === 0) return '—';
  const body = a >= 1_000_000 ? `$${(a / 1_000_000).toFixed(2)}M` : a >= 1_000 ? `$${Math.round(a / 1_000)}K` : `$${Math.round(a)}`;
  return n < 0 ? `(${body})` : body;
};
const fmtCell = (n: number, isPct?: boolean) => isPct ? `${n.toFixed(1)}%` : fmtM(n);
const fmtDeltaPct = (cur: number, prev: number) => {
  if (prev === 0) return '—';
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const sign = pct >= 0 ? '↑' : '↓';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
};

// Monthly trend (for chart)
const TREND_BASE = [
  { m: 'Jan', rev: 1680, margin: 15.2 }, { m: 'Feb', rev: 1740, margin: 16.1 },
  { m: 'Mar', rev: 2080, margin: 17.4 }, { m: 'Apr', rev: 1940, margin: 16.8 },
  { m: 'May', rev: 1820, margin: 15.9 }, { m: 'Jun', rev: 2240, margin: 18.6 },
  { m: 'Jul', rev: 2410, margin: 19.2 }, { m: 'Aug', rev: 2560, margin: 19.8 },
  { m: 'Sep', rev: 2620, margin: 20.4 }, { m: 'Oct', rev: 2380, margin: 18.1 },
  { m: 'Nov', rev: 2210, margin: 17.6 }, { m: 'Dec', rev: 2180, margin: 17.0 },
];

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
    <label className="pnl-toolbar-select inline-flex items-center" style={{ height: 34, padding: '0 10px 0 12px', background: '#FFFFFF', border: '1px solid #E5E5E7', borderRadius: 10, color: '#0A0A0B', fontSize: 13, fontWeight: 500, cursor: 'pointer', gap: 6, position: 'relative', flexShrink: 0 }}>
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
        className="inline-flex items-center"
        style={{ height: 34, padding: '0 10px 0 12px', background: '#FFFFFF', border: '1px solid #E5E5E7', borderRadius: 10, color: '#0A0A0B', fontSize: 13, fontWeight: 500, cursor: 'pointer', gap: 6 }}
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
  const [view, setView] = useState<View>('Expanded');
  const [groupBy, setGroupBy] = useState<typeof GROUP_BY_OPTIONS[number]>('Customer');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleMonths, setVisibleMonths] = useState<Record<string, boolean>>(() => Object.fromEntries(PERIODS.map((p) => [p, true])));
  const [showYtd, setShowYtd] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Map seg → channel scale key
  const channelKey = (seg === 'All' ? 'All channels' : (seg as typeof CHANNELS[number]));
  const scale = CH_SCALE[channelKey];
  const statement = useMemo(() => buildStatement(scale), [scale]);
  const totalRevenueByMonth = useMemo(() => statement.find((r) => r.name === 'Total Revenue')!.monthly, [statement]);

  // Pivot rows when groupBy != None
  const activeRows = useMemo<Row[]>(() => {
    if (groupBy === 'None') return statement;
    return pivotRows(groupBy, totalRevenueByMonth);
  }, [statement, groupBy, totalRevenueByMonth]);

  // Auto-expand ALL groups when switching to Detailed mode
  useEffect(() => { if (view === 'Detailed') setCollapsed({}); }, [view]);

  // Visible periods respect month column toggles
  const periods = useMemo(() => PERIODS.filter((p) => visibleMonths[p]), [visibleMonths]);

  // Statement row filter per view + collapsed
  const visibleRows = useMemo(() => {
    let rows = activeRows;
    if (view === 'Summary') rows = rows.filter((r) => SUMMARY_LABELS.includes(r.name) || r.name.startsWith('Total by '));
    if (view !== 'Summary') {
      const out: Row[] = [];
      let skipUntilLevel: 0 | 1 | 2 | null = null;
      for (const r of rows) {
        if (skipUntilLevel !== null) {
          if (r.level <= skipUntilLevel) { skipUntilLevel = null; } else { continue; }
        }
        out.push(r);
        if (r.isGroup && collapsed[r.name]) skipUntilLevel = r.level;
      }
      rows = out;
    }
    return rows;
  }, [activeRows, view, collapsed]);

  // Count true line items in current render (excludes groups, subtotals, grand totals, margin % rows)
  const lineItemCount = useMemo(
    () => visibleRows.filter((r) => !r.isGroup && !r.total && !r.isGrand && !r.subrow).length,
    [visibleRows]
  );

  // KPI header totals (across all 10 months)
  const netRevenue = useMemo(() => statement.find((r) => r.name === 'Total Revenue')!.monthly.reduce((s, v) => s + v, 0), [statement]);
  const opInc = useMemo(() => statement.find((r) => r.name === 'Operating Income' && r.isGrand)!.monthly.reduce((s, v) => s + v, 0), [statement]);
  const netInc = useMemo(() => statement.find((r) => r.name === 'Net Income')!.monthly.reduce((s, v) => s + v, 0), [statement]);
  const opMarginPct = netRevenue ? (opInc / netRevenue) * 100 : 0;
  const netMarginPct = netRevenue ? (netInc / netRevenue) * 100 : 0;

  const trend = useMemo(() => TREND_BASE.map((t) => ({ ...t, rev: t.rev * scale })), [scale]);

  // Current month = last visible period
  const currentPeriod = periods[periods.length - 1];
  const comparisonActive = comparison !== 'None';

  // Compute YTD per row (sum for amounts; weighted avg for pct — approximate as avg of visible)
  const ytdValue = (r: Row): number => {
    const visIdx = periods.map((p) => PERIODS.indexOf(p));
    if (r.isPct) {
      const vals = visIdx.map((i) => r.monthly[i]).filter((v) => typeof v === 'number');
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    }
    return visIdx.reduce((s, i) => s + (r.monthly[i] ?? 0), 0);
  };

  // Prior-period / PY values (mock: 88% of current, excluding pct rows)
  const PY_FACTOR = 0.88;
  const pyValue = (r: Row, period: string): number => {
    const idx = PERIODS.indexOf(period);
    const cur = r.monthly[idx] ?? 0;
    return cur * PY_FACTOR;
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

        {/* Hero 3-col KPI */}
        <section className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="pnl-hero">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr_1px_1fr]">
            {[
              { eyebrow: 'Net Revenue · YTD',       value: fmtM(netRevenue), delta: 7.4, caption: 'After returns & discounts' },
              { eyebrow: 'Operating Income · YTD',  value: fmtM(opInc),      delta: 6.1, caption: `${opMarginPct.toFixed(1)}% operating margin` },
              { eyebrow: 'Net Income · YTD',        value: fmtM(netInc),     delta: 5.3, caption: `${netMarginPct.toFixed(1)}% net margin` },
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

        {/* Monthly trend */}
        <section className="mt-4 rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="pnl-trend">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Monthly operating income</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: SLATE_500 }}>12-month view · Net revenue bars with operating margin line</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium uppercase" style={{ letterSpacing: '0.08em', color: SLATE_500 }}>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: INK }} /> Net revenue</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: CORAL }} /> Op. margin</span>
            </div>
          </div>
          <div className="mt-5" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={SLATE_100} vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickMargin={8} />
                <YAxis yAxisId="rev" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickFormatter={(v) => fmtM(v * 1000)} width={56} />
                <YAxis yAxisId="margin" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickFormatter={(v) => `${v}%`} width={36} domain={[0, 25]} />
                <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar yAxisId="rev" dataKey="rev" fill={INK} radius={[3, 3, 0, 0]} />
                <Line yAxisId="margin" type="monotone" dataKey="margin" stroke={CORAL} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Sticky secondary toolbar ───────────────────────────────── */}
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
              <button type="button" onClick={() => { const next: Record<string, boolean> = {}; activeRows.filter((r) => r.isGroup && r.level === 0).forEach((r) => { next[r.name] = true; }); setCollapsed(next); }} className="pnl-icon-btn" aria-label="Collapse all" data-testid="pnl-collapse-all"><Minus size={14} strokeWidth={2} /></button>
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
                          {fmtMonth(p)}
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

        {/* ── Statement card ─────────────────────────────────────────── */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white" style={{ paddingTop: 24, boxShadow: CARD_SHADOW }} data-testid="pnl-statement-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-numeric-center" style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1100 }} data-testid="pnl-statement-table">
              <thead>
                <tr style={{ boxShadow: `inset 0 -1px 0 #EDEDEF` }}>
                  <th style={{ padding: '0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E6E73', height: 44, position: 'sticky', left: 0, background: '#FFFFFF', zIndex: 2, minWidth: 220 }}>
                    {groupBy === 'None' ? 'Line item' : groupBy}
                  </th>
                  {view === 'Detailed' && groupBy === 'None' && (
                    <th style={{ padding: '0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E6E73', height: 44, minWidth: 68 }}>Code</th>
                  )}
                  {periods.map((p) => {
                    const isCurrent = p === currentPeriod;
                    return (
                      <th key={p} style={{ padding: '0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isCurrent ? CORAL_DK : '#6E6E73', background: isCurrent ? CORAL_50 : 'transparent', height: 44, minWidth: 92, position: 'relative', borderBottom: isCurrent ? `2px solid ${CORAL}` : undefined }}>
                        {fmtMonth(p)}
                      </th>
                    );
                  })}
                  {showYtd && (
                    <th style={{ padding: '0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK, height: 44, minWidth: 110, background: '#FAFAFA', borderTop: `2px solid ${CORAL_50}` }} data-testid="pnl-th-ytd">YTD</th>
                  )}
                  {comparisonActive && (
                    <th style={{ padding: '0 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK, height: 44, minWidth: 110 }} data-testid="pnl-th-delta">Δ vs {comparison === 'Prior Year' ? 'PY' : comparison === 'Prior Period' ? 'PP' : 'Budget'}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r, ri) => {
                  const isGroupRow = !!(r.isGroup && r.level === 0);
                  const isSubtotal = !!(r.total && !r.isGrand);
                  const isKeyTotal = !!r.isGrand;
                  const isPctRow = !!(r.subrow && r.isPct);
                  const isLineItem = !isGroupRow && !isSubtotal && !isKeyTotal && !isPctRow;

                  // Tier spacing
                  let rowHeight = 36; // tier 4 default
                  if (isGroupRow)      rowHeight = 36;
                  else if (isSubtotal) rowHeight = 40;
                  else if (isKeyTotal) rowHeight = 44;
                  else if (isPctRow)   rowHeight = 32;

                  const topBorder = isKeyTotal ? `1px solid ${DIV_KEY}` : isSubtotal ? `1px solid #F3F3F5` : 'none';
                  const bottomBorder = isKeyTotal ? `1px solid ${DIV_KEY}` : 'none';

                  const rowBg = isGroupRow ? SLATE_50 : isPctRow ? '#FAFAFA' : 'transparent';
                  const stickyBg = isGroupRow ? SLATE_50 : isPctRow ? '#FAFAFA' : '#FFFFFF';

                  // Name typography per tier
                  const nameSize = isGroupRow ? 11 : isKeyTotal ? 14 : isSubtotal ? 13 : isPctRow ? 12 : 13;
                  const nameWeight = isKeyTotal ? 600 : isSubtotal ? 500 : isGroupRow ? 700 : isPctRow ? 400 : 400;
                  const nameColor = isGroupRow ? '#6E6E73' : isKeyTotal ? SLATE_900 : isSubtotal ? SLATE_800 : isPctRow ? SLATE_500 : SLATE_700;
                  const nameTransform = isGroupRow ? 'uppercase' : 'none';
                  const nameSpacing = isGroupRow ? '0.08em' : '-0.005em';
                  const nameStyle: React.CSSProperties = {
                    padding: '0 14px', fontSize: nameSize, fontWeight: nameWeight, textTransform: nameTransform as any,
                    letterSpacing: nameSpacing, color: nameColor,
                    position: 'sticky', left: 0, background: stickyBg, zIndex: 1, whiteSpace: 'nowrap',
                    cursor: isGroupRow ? 'pointer' : 'default', borderRight: `1px solid #F3F3F5`,
                  };

                  const rowStyle: React.CSSProperties = { height: rowHeight, borderTop: topBorder, borderBottom: bottomBorder, background: rowBg };

                  return (
                    <tr key={ri}
                      className="transition-colors duration-150"
                      style={rowStyle}
                      onMouseEnter={(e) => { if (isLineItem || isPctRow || isSubtotal) e.currentTarget.style.background = '#FAFAFA'; }}
                      onMouseLeave={(e) => { if (isLineItem || isPctRow || isSubtotal) e.currentTarget.style.background = rowBg; }}
                      data-testid={`pnl-row-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    >
                      <td style={nameStyle} onClick={() => { if (isGroupRow) setCollapsed((s) => ({ ...s, [r.name]: !s[r.name] })); }}>
                        <span className="inline-flex items-center justify-center gap-1.5">
                          {isGroupRow && (
                            <ChevronDown size={13} strokeWidth={2} style={{ color: '#9A9A9E', transition: 'transform 120ms ease', transform: collapsed[r.name] ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                          )}
                          {r.name}
                        </span>
                      </td>
                      {view === 'Detailed' && groupBy === 'None' && (
                        <td style={{ padding: '0 10px', fontSize: 12, color: '#9A9A9E', background: stickyBg }}>{r.code || ''}</td>
                      )}
                      {periods.map((p) => {
                        const idx = PERIODS.indexOf(p);
                        const v = r.monthly[idx];
                        const isCurrent = p === currentPeriod;
                        const hasValue = v !== undefined && v !== null && !isGroupRow;
                        const isNeg = hasValue && v < 0;
                        const cellColor = r.isPct ? INK : isNeg ? CORAL_DK : isKeyTotal ? SLATE_900 : isSubtotal ? SLATE_800 : isPctRow ? SLATE_500 : SLATE_700;
                        const cellBg = isCurrent ? CORAL_WASH : 'transparent';
                        const cellFontSize = isKeyTotal ? 14 : isSubtotal ? 13 : isPctRow ? 12 : 13;
                        const cellWeight = isKeyTotal ? 600 : isSubtotal ? 500 : 400;
                        return (
                          <td key={p} style={{ padding: '0 14px', fontSize: cellFontSize, fontWeight: cellWeight, color: cellColor, background: cellBg }}>
                            {hasValue
                              ? r.isPct
                                ? (<span style={{ display: 'inline-block', padding: '2px 6px', background: '#F3F3F5', color: '#334155', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{fmtCell(v, r.isPct)}</span>)
                                : fmtCell(v, r.isPct)
                              : ''}
                          </td>
                        );
                      })}
                      {showYtd && (() => {
                        const y = ytdValue(r);
                        const hasValue = !isGroupRow && r.monthly.length > 0;
                        const isNeg = hasValue && y < 0;
                        const cellColor = r.isPct ? INK : isNeg ? CORAL_DK : isKeyTotal ? SLATE_900 : isSubtotal ? SLATE_800 : isPctRow ? SLATE_500 : SLATE_700;
                        return (
                          <td style={{ padding: '0 14px', fontSize: isKeyTotal ? 14 : 13, fontWeight: isKeyTotal ? 700 : 600, color: cellColor, background: '#FAFAFA', borderLeft: `1px solid #F3F3F5` }} data-testid={`pnl-ytd-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                            {hasValue ? (r.isPct ? `${y.toFixed(1)}%` : fmtM(y)) : ''}
                          </td>
                        );
                      })()}
                      {comparisonActive && (() => {
                        if (isGroupRow || r.monthly.length === 0) return <td style={{ padding: '0 14px' }} />;
                        const cur = ytdValue(r);
                        const prev = r.isPct ? cur * PY_FACTOR : cur * PY_FACTOR;
                        const positive = cur >= prev;
                        return (
                          <td style={{ padding: '0 14px', fontSize: 12, fontWeight: 600, color: positive ? GREEN : CORAL_DK }}>
                            <span className="inline-flex items-center gap-0.5">
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
          <div className="flex flex-wrap items-center justify-between" style={{ padding: '10px 20px', background: SLATE_50, borderTop: `1px solid #EDEDEF`, gap: 8 }} data-testid="pnl-statement-footer">
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
