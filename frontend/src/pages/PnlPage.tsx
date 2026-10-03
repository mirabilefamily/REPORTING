import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, Calendar, ChevronDown, HelpCircle, Minus, Plus } from 'lucide-react';
import { SegTabs } from '../DashboardPage';
import { usePageRange } from '../lib/pageRange';
import DateRangePicker from '../components/DateRangePicker';
import PageHeader from '../components/PageHeader';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;
const INK = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50 = '#F8FAFC';
const CORAL = '#FF6F61';
const CORAL_DK = '#C9422E';
const CORAL_BG = '#FFF1EF';
const GREEN = '#047857';
const GREEN_BG = '#ECFDF5';

const SEGS = ['All','US Wholesale','Distributors','Retail','Ecommerce','Amazon'] as const;
const DATE_RANGES = ['Custom','Last 30 days','MTD','QTD','YTD','Last Year','Rolling 12 months'] as const;
const SEGMENTATIONS = ['Monthly','Quarterly','Yearly','Weekly'] as const;
const ORDERS = ['Earliest First','Latest First'] as const;
const COMPARISONS = ['None','Prior Year','Prior Period','Budget'] as const;
const CHANNELS = ['All channels','US Wholesale','Distributors','Retail','Ecommerce','Amazon'] as const;
const VIEWS = ['Detailed','Expanded','Summary'] as const;
type View = typeof VIEWS[number];

// Monthly period labels (2026-01 through 2026-10)
const PERIODS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'];

// Channel scale (filters statement values)
const CH_SCALE: Record<typeof CHANNELS[number], number> = {
  'All channels': 1, 'US Wholesale': 0.37, 'Distributors': 0.30, 'Retail': 0.026, 'Ecommerce': 0.26, 'Amazon': 0.045,
};

// Row model
type Row = { code?: string; name: string; monthly: number[]; level: 0|1|2; total?: boolean; neg?: boolean; isGroup?: boolean; isGrand?: boolean; subrow?: boolean; isPct?: boolean };

// Build statement rows — each monthly value is in $
function buildStatement(scale: number): Row[] {
  const gRev  = (base: number[]) => base.map((v) => Math.round(v * scale * 4));
  const gCogs = (base: number[]) => base.map((v) => Math.round(v * scale * 3.3));
  const gOpex = (base: number[]) => base.map((v) => Math.round(v * scale * 1.5));
  const gTax  = (base: number[]) => base.map((v) => Math.round(v * scale * 3));
  const g     = (base: number[]) => base.map((v) => Math.round(v * scale));
  // Sales 4000 — sparse like reference
  const sales4000 = gRev([0, 0, 0, 68_000, 0, 0, 0, 0, 0, 0]);
  const sales4010 = gRev([786_000, 257_000, 272_000, 395_000, 465_000, 582_000, 940_000, 1_120_000, 980_000, 820_000]);
  const sales4020 = gRev([ 18_000,  22_000,  28_000,  26_000,  32_000,  38_000,  44_000,    48_000,  52_000,  44_000]);
  const totalSales = sales4000.map((_, i) => sales4000[i] + sales4010[i] + sales4020[i]);

  const shipping = gRev([ 8_000,  10_000,  12_000, 11_000, 14_000, 16_000, 18_000, 20_000, 22_000, 20_000]);
  const totalRevenue = totalSales.map((v, i) => v + shipping[i]);

  const discounts = gRev([ -42_000,  -38_000,  -48_000, -46_000, -52_000, -58_000, -72_000, -82_000, -78_000, -62_000]);
  const returns   = gRev([ -28_000,  -24_000,  -32_000, -30_000, -36_000, -42_000, -54_000, -62_000, -58_000, -46_000]);
  const totalContra = discounts.map((v, i) => v + returns[i]);

  const cogsBase    = gCogs([-32_000, -36_000, -42_000, -40_000, -48_000, -58_000, -72_000, -82_000, -78_000, -64_000]);
  const cogsProd    = gCogs([-120_000,-140_000,-180_000,-170_000,-210_000,-240_000,-290_000,-320_000,-310_000,-260_000]);
  const cogsFreight = gCogs([ -18_000, -20_000, -26_000, -24_000, -30_000, -34_000, -42_000, -48_000, -44_000, -38_000]);
  const cogsImport  = gCogs([ -12_000, -14_000, -18_000, -16_000, -22_000, -24_000, -30_000, -34_000, -32_000, -26_000]);
  const ppv         = gCogs([  -4_000,  -4_000,  -6_000,  -5_000,  -7_000,  -8_000, -10_000, -12_000, -11_000,  -8_000]);
  const mpf         = gCogs([  -8_000,  -9_000, -11_000, -10_000, -13_000, -15_000, -18_000, -21_000, -20_000, -16_000]);
  const adyen       = gCogs([  -2_000,  -2_000,  -3_000,  -2_500,  -3_200,  -3_800,  -4_600,  -5_200,  -5_000,  -4_000]);
  const afterpay    = gCogs([  -1_200,  -1_400,  -1_800,  -1_600,  -2_200,  -2_600,  -3_200,  -3_800,  -3_600,  -2_800]);
  const amex        = gCogs([  -3_000,  -3_200,  -4_200,  -3_800,  -5_000,  -5_800,  -7_200,  -8_200,  -7_800,  -6_200]);
  const stripe      = gCogs([  -1_800,  -2_000,  -2_600,  -2_400,  -3_200,  -3_800,  -4_600,  -5_200,  -5_000,  -4_000]);
  const shopPay     = gCogs([  -2_400,  -2_800,  -3_600,  -3_200,  -4_200,  -5_000,  -6_200,  -7_000,  -6_800,  -5_400]);
  const cogsAllItems = [cogsBase, cogsProd, cogsFreight, cogsImport, ppv, mpf, adyen, afterpay, amex, stripe, shopPay];
  const totalCogs = cogsBase.map((_, i) => cogsAllItems.reduce((s, arr) => s + arr[i], 0));

  const grossProfit = totalRevenue.map((v, i) => v + totalContra[i] + totalCogs[i]);

  const marketing = gOpex([-120_000,-130_000,-150_000,-140_000,-170_000,-190_000,-230_000,-260_000,-250_000,-200_000]);
  const ga        = gOpex([ -80_000, -82_000, -88_000, -86_000, -92_000, -98_000,-108_000,-120_000,-116_000, -98_000]);
  const operations= gOpex([ -60_000, -62_000, -68_000, -66_000, -72_000, -76_000, -88_000, -96_000, -94_000, -78_000]);
  const salaries  = gOpex([-180_000,-182_000,-188_000,-186_000,-192_000,-198_000,-210_000,-222_000,-218_000,-200_000]);
  const otherOpex = gOpex([ -22_000, -24_000, -28_000, -26_000, -32_000, -36_000, -42_000, -48_000, -44_000, -36_000]);
  const totalOpex = marketing.map((_, i) => marketing[i] + ga[i] + operations[i] + salaries[i] + otherOpex[i]);

  const operatingIncome = grossProfit.map((v, i) => v + totalOpex[i]);

  const intInc = g([ 8_000, 10_000, 12_000, 11_000, 14_000, 15_000, 16_000, 18_000, 18_000, 15_000]);
  const intExp = g([-12_000,-14_000,-18_000,-16_000,-22_000,-24_000,-28_000,-32_000,-30_000,-26_000]);
  const taxes  = gTax([-62_000,-68_000,-80_000,-72_000,-98_000,-112_000,-140_000,-158_000,-152_000,-124_000]);
  const netIncome = operatingIncome.map((v, i) => v + intInc[i] + intExp[i] + taxes[i]);

  // Operating margin % per period
  const opMargin = operatingIncome.map((v, i) => totalRevenue[i] === 0 ? 0 : (v / totalRevenue[i]) * 100);

  return [
    { name: 'Revenue', monthly: [], level: 0, isGroup: true },
    { name: 'Sales',   monthly: [], level: 1, isGroup: true },
    { code: '4000', name: 'Sales',               monthly: sales4000, level: 2 },
    { code: '4010', name: 'Sales',               monthly: sales4010, level: 2 },
    { code: '4020', name: 'Income - SHI Revenue',monthly: sales4020, level: 2 },
    { name: 'Total Sales',                       monthly: totalSales, level: 1, total: true },
    { code: '4021', name: 'Shipping Revenue',    monthly: shipping,  level: 2 },
    { name: 'Total Revenue',                     monthly: totalRevenue, level: 0, total: true },

    { name: 'Contra Revenue', monthly: [], level: 0, isGroup: true },
    { code: '4105', name: 'Discounts',           monthly: discounts, level: 2, neg: true },
    { code: '4106', name: 'Returns / Refunds',   monthly: returns,   level: 2, neg: true },
    { name: 'Total Contra Revenue',              monthly: totalContra, level: 0, total: true, neg: true },

    { name: 'Cost of Goods Sold', monthly: [], level: 0, isGroup: true },
    { code: '5000', name: 'Cost of Goods Sold',  monthly: [], level: 1, isGroup: true },
    { code: '5001', name: 'Cost of Goods Sold',  monthly: cogsBase,    level: 2, neg: true },
    { code: '5002', name: 'COGS - Production',   monthly: cogsProd,    level: 2, neg: true },
    { code: '5003', name: 'COGS - Freight',      monthly: cogsFreight, level: 2, neg: true },
    { code: '5010', name: 'COGS - Import & Duties', monthly: cogsImport, level: 2, neg: true },
    { code: '5011', name: 'Purchase Price Variance', monthly: ppv,     level: 2, neg: true },
    { code: '5012', name: 'Merchant Processing Fees', monthly: mpf,    level: 2, neg: true },
    { code: '5013', name: 'Adyen Fees',          monthly: adyen,       level: 2, neg: true },
    { code: '5014', name: 'AfterPay Fees',       monthly: afterpay,    level: 2, neg: true },
    { code: '5016', name: 'American Express Fees', monthly: amex,      level: 2, neg: true },
    { code: '5017', name: 'Stripe Fees',         monthly: stripe,      level: 2, neg: true },
    { code: '5032', name: 'Shopify Payments Fees', monthly: shopPay,   level: 2, neg: true },
    { name: 'Total COGS',                        monthly: totalCogs,   level: 0, total: true, neg: true },

    { name: 'Gross Profit',                      monthly: grossProfit, level: 0, total: true, isGrand: true },

    { name: 'Operating Expenses', monthly: [], level: 0, isGroup: true },
    { name: 'Marketing',           monthly: marketing,  level: 2, neg: true },
    { name: 'G&A',                 monthly: ga,         level: 2, neg: true },
    { name: 'Operations',          monthly: operations, level: 2, neg: true },
    { name: 'Salaries & Benefits', monthly: salaries,   level: 2, neg: true },
    { name: 'Other',               monthly: otherOpex,  level: 2, neg: true },
    { name: 'Total OpEx',          monthly: totalOpex,  level: 0, total: true, neg: true },

    { name: 'Operating Income',    monthly: operatingIncome, level: 0, total: true, isGrand: true },
    { name: 'Operating Margin %',  monthly: opMargin, level: 1, subrow: true, isPct: true },

    { name: 'Other', monthly: [], level: 0, isGroup: true },
    { name: 'Interest Income',  monthly: intInc, level: 2 },
    { name: 'Interest Expense', monthly: intExp, level: 2, neg: true },
    { name: 'Taxes',            monthly: taxes,  level: 2, neg: true },

    { name: 'Net Income',       monthly: netIncome, level: 0, total: true, isGrand: true },
  ];
}

const SUMMARY_LABELS = ['Total Revenue', 'Total Contra Revenue', 'Total COGS', 'Gross Profit', 'Total OpEx', 'Operating Income', 'Net Income'];

// Formatters
const fmtM = (n: number) => { const a = Math.abs(n); const s = n < 0 ? '-' : ''; if (a >= 1_000_000) return `${s}$${(a / 1_000_000).toFixed(2)}M`; if (a >= 1_000) return `${s}$${Math.round(a / 1_000)}K`; if (a === 0) return '—'; return `${s}$${Math.round(a)}`; };
const fmtCell = (n: number, isPct?: boolean) => isPct ? `${n.toFixed(1)}%` : fmtM(n);

// Monthly trend (for chart) — reuse earlier structure
const TREND_BASE = [
  { m:'Jan', rev: 1680, margin: 15.2 }, { m:'Feb', rev: 1740, margin: 16.1 },
  { m:'Mar', rev: 2080, margin: 17.4 }, { m:'Apr', rev: 1940, margin: 16.8 },
  { m:'May', rev: 1820, margin: 15.9 }, { m:'Jun', rev: 2240, margin: 18.6 },
  { m:'Jul', rev: 2410, margin: 19.2 }, { m:'Aug', rev: 2560, margin: 19.8 },
  { m:'Sep', rev: 2620, margin: 20.4 }, { m:'Oct', rev: 2380, margin: 18.1 },
  { m:'Nov', rev: 2210, margin: 17.6 }, { m:'Dec', rev: 2180, margin: 17.0 },
];

function InlineDelta({ v }: { v: number }) {
  const positive = v >= 0;
  const Arrow = positive ? ArrowUp : ArrowDown;
  return (<span className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-medium" style={{ ...TABULAR, color: positive ? GREEN : CORAL_DK, background: positive ? GREEN_BG : CORAL_BG, padding: '3px 8px' }}><Arrow size={10} strokeWidth={2.6} />{Math.abs(v).toFixed(1)}%</span>);
}

// ─── Filter rail primitives ────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: SLATE_500, display: 'block', marginBottom: 6 }}>{children}</label>;
}

function Dropdown({ value, onChange, options, testId }: { value: string; onChange: (v: string) => void; options: readonly string[]; testId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full inline-flex items-center justify-between transition-colors duration-150"
        style={{ height: 36, padding: '0 12px', background: '#FFFFFF', border: `1px solid ${SLATE_200}`, borderRadius: 8, color: SLATE_700, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = SLATE_300; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = SLATE_200; }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <ChevronDown size={14} strokeWidth={2} style={{ color: SLATE_500, marginLeft: 8 }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 70, background: '#FFFFFF', borderRadius: 8, boxShadow: '0 0 0 1px rgba(15,17,20,0.06), 0 10px 28px rgba(15,17,20,0.14)', padding: 4, maxHeight: 240, overflowY: 'auto' }}>
            {options.map((opt) => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center justify-between transition-colors duration-150"
                style={{ height: 30, padding: '0 10px', background: 'transparent', color: opt === value ? INK : SLATE_700, fontSize: 13, fontWeight: opt === value ? 600 : 500, borderRadius: 6, textAlign: 'left', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
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

function Toggle({ on, onToggle, testId }: { on: boolean; onToggle: () => void; testId: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} data-testid={testId}
      style={{ position: 'relative', width: 32, height: 18, borderRadius: 999, background: on ? CORAL : SLATE_200, cursor: 'pointer', transition: 'background .15s ease', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: 999, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', transition: 'left .15s ease' }} />
    </button>
  );
}

function Stepper({ value, setValue, min = 0, max = 5, testId }: { value: number; setValue: (n: number) => void; min?: number; max?: number; testId: string }) {
  return (
    <div className="inline-flex items-stretch" data-testid={testId} style={{ background: SLATE_100, borderRadius: 8, border: `1px solid ${SLATE_200}`, height: 36, overflow: 'hidden' }}>
      <button type="button" onClick={() => setValue(Math.max(min, value - 1))}
        className="transition-colors duration-150"
        style={{ display: 'grid', placeItems: 'center', width: 36, background: 'transparent', color: SLATE_700, cursor: value > min ? 'pointer' : 'not-allowed', opacity: value > min ? 1 : 0.4 }}
        onMouseEnter={(e) => { if (value > min) e.currentTarget.style.background = '#E2E8F0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}><Minus size={14} strokeWidth={2} /></button>
      <span style={{ ...TABULAR, flex: 1, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, color: INK, background: '#FFFFFF' }}>{value}</span>
      <button type="button" onClick={() => setValue(Math.min(max, value + 1))}
        className="transition-colors duration-150"
        style={{ display: 'grid', placeItems: 'center', width: 36, background: 'transparent', color: SLATE_700, cursor: value < max ? 'pointer' : 'not-allowed', opacity: value < max ? 1 : 0.4 }}
        onMouseEnter={(e) => { if (value < max) e.currentTarget.style.background = '#E2E8F0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}><Plus size={14} strokeWidth={2} /></button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function PnlPage() {
  const [seg, setSeg] = useState<string>('All');
  const [range, setRange] = usePageRange('pnl');
  // Filter rail state
  const [dateRange, setDateRange] = useState<typeof DATE_RANGES[number]>('Custom');
  const [startDate, setStartDate] = useState('01/01/2026');
  const [endDate, setEndDate] = useState('10/03/2026');
  const [segmentation, setSegmentation] = useState<typeof SEGMENTATIONS[number]>('Monthly');
  const [order, setOrder] = useState<typeof ORDERS[number]>('Earliest First');
  const [comparison, setComparison] = useState<typeof COMPARISONS[number]>('None');
  const [channel, setChannel] = useState<typeof CHANNELS[number]>('All channels');
  const [cls, setCls] = useState('');
  const [priorYears, setPriorYears] = useState(0);
  const [showPct, setShowPct] = useState(false);
  const [hideZeros, setHideZeros] = useState(false);
  const [view, setView] = useState<View>('Detailed');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const scale = CH_SCALE[channel];
  const statement = useMemo(() => buildStatement(scale), [scale]);
  const periods = useMemo(() => order === 'Latest First' ? [...PERIODS].reverse() : PERIODS, [order]);

  // Statement row filter per view + hideZeros + collapsed
  const visibleRows = useMemo(() => {
    let rows = statement;
    if (view === 'Summary') rows = rows.filter((r) => SUMMARY_LABELS.includes(r.name));
    // Collapsing: hide children of a collapsed group
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
    if (hideZeros) rows = rows.filter((r) => r.isGroup || r.isGrand || r.total || r.monthly.some((v) => v !== 0));
    return rows;
  }, [statement, view, hideZeros, collapsed]);

  // Totals for KPI hero (across all 10 months)
  const netRevenue = useMemo(() => statement.find((r) => r.name === 'Total Revenue')!.monthly.reduce((s, v) => s + v, 0), [statement]);
  const opInc = useMemo(() => statement.find((r) => r.name === 'Operating Income' && r.isGrand)!.monthly.reduce((s, v) => s + v, 0), [statement]);
  const netInc = useMemo(() => statement.find((r) => r.name === 'Net Income')!.monthly.reduce((s, v) => s + v, 0), [statement]);
  const opMargin = netRevenue ? (opInc / netRevenue) * 100 : 0;
  const netMargin = netRevenue ? (netInc / netRevenue) * 100 : 0;

  const trend = useMemo(() => TREND_BASE.map((t) => ({ ...t, rev: t.rev * scale })), [scale]);

  return (
    <div className="min-h-full" data-testid="pnl-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div style={{ padding: '24px' }}>
        {/* Editorial header */}
        <PageHeader
          eyebrow="Goorin Reporting · Financials"
          title="Profit & Loss"
          subtitle="Operating performance across revenue, cost of goods, and operating expenses."
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
              { eyebrow: 'Net Revenue · YTD', value: fmtM(netRevenue), delta: 7.4, caption: 'After returns & discounts' },
              { eyebrow: 'Operating Income · YTD', value: fmtM(opInc), delta: 6.1, caption: `${opMargin.toFixed(1)}% operating margin` },
              { eyebrow: 'Net Income · YTD', value: fmtM(netInc), delta: 5.3, caption: `${netMargin.toFixed(1)}% net margin` },
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

        {/* Filter rail + statement */}
        <div className="mt-4 flex flex-col lg:flex-row gap-4" data-testid="pnl-rail-statement">
          {/* Filter rail */}
          <aside
            className="rounded-2xl bg-white shrink-0 lg:sticky"
            style={{ width: 280, padding: 20, boxShadow: CARD_SHADOW, top: 24, alignSelf: 'flex-start' }}
            data-testid="pnl-filter-rail"
          >
            <div className="flex items-center justify-between">
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>Filters</h3>
              <a href="#" onClick={(e) => e.preventDefault()} className="transition-colors duration-150" style={{ fontSize: 12, fontWeight: 500, color: '#475569' }} onMouseEnter={(e) => { e.currentTarget.style.color = INK; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }} data-testid="pnl-saved-filters">
                Saved Filters ▾
              </a>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <Label>Date Range</Label>
                <Dropdown value={dateRange} onChange={(v) => setDateRange(v as any)} options={DATE_RANGES} testId="pnl-date-range" />
              </div>

              {dateRange === 'Custom' && (
                <>
                  <div>
                    <Label>Start Date</Label>
                    <div className="relative">
                      <input type="text" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="MM/DD/YYYY"
                        style={{ width: '100%', height: 36, padding: '0 36px 0 10px', background: '#FFFFFF', border: `1px solid ${SLATE_200}`, borderRadius: 8, color: INK, fontSize: 13, outline: 'none' }}
                        className="pnl-date-input" data-testid="pnl-start-date" />
                      <Calendar size={14} strokeWidth={1.9} style={{ position: 'absolute', top: 11, right: 10, color: SLATE_500, pointerEvents: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <div className="relative">
                      <input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="MM/DD/YYYY"
                        style={{ width: '100%', height: 36, padding: '0 36px 0 10px', background: '#FFFFFF', border: `1px solid ${SLATE_200}`, borderRadius: 8, color: INK, fontSize: 13, outline: 'none' }}
                        className="pnl-date-input" data-testid="pnl-end-date" />
                      <Calendar size={14} strokeWidth={1.9} style={{ position: 'absolute', top: 11, right: 10, color: SLATE_500, pointerEvents: 'none' }} />
                    </div>
                  </div>
                </>
              )}

              <div><Label>Segmentation</Label><Dropdown value={segmentation} onChange={(v) => setSegmentation(v as any)} options={SEGMENTATIONS} testId="pnl-segmentation" /></div>
              <div><Label>Order</Label><Dropdown value={order} onChange={(v) => setOrder(v as any)} options={ORDERS} testId="pnl-order" /></div>
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <label className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: SLATE_500 }}>Comparison Columns</label>
                  <HelpCircle size={12} strokeWidth={1.8} style={{ color: SLATE_400 }} />
                </div>
                <Dropdown value={comparison} onChange={(v) => setComparison(v as any)} options={COMPARISONS} testId="pnl-comparison" />
              </div>
              <div><Label>Channel</Label><Dropdown value={channel} onChange={(v) => setChannel(v as any)} options={CHANNELS} testId="pnl-channel" /></div>
              <div><Label>Company</Label><Dropdown value="[GOORIN] Goorin Bros. Inc." onChange={() => { /* read-only */ }} options={['[GOORIN] Goorin Bros. Inc.'] as unknown as readonly string[]} testId="pnl-company" /></div>
              <div>
                <Label>Class</Label>
                <input type="text" value={cls} onChange={(e) => setCls(e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 10px', background: '#FFFFFF', border: `1px solid ${SLATE_200}`, borderRadius: 8, color: INK, fontSize: 13, outline: 'none' }}
                  className="pnl-date-input" data-testid="pnl-class" />
              </div>
              <div><Label>Prior years to compare</Label><Stepper value={priorYears} setValue={setPriorYears} testId="pnl-prior-years" /></div>
              <div className="flex items-center justify-between" data-testid="pnl-show-pct-row">
                <span style={{ fontSize: 13, color: SLATE_700 }}>Show % of Net Revenue</span>
                <Toggle on={showPct} onToggle={() => setShowPct((v) => !v)} testId="pnl-show-pct" />
              </div>
              <div className="flex items-center justify-between" data-testid="pnl-hide-zero-row">
                <span style={{ fontSize: 13, color: SLATE_700 }}>Hide Zero Balances</span>
                <Toggle on={hideZeros} onToggle={() => setHideZeros((v) => !v)} testId="pnl-hide-zeros" />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button type="button" className="transition-colors duration-150" style={{ height: 40, width: '100%', background: INK, color: '#FFFFFF', fontSize: 14, fontWeight: 600, borderRadius: 10, cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_800; }} onMouseLeave={(e) => { e.currentTarget.style.background = INK; }} data-testid="pnl-run">Run</button>
              <button type="button" className="transition-colors duration-150" style={{ height: 40, width: '100%', background: SLATE_100, color: SLATE_700, border: `1px solid ${SLATE_200}`, fontSize: 14, fontWeight: 500, borderRadius: 10, cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_200; }} onMouseLeave={(e) => { e.currentTarget.style.background = SLATE_100; }} data-testid="pnl-save-filter">Save Filter</button>
            </div>
          </aside>

          {/* Statement area */}
          <div className="flex-1 min-w-0 rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="pnl-statement-card">
            {/* View tabs */}
            <div className="flex items-center" style={{ borderBottom: `1px solid ${SLATE_100}`, padding: '0 24px' }} role="tablist" data-testid="pnl-view-tabs">
              {VIEWS.map((v) => {
                const active = v === view;
                return (
                  <button key={v} type="button" role="tab" aria-selected={active} onClick={() => setView(v)}
                    className="transition-colors duration-150"
                    style={{ position: 'relative', height: 44, padding: '0 20px', background: 'transparent', color: active ? INK : SLATE_500, fontSize: 14, fontWeight: active ? 600 : 500, cursor: 'pointer', marginBottom: -1 }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = INK; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = SLATE_500; }}
                    data-testid={`pnl-view-${v.toLowerCase()}`}>
                    {v}
                    {active && <span aria-hidden="true" style={{ position: 'absolute', left: 12, right: 12, bottom: -1, height: 2, background: INK, borderRadius: 2 }} />}
                  </button>
                );
              })}
            </div>

            {/* Statement table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1100 }} data-testid="pnl-statement-table">
                <thead>
                  <tr style={{ boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                    <th style={{ padding: '0 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500, height: 44, position: 'sticky', left: 0, background: '#FFFFFF', zIndex: 2, minWidth: 240 }}>Account</th>
                    {view === 'Detailed' && (
                      <th style={{ padding: '0 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500, height: 44, minWidth: 72, position: 'sticky', left: 240, background: '#FFFFFF', zIndex: 2 }}>Code</th>
                    )}
                    {periods.map((p, pi) => (
                      <th key={p} style={{ padding: '0 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: pi === periods.length - 1 ? INK : SLATE_500, background: pi === periods.length - 1 ? SLATE_50 : 'transparent', height: 44, minWidth: 88 }}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r, ri) => {
                    const codeCol = view === 'Detailed';
                    const indent = r.level === 0 ? 0 : r.level === 1 ? 24 : 48;
                    const topDivider = r.isGrand ? `2px solid ${r.name === 'Net Income' ? INK : SLATE_200}` : r.total ? `1px solid ${SLATE_200}` : 'none';
                    const groupBg = r.isGroup ? SLATE_50 : 'transparent';
                    return (
                      <tr key={ri}
                        className="transition-colors duration-150"
                        style={{ height: 36, borderTop: topDivider, background: groupBg }}
                        onMouseEnter={(e) => { if (!r.isGroup) e.currentTarget.style.background = SLATE_50; }}
                        onMouseLeave={(e) => { if (!r.isGroup) e.currentTarget.style.background = 'transparent'; }}
                        data-testid={`pnl-row-${r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`}>
                        <td style={{ padding: `0 20px 0 ${20 + indent}px`, fontSize: r.isGrand ? 15 : r.total || r.isGroup ? 14 : 13, fontWeight: r.isGrand || r.total || r.isGroup ? 600 : (r.subrow ? 400 : 500), color: r.subrow ? SLATE_500 : INK, position: 'sticky', left: 0, background: r.isGroup ? SLATE_50 : '#FFFFFF', zIndex: 1, whiteSpace: 'nowrap', cursor: r.isGroup && r.level === 0 ? 'pointer' : 'default' }}
                          onClick={() => { if (r.isGroup && r.level === 0) setCollapsed((s) => ({ ...s, [r.name]: !s[r.name] })); }}>
                          {r.name}
                        </td>
                        {codeCol && (
                          <td style={{ padding: '0 12px', textAlign: 'right', fontSize: 12, color: SLATE_500, position: 'sticky', left: 240, background: r.isGroup ? SLATE_50 : '#FFFFFF', zIndex: 1 }}>{r.code || ''}</td>
                        )}
                        {periods.map((p, pi) => {
                          const idx = order === 'Latest First' ? PERIODS.length - 1 - pi : pi;
                          const v = r.monthly[idx];
                          const isLast = pi === periods.length - 1;
                          const hasValue = v !== undefined && v !== null;
                          const isNeg = hasValue && (r.neg ? v < 0 : v < 0);
                          return (
                            <td key={p} style={{ padding: '0 12px', textAlign: 'right', fontSize: r.isGrand ? 14 : 13, fontWeight: r.isGrand || r.total ? 600 : 500, color: isNeg ? CORAL_DK : (r.subrow ? SLATE_500 : INK), background: isLast ? SLATE_50 : 'transparent' }}>
                              {hasValue ? fmtCell(v, r.isPct) : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
