import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { SEG_COLORS, SegTabs } from '../DashboardPage';
import DateRangePicker from '../components/DateRangePicker';
import { usePageRange } from '../lib/pageRange';

// ─── Tokens (mirror Dashboard) ─────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = {
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  WebkitFontSmoothing: 'antialiased',
} as const;

const CORAL = '#FF6F61';
const CORAL_DK = '#C9422E';
const GREEN = '#047857';
const GREEN_BG = '#ECFDF5';
const CORAL_BG = '#FFF1EF';

const INK = '#0F172A';
const MUTED = '#64748B';
const FAINT = '#94A3B8';
const BORDER = '#F1F5F9';

// ─── Filter options ───────────────────────────────────────────────────
const CHANNELS = ['All', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
const FUNNEL_MODES = ['Ecommerce', 'Amazon', 'Combined'] as const;
const REORDER_MODES = ['All Wholesale', 'US Wholesale', 'Distributors', 'Retail'] as const;
const VELOCITY_MODES = ['Fast movers', 'Slow movers'] as const;
const RETURNS_MODES = ['By reason', 'By channel'] as const;

// ─── Mock data (hat brand) ────────────────────────────────────────────
type SegKey = typeof CHANNELS[number];
const SEG_SCALE: Record<SegKey, number> = {
  'All': 1, 'US Wholesale': 0.37, 'Distributors': 0.30, 'Ecommerce': 0.26, 'Amazon': 0.045, 'Retail': 0.026,
};

// Hero — Customer vs Operational Health
const HERO_CUSTOMER = {
  activeCustomers: 18_742,
  newPct: 56,
  returningPct: 44,
  repeatRate: 34.2,
  repeatYoY: 2.1,
  repeatSpark: [31, 32, 32, 33, 32, 33, 34, 33, 34, 34, 34, 34.2],
  ltvAov: '2.6x',
  ltvYoY: 0.3,
};

const HERO_OPS = {
  fillRate: 95.2,
  fillYoY: -0.3,
  fillSpark: [95.5, 95.5, 95.4, 95.4, 95.3, 95.3, 95.3, 95.2, 95.2, 95.2, 95.2, 95.2],
  otif: 91.4,
  otifYoY: 1.6,
  leadTime: 3.8,
  leadYoY: -0.4,
  returnRate: 6.4,
  returnYoY: -0.5,
};

// Quality KPI row
type KpiMetric = { label: string; value: string; delta: number; invert?: boolean; spark: number[]; sparkColor?: string };
const KPIS_ALL: KpiMetric[] = [
  { label: 'Fill Rate',       value: '95.2%', delta: -0.3, invert: true, spark: [95.5,95.5,95.4,95.4,95.3,95.3,95.3,95.2,95.2,95.2,95.2,95.2], sparkColor: CORAL },
  { label: 'Return Rate',     value: '6.4%',  delta: -0.5, invert: true, spark: [7.1,7.0,6.9,6.8,6.9,6.7,6.6,6.5,6.5,6.4,6.4,6.4] },
  { label: 'OTIF',            value: '91.4%', delta:  1.6, spark: [89,89.3,89.6,90,90.3,90.6,90.9,91.1,91.2,91.3,91.4,91.4] },
  { label: 'Avg Lead Time',   value: '3.8 d', delta: -0.4, invert: true, spark: [4.3,4.2,4.2,4.1,4.1,4.0,4.0,3.9,3.9,3.8,3.8,3.8] },
];
const KPIS_DTC: KpiMetric[] = [
  { label: 'Return Rate',       value: '7.9%',  delta: -0.6, invert: true, spark: [8.6,8.5,8.4,8.3,8.2,8.1,8.0,8.0,7.95,7.9,7.9,7.9] },
  { label: 'Conversion Rate',   value: '2.8%',  delta:  0.3, spark: [2.5,2.5,2.5,2.6,2.6,2.7,2.7,2.7,2.8,2.8,2.8,2.8] },
  { label: 'Cart Abandonment',  value: '71.4%', delta: -1.1, invert: true, spark: [73,72.8,72.5,72.2,72,71.8,71.6,71.5,71.5,71.4,71.4,71.4], sparkColor: CORAL },
  { label: 'Repeat Rate',       value: '34.2%', delta:  2.1, spark: [31,32,32,33,32,33,34,33,34,34,34,34.2] },
];
const KPIS_WH: KpiMetric[] = [
  { label: 'Fill Rate',       value: '95.2%', delta: -0.3, invert: true, spark: [95.5,95.5,95.4,95.4,95.3,95.3,95.3,95.2,95.2,95.2,95.2,95.2], sparkColor: CORAL },
  { label: 'OTIF',            value: '91.4%', delta:  1.6, spark: [89,89.3,89.6,90,90.3,90.6,90.9,91.1,91.2,91.3,91.4,91.4] },
  { label: 'Reorder Rate',    value: '58.4%', delta:  2.1, spark: [55,56,56,57,57,57.5,57.8,58,58.1,58.3,58.4,58.4] },
  { label: 'Avg Lead Time',   value: '3.8 d', delta: -0.4, invert: true, spark: [4.3,4.2,4.2,4.1,4.1,4.0,4.0,3.9,3.9,3.8,3.8,3.8] },
];
function getKpis(ch: SegKey): KpiMetric[] {
  if (ch === 'Ecommerce' || ch === 'Amazon') return KPIS_DTC;
  if (ch === 'US Wholesale' || ch === 'Distributors' || ch === 'Retail') return KPIS_WH;
  return KPIS_ALL;
}

// Returns Analysis
const RETURN_REASONS = [
  { label: 'Sizing / fit',         units: 1_418, pct: 38.4, delta: -1.2 },
  { label: 'Material quality',     units:   772, pct: 20.9, delta:  0.8 },
  { label: 'Not as described',     units:   562, pct: 15.2, delta: -0.5 },
  { label: 'Arrived damaged',      units:   428, pct: 11.6, delta: -2.1 },
  { label: 'Changed mind',         units:   324, pct:  8.8, delta:  1.4 },
  { label: 'Other',                units:   188, pct:  5.1, delta: -0.3 },
];
const RETURNS_BY_CHANNEL = [
  { name: 'Ecommerce',    rate: 7.9, units: 1_942, delta: -0.6 },
  { name: 'Amazon',       rate: 9.4, units:   914, delta:  0.3 },
  { name: 'US Wholesale', rate: 4.1, units:   518, delta: -0.8 },
  { name: 'Distributors', rate: 3.2, units:   218, delta: -0.1 },
  { name: 'Retail',       rate: 2.1, units:    42, delta:  0.0 },
];
const RETURN_RATE_TREND = [
  { m: 'Jan', r: 7.1 }, { m: 'Feb', r: 7.0 }, { m: 'Mar', r: 6.9 }, { m: 'Apr', r: 6.8 },
  { m: 'May', r: 6.9 }, { m: 'Jun', r: 6.7 }, { m: 'Jul', r: 6.6 }, { m: 'Aug', r: 6.5 },
  { m: 'Sep', r: 6.5 }, { m: 'Oct', r: 6.4 }, { m: 'Nov', r: 6.4 }, { m: 'Dec', r: 6.4 },
];

// DTC Funnel
const FUNNEL_DATA: Record<typeof FUNNEL_MODES[number], number[]> = {
  'Ecommerce': [486_210, 58_345, 36_174, 27_131],
  'Amazon':    [322_140, 38_657, 23_967, 17_975],
  'Combined':  [808_350, 97_002, 60_141, 45_106],
};
const FUNNEL_STAGES = ['Sessions', 'Add-to-cart', 'Checkout', 'Purchase'] as const;

// Reorder Cadence
const REORDER_BUCKETS = ['0-2w', '3-4w', '5-8w', '9-12w', '13-26w', '27-52w', '52w+'] as const;
const REORDER_BENCHMARK_IDX = 3;
const REORDER_DATA: Record<typeof REORDER_MODES[number], number[]> = {
  'All Wholesale': [48, 86, 132, 94, 61, 32, 18],
  'US Wholesale':  [32, 58,  78, 51, 33, 18,  9],
  'Distributors':  [14, 22,  41, 32, 20, 11,  7],
  'Retail':        [ 2,  6,  13, 11,  8,  3,  2],
};

// Product Velocity (fast movers / slow movers)
const FAST_MOVERS = [
  { sku: '101-2450-VOI01-O/S', name: 'Dean Vintage Canvas Trucker',  variant: 'Void · One Size',   onHand:  3_820, sold30: 2_412, dos:  47, sell: 94.1 },
  { sku: '101-2510-NAV02-O/S', name: 'Dusty Baker 5-Panel Cord',     variant: 'Navy · One Size',   onHand:  2_942, sold30: 1_804, dos:  49, sell: 91.6 },
  { sku: '101-2470-OLV01-O/S', name: 'Angler Mesh Snapback',         variant: 'Olive · One Size',  onHand:  2_418, sold30: 1_432, dos:  51, sell: 88.4 },
  { sku: '101-2615-TAN03-M/L', name: 'Farmer Full Grain Leather',    variant: 'Tan · M/L',         onHand:  1_804, sold30: 1_112, dos:  49, sell: 86.9 },
  { sku: '101-2452-SND01-O/S', name: 'Dean Washed Canvas Trucker',   variant: 'Sand · One Size',   onHand:  1_622, sold30:   964, dos:  50, sell: 84.2 },
];
const SLOW_MOVERS = [
  { sku: '101-1118-BRN02-S/M', name: 'Prospector Wool Felt',         variant: 'Brown · S/M',       onHand:  4_210, sold30:    82, dos: 1540, sell: 18.6 },
  { sku: '101-1142-KHA01-O/S', name: 'Lineman Flat Brim',            variant: 'Khaki · One Size',  onHand:  3_848, sold30:    94, dos: 1227, sell: 22.9 },
  { sku: '101-1230-WHT04-L/XL',name: 'Angler Twill Dad',             variant: 'White · L/XL',      onHand:  2_912, sold30:    98, dos:  891, sell: 29.4 },
  { sku: '101-1314-GRY02-O/S', name: 'Scout Corduroy 5-Panel',       variant: 'Grey · One Size',   onHand:  2_216, sold30:   112, dos:  594, sell: 36.1 },
  { sku: '101-1402-RED01-S/M', name: 'Firestarter Mesh Trucker',     variant: 'Red · S/M',         onHand:  1_980, sold30:   122, dos:  487, sell: 42.0 },
];

// Customer Insights (quality composition)
const CUSTOMER_INSIGHTS = [
  { label: 'Top 10 customers',     value: '75.7%', sub: '+2.1 pts vs prior',       caption: 'of net sales',           bar: 75.7, deltaOk: true },
  { label: 'Credit rate',          value: '2.0%',  sub: '$358K on $18.7M gross',    caption: 'Trending down · ↓0.4 pts', bar: 20,   deltaOk: true },
  { label: 'New customer rate',    value: '52.3%', sub: '4,217 new this period',    caption: '↑ 3.6 pts vs prior',      bar: 52.3, deltaOk: true },
  { label: 'Repeat purchase rate', value: '36.4%', sub: 'vs 33.1% prior',           caption: '↑ 3.3 pts',               bar: 36.4, deltaOk: true },
];

// Sales Rep Leaderboard — operational: on-time ship %, attainment
const SALES_REPS = [
  { name: 'Jovon Clements',  accounts: 34, otif: 94.6, fill: 97.1, attain:  92, yoy:  12.6 },
  { name: 'Erwin Samson',    accounts: 28, otif: 91.2, fill: 95.4, attain:  81, yoy:   6.3 },
  { name: 'Priya Rao',       accounts: 22, otif: 86.8, fill: 93.2, attain:  68, yoy:  -4.1 },
  { name: 'Devon Park',      accounts: 19, otif: 93.1, fill: 96.0, attain:  86, yoy:   9.2 },
  { name: 'James Whittaker', accounts: 16, otif: 82.4, fill: 90.6, attain:  61, yoy: -11.4 },
];

// ─── Formatters ────────────────────────────────────────────────────────
const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

// ─── Atoms ─────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: MUTED }}>
      {children}
    </p>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: FAINT }}>
      {children}
    </p>
  );
}

function InlineDelta({ v, invert = false, showArrow = true }: { v: number; invert?: boolean; showArrow?: boolean }) {
  const positive = invert ? v <= 0 : v >= 0;
  const Arrow = v >= 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-medium"
      style={{
        ...TABULAR,
        color: positive ? GREEN : CORAL_DK,
        background: positive ? GREEN_BG : CORAL_BG,
        padding: '3px 8px',
      }}
    >
      {showArrow && <Arrow size={10} strokeWidth={2.6} />}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function MiniSpark({ data, color = FAINT }: { data: number[]; color?: string }) {
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
  const dotColor = Math.abs(diff) <= 1 ? '#475569' : diff < 0 ? CORAL : '#059669';
  const clamped = Math.min(Math.max(actual, 2), 98);
  return (
    <div className="flex justify-end" aria-label={Math.abs(diff) <= 1 ? 'On pace' : diff < 0 ? `${Math.abs(diff)} pts behind` : `${diff} pts ahead`}>
      <div className="relative" style={{ width: 50, height: 10 }}>
        <div style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 2, background: BORDER, borderRadius: 999 }} />
        <div style={{ position: 'absolute', top: 1, left: `${expected}%`, width: 1, height: 8, background: FAINT, transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', top: 2, left: `${clamped}%`, width: 6, height: 6, borderRadius: 999, background: dotColor, transform: 'translateX(-50%)' }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, delta, invert }: { label: string; value: string; delta: number; invert?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3" style={{ minHeight: 24 }}>
      <span className="text-[12px]" style={{ color: MUTED }}>{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-[14px] font-semibold" style={{ ...TABULAR, color: INK }}>{value}</span>
        <InlineDelta v={delta} invert={invert} />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [channel, setChannel] = useState<SegKey>('All');
  const [range, setRange] = usePageRange('analytics');
  const [funnelMode, setFunnelMode] = useState<typeof FUNNEL_MODES[number]>('Ecommerce');
  const [reorderMode, setReorderMode] = useState<typeof REORDER_MODES[number]>('All Wholesale');
  const [velocityMode, setVelocityMode] = useState<typeof VELOCITY_MODES[number]>('Fast movers');
  const [returnsMode, setReturnsMode] = useState<typeof RETURNS_MODES[number]>('By reason');
  const [kpiOpacity, setKpiOpacity] = useState(1);

  useEffect(() => {
    setKpiOpacity(0.4);
    const t = setTimeout(() => setKpiOpacity(1), 20);
    return () => clearTimeout(t);
  }, [channel]);

  const kpis = useMemo(() => getKpis(channel), [channel]);
  const funnelData = FUNNEL_DATA[funnelMode];
  const reorderData = REORDER_DATA[reorderMode].map((count, i) => ({ bucket: REORDER_BUCKETS[i], count, stale: i > REORDER_BENCHMARK_IDX }));
  const reorderBarColor = reorderMode === 'All Wholesale' ? INK : SEG_COLORS[reorderMode];
  const scale = SEG_SCALE[channel];

  const velocityRows = velocityMode === 'Fast movers' ? FAST_MOVERS : SLOW_MOVERS;
  const velocityMax = Math.max(...velocityRows.map((r) => r.sell));

  const cardShell = 'rounded-2xl bg-white p-6';
  const shellStyle = { boxShadow: CARD_SHADOW } as React.CSSProperties;

  return (
    <div className="min-h-full" data-testid="analytics-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div style={{ padding: '24px' }}>

        {/* ── Editorial header + unified filter pill ─────────── */}
        <div className="flex flex-wrap items-start justify-between gap-6" data-testid="analytics-report-header">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.12em', color: FAINT }}>Goorin Reporting · Analytics</p>
            <h1 className="mt-2 font-semibold" style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: '-0.015em', color: INK }} data-testid="analytics-title">Operational Analytics</h1>
            <p className="mt-3 font-normal" style={{ fontSize: 16, lineHeight: 1.5, color: MUTED, maxWidth: 760 }}>
              Customer and operational health — returns, product velocity, DTC conversion, and wholesale reorder cadence.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="inline-flex items-center rounded-2xl p-1" style={{ background: '#EEEEEC' }} data-testid="unified-filter-group">
              <SegTabs tabs={CHANNELS as unknown as readonly string[]} value={channel} onChange={(v: any) => setChannel(v)} testId="a-channel-tabs" slugPrefix="a-ch" background="transparent" />
              <span aria-hidden="true" className="mx-2" style={{ width: 1, height: 20, background: '#CBD5E1' }} />
              <div className="unified-date-chip">
                <DateRangePicker value={range} onChange={setRange} testId="analytics-range" />
              </div>
            </div>
          </div>
        </div>

        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #E2E8F0' }} />

        {/* ── 01 / Health — Customer vs Operational hero ───────── */}
        <SectionLabel>01 / Health</SectionLabel>

        <section className="mt-3 overflow-hidden rounded-2xl bg-white" style={shellStyle} data-testid="analytics-hero">
          <div className="grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
            {/* Customer Health */}
            <div className="px-6 py-6 md:px-8 md:py-7" data-testid="analytics-customer-health">
              <Eyebrow>Customer Health</Eyebrow>
              <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
                <p className="font-semibold" style={{ ...TABULAR, fontSize: 'clamp(44px, 4.4vw, 56px)', lineHeight: 1, letterSpacing: '-0.02em', color: INK }} data-testid="customer-active-value">
                  {fmtInt(HERO_CUSTOMER.activeCustomers * (scale === 1 ? 1 : scale * 1.6))}
                </p>
                <p className="mb-2 text-[12px] font-medium" style={{ color: MUTED }}>Active customers · YTD distinct</p>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] font-medium" style={{ color: MUTED }}>
                  <span>{HERO_CUSTOMER.newPct}% new</span>
                  <span>{HERO_CUSTOMER.returningPct}% returning</span>
                </div>
                <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full" style={{ background: BORDER }}>
                  <div style={{ width: `${HERO_CUSTOMER.newPct}%`, background: INK }} />
                  <div style={{ width: `${HERO_CUSTOMER.returningPct}%`, background: CORAL }} />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px]" style={{ color: MUTED }}>Repeat purchase rate</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold" style={{ ...TABULAR, color: INK }}>{HERO_CUSTOMER.repeatRate.toFixed(1)}%</span>
                    <InlineDelta v={HERO_CUSTOMER.repeatYoY} />
                  </div>
                </div>
                <div style={{ height: 22 }}><MiniSpark data={HERO_CUSTOMER.repeatSpark} color={CORAL} /></div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px]" style={{ color: MUTED }}>LTV / AOV</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold" style={{ ...TABULAR, color: INK }}>{HERO_CUSTOMER.ltvAov}</span>
                    <InlineDelta v={HERO_CUSTOMER.ltvYoY} />
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden min-[900px]:block" style={{ background: BORDER }} aria-hidden="true" />

            {/* Operational Health */}
            <div className="border-t border-[#F1F5F9] px-6 py-6 md:px-8 md:py-7 min-[900px]:border-t-0" data-testid="analytics-operational-health">
              <Eyebrow>Operational Health</Eyebrow>
              <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
                <p className="font-semibold" style={{ ...TABULAR, fontSize: 'clamp(44px, 4.4vw, 56px)', lineHeight: 1, letterSpacing: '-0.02em', color: INK }} data-testid="ops-fillrate-value">
                  {HERO_OPS.fillRate.toFixed(1)}%
                </p>
                <p className="mb-2 text-[12px] font-medium" style={{ color: MUTED }}>Fill rate · trailing 30d</p>
              </div>

              <div className="mt-4" style={{ height: 32 }}>
                <MiniSpark data={HERO_OPS.fillSpark} color={CORAL} />
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <StatRow label="OTIF" value={`${HERO_OPS.otif.toFixed(1)}%`} delta={HERO_OPS.otifYoY} />
                <StatRow label="Avg lead time" value={`${HERO_OPS.leadTime.toFixed(1)} d`} delta={HERO_OPS.leadYoY} invert />
                <StatRow label="Return rate" value={`${HERO_OPS.returnRate.toFixed(1)}%`} delta={HERO_OPS.returnYoY} invert />
              </div>
            </div>
          </div>
        </section>

        {/* ── 02 / Quality — adaptive 4-column KPIs ───────────── */}
        <p className="mt-10"><SectionLabel>02 / Quality KPIs</SectionLabel></p>

        <section className="mt-3 overflow-hidden rounded-2xl bg-white" style={shellStyle} data-testid="analytics-kpi-row">
          <div className="grid grid-cols-1 md:grid-cols-4" style={{ opacity: kpiOpacity, transition: 'opacity 180ms ease-out' }}>
            {kpis.map((k, i) => (
              <div
                key={k.label}
                className="px-6 py-6"
                style={{ borderLeft: i > 0 ? `1px solid ${BORDER}` : 'none' }}
                data-testid={`akpi-${k.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Eyebrow>{k.label}</Eyebrow>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                  <p className="font-semibold" style={{ ...TABULAR, fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em', color: INK }}>
                    {k.value}
                  </p>
                  <InlineDelta v={k.delta} invert={k.invert} />
                </div>
                <div className="mt-3" style={{ height: 28 }}><MiniSpark data={k.spark} color={k.sparkColor || FAINT} /></div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 03 / Returns — Returns Analysis ──────── */}
        <p className="mt-10"><SectionLabel>03 / Returns Analysis</SectionLabel></p>

        <section className={`mt-3 ${cardShell}`} style={shellStyle} data-testid="analytics-returns">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold leading-none" style={{ color: INK, letterSpacing: '-0.005em' }}>Returns analysis</h2>
              <p className="mt-1.5 text-[12px] font-medium" style={{ color: MUTED }}>3,692 returned units YTD · 6.4% rate</p>
            </div>
            <SegTabs tabs={RETURNS_MODES as unknown as readonly string[]} value={returnsMode} onChange={(v: any) => setReturnsMode(v)} testId="a-returns-mode" slugPrefix="a-returns" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_1px_minmax(0,1fr)]">
            {/* Left: reasons or channels list */}
            <div data-testid="returns-breakdown">
              {returnsMode === 'By reason' && (
                <>
                  <div className="grid gap-x-5 pb-3 text-[11px] font-semibold uppercase" style={{ gridTemplateColumns: '2fr 1fr 100px 90px', letterSpacing: '0.08em', color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                    <span>Reason</span>
                    <span>Share</span>
                    <span className="text-right">Units</span>
                    <span className="text-right">Δ</span>
                  </div>
                  {RETURN_REASONS.map((r, i) => (
                    <div
                      key={r.label}
                      className="grid items-center gap-x-5 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded px-3"
                      style={{ gridTemplateColumns: '2fr 1fr 100px 90px', borderBottom: i === RETURN_REASONS.length - 1 ? 'none' : `1px solid ${BORDER}`, minHeight: 48 }}
                      data-testid={`return-reason-${i}`}
                    >
                      <span className="truncate text-[14px] font-medium" style={{ color: INK }}>{r.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="relative h-1 flex-1 overflow-hidden rounded-full" style={{ background: BORDER }}>
                          <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${(r.pct / RETURN_REASONS[0].pct) * 100}%`, background: CORAL }} />
                        </div>
                        <span className="text-[12px] font-medium" style={{ ...TABULAR, color: MUTED, width: 42, textAlign: 'right' }}>{r.pct.toFixed(1)}%</span>
                      </div>
                      <span className="text-right text-[14px] font-semibold" style={{ ...TABULAR, color: INK }}>{fmtInt(r.units)}</span>
                      <div className="flex justify-end"><InlineDelta v={r.delta} invert /></div>
                    </div>
                  ))}
                </>
              )}
              {returnsMode === 'By channel' && (
                <>
                  <div className="grid gap-x-5 pb-3 text-[11px] font-semibold uppercase" style={{ gridTemplateColumns: '1.5fr 1fr 100px 90px', letterSpacing: '0.08em', color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                    <span>Channel</span>
                    <span>Rate</span>
                    <span className="text-right">Units</span>
                    <span className="text-right">Δ</span>
                  </div>
                  {RETURNS_BY_CHANNEL.map((r, i) => (
                    <div
                      key={r.name}
                      className="grid items-center gap-x-5 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded px-3"
                      style={{ gridTemplateColumns: '1.5fr 1fr 100px 90px', borderBottom: i === RETURNS_BY_CHANNEL.length - 1 ? 'none' : `1px solid ${BORDER}`, minHeight: 48 }}
                      data-testid={`return-channel-${i}`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SEG_COLORS[r.name] }} />
                        <span className="truncate text-[14px] font-medium" style={{ color: INK }}>{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative h-1 flex-1 overflow-hidden rounded-full" style={{ background: BORDER }}>
                          <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${(r.rate / 10) * 100}%`, background: CORAL }} />
                        </div>
                        <span className="text-[12px] font-medium" style={{ ...TABULAR, color: MUTED, width: 42, textAlign: 'right' }}>{r.rate.toFixed(1)}%</span>
                      </div>
                      <span className="text-right text-[14px] font-semibold" style={{ ...TABULAR, color: INK }}>{fmtInt(r.units)}</span>
                      <div className="flex justify-end"><InlineDelta v={r.delta} invert /></div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="hidden lg:block" style={{ background: BORDER }} aria-hidden="true" />

            {/* Right: return rate trend */}
            <div className="border-t border-[#F1F5F9] pt-5 lg:border-t-0 lg:pt-0" data-testid="returns-rate-trend">
              <Eyebrow>Return Rate · 12 months</Eyebrow>
              <div className="mt-3 flex items-baseline gap-3">
                <p className="font-semibold" style={{ ...TABULAR, fontSize: 32, lineHeight: 1, letterSpacing: '-0.02em', color: INK }}>6.4%</p>
                <InlineDelta v={-0.5} invert />
              </div>
              <p className="mt-1 text-[11px] font-medium" style={{ color: MUTED }}>Trending down · 0.7 pts since Jan</p>
              <div className="mt-4" style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={RETURN_RATE_TREND} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke={BORDER} vertical={false} />
                    <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: MUTED, fontWeight: 500 }} interval={1} tickMargin={6} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: MUTED, fontWeight: 500 }} width={28} tickFormatter={(v) => `${v}%`} domain={[6, 7.5]} />
                    <Tooltip
                      cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                      content={({ active, payload, label }: any) => (!active || !payload?.length) ? null : (
                        <div style={{ background: '#FFFFFF', borderRadius: 10, padding: 8, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)', ...TABULAR }}>
                          <p style={{ color: MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{label}</p>
                          <p style={{ color: INK, fontSize: 13, fontWeight: 600, margin: '3px 0 0' }}>{payload[0].value}%</p>
                        </div>
                      )}
                    />
                    <Line type="monotone" dataKey="r" stroke={CORAL} strokeWidth={1.8} dot={false} isAnimationActive animationDuration={400} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* ── 04 / Funnels — DTC + Reorder Cadence ──────── */}
        <p className="mt-10"><SectionLabel>04 / Funnels</SectionLabel></p>

        <section className="mt-3 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
          <div className={cardShell} style={shellStyle} data-testid="analytics-funnel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold leading-none" style={{ color: INK, letterSpacing: '-0.005em' }}>DTC conversion funnel</h2>
                <p className="mt-1.5 text-[12px] font-medium" style={{ color: MUTED }}>Sessions → Add-to-cart → Checkout → Purchase</p>
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
                      <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: MUTED }}>{stage}</span>
                      {i > 0 && (
                        <span className="inline-flex items-center rounded-full text-[11px] font-medium" style={{ ...TABULAR, background: CORAL_BG, color: CORAL_DK, padding: '2px 8px' }}>
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
                <h2 className="text-[15px] font-semibold leading-none" style={{ color: INK, letterSpacing: '-0.005em' }}>Reorder cadence</h2>
                <p className="mt-1.5 text-[12px] font-medium" style={{ color: MUTED }}>Weeks since last order · wholesale</p>
              </div>
              <SegTabs tabs={REORDER_MODES as unknown as readonly string[]} value={reorderMode} onChange={(v: any) => setReorderMode(v)} testId="a-reorder-mode" slugPrefix="a-reorder" />
            </div>
            <div className="mt-5" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reorderData} margin={{ top: 24, right: 12, left: 0, bottom: 8 }} barCategoryGap="22%">
                  <CartesianGrid stroke={BORDER} vertical={false} />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: MUTED, fontWeight: 500 }} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: MUTED, fontWeight: 500 }} width={32} />
                  <Tooltip
                    cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                    content={({ active, payload }: any) => (!active || !payload?.length) ? null : (
                      <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 10, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)', ...TABULAR }}>
                        <p style={{ color: MUTED, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{payload[0].payload.bucket}</p>
                        <p style={{ color: INK, fontSize: 13, fontWeight: 600, margin: '4px 0 0' }}>{payload[0].value} accounts</p>
                      </div>
                    )}
                  />
                  <ReferenceLine x="9-12w" stroke={CORAL} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Reorder benchmark', position: 'top', fill: CORAL_DK, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={400}>
                    {reorderData.map((d, i) => <Cell key={i} fill={reorderBarColor} fillOpacity={d.stale ? 0.5 : 1} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── 05 / Velocity — Product sell-through ──────── */}
        <p className="mt-10"><SectionLabel>05 / Product Velocity</SectionLabel></p>

        <section className={`mt-3 ${cardShell}`} style={shellStyle} data-testid="analytics-velocity">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold leading-none" style={{ color: INK, letterSpacing: '-0.005em' }}>Product velocity</h2>
              <p className="mt-1.5 text-[12px] font-medium" style={{ color: MUTED }}>Sell-through, on-hand units, and days of supply</p>
            </div>
            <SegTabs tabs={VELOCITY_MODES as unknown as readonly string[]} value={velocityMode} onChange={(v: any) => setVelocityMode(v)} testId="a-velocity-mode" slugPrefix="a-velocity" />
          </div>
          <div className="mt-5">
            <div
              className="grid items-center gap-x-5 pb-3 text-[11px] font-semibold uppercase"
              style={{ gridTemplateColumns: '2fr 100px 110px 110px 1fr', letterSpacing: '0.08em', color: MUTED, borderBottom: `1px solid ${BORDER}` }}
            >
              <span>Product</span>
              <span className="text-right">On hand</span>
              <span className="text-right">Sold 30d</span>
              <span className="text-right">Days of supply</span>
              <span>Sell-through</span>
            </div>
            {velocityRows.map((r, i) => {
              const dosColor = r.dos > 180 ? CORAL_DK : r.dos > 90 ? '#B45309' : INK;
              const sellColor = velocityMode === 'Fast movers' ? INK : CORAL;
              return (
                <div
                  key={r.sku}
                  className="grid items-center gap-x-5 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded px-3"
                  style={{ gridTemplateColumns: '2fr 100px 110px 110px 1fr', borderBottom: i === velocityRows.length - 1 ? 'none' : `1px solid ${BORDER}`, minHeight: 56 }}
                  data-testid={`velocity-row-${i}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium" style={{ color: INK }}>{r.name}</p>
                    <p className="mt-0.5 text-[11px]" style={{ ...TABULAR, color: FAINT }}>{r.variant} · {r.sku}</p>
                  </div>
                  <span className="text-right text-[14px] font-semibold" style={{ ...TABULAR, color: INK }}>{fmtInt(r.onHand)}</span>
                  <span className="text-right text-[14px] font-semibold" style={{ ...TABULAR, color: INK }}>{fmtInt(r.sold30)}</span>
                  <span className="text-right text-[14px] font-semibold" style={{ ...TABULAR, color: dosColor }}>{r.dos > 999 ? `${(r.dos / 1000).toFixed(1)}k` : r.dos} d</span>
                  <div className="flex items-center gap-3">
                    <div className="relative h-1 flex-1 overflow-hidden rounded-full" style={{ background: BORDER }}>
                      <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${(r.sell / velocityMax) * 100}%`, background: sellColor }} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ ...TABULAR, color: INK, width: 44, textAlign: 'right' }}>{r.sell.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 06 / Customers — insights (full width) ───────── */}
        <p className="mt-10"><SectionLabel>06 / Customers</SectionLabel></p>

        <section className={`mt-3 ${cardShell}`} style={shellStyle} data-testid="analytics-customer-insights">
          <div>
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: INK, letterSpacing: '-0.005em' }}>Customer insights</h2>
            <p className="mt-1.5 text-[12px] font-medium" style={{ color: MUTED }}>Composition and quality</p>
          </div>
          <div className="mt-5 flex flex-col">
            {CUSTOMER_INSIGHTS.map((row, i) => (
              <div
                key={row.label}
                className="flex items-center gap-6"
                style={{ borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`, minHeight: 60 }}
                data-testid={`cust-insight-${row.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="min-w-[200px] text-[14px] font-medium" style={{ color: INK }}>{row.label}</span>
                <div className="flex-1 flex items-center gap-4">
                  <div className="relative h-1 w-32 overflow-hidden rounded-full" style={{ background: BORDER }}>
                    <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${row.bar}%`, background: INK }} />
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: MUTED }}>{row.sub}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[16px] font-semibold tabular-nums" style={{ color: INK }}>{row.value}</span>
                  <span className="text-[11px] font-medium" style={{ color: row.deltaOk ? GREEN : CORAL_DK }}>{row.caption}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 07 / Reps — Operational leaderboard ────────────── */}
        <p className="mt-10"><SectionLabel>07 / Reps</SectionLabel></p>

        <section className={`mt-3 ${cardShell}`} style={shellStyle} data-testid="analytics-reps">
          <div>
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: INK, letterSpacing: '-0.005em' }}>Sales rep leaderboard</h2>
            <p className="mt-1.5 text-[12px] font-medium" style={{ color: MUTED }}>Fulfillment quality and attainment · YTD</p>
          </div>
          <div className="mt-5">
            <div
              className="grid items-center gap-x-5 pb-3 text-[11px] font-semibold uppercase"
              style={{ gridTemplateColumns: '2fr 90px 100px 100px 120px 100px', letterSpacing: '0.08em', color: MUTED, borderBottom: `1px solid ${BORDER}` }}
            >
              <span>Rep</span>
              <span className="text-right">Accounts</span>
              <span className="text-right">OTIF</span>
              <span className="text-right">Fill Rate</span>
              <span className="text-right">Attainment</span>
              <span className="text-right">Pace</span>
            </div>
            {SALES_REPS.map((r, i) => {
              const attainColor = r.attain < 70 ? CORAL_DK : INK;
              return (
                <div
                  key={r.name}
                  className="grid items-center gap-x-5 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded px-3 cursor-pointer"
                  style={{ gridTemplateColumns: '2fr 90px 100px 100px 120px 100px', borderBottom: i === SALES_REPS.length - 1 ? 'none' : `1px solid ${BORDER}`, minHeight: 48 }}
                  data-testid={`arep-${i}`}
                  role="button"
                  tabIndex={0}
                >
                  <span className="truncate text-[14px] font-medium" style={{ color: INK }}>{r.name}</span>
                  <span className="text-right text-[14px] font-medium tabular-nums" style={{ color: '#475569' }}>{r.accounts}</span>
                  <span className="text-right text-[14px] font-semibold" style={{ ...TABULAR, color: INK }}>{r.otif.toFixed(1)}%</span>
                  <span className="text-right text-[14px] font-semibold" style={{ ...TABULAR, color: INK }}>{r.fill.toFixed(1)}%</span>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-[14px] font-semibold" style={{ ...TABULAR, color: attainColor }}>{r.attain}%</span>
                  </div>
                  <div className="flex justify-end"><PaceTrack actual={r.attain} expected={75} /></div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
