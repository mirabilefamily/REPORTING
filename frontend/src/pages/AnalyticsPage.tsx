import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Plus, X } from 'lucide-react';
import { SEG_COLORS, SegTabs } from '../DashboardPage';
import DateRangePicker from '../components/DateRangePicker';
import PageHeader from '../components/PageHeader';
import { usePageRange } from '../lib/pageRange';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;

const INK = '#0F172A';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50 = '#F8FAFC';
const CORAL = '#FF6F61';
const CORAL_DK = '#C9422E';
const GREEN = '#047857';

const VIEWS = ['Health', 'Funnels', 'Products', 'Customers'] as const;
type View = typeof VIEWS[number];
const COMPARE = ['vs prior', 'vs plan', 'vs LY'] as const;

const RETURNS_REPEAT_TREND = [
  { m: 'Jan', rate: 7.1, repeat: 31.0 }, { m: 'Feb', rate: 7.0, repeat: 32.0 },
  { m: 'Mar', rate: 6.9, repeat: 32.5 }, { m: 'Apr', rate: 6.8, repeat: 32.8 },
  { m: 'May', rate: 6.9, repeat: 33.2 }, { m: 'Jun', rate: 6.7, repeat: 33.6 },
  { m: 'Jul', rate: 6.6, repeat: 33.9 }, { m: 'Aug', rate: 6.5, repeat: 34.0 },
  { m: 'Sep', rate: 6.5, repeat: 34.1 }, { m: 'Oct', rate: 6.4, repeat: 34.2 },
  { m: 'Nov', rate: 6.4, repeat: 34.2 }, { m: 'Dec', rate: 6.4, repeat: 34.2 },
];
const RETURN_REASONS = [
  { label: 'Sizing / fit', pct: 38.4 }, { label: 'Material quality', pct: 20.9 },
  { label: 'Not as described', pct: 15.2 }, { label: 'Arrived damaged', pct: 11.6 },
  { label: 'Changed mind', pct: 8.8 }, { label: 'Other', pct: 5.1 },
];
const LTV_HIST = [
  { bucket: '0-50', count: 412 }, { bucket: '50-100', count: 814 },
  { bucket: '100-200', count: 2210 }, { bucket: '200-400', count: 4120 },
  { bucket: '400-800', count: 6220 }, { bucket: '800-1500', count: 3812 },
  { bucket: '1500+', count: 1142 },
];

const FUNNEL_MODES = ['Ecommerce', 'Amazon', 'Combined'] as const;
const FUNNEL_DATA: Record<typeof FUNNEL_MODES[number], number[]> = {
  'Ecommerce': [486_210, 58_345, 36_174, 27_131],
  'Amazon':    [322_140, 38_657, 23_967, 17_975],
  'Combined':  [808_350, 97_002, 60_141, 45_106],
};
const FUNNEL_STAGES = ['Sessions', 'Add-to-cart', 'Checkout', 'Purchase'] as const;

const REORDER_MODES = ['All Wholesale', 'US Wholesale', 'Distributors', 'Retail'] as const;
const REORDER_BUCKETS = ['0-2w', '3-4w', '5-8w', '9-12w', '13-26w', '27-52w', '52w+'] as const;
const REORDER_BENCHMARK_IDX = 3;
const REORDER_DATA: Record<typeof REORDER_MODES[number], number[]> = {
  'All Wholesale': [48, 86, 132, 94, 61, 32, 18],
  'US Wholesale':  [32, 58,  78, 51, 33, 18,  9],
  'Distributors':  [14, 22,  41, 32, 20, 11,  7],
  'Retail':        [ 2,  6,  13, 11,  8,  3,  2],
};

type Product = { sku: string; name: string; units: number; sellThrough: number; onHand: number; channel: string };
const PRODUCTS: Product[] = [
  { sku: '101-2450', name: 'Dean Vintage Trucker', units: 25_132, sellThrough: 94.1, onHand: 3820, channel: 'Ecommerce' },
  { sku: '101-2510', name: 'Dusty Baker 5-Panel',  units: 18_904, sellThrough: 91.6, onHand: 2942, channel: 'US Wholesale' },
  { sku: '101-2470', name: 'Angler Mesh',          units: 12_880, sellThrough: 88.4, onHand: 2418, channel: 'Distributors' },
  { sku: '101-2615', name: 'Farmer Full Grain',    units: 14_210, sellThrough: 86.9, onHand: 1804, channel: 'US Wholesale' },
  { sku: '101-2452', name: 'Dean Washed Trucker',  units: 10_122, sellThrough: 84.2, onHand: 1622, channel: 'Ecommerce' },
  { sku: '101-1118', name: 'Prospector Wool',      units:    982, sellThrough: 18.6, onHand: 4210, channel: 'Retail' },
  { sku: '101-1142', name: 'Lineman Flat Brim',    units:  1_094, sellThrough: 22.9, onHand: 3848, channel: 'Amazon' },
  { sku: '101-1230', name: 'Angler Twill Dad',     units:  1_948, sellThrough: 29.4, onHand: 2912, channel: 'US Wholesale' },
  { sku: '101-1314', name: 'Scout Corduroy',       units:  3_212, sellThrough: 36.1, onHand: 2216, channel: 'Distributors' },
  { sku: '101-1402', name: 'Firestarter Mesh',     units:  4_122, sellThrough: 42.0, onHand: 1980, channel: 'Amazon' },
  { sku: '101-1520', name: 'Wren Felt',            units:  6_820, sellThrough: 54.3, onHand: 1240, channel: 'Ecommerce' },
  { sku: '101-1611', name: 'Panther Trucker',      units:  8_412, sellThrough: 68.1, onHand: 1480, channel: 'US Wholesale' },
  { sku: '101-1720', name: 'Noe Valley 7-Panel',   units:  9_210, sellThrough: 74.2, onHand: 1120, channel: 'Distributors' },
  { sku: '101-1820', name: 'Hartford Snapback',    units:  7_632, sellThrough: 61.5, onHand: 1680, channel: 'Ecommerce' },
];
const FAST_MOVERS = PRODUCTS.filter((p) => p.sellThrough >= 80).slice(0, 5);
const SLOW_MOVERS = PRODUCTS.filter((p) => p.sellThrough < 40).slice(0, 5);

const COHORT = [
  { m: 'Jan', newC: 820, ret: 452 }, { m: 'Feb', newC: 940, ret: 512 },
  { m: 'Mar', newC: 1_120, ret: 582 }, { m: 'Apr', newC: 1_040, ret: 640 },
  { m: 'May', newC: 980, ret: 712 }, { m: 'Jun', newC: 1_210, ret: 780 },
  { m: 'Jul', newC: 1_440, ret: 820 }, { m: 'Aug', newC: 1_620, ret: 902 },
  { m: 'Sep', newC: 1_380, ret: 1_010 }, { m: 'Oct', newC: 1_280, ret: 1_120 },
  { m: 'Nov', newC: 1_540, ret: 1_190 }, { m: 'Dec', newC: 1_712, ret: 1_240 },
];
const CUSTOMER_INSIGHTS = [
  { label: 'Top 10 customers',     value: '75.7%', sub: '+2.1 pts vs prior',    caption: 'of net sales', bar: 75.7 },
  { label: 'Credit rate',          value: '2.0%',  sub: '$358K on $18.7M gross',caption: '↓ 0.4 pts',    bar: 20 },
  { label: 'New customer rate',    value: '52.3%', sub: '4,217 new this period',caption: '↑ 3.6 pts',    bar: 52.3 },
  { label: 'Repeat purchase rate', value: '36.4%', sub: 'vs 33.1% prior',       caption: '↑ 3.3 pts',    bar: 36.4 },
];

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: SLATE_500, margin: 0 }}>{children}</p>;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ height: 26, padding: '0 10px', borderRadius: 999, background: SLATE_100, color: '#334155', fontSize: 12, fontWeight: 500 }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEG_COLORS[label] || SLATE_500 }} />
      {label}
      <button type="button" onClick={onRemove} style={{ display: 'grid', placeItems: 'center', width: 16, height: 16, borderRadius: 999, background: 'transparent', color: SLATE_500, cursor: 'pointer', marginLeft: 2 }} aria-label={`Remove ${label}`}>
        <X size={11} strokeWidth={2.4} />
      </button>
    </span>
  );
}

function HealthView() {
  return (
    <>
      <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 24 }} data-testid="an-health-primary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>Primary · 12 months</Eyebrow>
            <h2 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Return rate vs repeat rate</h2>
            <p style={{ margin: 0, fontSize: 12, color: SLATE_500 }}>Lower returns and rising repeats indicate healthier customer trust.</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium uppercase" style={{ letterSpacing: '0.08em', color: SLATE_500 }}>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: INK }} /> Return rate</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: CORAL }} /> Repeat rate</span>
          </div>
        </div>
        <div className="mt-5" style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={RETURNS_REPEAT_TREND} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={SLATE_100} vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickMargin={8} />
              <YAxis yAxisId="r" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickFormatter={(v) => `${v}%`} width={38} domain={[6, 7.5]} />
              <YAxis yAxisId="rep" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickFormatter={(v) => `${v}%`} width={38} domain={[28, 36]} />
              <Tooltip cursor={{ stroke: SLATE_200, strokeWidth: 1 }} />
              <Line yAxisId="r" type="monotone" dataKey="rate" stroke={INK} strokeWidth={2} dot={false} isAnimationActive animationDuration={400} />
              <Line yAxisId="rep" type="monotone" dataKey="repeat" stroke={CORAL} strokeWidth={2} dot={false} isAnimationActive animationDuration={400} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 20 }}>
            <Eyebrow>Active customers</Eyebrow>
            <p style={{ ...TABULAR, margin: '8px 0 0', fontSize: 32, fontWeight: 600, color: INK, letterSpacing: '-0.02em' }}>18,742</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>YTD distinct · vs 17,645 prior</p>
          </section>
          <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 20 }}>
            <Eyebrow>Customer concentration</Eyebrow>
            <p style={{ ...TABULAR, margin: '8px 0 0', fontSize: 28, fontWeight: 600, color: INK, letterSpacing: '-0.02em' }}>75.7%</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>Top 10 share of net sales</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: SLATE_100 }}>
              <div style={{ width: '75.7%', height: '100%', background: INK }} />
            </div>
          </section>
          <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 20 }}>
            <Eyebrow>New vs returning</Eyebrow>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full" style={{ background: SLATE_100 }}>
              <div style={{ width: '56%', background: INK }} />
              <div style={{ width: '44%', background: CORAL }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px]" style={{ ...TABULAR, color: SLATE_500 }}>
              <span><span style={{ color: INK, fontWeight: 600 }}>56%</span> new</span>
              <span><span style={{ color: INK, fontWeight: 600 }}>44%</span> returning</span>
            </div>
          </section>
        </div>
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 20 }}>
            <Eyebrow>Return rate · by reason</Eyebrow>
            <div className="mt-3 flex flex-col gap-2.5">
              {RETURN_REASONS.map((r) => (
                <div key={r.label} className="grid items-center gap-3" style={{ gridTemplateColumns: '140px 1fr 48px' }}>
                  <span style={{ fontSize: 13, color: '#334155' }}>{r.label}</span>
                  <div className="relative h-1.5 overflow-hidden rounded-full" style={{ background: SLATE_100 }}>
                    <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${(r.pct / RETURN_REASONS[0].pct) * 100}%`, background: CORAL }} />
                  </div>
                  <span style={{ ...TABULAR, fontSize: 12, fontWeight: 600, color: INK, textAlign: 'right' }}>{r.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 20 }}>
            <Eyebrow>LTV distribution</Eyebrow>
            <div className="mt-3" style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={LTV_HIST} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barCategoryGap="18%">
                  <CartesianGrid stroke={SLATE_100} vertical={false} />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: SLATE_500 }} tickMargin={6} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: SLATE_500 }} width={34} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} />
                  <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={INK} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function FunnelsView() {
  const [funnelMode, setFunnelMode] = useState<typeof FUNNEL_MODES[number]>('Combined');
  const [reorderMode, setReorderMode] = useState<typeof REORDER_MODES[number]>('All Wholesale');
  const funnelData = FUNNEL_DATA[funnelMode];
  const reorderData = REORDER_DATA[reorderMode].map((count, i) => ({ bucket: REORDER_BUCKETS[i], count, stale: i > REORDER_BENCHMARK_IDX }));
  const reorderBarColor = reorderMode === 'All Wholesale' ? INK : SEG_COLORS[reorderMode];

  return (
    <>
      <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 24 }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>Primary · DTC conversion</Eyebrow>
            <h2 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 600, color: INK }}>Sessions → Add-to-cart → Checkout → Purchase</h2>
          </div>
          <SegTabs tabs={FUNNEL_MODES as unknown as readonly string[]} value={funnelMode} onChange={(v: any) => setFunnelMode(v)} testId="an-funnel-mode" slugPrefix="an-funnel" />
        </div>
        <div className="mt-6 flex flex-col gap-4" style={{ minHeight: 340 }}>
          {FUNNEL_STAGES.map((stage, i) => {
            const value = funnelData[i];
            const share = (value / funnelData[0]) * 100;
            const dropPct = i > 0 ? ((funnelData[i - 1] - value) / funnelData[i - 1]) * 100 : 0;
            return (
              <div key={stage}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: SLATE_500 }}>{stage}</span>
                  {i > 0 && <span className="inline-flex items-center rounded-full text-[11px] font-medium" style={{ ...TABULAR, background: '#FFF1EF', color: CORAL_DK, padding: '2px 10px' }}>−{dropPct.toFixed(1)}% drop-off</span>}
                </div>
                <div className="relative h-16 rounded-md" style={{ width: `${Math.max(share, 12)}%`, background: 'linear-gradient(180deg, #10B981 0%, #34D399 100%)', transition: 'width 400ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-white" style={TABULAR}>{value.toLocaleString('en-US')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 24 }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>Supporting · Wholesale</Eyebrow>
            <h2 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 600, color: INK }}>Reorder cadence</h2>
          </div>
          <SegTabs tabs={REORDER_MODES as unknown as readonly string[]} value={reorderMode} onChange={(v: any) => setReorderMode(v)} testId="an-reorder-mode" slugPrefix="an-reorder" />
        </div>
        <div className="mt-5" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reorderData} margin={{ top: 24, right: 12, left: 0, bottom: 8 }} barCategoryGap="22%">
              <CartesianGrid stroke={SLATE_100} vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} width={32} />
              <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
              <ReferenceLine x="9-12w" stroke={CORAL} strokeDasharray="4 4" strokeWidth={1.5} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {reorderData.map((d, i) => <Cell key={i} fill={reorderBarColor} fillOpacity={d.stale ? 0.5 : 1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}

function ProductsView() {
  const channels = Array.from(new Set(PRODUCTS.map((p) => p.channel)));
  return (
    <>
      <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 24 }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>Primary · Velocity map</Eyebrow>
            <h2 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 600, color: INK }}>Units sold × Sell-through</h2>
            <p style={{ margin: 0, fontSize: 12, color: SLATE_500 }}>Dot size = on-hand inventory. Low sell-through + high inventory = slow movers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium" style={{ color: SLATE_500 }}>
            {channels.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: SEG_COLORS[c] || SLATE_500 }} />{c}</span>
            ))}
          </div>
        </div>
        <div className="mt-5" style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid stroke={SLATE_100} />
              <XAxis type="number" dataKey="units" name="Units sold" tickLine={false} axisLine={{ stroke: SLATE_200 }} tick={{ fontSize: 11, fill: SLATE_500 }} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
              <YAxis type="number" dataKey="sellThrough" name="Sell-through" tickLine={false} axisLine={{ stroke: SLATE_200 }} tick={{ fontSize: 11, fill: SLATE_500 }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
              <ZAxis type="number" dataKey="onHand" range={[60, 420]} />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: SLATE_200 }} />
              {channels.map((ch) => (
                <Scatter key={ch} name={ch} data={PRODUCTS.filter((p) => p.channel === ch)} fill={SEG_COLORS[ch] || SLATE_500} fillOpacity={0.75} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 20 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>Fast movers</h3>
          <p style={{ margin: '2px 0 12px', fontSize: 12, color: SLATE_500 }}>Sell-through ≥ 80%</p>
          {FAST_MOVERS.map((p) => (
            <div key={p.sku} className="grid items-center gap-3" style={{ gridTemplateColumns: '1fr 72px 72px', padding: '10px 0', borderTop: `1px solid ${SLATE_100}` }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: INK }}>{p.name}</p>
                <p style={{ margin: '2px 0 0', ...TABULAR, fontSize: 11, color: SLATE_400 }}>{p.sku}</p>
              </div>
              <span style={{ ...TABULAR, fontSize: 13, color: '#334155', textAlign: 'right' }}>{fmtInt(p.units)}</span>
              <span style={{ ...TABULAR, fontSize: 13, fontWeight: 600, color: INK, textAlign: 'right' }}>{p.sellThrough.toFixed(1)}%</span>
            </div>
          ))}
        </section>
        <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 20 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>Slow movers</h3>
          <p style={{ margin: '2px 0 12px', fontSize: 12, color: SLATE_500 }}>Sell-through &lt; 40%</p>
          {SLOW_MOVERS.map((p) => (
            <div key={p.sku} className="grid items-center gap-3" style={{ gridTemplateColumns: '1fr 72px 72px', padding: '10px 0', borderTop: `1px solid ${SLATE_100}` }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: INK }}>{p.name}</p>
                <p style={{ margin: '2px 0 0', ...TABULAR, fontSize: 11, color: SLATE_400 }}>{p.sku}</p>
              </div>
              <span style={{ ...TABULAR, fontSize: 13, color: '#334155', textAlign: 'right' }}>{fmtInt(p.units)}</span>
              <span style={{ ...TABULAR, fontSize: 13, fontWeight: 600, color: CORAL_DK, textAlign: 'right' }}>{p.sellThrough.toFixed(1)}%</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function CustomersView() {
  return (
    <>
      <section className="rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 24 }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>Primary · Cohort</Eyebrow>
            <h2 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 600, color: INK }}>New vs returning customers · 12 months</h2>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium uppercase" style={{ letterSpacing: '0.08em', color: SLATE_500 }}>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: INK }} /> New</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: CORAL }} /> Returning</span>
          </div>
        </div>
        <div className="mt-5" style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={COHORT} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="cohortNew" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={INK} stopOpacity={0.12} /><stop offset="100%" stopColor={INK} stopOpacity={0} /></linearGradient>
                <linearGradient id="cohortRet" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CORAL} stopOpacity={0.18} /><stop offset="100%" stopColor={CORAL} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke={SLATE_100} vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500 }} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500 }} width={40} />
              <Tooltip cursor={{ stroke: SLATE_200, strokeWidth: 1 }} />
              <Area type="monotone" dataKey="newC" stroke={INK} strokeWidth={2} fill="url(#cohortNew)" dot={false} />
              <Area type="monotone" dataKey="ret"  stroke={CORAL} strokeWidth={2} fill="url(#cohortRet)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW, padding: 24 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK }}>Customer insights</h3>
        <p style={{ margin: '4px 0 16px', fontSize: 12, color: SLATE_500 }}>Composition and quality</p>
        {CUSTOMER_INSIGHTS.map((row, i) => (
          <div key={row.label} className="flex items-center gap-6" style={{ borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}`, minHeight: 60 }}>
            <span style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: INK }}>{row.label}</span>
            <div className="flex-1 flex items-center gap-4">
              <div className="relative h-1 w-32 overflow-hidden rounded-full" style={{ background: SLATE_100 }}>
                <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${row.bar}%`, background: INK }} />
              </div>
              <span style={{ fontSize: 12, color: SLATE_500 }}>{row.sub}</span>
            </div>
            <div className="flex flex-col items-end">
              <span style={{ ...TABULAR, fontSize: 16, fontWeight: 600, color: INK }}>{row.value}</span>
              <span style={{ fontSize: 11, color: GREEN, fontWeight: 500 }}>{row.caption}</span>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

export default function AnalyticsPage() {
  const [view, setView] = useState<View>('Health');
  const [compare, setCompare] = useState<string>('vs prior');
  const [range, setRange] = usePageRange('analytics');
  const [chips, setChips] = useState<string[]>(['US Wholesale', 'Distributors']);

  const viewComponent = useMemo(() => {
    switch (view) {
      case 'Health':    return <HealthView />;
      case 'Funnels':   return <FunnelsView />;
      case 'Products':  return <ProductsView />;
      case 'Customers': return <CustomersView />;
    }
  }, [view]);

  return (
    <div className="min-h-full" data-testid="analytics-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        <PageHeader
          title="Operational"
          testIdPrefix="an"
          right={
            <SegTabs tabs={COMPARE as unknown as readonly string[]} value={compare} onChange={(v: string) => setCompare(v)} testId="an-compare-tabs" slugPrefix="an-compare" />
          }
        />

        <div role="tablist" aria-label="Analytics views" className="flex items-center" style={{ borderBottom: `1px solid ${SLATE_100}` }} data-testid="an-view-tabs">
          {VIEWS.map((v) => {
            const active = v === view;
            return (
              <button key={v} type="button" role="tab" aria-selected={active} onClick={() => setView(v)}
                className="transition-colors duration-150"
                style={{ position: 'relative', height: 44, padding: '0 20px', background: 'transparent', color: active ? INK : SLATE_500, fontSize: 14, fontWeight: active ? 600 : 500, cursor: 'pointer', marginBottom: -1 }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = INK; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = SLATE_500; }}
                data-testid={`an-view-${v.toLowerCase()}`}>
                {v}
                {active && <span aria-hidden="true" style={{ position: 'absolute', left: 12, right: 12, bottom: -1, height: 2, background: CORAL, borderRadius: 2 }} />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="an-filter-strip">
          {chips.map((c) => (
            <Chip key={c} label={c} onRemove={() => setChips((s) => s.filter((x) => x !== c))} />
          ))}
          <button type="button" className="inline-flex items-center gap-1 transition-colors duration-150"
            style={{ height: 26, padding: '0 10px', borderRadius: 999, background: 'transparent', border: `1px dashed ${SLATE_300}`, color: SLATE_500, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = INK; e.currentTarget.style.borderColor = SLATE_500; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; e.currentTarget.style.borderColor = SLATE_300; }}>
            <Plus size={11} strokeWidth={2.4} />Add filter
          </button>
          <div className="ml-auto">
            <DateRangePicker value={range} onChange={setRange} testId="analytics-range" />
          </div>
        </div>

        <div className="mt-4">{viewComponent}</div>
      </div>
    </div>
  );
}
