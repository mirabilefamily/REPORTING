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
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
} from 'lucide-react';

type Props = { name?: string; onNavigate?: (label: string) => void };

const CORAL = '#FC7460';
const CORAL_LIGHT = '#FF9678';
const CORAL_SOFT = '#FF8A76';
const INK = '#0F1214';
const TOTAL_NAVY = '#1E3A8A';

// Softer, more executive-feeling segment colors
const C_USW = '#22C55E';
const C_DIST = '#3B82F6';
const C_RETAIL = '#F59E0B';
const C_ECOM = '#8B5CF6';
const C_AMZN = '#EC4899';
const C_OPEN = '#86EFAC';

const BORDER = 'rgb(232 236 240)';
const TRACK = '#F0F1F2';
const MUTED = '#8A8E93';

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } as const;

const usd0 = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const fmtM = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
};
const fmtMShort = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
};

// ─── Data (from user spec, verbatim) ─────────────────────────────────
const SEGMENTS = ['All', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;

const SHARE = { usw: 0.37, dist: 0.30, ecom: 0.26, amzn: 0.05, retail: 0.02 };
const MONTH_TOTAL_M = [1.35, 2.45, 1.55, 1.75, 1.90, 1.85, 2.45, 2.65, 1.55, 1.30, 2.30, 2.10];
const OPEN_TAIL_M   = [0,    0,    0,    0,    0,    0,    0,    0,    0,    0.35, 0.55, 0.70];
const FORECAST_M    = [1.50, 2.55, 1.70, 1.90, 2.10, 2.30, 3.00, 2.80, 1.90, 1.70, 2.60, 2.50];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTHLY = MONTHS.map((m, i) => {
  const total = MONTH_TOTAL_M[i] * 1e6;
  return {
    m,
    usw: total * SHARE.usw,
    dist: total * SHARE.dist,
    retail: total * SHARE.retail,
    ecom: total * SHARE.ecom,
    amzn: total * SHARE.amzn,
    open: OPEN_TAIL_M[i] * 1e6,
    total,
    forecast: FORECAST_M[i] * 1e6,
  };
});

const SEGMENT_ROWS = [
  { key: 'US Wholesale', pct: 71, cur: 6_480_000, tgt: 9_180_000, c: C_USW },
  { key: 'Distributors', pct: 62, cur: 5_240_000, tgt: 8_410_000, c: C_DIST },
  { key: 'Retail',       pct: 72, cur:   462_000, tgt:   640_000, c: C_RETAIL },
  { key: 'Ecommerce',    pct: 68, cur: 4_550_000, tgt: 6_730_000, c: C_ECOM },
  { key: 'Amazon',       pct: 77, cur:   785_000, tgt: 1_020_000, c: C_AMZN },
];

const DONUT_ALL = [
  { name: 'US Wholesale', v: 6_480_000, share: 37.0, c: C_USW },
  { name: 'Distributors', v: 5_240_000, share: 29.9, c: C_DIST },
  { name: 'Ecommerce',    v: 4_550_000, share: 26.0, c: C_ECOM },
  { name: 'Amazon',       v:   785_000, share:  4.5, c: C_AMZN },
  { name: 'Retail',       v:   462_000, share:  2.6, c: C_RETAIL },
];
const DONUT_B2B = [
  { name: 'B2B',       v: 11_720_000, share: 66.9, c: C_USW },
  { name: 'Ecommerce', v:  4_550_000, share: 26.0, c: C_ECOM },
  { name: 'Amazon',    v:    785_000, share:  4.5, c: C_AMZN },
  { name: 'Retail',    v:    462_000, share:  2.6, c: C_RETAIL },
];

const SVG_ROWS = [
  { name: 'US Wholesale', c: C_USW,    net: 6_480_000, goal: 7_580_000, variance: -1_100_000, pct: 86, annual: 9_180_000 },
  { name: 'Distributors', c: C_DIST,   net: 5_240_000, goal: 5_750_000, variance:   -518_000, pct: 91, annual: 8_410_000 },
  { name: 'Retail',       c: C_RETAIL, net:   462_000, goal:   483_000, variance:    -22_000, pct: 96, annual:   640_000 },
  { name: 'Ecommerce',    c: C_ECOM,   net: 4_550_000, goal: 5_040_000, variance:   -494_000, pct: 90, annual: 6_730_000 },
  { name: 'Amazon',       c: C_AMZN,   net:   785_000, goal:   827_000, variance:    -42_000, pct: 95, annual: 1_020_000 },
];
const SVG_TOTAL = { net: 17_510_000, goal: 19_690_000, variance: -2_170_000, pct: 89, annual: 25_980_000 };

const TOP_ACCOUNTS = [
  { name: 'Lids',                            net: 2_720_000, yoy: -24.8 },
  { name: 'SASAtrend',                       net: 1_460_000, yoy:  -4.7 },
  { name: 'Industrias Mercury, S.A.',        net: 1_030_000, yoy:  53.7 },
  { name: 'Nordstrom Accounts Payable',      net:   726_000, yoy: -20.2 },
  { name: 'Buckle Inc., The',                net:   617_000, yoy: -54.8 },
];

const TOP_ITEMS = [
  { name: 'Panther Trucker',            variant: 'Void · One Size',                     sku: '101-2450-VOI01-O/S',            rev: 287_000, units: 25_132 },
  { name: 'Suede Black Panther',        variant: 'Dust / Void · One Size',              sku: '101-2961-DUS02-O/S',            rev: 120_000, units:  7_957 },
  { name: 'Black Sheep Trucker',        variant: 'Void · One Size',                     sku: '101-2457-VOI01-O/S',            rev: 111_000, units:  7_521 },
  { name: 'Suede Colorful Rooster',     variant: 'Dust White / Void Black · One Size',  sku: '101-3849-WHT02/BLK01-O/S',      rev: 103_000, units:  6_058 },
  { name: 'The Alpha Dog',              variant: 'Void · One Size',                     sku: '101-1666-VOI01-O/S',            rev:  77_000, units:  4_826 },
];

// ─── Reusable atoms ───────────────────────────────────────────────────
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.14em]';
const eyebrowStyle = { color: MUTED } as const;

function SegTabs({ tabs, value, onChange, testId, slugPrefix }: { tabs: readonly string[]; value: string; onChange: (v: any) => void; testId: string; slugPrefix: string }) {
  return (
    <div
      className="inline-flex items-center gap-[2px] rounded-full p-1"
      role="tablist"
      style={{ background: '#EEEEEC' }}
      data-testid={testId}
    >
      {tabs.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t)}
            data-testid={`${slugPrefix}-${t.toLowerCase().replace(/\s+/g, '-')}`}
            className="rounded-full px-4 py-2 text-[13.5px] tracking-tight transition focus:outline-none"
            style={
              active
                ? {
                    background: '#FFFFFF',
                    color: '#0F1214',
                    fontWeight: 700,
                    boxShadow: '0 1px 2px rgba(15,17,20,0.06), 0 2px 6px rgba(15,17,20,0.04)',
                    border: '1px solid rgba(15,17,20,0.06)',
                  }
                : {
                    color: '#8A8E93',
                    fontWeight: 600,
                    border: '1px solid transparent',
                    background: 'transparent',
                  }
            }
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid rgba(252,116,96,0.35)'; e.currentTarget.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = ''; }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#4B5058'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#8A8E93'; }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function DeltaPill({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
      style={{
        ...TABULAR,
        background: up ? 'rgba(16,185,129,0.10)' : 'rgba(244,63,94,0.10)',
        color: up ? '#059669' : '#E11D48',
      }}
    >
      {up ? <ArrowUp size={10} strokeWidth={2.6} /> : <ArrowDown size={10} strokeWidth={2.6} />}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function HeroKPI({ label, value, sub, testId }: { label: string; value: string; sub?: string; testId: string }) {
  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <p className={EYEBROW} style={eyebrowStyle}>{label}</p>
      <p
        className="text-[32px] font-bold leading-none tracking-tight"
        style={{ ...TABULAR, letterSpacing: '-0.03em', color: INK }}
      >
        {value}
      </p>
      {sub && <p className="text-[11.5px] leading-snug text-neutral-500" style={TABULAR}>{sub}</p>}
    </div>
  );
}

function Donut({ title, headerRight, data, testId }: { title: string; headerRight?: string; data: typeof DONUT_ALL; testId: string }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  return (
    <div
      className="rounded-3xl bg-white p-8"
      style={{ border: `1px solid ${BORDER}` }}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={EYEBROW} style={eyebrowStyle}>Channel Mix</p>
          <h3 className="mt-1.5 text-[16px] font-bold tracking-tight" style={{ color: INK }}>{title}</h3>
        </div>
        {headerRight && (
          <span className={EYEBROW} style={eyebrowStyle}>{headerRight}</span>
        )}
      </div>

      <div className="mt-5 flex items-center gap-7">
        <div className="relative h-[196px] w-[196px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="v" innerRadius={64} outerRadius={92} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {data.map((d, i) => <Cell key={i} fill={d.c} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtM(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUTED }}>YTD</p>
              <p className="mt-1 text-[20px] font-bold tracking-tight" style={{ ...TABULAR, color: INK }}>{fmtM(total)}</p>
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-3">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2.5 text-[13px]" data-testid={`${testId}-item-${d.name.toLowerCase().replace(/\s+/g, '-')}`}>
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: d.c }} />
              <span className="min-w-0 flex-1 truncate text-neutral-700">{d.name}</span>
              <b className="text-neutral-900" style={TABULAR}>{fmtM(d.v)}</b>
              <span className="w-12 text-right text-[11.5px] font-semibold text-neutral-500" style={TABULAR}>{d.share.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Swatch({ color, label, dashed = false, line = false }: { color: string; label: string; dashed?: boolean; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600" style={TABULAR}>
      {line ? (
        <span
          className="inline-block h-[2px] w-5 rounded"
          style={{ background: dashed ? 'transparent' : color, borderTop: dashed ? `2px dashed ${color}` : 'none' }}
        />
      ) : (
        <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage({ onNavigate }: Props) {
  const [seg, setSeg] = useState<string>('All');
  const [svgTab, setSvgTab] = useState<'By Class' | 'By Month'>('By Class');

  const netSalesYTD = 9_166_708;
  const openOrders = 26_679_135;
  const total = 26_679_135;
  const forecast = 25_980_800;

  const topAcctMax = TOP_ACCOUNTS[0].net;
  const topItemMax = TOP_ITEMS[0].rev;
  const yTicks = useMemo(() => [0, 1.3e6, 2.5e6, 3.8e6, 5e6], []);

  return (
    <div className="min-h-full space-y-8 p-1" data-testid="dashboard-page" style={TABULAR}>
      {/* ── Section 1: Segment Tabs (first content element) ─────────── */}
      <header className="flex flex-wrap items-center justify-end gap-4" data-testid="dashboard-header">
        <SegTabs tabs={SEGMENTS} value={seg} onChange={setSeg} testId="segment-tabs" slugPrefix="seg" />
      </header>

      {/* ── Section 2: LIGHT Hero Card (4 KPIs + Annual Goal) ───────── */}
      <section
        className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8"
        style={{
          border: `1px solid ${BORDER}`,
          backgroundImage: 'linear-gradient(135deg, rgba(252,116,96,0.05) 0%, rgba(252,116,96,0) 55%)',
        }}
        data-testid="hero-card"
      >
        {/* 4 KPIs */}
        <div className="grid grid-cols-2 gap-6 xl:grid-cols-4 xl:gap-8">
          {/* Net Sales YTD (with coral accent bar + delta pill + caption) */}
          <div
            data-testid="kpi-net-sales"
            className="relative xl:border-r xl:pr-8"
            style={{ borderColor: BORDER }}
          >
            <p className={EYEBROW} style={eyebrowStyle}>Net Sales YTD</p>
            <div className="mt-3 flex items-baseline gap-3">
              <p
                className="text-[64px] font-bold leading-none tracking-tight"
                style={{ ...TABULAR, letterSpacing: '-0.035em', color: INK }}
              >
                {usd0(netSalesYTD)}
              </p>
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-semibold"
                style={{ ...TABULAR, background: 'rgba(16,185,129,0.10)', color: '#059669' }}
              >
                <ArrowUp size={11} strokeWidth={2.6} />25.6%
              </span>
            </div>
            <span
              className="mt-3 block h-[2px] w-9 rounded-full"
              style={{ background: 'rgba(252,116,96,0.6)' }}
            />
            <p className="mt-3 text-[12px] leading-snug text-neutral-500">After discounts, returns &amp; tax · shipping included</p>
          </div>

          <div
            className="xl:border-r xl:pr-8"
            style={{ borderColor: BORDER }}
          >
            <HeroKPI label="Open Orders" value={usd0(openOrders)} testId="kpi-open-orders" />
          </div>
          <div
            className="xl:border-r xl:pr-8"
            style={{ borderColor: BORDER }}
          >
            <HeroKPI label="Total" value={usd0(total)} sub="Net Sales + Open Orders" testId="kpi-total" />
          </div>
          <HeroKPI label="Forecast" value={usd0(forecast)} testId="kpi-forecast" />
        </div>

        {/* Annual Goal Progress */}
        <div
          className="mt-8 pt-6"
          style={{ borderTop: `1px solid ${BORDER}` }}
          data-testid="annual-goal"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={EYEBROW} style={eyebrowStyle}>Annual Goal Progress</p>
              <div className="mt-2 flex items-baseline gap-3">
                <p
                  className="text-[42px] font-bold leading-none tracking-tight"
                  style={{ ...TABULAR, letterSpacing: '-0.03em', color: INK }}
                >
                  67%
                </p>
                <span className="text-[13px] text-neutral-500" style={TABULAR}>$17.51M of $25.98M</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#B45309' }}
                data-testid="behind-pace-pill"
              >
                Behind pace
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500" style={TABULAR}>
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: MUTED }} /> Pace 75%
              </span>
            </div>
          </div>
          <div
            className="mt-4 h-[10px] w-full overflow-hidden rounded-full"
            style={{ background: TRACK }}
            data-testid="goal-bar"
          >
            <span
              className="block h-full rounded-full"
              style={{ width: '67%', background: `linear-gradient(90deg, ${CORAL} 0%, ${CORAL_LIGHT} 100%)` }}
            />
          </div>
        </div>
      </section>

      {/* ── Section 3: AI Assist Strip ──────────────────────────────── */}
      <section
        className="rounded-3xl bg-white px-6 py-3.5"
        style={{ border: `1px solid ${BORDER}` }}
        data-testid="ai-strip"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="grid h-6 w-6 place-items-center rounded-full"
              style={{ background: `linear-gradient(135deg, ${CORAL} 0%, ${CORAL_LIGHT} 100%)` }}
            >
              <Sparkles size={12} color="#fff" strokeWidth={2.4} />
            </span>
            <p className="text-[13px] text-neutral-700">
              <span className="font-semibold" style={{ color: INK }}>Claude</span> is analyzing your data…
            </p>
          </div>
          <button
            data-testid="ai-strip-view-insights"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold transition hover:opacity-80"
            style={{ color: CORAL }}
          >
            View insights <ArrowUpRight size={13} />
          </button>
        </div>
      </section>

      {/* ── Section 4: Revenue by Month + Segments panel ────────────── */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)]">
        <div
          className="rounded-3xl bg-white p-8"
          style={{ border: `1px solid ${BORDER}` }}
          data-testid="rev-by-month"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={EYEBROW} style={eyebrowStyle}>Monthly</p>
              <h2 className="mt-1.5 text-[16px] font-bold tracking-tight" style={{ color: INK }}>Revenue by Month</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Swatch color={C_USW}      label="US Wholesale" />
              <Swatch color={C_DIST}     label="Distributors" />
              <Swatch color={C_RETAIL}   label="Retail" />
              <Swatch color={C_ECOM}     label="Ecommerce" />
              <Swatch color={C_AMZN}     label="Amazon" />
              <Swatch color={C_OPEN}     label="Open Orders" />
              <Swatch color={TOTAL_NAVY} label="Total"    line />
              <Swatch color={CORAL}      label="Forecast" line dashed />
              <button
                data-testid="rev-export"
                className="ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <Download size={12} /> Export
              </button>
            </div>
          </div>

          <div className="mt-6 h-[340px]" style={TABULAR}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={MONTHLY} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgb(240 242 244)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: MUTED }} />
                <YAxis
                  ticks={yTicks}
                  domain={[0, 5e6]}
                  tickFormatter={fmtMShort}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: MUTED }}
                  width={56}
                />
                <Tooltip formatter={(v: number) => fmtM(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 12 }} />
                <Bar dataKey="usw"    stackId="s" fill={C_USW}    isAnimationActive={false} />
                <Bar dataKey="dist"   stackId="s" fill={C_DIST}   isAnimationActive={false} />
                <Bar dataKey="retail" stackId="s" fill={C_RETAIL} isAnimationActive={false} />
                <Bar dataKey="ecom"   stackId="s" fill={C_ECOM}   isAnimationActive={false} />
                <Bar dataKey="amzn"   stackId="s" fill={C_AMZN}   isAnimationActive={false} />
                <Bar dataKey="open"   stackId="s" fill={C_OPEN}   radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Line type="monotone" dataKey="total"    stroke={TOTAL_NAVY} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="forecast" stroke={CORAL}      strokeWidth={2} dot={false} strokeDasharray="5 4" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="rounded-3xl bg-white p-8"
          style={{ border: `1px solid ${BORDER}` }}
          data-testid="segment-panel"
        >
          <p className={EYEBROW} style={eyebrowStyle}>Segments</p>
          <h2 className="mt-1.5 text-[16px] font-bold tracking-tight" style={{ color: INK }}>Attainment</h2>
          <ul className="mt-6 space-y-5">
            {SEGMENT_ROWS.map((s) => (
              <li key={s.key} data-testid={`seg-row-${s.key.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: s.c }} />
                    <b className="font-semibold text-neutral-800">{s.key}</b>
                  </span>
                  <b style={{ ...TABULAR, color: INK }}>{s.pct}%</b>
                </div>
                <div className="mt-2 h-[5px] w-full overflow-hidden rounded-full" style={{ background: TRACK }}>
                  <span className="block h-full rounded-full" style={{ width: `${s.pct}%`, background: s.c }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-neutral-500" style={TABULAR}>
                  <span>{fmtM(s.cur)}</span>
                  <span>of {fmtM(s.tgt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Section 5: Channel Mix (2 donuts) ───────────────────────── */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2" data-testid="channel-mix">
        <Donut title="All Channels" headerRight="% of Net Sales YTD" data={DONUT_ALL} testId="donut-all" />
        <Donut title="B2B Combined" headerRight="% of Net Sales YTD" data={DONUT_B2B} testId="donut-b2b" />
      </section>

      {/* ── Section 6: Sales vs Goal ────────────────────────────────── */}
      <section
        className="rounded-3xl bg-white p-8"
        style={{ border: `1px solid ${BORDER}` }}
        data-testid="sales-vs-goal"
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight" style={{ color: INK }}>Sales vs Goal</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">2026 goal pacing through September</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                data-testid="svg-export-excel"
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
                style={{ border: `1px solid transparent` }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = BORDER)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <FileSpreadsheet size={12} /> Excel
              </button>
              <button
                data-testid="svg-export-pdf"
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-neutral-600 transition hover:text-neutral-900"
                style={{ border: `1px solid transparent` }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = BORDER)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <FileText size={12} /> PDF
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-x-8" data-testid="svg-kpis">
            <div className="text-right">
              <p className={EYEBROW} style={eyebrowStyle}>Net Sales YTD</p>
              <p className="mt-1.5 text-[20px] font-bold tracking-tight" style={{ ...TABULAR, color: INK }}>$17.51M</p>
            </div>
            <span className="hidden h-6 w-px md:block" style={{ background: BORDER }} aria-hidden="true" />
            <div className="text-right">
              <p className={EYEBROW} style={eyebrowStyle}>Goal YTD</p>
              <p className="mt-1.5 text-[20px] font-bold tracking-tight" style={{ ...TABULAR, color: INK }}>$19.69M</p>
            </div>
            <span className="hidden h-6 w-px md:block" style={{ background: BORDER }} aria-hidden="true" />
            <div className="text-right">
              <p className={EYEBROW} style={eyebrowStyle}>Variance</p>
              <p className="mt-1.5 text-[20px] font-bold tracking-tight text-rose-600" style={TABULAR}>-$2.17M</p>
            </div>
            <span className="hidden h-6 w-px md:block" style={{ background: BORDER }} aria-hidden="true" />
            <div className="text-right">
              <p className={EYEBROW} style={eyebrowStyle}>% to Goal</p>
              <p className="mt-1.5 text-[20px] font-bold tracking-tight" style={{ ...TABULAR, color: CORAL }}>89%</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6" data-testid="svg-tabs-wrap">
          <SegTabs tabs={['By Class', 'By Month']} value={svgTab} onChange={setSvgTab} testId="svg-tabs" slugPrefix="svg-tab" />
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <div
            className={`grid grid-cols-[minmax(180px,1.4fr)_120px_110px_110px_minmax(160px,1.2fr)_120px] items-center gap-x-4 pb-2.5 ${EYEBROW}`}
            style={{ ...eyebrowStyle, borderBottom: `1px solid ${BORDER}` }}
          >
            <span>Class</span>
            <span className="text-right">Net Sales YTD</span>
            <span className="text-right">Goal YTD</span>
            <span className="text-right">Variance</span>
            <span>% to Goal</span>
            <span className="text-right">Annual Goal</span>
          </div>
          {SVG_ROWS.map((r) => (
            <div
              key={r.name}
              className="grid grid-cols-[minmax(180px,1.4fr)_120px_110px_110px_minmax(160px,1.2fr)_120px] items-center gap-x-4 py-4 text-[13px] last:border-b-0 hover:bg-neutral-50/60"
              style={{ borderBottom: `1px solid ${BORDER}` }}
              data-testid={`svg-row-${r.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-full" style={{ background: r.c }} />
                <b className="truncate font-semibold" style={{ color: INK }}>{r.name}</b>
              </span>
              <b className="text-right" style={{ ...TABULAR, color: INK }}>{fmtM(r.net)}</b>
              <span className="text-right text-neutral-700" style={TABULAR}>{fmtM(r.goal)}</span>
              <span className="text-right font-semibold text-rose-600" style={TABULAR}>{fmtM(r.variance)}</span>
              <span className="flex items-center gap-3">
                <span className="relative h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: TRACK }}>
                  <span
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ width: `${r.pct}%`, background: `linear-gradient(90deg, ${CORAL} 0%, ${CORAL_LIGHT} 100%)` }}
                  />
                </span>
                <b className="w-10 text-right text-[12px] font-bold" style={{ ...TABULAR, color: CORAL }}>{r.pct}%</b>
              </span>
              <span className="text-right text-neutral-700" style={TABULAR}>{fmtM(r.annual)}</span>
            </div>
          ))}
          {/* Total row */}
          <div
            className="grid grid-cols-[minmax(180px,1.4fr)_120px_110px_110px_minmax(160px,1.2fr)_120px] items-center gap-x-4 py-4 text-[13.5px] font-bold"
            style={{ borderTop: `2px solid ${BORDER}` }}
            data-testid="svg-total-row"
          >
            <span style={{ color: INK }}>Total</span>
            <b className="text-right" style={{ ...TABULAR, color: INK }}>{fmtM(SVG_TOTAL.net)}</b>
            <span className="text-right" style={{ ...TABULAR, color: INK }}>{fmtM(SVG_TOTAL.goal)}</span>
            <span className="text-right text-rose-600" style={TABULAR}>{fmtM(SVG_TOTAL.variance)}</span>
            <span className="flex items-center gap-3">
              <span className="relative h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: TRACK }}>
                <span
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${SVG_TOTAL.pct}%`, background: `linear-gradient(90deg, ${CORAL} 0%, ${CORAL_LIGHT} 100%)` }}
                />
              </span>
              <b className="w-10 text-right text-[12px]" style={{ ...TABULAR, color: CORAL }}>{SVG_TOTAL.pct}%</b>
            </span>
            <span className="text-right" style={{ ...TABULAR, color: INK }}>{fmtM(SVG_TOTAL.annual)}</span>
          </div>
        </div>
      </section>

      {/* ── Section 7: Top Accounts + Top Items ─────────────────────── */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Top Accounts */}
        <div
          className="rounded-3xl bg-white p-8"
          style={{ border: `1px solid ${BORDER}` }}
          data-testid="top-accounts"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className={EYEBROW} style={eyebrowStyle}>Leaderboard</p>
              <h2 className="mt-1.5 text-[16px] font-bold tracking-tight" style={{ color: INK }}>Top Accounts</h2>
            </div>
            <span className={EYEBROW} style={eyebrowStyle}>Net Sales · YTD</span>
          </div>
          <ol className="mt-5 space-y-4">
            {TOP_ACCOUNTS.map((a, i) => {
              const share = (a.net / topAcctMax) * 100;
              const isFirst = i === 0;
              return (
                <li
                  key={a.name}
                  className="grid grid-cols-[22px_minmax(0,1fr)_auto_auto] items-center gap-3 -mx-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(15,17,20,0.02)]"
                  data-testid={`top-acct-${i}`}
                >
                  <span
                    className="grid h-[22px] w-[22px] place-items-center rounded-full text-[11px] font-bold"
                    style={{ background: isFirst ? CORAL_SOFT : TRACK, color: isFirst ? '#fff' : '#3d3f3c' }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <b className="block truncate text-[13.5px] font-semibold" style={{ color: INK }}>{a.name}</b>
                    <div className="mt-1.5 h-[4px] w-full overflow-hidden rounded-full" style={{ background: TRACK }}>
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${share}%`, background: `linear-gradient(90deg, ${INK} 0%, ${CORAL} 100%)` }}
                      />
                    </div>
                  </div>
                  <b className="text-right text-[13.5px]" style={{ ...TABULAR, color: INK }}>{fmtM(a.net)}</b>
                  <DeltaPill v={a.yoy} />
                </li>
              );
            })}
          </ol>
        </div>

        {/* Top Items */}
        <div
          className="rounded-3xl bg-white p-8"
          style={{ border: `1px solid ${BORDER}` }}
          data-testid="top-items"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className={EYEBROW} style={eyebrowStyle}>Products</p>
              <h2 className="mt-1.5 text-[16px] font-bold tracking-tight" style={{ color: INK }}>Top Items</h2>
            </div>
            <span className={EYEBROW} style={eyebrowStyle}>Revenue · YTD</span>
          </div>
          <ol className="mt-5 space-y-4">
            {TOP_ITEMS.map((it, i) => {
              const share = (it.rev / topItemMax) * 100;
              const isFirst = i === 0;
              return (
                <li
                  key={it.sku}
                  className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 -mx-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(15,17,20,0.02)]"
                  data-testid={`top-item-${i}`}
                >
                  <span
                    className="grid h-[22px] w-[22px] place-items-center rounded-full text-[11px] font-bold"
                    style={{ background: isFirst ? CORAL_SOFT : TRACK, color: isFirst ? '#fff' : '#3d3f3c' }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                      <b className="text-[13.5px] font-semibold" style={{ color: INK }}>{it.name}</b>
                      <span className="text-[11.5px] text-neutral-500">· {it.variant}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500" style={MONO}>{it.sku}</p>
                    <div className="mt-1.5 h-[4px] w-full overflow-hidden rounded-full" style={{ background: TRACK }}>
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${share}%`, background: `linear-gradient(90deg, ${INK} 0%, ${CORAL} 100%)` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <b className="block text-[13.5px]" style={{ ...TABULAR, color: INK }}>{fmtM(it.rev)}</b>
                    <span className="text-[11px] text-neutral-500" style={TABULAR}>{it.units.toLocaleString('en-US')} units</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}
