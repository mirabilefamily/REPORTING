import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDown,
  ArrowUp,
  Command,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Sparkles,
} from 'lucide-react';

type Props = { name?: string; onNavigate?: (label: string) => void };

const CORAL = '#FC7460';
const CORAL_SOFT = '#FF9678';
const CHANNEL: Record<string, string> = {
  us: '#16A37A',
  dist: '#3B6EF6',
  retail: '#F59F00',
  ecom: '#A855F7',
  amazon: '#EC4899',
};
const SEG_TABS = ['All', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'];

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const usdM = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${n < 0 ? '-' : ''}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${n < 0 ? '-' : ''}$${Math.round(a / 1e3)}K`;
  return `${n < 0 ? '-' : ''}$${Math.round(a)}`;
};

// ─── Revenue by month (mock) ────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthly = MONTHS.map((m, i) => {
  const usB = [820, 940, 780, 990, 1_120, 1_180, 1_240, 1_190, 720, 0, 0, 0][i] * 1000;
  const distB = [640, 700, 590, 780, 860, 940, 980, 890, 620, 0, 0, 0][i] * 1000;
  const retB = [40, 45, 38, 52, 60, 66, 72, 68, 45, 0, 0, 0][i] * 1000;
  const ecomB = [520, 540, 460, 620, 690, 760, 810, 770, 520, 0, 0, 0][i] * 1000;
  const amzB = [86, 92, 78, 108, 120, 130, 138, 128, 84, 0, 0, 0][i] * 1000;
  const openO = i >= 9 ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 2_640_000, 3_120_000, 3_180_000][i] : 0;
  const total = usB + distB + retB + ecomB + amzB + openO;
  const forecast = [2_150_000, 2_360_000, 1_960_000, 2_580_000, 2_870_000, 3_100_000, 3_260_000, 3_060_000, 2_050_000, 2_720_000, 3_180_000, 3_260_000][i];
  return { m, us: usB, dist: distB, retail: retB, ecom: ecomB, amazon: amzB, open: openO, total, forecast };
});

// ─── Channel mix (donut) ────────────────────────────────────────────────────
const channelMix = [
  { k: 'US Wholesale', v: 6_480_000, pct: 37.0, c: CHANNEL.us },
  { k: 'Distributors', v: 5_240_000, pct: 29.9, c: CHANNEL.dist },
  { k: 'Ecommerce', v: 4_550_000, pct: 26.0, c: CHANNEL.ecom },
  { k: 'Amazon', v: 785_000, pct: 4.5, c: CHANNEL.amazon },
  { k: 'Retail', v: 462_000, pct: 2.6, c: CHANNEL.retail },
];
const channelMixB2B = [
  { k: 'B2B', v: 11_720_000, pct: 66.9, c: CHANNEL.us },
  { k: 'Ecommerce', v: 4_550_000, pct: 26.0, c: CHANNEL.ecom },
  { k: 'Amazon', v: 785_000, pct: 4.5, c: CHANNEL.amazon },
  { k: 'Retail', v: 462_000, pct: 2.6, c: CHANNEL.retail },
];

// ─── Segments panel ─────────────────────────────────────────────────────────
const segments = [
  { name: 'US Wholesale', pct: 71, cur: 6_480_000, target: 9_180_000, color: CHANNEL.us },
  { name: 'Distributors', pct: 62, cur: 5_240_000, target: 8_410_000, color: CHANNEL.dist },
  { name: 'Retail', pct: 72, cur: 462_000, target: 640_000, color: CHANNEL.retail },
  { name: 'Ecommerce', pct: 68, cur: 4_550_000, target: 6_730_000, color: CHANNEL.ecom },
  { name: 'Amazon', pct: 77, cur: 785_000, target: 1_020_000, color: CHANNEL.amazon },
];

// ─── Sales vs Goal ──────────────────────────────────────────────────────────
const svg = [
  { cls: 'US Wholesale', ytd: 6_480_000, goalYtd: 7_580_000, annual: 9_180_000 },
  { cls: 'Distributors', ytd: 5_240_000, goalYtd: 5_758_000, annual: 8_410_000 },
  { cls: 'Retail', ytd: 462_000, goalYtd: 484_000, annual: 640_000 },
  { cls: 'Ecommerce', ytd: 4_550_000, goalYtd: 5_044_000, annual: 6_730_000 },
  { cls: 'Amazon', ytd: 785_000, goalYtd: 827_000, annual: 1_020_000 },
];
const svgTotal = svg.reduce((a, r) => ({ ytd: a.ytd + r.ytd, goalYtd: a.goalYtd + r.goalYtd, annual: a.annual + r.annual }), { ytd: 0, goalYtd: 0, annual: 0 });

// ─── Top Accounts / Top Items ───────────────────────────────────────────────
const topAccts = [
  { rank: 1, name: 'Lids', ytd: 2_720_000, delta: -24.8 },
  { rank: 2, name: 'SASAtrend', ytd: 1_460_000, delta: -4.7 },
  { rank: 3, name: 'Industrias Mercury, S.A.', ytd: 1_030_000, delta: 53.7 },
  { rank: 4, name: 'Nordstrom Accounts Payable', ytd: 726_000, delta: -20.2 },
  { rank: 5, name: 'Buckle Inc., The', ytd: 617_000, delta: -54.8 },
];
const topItems = [
  { rank: 1, name: 'Panther Trucker', variant: 'Void · One Size', sku: '101-2450-VOI01-O/S', rev: 287_000, units: 25_132 },
  { rank: 2, name: 'Suede Black Panther', variant: 'Dust / Void · One Size', sku: '101-2961-DUS02-O/S', rev: 120_000, units: 7_957 },
  { rank: 3, name: 'Black Sheep Trucker', variant: 'Void · One Size', sku: '101-2457-VOI01-O/S', rev: 111_000, units: 7_521 },
  { rank: 4, name: 'Suede Colorful Rooster', variant: 'Dust White / Void Black · One Size', sku: '101-3849-WHT02/BLK01-O/S', rev: 103_000, units: 6_058 },
  { rank: 5, name: 'The Alpha Dog', variant: 'Void · One Size', sku: '101-1666-VOI01-O/S', rev: 77_000, units: 4_826 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function DeltaPill({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{Math.abs(v).toFixed(1)}%
    </span>
  );
}

function SmallDeltaPill({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{Math.abs(v).toFixed(1)}%
    </span>
  );
}

function HeroKpi({ label, value, delta, caption, coralAccent = false, testId }: { label: string; value: string; delta?: number; caption?: string; coralAccent?: boolean; testId?: string }) {
  return (
    <div className="min-w-0" data-testid={testId}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[26px] font-bold leading-none text-white">{value}</span>
        {delta !== undefined && <DeltaPill v={delta} />}
      </div>
      {coralAccent && <span className="mt-2 block h-[3px] w-14 rounded-full" style={{ background: `linear-gradient(90deg, ${CORAL}, ${CORAL_SOFT})` }} />}
      {caption && <p className="mt-2 text-[11px] leading-snug text-neutral-500">{caption}</p>}
    </div>
  );
}

// ─── Custom tooltip ────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const parts = [
    { k: 'US Wholesale', v: row.us, c: CHANNEL.us },
    { k: 'Distributors', v: row.dist, c: CHANNEL.dist },
    { k: 'Retail', v: row.retail, c: CHANNEL.retail },
    { k: 'Ecommerce', v: row.ecom, c: CHANNEL.ecom },
    { k: 'Amazon', v: row.amazon, c: CHANNEL.amazon },
    { k: 'Open Orders', v: row.open, c: '#94a3b8' },
  ].filter((p) => p.v > 0);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-neutral-900">{label}</p>
      {parts.map((p) => (
        <div key={p.k} className="flex items-center gap-2 py-0.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: p.c }} /><span className="text-neutral-600 flex-1">{p.k}</span><b className="text-neutral-900">{usdM(p.v)}</b></div>
      ))}
      <div className="mt-1.5 flex items-center gap-2 border-t border-neutral-100 pt-1.5"><span className="text-neutral-600 flex-1">Total</span><b className="text-neutral-900">{usdM(row.total)}</b></div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function DashboardPage({ name = 'Ryan' }: Props) {
  const [seg, setSeg] = useState('All');
  const [svgMode, setSvgMode] = useState<'class' | 'month'>('class');
  const topA = Math.max(...topAccts.map((a) => a.ytd));
  const topI = Math.max(...topItems.map((a) => a.rev));

  const netYtd = 9_166_708;
  const openOrders = 26_679_135;
  const total = 35_845_843;
  const forecast = 25_980_800;
  const goalCur = 17_510_000;
  const goalTarget = 25_980_800;
  const goalPct = Math.round((goalCur / goalTarget) * 100);
  const pace = 75;

  return (
    <div className="min-h-full space-y-5 bg-[#F5F6F3] p-6" data-testid="dashboard-page">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
          <div className="ml-auto flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Segment">
            {SEG_TABS.map((t) => (
              <button key={t} onClick={() => setSeg(t)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${seg === t ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'}`} data-testid={`seg-tab-${t.toLowerCase().replace(/\s+/g, '-')}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hero KPI card ───────────────────────────────────────────── */}
      <section className="rounded-2xl p-7 text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #141416 60%, #101013 100%)' }} data-testid="hero-card">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-8">
          <HeroKpi label="Net Sales YTD" value={usd(netYtd)} delta={25.6} caption="After discounts, returns & tax · shipping included" coralAccent testId="hero-net-sales" />
          <HeroKpi label="Open Orders" value={usd(openOrders)} caption="Booked, not yet invoiced" testId="hero-open-orders" />
          <HeroKpi label="Total (Net Sales + Open Orders)" value={usd(total)} caption="Full pipeline" testId="hero-total" />
          <HeroKpi label="Forecast" value={usd(forecast)} caption="Full-year projection" testId="hero-forecast" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <div className="flex items-baseline gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Annual Goal Progress</p>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <strong className="text-4xl font-bold leading-none">{goalPct}%</strong>
              <span className="text-sm text-neutral-400">{usdM(goalCur)} of {usdM(goalTarget)}</span>
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/10" data-testid="hero-progress">
              <div className="h-full rounded-full" style={{ width: `${goalPct}%`, background: `linear-gradient(90deg, ${CORAL} 0%, ${CORAL_SOFT} 100%)`, boxShadow: `0 0 12px ${CORAL}55` }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">Behind pace</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Pace {pace}%</span>
          </div>
        </div>
      </section>

      {/* ── AI Assist strip ─────────────────────────────────────────── */}
      <section className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm" data-testid="ai-strip">
        <span className="relative grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: `linear-gradient(135deg, ${CORAL} 0%, ${CORAL_SOFT} 100%)`, boxShadow: `0 6px 18px ${CORAL}55` }}>
          <Sparkles size={18} />
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-white ai-pulse" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-900">Claude is analyzing your data…</p>
          <p className="text-xs text-neutral-500">Coral trends detected in Distributor segment. Insight ready in a moment.</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Live</span>
        <style>{`@keyframes aip { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:1;transform:scale(1.35)} } .ai-pulse{animation:aip 1.4s ease-in-out infinite}`}</style>
      </section>

      {/* ── Revenue + Segments ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2" data-testid="rev-by-month">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Revenue by Month</h2>
              <p className="text-xs text-neutral-500">Stacked channels · total line · dashed forecast</p>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50" data-testid="rev-export"><Download size={13} /> Export</button>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-600">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: CHANNEL.us }} />US Wholesale</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: CHANNEL.dist }} />Distributors</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: CHANNEL.retail }} />Retail</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: CHANNEL.ecom }} />Ecommerce</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: CHANNEL.amazon }} />Amazon</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-neutral-300" />Open Orders</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[2px] w-4 rounded" style={{ background: '#1e3a8a' }} />Total</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[2px] w-4 rounded" style={{ background: CORAL, backgroundImage: `repeating-linear-gradient(90deg, ${CORAL} 0 4px, transparent 4px 7px)` }} />Forecast</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef1ef" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a938e' }} />
                <YAxis tickFormatter={usdM} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a3aaa5' }} width={60} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="us" stackId="s" fill={CHANNEL.us} isAnimationActive={false} />
                <Bar dataKey="dist" stackId="s" fill={CHANNEL.dist} isAnimationActive={false} />
                <Bar dataKey="retail" stackId="s" fill={CHANNEL.retail} isAnimationActive={false} />
                <Bar dataKey="ecom" stackId="s" fill={CHANNEL.ecom} isAnimationActive={false} />
                <Bar dataKey="amazon" stackId="s" fill={CHANNEL.amazon} isAnimationActive={false} />
                <Bar dataKey="open" stackId="s" fill="#cbd5e1" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Line type="monotone" dataKey="total" stroke="#1e3a8a" strokeWidth={2.6} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="forecast" stroke={CORAL} strokeWidth={2.4} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid="segments-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Segments</h2>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">% of goal</span>
          </div>
          <div className="space-y-4">
            {segments.map((s) => (
              <div key={s.name} data-testid={`seg-row-${s.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center gap-2">
                  <i className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1 text-sm font-medium text-neutral-800">{s.name}</span>
                  <b className={`text-sm font-bold ${s.pct >= 70 ? 'text-emerald-600' : 'text-neutral-700'}`}>{s.pct}%</b>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
                  <span>{usdM(s.cur)}</span><span>{usdM(s.target)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Channel Mix donuts ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DonutCard title="Channel Mix" data={channelMix} testId="donut-mix" />
        <DonutCard title="Channel Mix — B2B Combined" data={channelMixB2B} testId="donut-mix-b2b" />
      </div>

      {/* ── Sales vs Goal ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid="sales-vs-goal">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Sales vs Goal</h2>
            <p className="text-xs text-neutral-500">2026 goal pacing through September</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <MiniKpi label="Net Sales YTD" value={usdM(svgTotal.ytd)} />
            <MiniKpi label="Goal YTD" value={usdM(svgTotal.goalYtd)} />
            <MiniKpi label="Variance" value={usdM(svgTotal.ytd - svgTotal.goalYtd)} tone="rose" />
            <MiniKpi label="% to Goal" value={`${Math.round((svgTotal.ytd / svgTotal.goalYtd) * 100)}%`} tone="coral" />
            <div className="flex items-center gap-1">
              <button className="grid h-8 w-8 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50" title="Excel" data-testid="svg-excel"><FileSpreadsheet size={14} /></button>
              <button className="grid h-8 w-8 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50" title="PDF" data-testid="svg-pdf"><FileText size={14} /></button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 w-fit" role="tablist">
          <button onClick={() => setSvgMode('class')} className={`rounded-md px-3 py-1 text-xs font-semibold ${svgMode === 'class' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`} data-testid="svg-by-class">By Class</button>
          <button onClick={() => setSvgMode('month')} className={`rounded-md px-3 py-1 text-xs font-semibold ${svgMode === 'month' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`} data-testid="svg-by-month">By Month</button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-neutral-500">
                <th className="pb-2 font-semibold">Class</th>
                <th className="pb-2 text-right font-semibold">Net Sales YTD</th>
                <th className="pb-2 text-right font-semibold">Goal YTD</th>
                <th className="pb-2 text-right font-semibold">Variance</th>
                <th className="pb-2 text-right font-semibold w-[220px]">% to Goal</th>
                <th className="pb-2 text-right font-semibold">Annual Goal</th>
              </tr>
            </thead>
            <tbody>
              {svg.map((r) => {
                const variance = r.ytd - r.goalYtd;
                const pct = Math.round((r.ytd / r.goalYtd) * 100);
                return (
                  <tr key={r.cls} className="border-t border-neutral-100">
                    <td className="py-3 font-medium text-neutral-800">{r.cls}</td>
                    <td className="py-3 text-right text-neutral-900">{usdM(r.ytd)}</td>
                    <td className="py-3 text-right text-neutral-600">{usdM(r.goalYtd)}</td>
                    <td className="py-3 text-right font-semibold text-rose-600">{usdM(variance)}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-3">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: CORAL }} />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold" style={{ color: CORAL }}>{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-neutral-600">{usdM(r.annual)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-neutral-200 bg-neutral-50/50">
                <td className="py-3 font-bold text-neutral-900">Total</td>
                <td className="py-3 text-right font-bold text-neutral-900">{usdM(svgTotal.ytd)}</td>
                <td className="py-3 text-right font-semibold text-neutral-800">{usdM(svgTotal.goalYtd)}</td>
                <td className="py-3 text-right font-bold text-rose-600">{usdM(svgTotal.ytd - svgTotal.goalYtd)}</td>
                <td className="py-3">
                  <div className="flex items-center justify-end gap-3">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full" style={{ width: `${Math.round((svgTotal.ytd / svgTotal.goalYtd) * 100)}%`, background: CORAL }} />
                    </div>
                    <span className="w-10 text-right text-xs font-bold" style={{ color: CORAL }}>{Math.round((svgTotal.ytd / svgTotal.goalYtd) * 100)}%</span>
                  </div>
                </td>
                <td className="py-3 text-right font-semibold text-neutral-800">{usdM(svgTotal.annual)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Top Accounts + Top Items ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid="top-accounts">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Top Accounts</h2>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Net Sales · YTD</span>
          </div>
          <ol className="space-y-4">
            {topAccts.map((a) => (
              <li key={a.name} className="grid grid-cols-[24px_1fr_auto] items-center gap-x-3 gap-y-1" data-testid={`top-account-${a.rank}`}>
                <span className="text-sm font-bold text-neutral-400">{a.rank}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">{a.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">{usdM(a.ytd)}</span>
                  <SmallDeltaPill v={a.delta} />
                </div>
                <span />
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full" style={{ width: `${(a.ytd / topA) * 100}%`, background: `linear-gradient(90deg, #1a1d1c 0%, #2c312d 60%, ${CORAL} 100%)` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid="top-items">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Top Items</h2>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Revenue · YTD</span>
          </div>
          <ol className="space-y-4">
            {topItems.map((it) => (
              <li key={it.sku} className="grid grid-cols-[24px_1fr_auto] items-center gap-x-3 gap-y-1" data-testid={`top-item-${it.rank}`}>
                <span className="text-sm font-bold text-neutral-400">{it.rank}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">{it.name} <span className="font-normal text-neutral-500">· {it.variant}</span></p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-500">{it.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-900">{usdM(it.rev)}</p>
                  <p className="text-[11px] text-neutral-500">{it.units.toLocaleString('en-US')} units</p>
                </div>
                <span />
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full" style={{ width: `${(it.rev / topI) * 100}%`, background: `linear-gradient(90deg, #1a1d1c 0%, #2c312d 60%, ${CORAL} 100%)` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'rose' | 'coral' }) {
  const cls = tone === 'rose' ? 'text-rose-600' : tone === 'coral' ? '' : 'text-neutral-900';
  const style = tone === 'coral' ? { color: CORAL } : undefined;
  return (
    <div className="min-w-[100px]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${cls}`} style={style}>{value}</p>
    </div>
  );
}

function DonutCard({ title, data, testId }: { title: string; data: typeof channelMix; testId: string }) {
  const total = useMemo(() => data.reduce((s, d) => s + d.v, 0), [data]);
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid={testId}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">% of Net Sales YTD</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[190px_1fr] md:items-center">
        <div className="relative mx-auto h-[180px] w-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="v" nameKey="k" innerRadius={56} outerRadius={82} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {data.map((d) => <Cell key={d.k} fill={d.c} />)}
              </Pie>
              <Tooltip formatter={(v: number) => usdM(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">Total</span>
            <strong className="text-xl font-bold text-neutral-900">{usdM(total)}</strong>
          </div>
        </div>
        <ul className="space-y-2">
          {data.map((d) => (
            <li key={d.k} className="flex items-center gap-3 text-sm">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: d.c }} />
              <span className="flex-1 text-neutral-700">{d.k}</span>
              <b className="text-neutral-900">{usdM(d.v)}</b>
              <span className="w-12 text-right text-xs text-neutral-500">{d.pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
