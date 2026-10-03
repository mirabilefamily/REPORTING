import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { SEG_COLORS, SegTabs, DeltaPill } from '../DashboardPage';
import DateRangePicker from '../components/DateRangePicker';
import { usePageRange } from '../lib/pageRange';

// ─── Tokens (mirror Dashboard) ─────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = {
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  WebkitFontSmoothing: 'antialiased',
} as const;

const fmtM = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
};
const usd0 = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

// ─── Filter options ───────────────────────────────────────────────────
const CHANNELS = ['All', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
const TREND_MODES = ['Daily', 'Weekly', 'Monthly'] as const;
const FUNNEL_MODES = ['Ecommerce', 'Amazon', 'Combined'] as const;
const REORDER_MODES = ['All Wholesale', 'US Wholesale', 'Distributors', 'Retail'] as const;

// ─── Mock data (hat brand) ────────────────────────────────────────────
type SegKey = typeof CHANNELS[number];
const SEG_SCALE: Record<SegKey, number> = {
  'All': 1, 'US Wholesale': 0.37, 'Distributors': 0.30, 'Ecommerce': 0.26, 'Amazon': 0.045, 'Retail': 0.026,
};

const HERO = {
  revenue: 17_510_000,
  revenueYoY: 11.4,
  grossMargin: 52.4,
  discountRate: 9.6,
  returnRate: 6.4,
  activeCustomers: 18_742,
  newPct: 56,
  returningPct: 44,
  repeatRate: 34.2,
  repeatSpark: [31, 32, 32, 33, 32, 33, 34, 33, 34, 34, 34, 34.2],
  ltvAov: '2.6x',
};

const TREND_MONTHLY = [
  { m: 'Jan', total: 1.35e6, margin: 51.2 },
  { m: 'Feb', total: 2.45e6, margin: 52.0 },
  { m: 'Mar', total: 1.55e6, margin: 51.6 },
  { m: 'Apr', total: 1.75e6, margin: 52.1 },
  { m: 'May', total: 1.90e6, margin: 52.9 },
  { m: 'Jun', total: 1.85e6, margin: 52.6 },
  { m: 'Jul', total: 2.45e6, margin: 53.4 },
  { m: 'Aug', total: 2.65e6, margin: 53.8 },
  { m: 'Sep', total: 1.55e6, margin: 52.5 },
  { m: 'Oct', total: 1.30e6, margin: 51.9 },
  { m: 'Nov', total: 2.30e6, margin: 52.8 },
  { m: 'Dec', total: 2.10e6, margin: 52.3 },
];

const SEGMENT_PERF = [
  { name: 'US Wholesale', rev: 6_480_000, share: 37.0, yoy:  5.8, pct: 85 },
  { name: 'Distributors', rev: 5_240_000, share: 29.9, yoy:  8.4, pct: 91 },
  { name: 'Ecommerce',    rev: 4_550_000, share: 26.0, yoy: 12.1, pct: 96 },
  { name: 'Amazon',       rev:   785_000, share:  4.5, yoy: -3.6, pct: 90 },
  { name: 'Retail',       rev:   462_000, share:  2.6, yoy: -8.9, pct: 65 },
];

const FUNNEL_DATA: Record<typeof FUNNEL_MODES[number], number[]> = {
  'Ecommerce': [486210, 58345, 36174, 27131],
  'Amazon':    [322140, 38657, 23967, 17975],
  'Combined':  [808350, 97002, 60141, 45106],
};
const FUNNEL_STAGES = ['Sessions', 'Add-to-cart', 'Checkout', 'Purchase'] as const;

const REORDER_BUCKETS = ['0-2w', '3-4w', '5-8w', '9-12w', '13-26w', '27-52w', '52w+'] as const;
const REORDER_BENCHMARK_IDX = 3;
const REORDER_DATA: Record<typeof REORDER_MODES[number], number[]> = {
  'All Wholesale': [48, 86, 132, 94, 61, 32, 18],
  'US Wholesale':  [32, 58,  78, 51, 33, 18,  9],
  'Distributors':  [14, 22,  41, 32, 20, 11,  7],
  'Retail':        [ 2,  6,  13, 11,  8,  3,  2],
};

const CHANNEL_MIX = [
  { name: 'US Wholesale', v: 6_480_000, share: 37.0, delta:  5.8 },
  { name: 'Distributors', v: 5_240_000, share: 29.9, delta:  8.4 },
  { name: 'Ecommerce',    v: 4_550_000, share: 26.0, delta: 12.1 },
  { name: 'Amazon',       v:   785_000, share:  4.5, delta: -3.6 },
  { name: 'Retail',       v:   462_000, share:  2.6, delta: -8.9 },
];

const TOP_ACCOUNTS = [
  { name: 'Lids',                       net: 2_720_000, yoy:  8.2 },
  { name: 'SASAtrend',                  net: 1_460_000, yoy: 12.4 },
  { name: 'Industrias Mercury, S.A.',   net: 1_030_000, yoy: -4.1 },
  { name: 'Nordstrom Accounts Payable', net:   726_000, yoy:  3.6 },
  { name: 'Buckle Inc., The',           net:   617_000, yoy: -2.3 },
];

const TOP_ITEMS = [
  { name: 'Dean Vintage Canvas Trucker',   sku: '101-2450-VOI01-O/S', variant: 'Void · One Size',   units: 25_132, rev: 1_412_000 },
  { name: 'Dusty Baker 5-Panel Cord',      sku: '101-2510-NAV02-O/S', variant: 'Navy · One Size',  units: 18_904, rev:   986_000 },
  { name: 'Farmer Full Grain Leather',     sku: '101-2615-TAN03-M/L', variant: 'Tan · M/L',        units: 14_210, rev:   862_000 },
  { name: 'Angler Mesh Snapback',          sku: '101-2470-OLV01-O/S', variant: 'Olive · One Size', units: 12_880, rev:   704_000 },
  { name: 'Dean Washed Canvas Trucker',    sku: '101-2452-SND01-O/S', variant: 'Sand · One Size',  units: 10_122, rev:   568_000 },
];

const SALES_REPS = [
  { name: 'Jovon Clements',  accounts: 34, net: 4_820_000, yoy:  12.6, pct: 92 },
  { name: 'Erwin Samson',    accounts: 28, net: 3_940_000, yoy:   6.3, pct: 81 },
  { name: 'Priya Rao',       accounts: 22, net: 2_710_000, yoy:  -4.1, pct: 68 },
  { name: 'Devon Park',      accounts: 19, net: 2_180_000, yoy:   9.2, pct: 86 },
  { name: 'James Whittaker', accounts: 16, net: 1_860_000, yoy: -11.4, pct: 61 },
];

// Adaptive KPI configs (3 variants)
type KpiMetric = { label: string; value: string; delta: number; spark: number[]; sparkColor?: string };
const KPIS_ALL: KpiMetric[] = [
  { label: 'Sessions · YTD',         value: '808,350', delta:  8.9, spark: [62, 65, 64, 68, 70, 72, 71, 74, 76, 77, 78, 80] },
  { label: 'AOV · YTD',              value: '$2,134',  delta:  3.1, spark: [2.0,2.0,2.05,2.08,2.1,2.11,2.1,2.12,2.13,2.13,2.13,2.13] },
  { label: 'Return Rate · YTD',      value: '6.4%',    delta: -0.5, spark: [7.1,7.0,6.9,6.8,6.9,6.7,6.6,6.5,6.5,6.4,6.4,6.4], sparkColor: '#FF6F61' },
  { label: 'Active Accounts · YTD',  value: '472',     delta:  3.8, spark: [455,458,459,462,464,466,468,469,470,471,472,472] },
];
const KPIS_DTC: KpiMetric[] = [
  { label: 'Sessions · YTD',           value: '486,210', delta:  8.9, spark: [40, 42, 44, 44, 46, 47, 47, 48, 48, 48.5, 48.6, 48.6] },
  { label: 'Conversion Rate · YTD',    value: '2.8%',    delta:  0.3, spark: [2.5,2.5,2.5,2.6,2.6,2.7,2.7,2.7,2.8,2.8,2.8,2.8] },
  { label: 'Repeat Rate · YTD',        value: '34.2%',   delta:  2.1, spark: [31,32,32,33,32,33,34,33,34,34,34,34.2] },
  { label: 'Cart Abandonment · YTD',   value: '71.4%',   delta: -1.1, spark: [73,72.8,72.5,72.2,72,71.8,71.6,71.5,71.5,71.4,71.4,71.4], sparkColor: '#FF6F61' },
];
const KPIS_WH: KpiMetric[] = [
  { label: 'Active Accounts · YTD',  value: '472',     delta:  3.8, spark: [455,458,459,462,464,466,468,469,470,471,472,472] },
  { label: 'Reorder Rate · YTD',     value: '58.4%',   delta:  2.1, spark: [55,56,56,57,57,57.5,57.8,58,58.1,58.3,58.4,58.4] },
  { label: 'Avg Order Size · YTD',   value: '$8,420',  delta:  5.2, spark: [7.9,7.95,8.0,8.05,8.1,8.2,8.25,8.3,8.35,8.4,8.42,8.42] },
  { label: 'Fill Rate · YTD',        value: '95.2%',   delta: -0.3, spark: [95.5,95.5,95.4,95.4,95.3,95.3,95.3,95.2,95.2,95.2,95.2,95.2] },
];
function getKpis(ch: SegKey): KpiMetric[] {
  if (ch === 'Ecommerce' || ch === 'Amazon') return KPIS_DTC;
  if (ch === 'US Wholesale' || ch === 'Distributors' || ch === 'Retail') return KPIS_WH;
  return KPIS_ALL;
}

// ─── Atoms ─────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>
      {children}
    </p>
  );
}

function InlineDelta({ v, showArrow = true }: { v: number; showArrow?: boolean }) {
  const up = v >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-medium"
      style={{
        ...TABULAR,
        color: up ? '#047857' : '#C9422E',
        background: up ? '#ECFDF5' : '#FFF1EF',
        padding: '3px 8px',
      }}
    >
      {showArrow && (up ? <ArrowUp size={10} strokeWidth={2.6} /> : <ArrowDown size={10} strokeWidth={2.6} />)}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function MiniSpark({ data, color = '#94A3B8' }: { data: number[]; color?: string }) {
  const w = 100, h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = (max - min) || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PaceTrack({ actual, expected }: { actual: number; expected: number }) {
  const diff = Math.round(actual - expected);
  const dotColor = Math.abs(diff) <= 1 ? '#475569' : diff < 0 ? '#FF6F61' : '#059669';
  const clamped = Math.min(Math.max(actual, 2), 98);
  return (
    <div className="flex justify-end" aria-label={Math.abs(diff) <= 1 ? 'On pace' : diff < 0 ? `${Math.abs(diff)} pts behind` : `${diff} pts ahead`}>
      <div className="relative" style={{ width: 50, height: 10 }}>
        <div style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 2, background: '#F1F5F9', borderRadius: 999 }} />
        <div style={{ position: 'absolute', top: 1, left: `${expected}%`, width: 1, height: 8, background: '#94A3B8', transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', top: 2, left: `${clamped}%`, width: 6, height: 6, borderRadius: 999, background: dotColor, transform: 'translateX(-50%)' }} />
      </div>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.find((p: any) => p.dataKey === 'total')?.value ?? 0;
  const margin = payload.find((p: any) => p.dataKey === 'margin')?.value;
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 12, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)', minWidth: 200, ...TABULAR }}>
      <p style={{ color: '#0F172A', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#0F172A', fontSize: 15, fontWeight: 600, margin: 0 }}>{fmtM(total)}</p>
      {margin !== undefined && (
        <p style={{ marginTop: 4, fontSize: 11, fontWeight: 500, color: '#64748B' }}>Gross margin · {margin.toFixed(1)}%</p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [channel, setChannel] = useState<SegKey>('All');
  const [range, setRange] = usePageRange('analytics');
  const [trendMode, setTrendMode] = useState<typeof TREND_MODES[number]>('Monthly');
  const [funnelMode, setFunnelMode] = useState<typeof FUNNEL_MODES[number]>('Ecommerce');
  const [reorderMode, setReorderMode] = useState<typeof REORDER_MODES[number]>('All Wholesale');
  const [kpiOpacity, setKpiOpacity] = useState(1);

  useEffect(() => {
    setKpiOpacity(0.4);
    const t = setTimeout(() => setKpiOpacity(1), 20);
    return () => clearTimeout(t);
  }, [channel]);

  const kpis = useMemo(() => getKpis(channel), [channel]);
  const funnelData = FUNNEL_DATA[funnelMode];
  const reorderData = REORDER_DATA[reorderMode].map((count, i) => ({ bucket: REORDER_BUCKETS[i], count, stale: i > REORDER_BENCHMARK_IDX }));
  const reorderBarColor = reorderMode === 'All Wholesale' ? '#0F172A' : SEG_COLORS[reorderMode];
  const scale = SEG_SCALE[channel];

  const cardShell = 'rounded-2xl bg-white p-6';
  const shellStyle = { boxShadow: CARD_SHADOW } as React.CSSProperties;

  return (
    <div className="p-1 space-y-4" data-testid="analytics-page" style={{ ...INTER, ...TABULAR }}>

      {/* 1) Combined header: Channel tabs + Date chip */}
      <section className="flex flex-wrap items-center justify-between gap-3" data-testid="analytics-header">
        <SegTabs tabs={CHANNELS as unknown as readonly string[]} value={channel} onChange={(v: any) => setChannel(v)} testId="a-channel-tabs" slugPrefix="a-ch" />
        <DateRangePicker value={range} onChange={setRange} testId="analytics-range" />
      </section>

      {/* 2) Hero: Northstar + Customer Health */}
      <section className="overflow-hidden rounded-2xl bg-white" style={shellStyle} data-testid="analytics-hero">
        <div className="grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,7fr)_1px_minmax(0,3fr)]">
          {/* LEFT: Revenue Northstar */}
          <div className="px-6 pb-6 pt-5" data-testid="analytics-northstar">
            <Eyebrow>Net Revenue · YTD</Eyebrow>
            <div className="mt-2.5 flex min-h-[64px] flex-wrap items-end gap-x-4 gap-y-2">
              <p className="font-semibold" style={{ ...TABULAR, fontSize: 'clamp(40px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#0F172A' }}>
                {fmtM(HERO.revenue * scale)}
              </p>
              <InlineDelta v={HERO.revenueYoY} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2"><span className="text-[12px]" style={{ color: '#64748B' }}>Gross Margin</span><span className="text-[13px] font-semibold" style={{ ...TABULAR, color: '#0F172A' }}>{HERO.grossMargin.toFixed(1)}%</span></div>
              <div className="flex items-center gap-2"><span className="text-[12px]" style={{ color: '#64748B' }}>Discount Rate</span><span className="text-[13px] font-semibold" style={{ ...TABULAR, color: '#0F172A' }}>{HERO.discountRate.toFixed(1)}%</span></div>
              <div className="flex items-center gap-2"><span className="text-[12px]" style={{ color: '#64748B' }}>Return Rate</span><span className="text-[13px] font-semibold" style={{ ...TABULAR, color: '#0F172A' }}>{HERO.returnRate.toFixed(1)}%</span></div>
            </div>
            <div className="mt-4 h-[140px]" style={TABULAR}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND_MONTHLY} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="northstarArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6F61" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#FF6F61" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="m" hide />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Area type="monotone" dataKey="total" stroke="#FF6F61" strokeWidth={1.5} fill="url(#northstarArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden min-[900px]:block" style={{ background: '#F1F5F9' }} />

          {/* RIGHT: Customer Health */}
          <div className="border-t border-[#F1F5F9] px-6 pb-6 pt-5 min-[900px]:border-t-0" data-testid="analytics-customer-health">
            <Eyebrow>Customer Health</Eyebrow>
            <p className="mt-2.5 font-semibold" style={{ ...TABULAR, fontSize: 28, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#0F172A' }}>
              {Math.round(HERO.activeCustomers * (scale === 1 ? 1 : scale * 1.6)).toLocaleString('en-US')}
            </p>
            <p className="mt-1 text-[11px] font-medium" style={{ color: '#64748B' }}>YTD distinct customers</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-medium" style={{ color: '#64748B' }}>
                <span>New {HERO.newPct}%</span>
                <span>Returning {HERO.returningPct}%</span>
              </div>
              <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full" style={{ background: '#F1F5F9' }}>
                <div style={{ width: `${HERO.newPct}%`, background: '#FF6F61' }} />
                <div style={{ width: `${HERO.returningPct}%`, background: '#0F172A' }} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: '#64748B' }}>Repeat Purchase Rate</span>
                <span className="text-[13px] font-semibold" style={{ ...TABULAR, color: '#0F172A' }}>{HERO.repeatRate.toFixed(1)}%</span>
              </div>
              <div className="mt-1.5" style={{ height: 24 }}><MiniSpark data={HERO.repeatSpark} /></div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[12px]" style={{ color: '#64748B' }}>LTV / AOV</span>
              <span className="text-[13px] font-semibold" style={{ ...TABULAR, color: '#0F172A' }}>{HERO.ltvAov}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3) Adaptive KPI row — 4 columns */}
      <section className="overflow-hidden rounded-2xl bg-white" style={shellStyle} data-testid="analytics-kpi-row">
        <div className="grid grid-cols-1 md:grid-cols-4" style={{ opacity: kpiOpacity, transition: 'opacity 180ms ease-out' }}>
          {kpis.map((k, i) => (
            <div
              key={k.label}
              className="px-5 py-5"
              style={{ borderLeft: i > 0 ? '1px solid #F1F5F9' : 'none' }}
              data-testid={`akpi-${k.label.split('·')[0].trim().toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Eyebrow>{k.label}</Eyebrow>
              <div className="mt-2.5 flex flex-wrap items-end justify-between gap-2">
                <p className="font-semibold" style={{ ...TABULAR, fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#0F172A' }}>
                  {k.value}
                </p>
                <InlineDelta v={k.delta} />
              </div>
              <div className="mt-3" style={{ height: 28 }}><MiniSpark data={k.spark} color={k.sparkColor || '#94A3B8'} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* 4) Revenue trend by month + Segment performance */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,4fr)]">
        {/* Revenue trend */}
        <div className={cardShell} style={shellStyle} data-testid="analytics-trend">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Revenue trend by month</h2>
            <SegTabs tabs={TREND_MODES as unknown as readonly string[]} value={trendMode} onChange={(v: any) => setTrendMode(v)} testId="a-trend-mode" slugPrefix="a-trend" />
          </div>
          <div className="mt-5 h-[280px]" style={TABULAR}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={TREND_MONTHLY} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} barCategoryGap="22%">
                <defs>
                  <linearGradient id="trendBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.92} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500, letterSpacing: '0.06em' }} tickFormatter={(m: string) => m.toUpperCase()} tickMargin={8} />
                <YAxis yAxisId="rev" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} tickFormatter={(v: number) => `$${v / 1_000_000}M`} width={44} />
                <YAxis yAxisId="margin" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} tickFormatter={(v: number) => `${v}%`} width={38} domain={[48, 56]} />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
                <Bar yAxisId="rev" dataKey="total" fill="url(#trendBar)" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={400} />
                <Line yAxisId="margin" type="monotone" dataKey="margin" stroke="#FF6F61" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Segment performance */}
        <div className={cardShell} style={shellStyle} data-testid="analytics-segment-perf">
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Segment performance</h2>
          <div className="mt-5">
            <div className="grid grid-cols-[minmax(0,1.4fr)_90px_72px_70px_60px] items-center gap-3 pb-3 text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>
              <span>Segment</span>
              <span className="text-right">Revenue</span>
              <span className="text-right">Share</span>
              <span className="text-right">YoY</span>
              <span className="text-right">Pace</span>
            </div>
            {[...SEGMENT_PERF].sort((a, b) => b.rev - a.rev).map((s, i) => (
              <div
                key={s.name}
                className="grid grid-cols-[minmax(0,1.4fr)_90px_72px_70px_60px] items-center gap-3 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded-lg px-3"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 44 }}
                data-testid={`aseg-${s.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SEG_COLORS[s.name] }} />
                  <span className="truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{s.name}</span>
                </div>
                <span className="text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(s.rev)}</span>
                <span className="text-right text-[13px] font-medium tabular-nums" style={{ color: '#64748B' }}>{s.share.toFixed(1)}%</span>
                <div className="flex justify-end"><InlineDelta v={s.yoy} /></div>
                <PaceTrack actual={s.pct} expected={75} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5) DTC Funnel + Wholesale Reorder Cadence */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <div className={cardShell} style={shellStyle} data-testid="analytics-funnel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>DTC Funnel</h2>
              <p className="mt-1.5 text-[12px] font-medium" style={{ color: '#64748B' }}>Sessions → ATC → Checkout → Purchase</p>
            </div>
            <SegTabs tabs={FUNNEL_MODES as unknown as readonly string[]} value={funnelMode} onChange={(v: any) => setFunnelMode(v)} testId="a-funnel-mode" slugPrefix="a-funnel" />
          </div>
          <div className="mt-5 flex flex-col gap-3" style={{ minHeight: 220 }}>
            {FUNNEL_STAGES.map((stage, i) => {
              const value = funnelData[i];
              const share = (value / funnelData[0]) * 100;
              const dropPct = i > 0 ? ((funnelData[i - 1] - value) / funnelData[i - 1]) * 100 : 0;
              return (
                <div key={stage}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>{stage}</span>
                    {i > 0 && (
                      <span className="inline-flex items-center rounded-full text-[11px] font-medium" style={{ ...TABULAR, background: '#FFF1EF', color: '#C9422E', padding: '2px 8px' }}>
                        −{dropPct.toFixed(1)}% drop-off
                      </span>
                    )}
                  </div>
                  <div className="relative h-11 rounded-md" style={{ width: `${Math.max(share, 12)}%`, background: 'linear-gradient(180deg, #10B981 0%, #34D399 100%)', transition: 'width 400ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-white" style={TABULAR}>{value.toLocaleString('en-US')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={cardShell} style={shellStyle} data-testid="analytics-reorder">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Wholesale Reorder Cadence</h2>
              <p className="mt-1.5 text-[12px] font-medium" style={{ color: '#64748B' }}>Weeks since last order</p>
            </div>
            <SegTabs tabs={REORDER_MODES as unknown as readonly string[]} value={reorderMode} onChange={(v: any) => setReorderMode(v)} testId="a-reorder-mode" slugPrefix="a-reorder" />
          </div>
          <div className="mt-5 h-[220px]" style={TABULAR}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reorderData} margin={{ top: 24, right: 12, left: 0, bottom: 8 }} barCategoryGap="22%">
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} width={32} />
                <Tooltip
                  cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                  content={({ active, payload }: any) => (!active || !payload?.length) ? null : (
                    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 10, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)', ...TABULAR }}>
                      <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{payload[0].payload.bucket}</p>
                      <p style={{ color: '#0F172A', fontSize: 13, fontWeight: 600, margin: '4px 0 0' }}>{payload[0].value} accounts</p>
                    </div>
                  )}
                />
                <ReferenceLine x="9-12w" stroke="#FF6F61" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Reorder benchmark', position: 'top', fill: '#C9422E', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={400}>
                  {reorderData.map((d, i) => <Cell key={i} fill={reorderBarColor} fillOpacity={d.stale ? 0.5 : 1} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 6) Channel Mix + Customer Insights */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <div className={cardShell} style={shellStyle} data-testid="analytics-channel-mix">
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Channel Mix</h2>
          <div className="mt-5">
            {CHANNEL_MIX.map((c, i) => (
              <div
                key={c.name}
                className="grid grid-cols-[140px_minmax(0,1fr)_56px_84px_72px] items-center gap-3 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded-lg px-3"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 44 }}
                data-testid={`amix-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SEG_COLORS[c.name] }} />
                  <span className="truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{c.name}</span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#F1F5F9' }}>
                  <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${c.share}%`, background: SEG_COLORS[c.name], transition: 'width 700ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
                </div>
                <span className="text-right text-[13px] font-medium tabular-nums" style={{ color: '#64748B' }}>{c.share.toFixed(1)}%</span>
                <span className="text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(c.v)}</span>
                <div className="flex justify-end"><InlineDelta v={c.delta} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className={cardShell} style={shellStyle} data-testid="analytics-customer-insights">
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Customer Insights</h2>
          <div className="mt-5 flex flex-col">
            {[
              { label: 'Top 10 customers',       sub: 'Share of total revenue',          value: '75.7%',   bar: 75.7 },
              { label: 'Credit rate',            sub: '$448K credits on $18.7M gross',   value: '2.4%',    bar: 24 },
              { label: 'New customer rate',      sub: '10,495 new this period',          value: '56.0%',   bar: 56 },
              { label: 'Repeat purchase rate',   sub: 'vs 32.1% prior · ↑2.1 pts',       value: '34.2%',   bar: 34.2 },
            ].map((row, i) => (
              <div key={row.label} className="flex flex-col py-3" style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 56 }}>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium" style={{ color: '#0F172A' }}>{row.label}</span>
                  <span className="text-[14px] font-semibold" style={{ ...TABULAR, color: '#0F172A' }}>{row.value}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-[11px]" style={{ color: '#64748B' }}>{row.sub}</span>
                  <div className="relative h-1 w-28 overflow-hidden rounded-full" style={{ background: '#F1F5F9' }}>
                    <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${row.bar}%`, background: '#0F172A' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7) Top accounts + Top items */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <div className={cardShell + ' flex flex-col h-full'} style={shellStyle} data-testid="analytics-top-accounts">
          <div className="flex items-start justify-between">
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Top accounts</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#64748B' }}>Net Sales · YTD</span>
          </div>
          <ol className="mt-5 flex flex-1 flex-col">
            {TOP_ACCOUNTS.map((a, i) => (
              <li
                key={a.name}
                className="group flex flex-1 items-center gap-3 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded-lg px-3 cursor-pointer"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 60 }}
                data-testid={`atop-acct-${i}`}
                role="button"
                tabIndex={0}
              >
                <span className="w-7 text-right text-[11px] font-medium tabular-nums" style={{ color: '#94A3B8' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{a.name}</span>
                <DeltaPill v={a.yoy} />
                <span className="w-[96px] text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(a.net)}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className={cardShell + ' flex flex-col h-full'} style={shellStyle} data-testid="analytics-top-items">
          <div className="flex items-start justify-between">
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Top items</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#64748B' }}>Revenue · YTD</span>
          </div>
          <ol className="mt-5 flex flex-1 flex-col">
            {TOP_ITEMS.map((it, i) => (
              <li
                key={it.sku}
                className="group flex flex-1 flex-col justify-center py-2 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded-lg px-3"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 60 }}
                data-testid={`atop-item-${i}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-right text-[11px] font-medium tabular-nums" style={{ color: '#94A3B8' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{it.name}</span>
                  <span className="text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(it.rev)}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 pl-10">
                  <span className="text-[11px]" style={{ color: '#64748B' }}>{it.variant}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium tabular-nums" style={{ color: '#94A3B8' }}>{it.sku}</span>
                  <span className="text-right text-[11px] font-medium tabular-nums" style={{ color: '#64748B' }}>{it.units.toLocaleString('en-US')} units</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 8) Sales Rep Leaderboard — full width */}
      <section className={cardShell} style={shellStyle} data-testid="analytics-reps">
        <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Sales Rep Leaderboard</h2>
        <div className="mt-5">
          <div className="grid grid-cols-[minmax(0,2fr)_100px_140px_90px_70px] items-center gap-3 pb-3 text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>
            <span>Rep</span>
            <span className="text-right">Accounts</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">YoY</span>
            <span className="text-right">Pace</span>
          </div>
          {SALES_REPS.map((r, i) => (
            <div
              key={r.name}
              className="grid grid-cols-[minmax(0,2fr)_100px_140px_90px_70px] items-center gap-3 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded-lg px-3 cursor-pointer"
              style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 44 }}
              data-testid={`arep-${i}`}
              role="button"
              tabIndex={0}
            >
              <span className="truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{r.name}</span>
              <span className="text-right text-[14px] font-medium" style={{ ...TABULAR, color: '#0F172A' }}>{r.accounts}</span>
              <span className="text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(r.net)}</span>
              <div className="flex justify-end"><DeltaPill v={r.yoy} /></div>
              <PaceTrack actual={r.pct} expected={75} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
