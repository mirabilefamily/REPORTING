import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
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
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';
import DateRangePicker from './components/DateRangePicker';
import { usePageRange } from './lib/pageRange';
import AccountDrilldown from './AccountDrilldown';

type Props = { name?: string; onNavigate?: (label: string) => void };

// ─── Design tokens ────────────────────────────────────────────────────
const CORAL = '#FF6F61';
const CORAL_LIGHT = '#FF9678';
const CORAL_SOFT = '#FF8A76';
const CORAL_DEEP = '#EE5A44';
const INK = '#0A0A0A';
const INK_SOFT = '#171717';
const TOTAL_NAVY = '#0A0A0A';
const LY_GRAY = '#94A3B8';
const BORDER = '#E5E5E5';
const RULE = '#E5E5E5';
const TRACK = '#EFEFEF';
const MUTED = '#525252';
const BODY = '#171717';
const FAINT = '#A3A3A3';
const CANVAS = '#FAFAFA';
const CARD_GRAD = 'linear-gradient(180deg, #FFFFFF 0%, #FAFAF9 100%)';
const CORAL_GRAD_V = `linear-gradient(180deg, ${CORAL} 0%, ${CORAL_DEEP} 100%)`;
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const INSET_TRACK = 'inset 0 1px 2px rgba(15,17,20,0.04)';

// Segment palette
// ─── Locked segment color palette (single source of truth) ────────────
// Slate-900 anchor + 4-step coral ramp (dark → light). Used by Channel Mix + Revenue by month.
const C_USW    = '#0F172A'; // slate-900 (anchor)
const C_DIST   = '#C9422E'; // coral-700 (dark burnt coral)
const C_ECOM   = '#FF6F61'; // coral-500 (brand coral)
const C_AMZN   = '#FFA195'; // coral-300 (light coral)
const C_RETAIL = '#FFD2CB'; // coral-200 (pale coral)
export const SEG_COLORS: Record<string, string> = {
  'US Wholesale': C_USW,
  'Distributors': C_DIST,
  'Ecommerce':    C_ECOM,
  'Amazon':       C_AMZN,
  'Retail':       C_RETAIL,
};
const C_OPEN = '#D4D4D4';

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.08em]';
const eyebrowStyle = { color: MUTED } as const;
const BAR_TRANS = 'width 700ms cubic-bezier(0.22, 1, 0.36, 1)';

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

// ─── Data ─────────────────────────────────────────────────────────────
const SEGMENTS = ['All', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
type SegKey = typeof SEGMENTS[number];

const SEG_SCALE: Record<SegKey, number> = {
  'All': 1.0, 'US Wholesale': 0.559, 'Distributors': 0.451,
  'Retail': 0.040, 'Ecommerce': 0.393, 'Amazon': 0.068,
};
const SEG_KEY: Record<SegKey, string> = {
  'All': 'all', 'US Wholesale': 'usw', 'Distributors': 'dist',
  'Retail': 'retail', 'Ecommerce': 'ecom', 'Amazon': 'amzn',
};

const RANGE_SCALE: Record<string, number> = {
  'YTD':      1.00,
  'QTD':      0.28,
  'Last 30d': 0.083,
  'Custom':   1.00,
};
const RANGE_LABEL: Record<string, string> = {
  'YTD':      'YTD',
  'QTD':      'QTD',
  'Last 30d': 'LAST 30D',
  'Custom':   'CUSTOM RANGE',
};
const SVG_SUBTITLE: Record<string, string> = {
  'YTD':      '2026 goal pacing through September',
  'QTD':      'Q3 2026 pacing',
  'Last 30d': 'Last 30 days',
  'Custom':   'Custom range',
};
const MONTHS_VISIBLE: Record<string, number> = {
  'YTD':      12,
  'QTD':      3,
  'Last 30d': 4,
  'Custom':   12,
};

const SHARE = { usw: 0.37, dist: 0.30, ecom: 0.26, amzn: 0.05, retail: 0.02 };
const MONTH_TOTAL_M = [1.35, 2.45, 1.55, 1.75, 1.90, 1.85, 2.45, 2.65, 1.55, 1.30, 2.30, 2.10];
const OPEN_TAIL_M   = [0,    0,    0,    0,    0,    0,    0,    0,    0,    0.35, 0.55, 0.70];
const FORECAST_M    = [1.50, 2.55, 1.70, 1.90, 2.10, 2.30, 3.00, 2.80, 1.90, 1.70, 2.60, 2.50];
const LY_M          = [1.55, 2.10, 1.40, 1.62, 1.70, 1.60, 2.05, 2.15, 1.40, 1.60, 2.75, 2.35];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTHLY_BASE = MONTHS.map((m, i) => {
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
    ly: LY_M[i] * 1e6,
  };
});

const SEGMENT_ROWS = [
  { key: 'US Wholesale', pct: 71, cur: 6_480_000, tgt: 9_180_000, c: C_USW },
  { key: 'Distributors', pct: 62, cur: 5_240_000, tgt: 8_410_000, c: C_DIST },
  { key: 'Retail',       pct: 72, cur:   462_000, tgt:   640_000, c: C_RETAIL },
  { key: 'Ecommerce',    pct: 68, cur: 4_550_000, tgt: 6_730_000, c: C_ECOM },
  { key: 'Amazon',       pct: 77, cur:   785_000, tgt: 1_020_000, c: C_AMZN },
];

const SEG_TREND: Record<string, 'up' | 'down'> = {
  'US Wholesale': 'up',
  'Distributors': 'down',
  'Retail':       'up',
  'Ecommerce':    'down',
  'Amazon':       'up',
};

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

// Movers (gainers + decliners) — biggest changes vs prior period
const GAINERS = [
  { name: 'Industrias Mercury, S.A.',       type: 'Account', yoy:  53.7, v: 1_030_000 },
  { name: 'Dusty Baker 5-Panel Cord',       type: 'Item',    yoy:  42.1, v:   986_000 },
  { name: 'Dean Vintage Canvas Trucker',    type: 'Item',    yoy:  31.4, v: 1_412_000 },
  { name: 'Farmer Full Grain Leather',      type: 'Item',    yoy:  22.8, v:   862_000 },
  { name: 'SASAtrend',                      type: 'Account', yoy:  12.4, v: 1_460_000 },
];
const DECLINERS = [
  { name: 'Buckle Inc., The',               type: 'Account', yoy: -54.8, v:   617_000 },
  { name: 'Lids',                           type: 'Account', yoy: -24.8, v: 2_720_000 },
  { name: 'Nordstrom Accounts Payable',     type: 'Account', yoy: -20.2, v:   726_000 },
  { name: 'Angler Mesh Snapback',           type: 'Item',    yoy: -18.5, v:   704_000 },
  { name: 'Panther Trucker',                type: 'Item',    yoy: -14.2, v:   287_000 },
];

const TOP_ACCOUNTS = [
  { name: 'Lids',                       net: 2_720_000, yoy: -24.8, spark: [1.85, 1.70, 1.58, 1.42, 1.30, 1.18, 1.22, 1.05, 0.95, 0.82, 0.75, 0.68], trend: 'down' as const },
  { name: 'SASAtrend',                  net: 1_460_000, yoy:  -4.7, spark: [1.20, 1.15, 1.18, 1.12, 1.10, 1.08, 1.05, 1.02, 1.00, 0.98, 0.95, 0.98], trend: 'down' as const },
  { name: 'Industrias Mercury, S.A.',   net: 1_030_000, yoy:  53.7, spark: [0.55, 0.60, 0.62, 0.68, 0.72, 0.80, 0.85, 0.90, 0.95, 1.00, 1.08, 1.14], trend: 'up' as const },
  { name: 'Nordstrom Accounts Payable', net:   726_000, yoy: -20.2, spark: [0.95, 0.92, 0.88, 0.84, 0.80, 0.78, 0.75, 0.72, 0.68, 0.66, 0.62, 0.60], trend: 'down' as const },
  { name: 'Buckle Inc., The',           net:   617_000, yoy: -54.8, spark: [1.38, 1.25, 1.10, 0.95, 0.82, 0.74, 0.70, 0.64, 0.58, 0.52, 0.48, 0.45], trend: 'down' as const },
];

const TOP_ITEMS = [
  { name: 'Panther Trucker',        variant: 'Void · One Size',                     sku: '101-2450-VOI01-O/S',       rev: 287_000, units: 25_132 },
  { name: 'Suede Black Panther',    variant: 'Dust / Void · One Size',              sku: '101-2961-DUS02-O/S',       rev: 120_000, units:  7_957 },
  { name: 'Black Sheep Trucker',    variant: 'Void · One Size',                     sku: '101-2457-VOI01-O/S',       rev: 111_000, units:  7_521 },
  { name: 'Suede Colorful Rooster', variant: 'Dust White / Void Black · One Size',  sku: '101-3849-WHT02/BLK01-O/S', rev: 103_000, units:  6_058 },
  { name: 'The Alpha Dog',          variant: 'Void · One Size',                     sku: '101-1666-VOI01-O/S',       rev:  77_000, units:  4_826 },
];

// ─── Hooks ────────────────────────────────────────────────────────────
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

function useCountUp(target: number, duration = 500) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { prev.current = target; setV(target); return; }
    let raf = 0;
    const start = performance.now();
    const from = prev.current;
    // easeOutQuart
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const val = from + (target - from) * ease(t);
      setV(val);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return v;
}

// Segment key ⇄ bar dataKey mapping (used for cross-module hover)
const SEG_TO_BAR_KEY: Record<string, string> = {
  'US Wholesale': 'usw', 'Distributors': 'dist', 'Retail': 'retail', 'Ecommerce': 'ecom', 'Amazon': 'amzn',
};

// Hero Net Sales trend line tooltip (month + value + MoM delta vs previous point)
function HeroTrendTooltip({ active, payload, label, monthly }: any) {
  if (!active || !payload?.length) return null;
  const cur = payload[0]?.payload ?? {};
  const idx = Array.isArray(monthly) ? monthly.findIndex((r: any) => r.m === label) : -1;
  const prev = idx > 0 ? monthly[idx - 1] : null;
  const t = cur.total ?? 0;
  const pt = prev?.total ?? 0;
  const mom = pt ? { d: t - pt, p: ((t - pt) / pt) * 100 } : { d: 0, p: 0 };
  const up = mom.d >= 0;
  return (
    <div
      style={{
        background: '#FFFFFF', borderRadius: 12, padding: 12,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)',
        minWidth: 180, ...TABULAR,
      }}
    >
      <p style={{ color: '#0F172A', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#0F172A', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>{fmtM(t)}</p>
      {prev && (
        <p style={{ marginTop: 4, fontSize: 11, fontWeight: 500, color: up ? '#047857' : '#C9422E' }}>
          {up ? '↑' : '↓'} {Math.abs(mom.p).toFixed(1)}% MoM
        </p>
      )}
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────
export function SegTabs({ tabs, value, onChange, testId, slugPrefix }: { tabs: readonly string[]; value: string; onChange: (v: any) => void; testId: string; slugPrefix: string }) {
  return (
    <div
      className="inline-flex items-center gap-[2px] rounded-2xl p-1"
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
            className="rounded-[10px] px-4 py-2 text-[14px] tracking-tight transition-colors duration-150 focus:outline-none"
            style={
              active
                ? {
                    background: '#FFFFFF',
                    color: '#0F1214',
                    fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(15,17,20,0.06), 0 2px 8px rgba(15,17,20,0.04)',
                    border: '1px solid rgba(15,17,20,0.06)',
                  }
                : {
                    color: '#52525B',
                    fontWeight: 500,
                    border: '1px solid transparent',
                    background: 'transparent',
                  }
            }
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid rgba(252,116,96,0.35)'; e.currentTarget.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = ''; }}
            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = '#27272A'; e.currentTarget.style.background = 'rgba(15,17,20,0.02)'; } }}
            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = '#52525B'; e.currentTarget.style.background = 'transparent'; } }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

export function DeltaPill({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-semibold"
      style={{
        ...TABULAR,
        color: up ? '#047857' : '#C9422E',
        background: up ? '#ECFDF5' : '#FFF1EF',
        padding: '3px 8px',
      }}
    >
      {up ? <ArrowUp size={10} strokeWidth={2.6} /> : <ArrowDown size={10} strokeWidth={2.6} />}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function Spark({ data, stroke = FAINT, gradId, width = 96, height = 24, endDot = false }: { data: number[]; stroke?: string; gradId: string; width?: number; height?: number; endDot?: boolean }) {
  const pts = data.map((v, i) => ({ i, v }));
  const lastIdx = pts.length - 1;
  return (
    <div style={{ width, height, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pts} margin={{ top: 2, right: 3, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={stroke} stopOpacity={0.14} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.25}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
            dot={endDot ? ((props: any) => (props.index === lastIdx
              ? <circle key={`ep-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill={stroke} />
              : <g key={`ep-${props.index}`} />)) as any : false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function HeroKPI({ label, target, sub, testId }: { label: string; target: number; sub?: React.ReactNode; testId: string }) {
  const v = useCountUp(target, 700);
  return (
    <div className="flex items-center justify-between gap-4 py-4" data-testid={testId} style={{ borderTop: `1px solid ${BORDER}` }}>
      <div className="min-w-0">
        <p className={EYEBROW} style={eyebrowStyle}>{label}</p>
        <p className="mt-1 text-[26px] font-bold leading-none" style={{ ...TABULAR, letterSpacing: '-0.015em', color: BODY }}>
          {usd0(Math.max(0, v))}
        </p>
      </div>
      {sub && <div className="shrink-0 text-right text-[12px] font-medium leading-snug" style={{ ...TABULAR, color: MUTED }}>{sub}</div>}
    </div>
  );
}

function RevTooltip({ active, payload, label, monthly }: any) {
  if (!active || !payload?.length) return null;
  const nameMap: Record<string, string> = {
    usw: 'US Wholesale', dist: 'Distributors', retail: 'Retail', ecom: 'Ecommerce',
    amzn: 'Amazon', open: 'Open Orders',
  };
  const segRows = payload.filter((p: any) => p.value != null && p.value !== 0 && nameMap[p.dataKey]);
  const current = payload[0]?.payload ?? {};
  const idx = Array.isArray(monthly) ? monthly.findIndex((r: any) => r.m === label) : -1;
  const prev = idx > 0 ? monthly[idx - 1] : null;

  const t = current.total ?? 0;
  const f = current.forecast ?? 0;
  const ly = current.ly ?? 0;
  const pt = prev?.total ?? 0;

  const mom = pt ? { d: t - pt, p: ((t - pt) / pt) * 100 } : { d: 0, p: 0 };
  const vsLy = ly ? { d: t - ly, p: ((t - ly) / ly) * 100 } : { d: 0, p: 0 };
  const vsFc = f ? { d: t - f, p: ((t - f) / f) * 100 } : { d: 0, p: 0 };

  const totalShare = segRows.reduce((s: number, p: any) => s + p.value, 0);
  const HAIRLINE = '1px solid #EDEDEE';

  const arrow = (n: number) => Math.abs(n) < 0.01 ? '↔' : (n > 0 ? '↑' : '↓');
  const tone = (n: number, invertIfNeg = false) => {
    if (Math.abs(n) < 0.01) return '#71717A';
    const pos = invertIfNeg ? n < 0 : n > 0;
    return pos ? '#047857' : '#BE123C';
  };

  const DeltaRow = ({ lbl, delta, pct, invertIfNeg }: { lbl: string; delta: number; pct: number; invertIfNeg?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '3px 0', color: '#3F3F46' }}>
      <span style={{ width: 12, textAlign: 'center', color: tone(delta, invertIfNeg), fontWeight: 700 }}>{arrow(delta)}</span>
      <span style={{ flex: 1, fontWeight: 500 }}>{lbl}</span>
      <b style={{ color: tone(delta, invertIfNeg), minWidth: 72, textAlign: 'right' }}>{fmtM(delta)}</b>
      <span style={{ color: tone(delta, invertIfNeg), minWidth: 52, textAlign: 'right', fontWeight: 600 }}>{`${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}</span>
    </div>
  );

  return (
    <div
      style={{
        background: '#FFFFFF', border: 'none', borderRadius: 12,
        padding: '14px', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.08)',
        minWidth: 240, maxWidth: 320, ...TABULAR,
      }}
    >
      <p style={{ color: INK, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 8 }}>{label}</p>
      {segRows.map((p: any, idx: number) => {
        const share = totalShare > 0 ? (p.value / totalShare) * 100 : 0;
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#3F3F46', padding: '3px 0' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color || p.stroke, flexShrink: 0 }} />
            <span style={{ flex: 1, fontWeight: 500 }}>{nameMap[p.dataKey] || p.dataKey}</span>
            <b style={{ color: INK, minWidth: 56, textAlign: 'right' }}>{fmtM(p.value)}</b>
            <span style={{ color: MUTED, minWidth: 42, textAlign: 'right', fontWeight: 500 }}>{share.toFixed(1)}%</span>
          </div>
        );
      })}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: HAIRLINE, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#3F3F46', padding: '3px 0' }}>
          <span style={{ width: 16, height: 2, background: TOTAL_NAVY, borderRadius: 1 }} />
          <span style={{ flex: 1, fontWeight: 500 }}>Total</span>
          <b style={{ color: INK, minWidth: 56, textAlign: 'right' }}>{fmtM(t)}</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#3F3F46', padding: '3px 0' }}>
          <span style={{ width: 16, height: 2, background: CORAL, borderRadius: 1, boxShadow: `2px 0 0 ${CORAL}, -2px 0 0 ${CORAL}` }} />
          <span style={{ flex: 1, fontWeight: 500 }}>Forecast</span>
          <b style={{ color: INK, minWidth: 56, textAlign: 'right' }}>{fmtM(f)}</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#3F3F46', padding: '3px 0' }}>
          <span style={{ width: 16, height: 2, background: LY_GRAY, borderRadius: 1 }} />
          <span style={{ flex: 1, fontWeight: 500 }}>vs LY</span>
          <b style={{ color: INK, minWidth: 56, textAlign: 'right' }}>{fmtM(ly)}</b>
        </div>
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: HAIRLINE }}>
        <DeltaRow lbl="MoM change" delta={mom.d} pct={mom.p} />
        <DeltaRow lbl="vs LY"      delta={vsLy.d} pct={vsLy.p} />
        <DeltaRow lbl="Δ Forecast" delta={vsFc.d} pct={vsFc.p} />
      </div>
    </div>
  );
}

function Donut({ title, headerRight, data, testId, emphasizeName }: { title: string; headerRight?: string; data: typeof DONUT_ALL; testId: string; emphasizeName?: string | null }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.v, 0);
  const centerIdx = hovered ?? (emphasizeName ? data.findIndex((d) => d.name === emphasizeName) : -1);
  const centerData = centerIdx >= 0 ? data[centerIdx] : null;
  return (
    <div
      className="rounded-3xl bg-white p-6 md:p-8"
      style={{ border: `1px solid ${BORDER}`, backgroundImage: CARD_GRAD }}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={EYEBROW} style={eyebrowStyle}>Channel Mix — {title}</p>
        {headerRight && <span className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ color: MUTED }}>{headerRight}</span>}
      </div>
      <div className="mt-6 flex flex-col items-center gap-6 md:flex-row md:gap-8">
        <div className="relative h-[200px] w-[200px] shrink-0" style={{ borderRadius: '50%', boxShadow: 'inset 0 1px 6px rgba(15,17,20,0.03)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data} dataKey="v"
                innerRadius={68} outerRadius={92} paddingAngle={2} stroke="#FFFFFF" strokeWidth={2}
                isAnimationActive animationDuration={400}
                onMouseEnter={(_: any, idx: number) => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
              >
                {data.map((d, i) => {
                  const isEmphasized = emphasizeName ? d.name === emphasizeName : true;
                  const isHovered = hovered === i;
                  const dimmed = (hovered != null && !isHovered) || (emphasizeName && !isEmphasized && hovered == null);
                  return <Cell key={i} fill={d.c} opacity={dimmed ? 0.35 : 1} style={{ transition: 'opacity 200ms ease' }} />;
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ color: MUTED }}>
                {centerData ? centerData.name : 'YTD'}
              </p>
              <p className="mt-1 text-[28px] font-bold" style={{ ...TABULAR, color: INK, letterSpacing: '-0.01em' }}>
                {centerData ? fmtM(centerData.v) : fmtM(total)}
              </p>
              {centerData && (
                <p className="text-[12px] font-semibold" style={{ ...TABULAR, color: MUTED }}>{centerData.share.toFixed(1)}%</p>
              )}
            </div>
          </div>
        </div>
        <ul className="flex-1">
          {data.map((d, i) => {
            const isEmphasized = emphasizeName ? d.name === emphasizeName : true;
            const dimmed = (hovered != null && hovered !== i) || (emphasizeName && !isEmphasized && hovered == null);
            return (
              <li
                key={d.name}
                className="flex h-8 items-center gap-2.5 text-[13px]"
                style={{
                  opacity: dimmed ? 0.35 : 1,
                  transition: 'opacity 200ms ease',
                  borderTop: i === 0 ? 'none' : `1px solid ${RULE}`,
                }}
                data-testid={`${testId}-item-${d.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <i className="h-2 w-2 rounded-full shrink-0" style={{ background: d.c }} />
                <span className="min-w-0 flex-1 truncate font-medium" style={{ color: '#4B5058' }}>{d.name}</span>
                <span className="text-[12px] font-medium" style={{ ...TABULAR, color: MUTED }}>{fmtM(d.v)} · {d.share.toFixed(1)}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Swatch({ color, label, dashed = false, line = false, dim = false }: { color: string; label: string; dashed?: boolean; line?: boolean; dim?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px]"
      style={{ ...TABULAR, color: '#475569', opacity: dim ? 0.35 : 1, transition: 'opacity 200ms ease' }}
    >
      {line ? (
        <span
          className="inline-block h-[2px] w-4 rounded"
          style={{ background: dashed ? 'transparent' : color, borderTop: dashed ? `2px dashed ${color}` : 'none' }}
        />
      ) : (
        <i className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}

// ─── Micro-sparkline data (last 12 periods, millions where applicable) ─
const SPARK_OPEN_ORDERS = [3.4, 3.7, 3.5, 3.9, 4.1, 3.8, 4.2, 4.3, 4.0, 4.4, 4.1, 4.18];
const SPARK_TOTAL       = [22.1, 22.8, 23.4, 23.1, 23.9, 24.3, 24.0, 24.8, 25.2, 25.5, 25.9, 26.68];
const SPARK_FORECAST    = [26.4, 26.3, 26.2, 26.15, 26.1, 26.05, 26.0, 26.0, 25.99, 25.98, 25.98, 25.98];
const SPARK_AT_RISK     = [16, 17, 18, 18, 19, 20, 20, 21, 22, 22, 23, 23];
const SPARK_CART_ABAND  = [73.1, 72.8, 72.5, 72.3, 72.0, 71.9, 71.7, 71.6, 71.5, 71.5, 71.4, 71.4];
const SPARK_AOV         = [2.42, 2.46, 2.49, 2.52, 2.55, 2.58, 2.61, 2.63, 2.66, 2.68, 2.70, 2.72];

// YoY by channel (full-year growth) — used by Channel Performance
const CHANNEL_YOY: Record<string, number> = {
  'US Wholesale':  5.8,
  'Distributors':  8.4,
  'Ecommerce':    12.1,
  'Amazon':       -3.6,
  'Retail':       -8.9,
};

function MiniSpark({ data, color }: { data: number[]; color: string }) {
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

function InsightStrip({ goalPct, pace, segmentRows, period }: { goalPct: number; pace: number; segmentRows: Array<{ key: string; cur: number; tgt: number; pct: number }>; period: string }) {
  const diff = goalPct - pace;
  const ahead = diff >= 0;
  const sorted = [...segmentRows].sort((a, b) => a.pct - b.pct);
  const drag = sorted[0];
  const mover = sorted[sorted.length - 1];
  const dragGap = Math.max(0, drag.tgt - drag.cur);
  return (
    <div
      className="flex items-center gap-3 rounded-xl transition-colors duration-150 hover:bg-slate-100"
      style={{ background: '#F8FAFC', minHeight: 48, padding: '0 20px', borderLeft: '2px solid #FF6F61' }}
      data-testid="insight-strip"
      title={`${period} snapshot across all segments`}
    >
      <AlertCircle size={16} color="#FF6F61" strokeWidth={2} />
      <p className="text-[13px] font-medium" style={{ color: '#1E293B', lineHeight: 1.4 }}>
        You're <strong style={{ color: '#0F172A', fontWeight: 600 }}>{Math.abs(diff)} pts {ahead ? 'ahead of' : 'behind'}</strong> pace.{' '}
        <strong style={{ color: '#0F172A', fontWeight: 600 }}>{drag.key}</strong> is the biggest drag,{' '}
        <strong style={{ color: '#0F172A', fontWeight: 600 }}>{fmtM(dragGap)} below plan</strong>.{' '}
        <strong style={{ color: '#0F172A', fontWeight: 600 }}>{mover.key}</strong> is pacing strongest at{' '}
        <strong style={{ color: '#0F172A', fontWeight: 600 }}>{mover.pct}% attainment</strong>.
      </p>
    </div>
  );
}

function ContextChip({ label, value, onReset, testId }: { label: string; value: string; onReset: () => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors duration-150 hover:bg-slate-200"
      style={{ background: '#F1F5F9', color: '#334155', height: 24 }}
      data-testid={testId}
    >
      <span style={{ color: '#64748B' }}>{label}:</span>
      <span>{value}</span>
      <X size={10} strokeWidth={2.4} color="#64748B" />
    </button>
  );
}

function ContextChips({ seg, rLabel, onResetSeg, onResetRange }: { seg: string; rLabel: string; onResetSeg: () => void; onResetRange: () => void }) {
  const segNonDefault = seg !== 'All';
  const rangeNonDefault = rLabel !== 'YTD';
  if (!segNonDefault && !rangeNonDefault) return null;
  return (
    <div className="flex items-center gap-2 px-1 py-1" data-testid="context-chips" style={{ animation: 'dashFadeSlideUp 300ms ease-out both' }}>
      <span className="text-[11px] font-medium" style={{ color: '#64748B' }}>Showing:</span>
      {segNonDefault && <ContextChip label="Segment" value={seg} onReset={onResetSeg} testId="context-chip-seg" />}
      {rangeNonDefault && <ContextChip label="Period" value={rLabel} onReset={onResetRange} testId="context-chip-period" />}
    </div>
  );
}

function MiniKPI({ label, target, delta, caption, testId, format }: { label: string; target: number; delta: React.ReactNode; caption: string; testId: string; format?: (n: number) => string }) {
  const v = useCountUp(target, 700);
  const config: Record<string, { full: string; data: number[]; color: string }> = {
    'Open Orders':      { full: 'Open Orders · In Flight',   data: SPARK_OPEN_ORDERS, color: '#94A3B8' },
    'Total':            { full: 'Total · YTD',               data: SPARK_TOTAL,       color: '#94A3B8' },
    'Forecast':         { full: 'Forecast · 2026 EOY',       data: SPARK_FORECAST,    color: '#FF6F61' },
    'At Risk Accounts': { full: 'At Risk Accounts',          data: SPARK_AT_RISK,     color: '#FF6F61' },
    'Cart Abandonment': { full: 'Cart Abandonment %',        data: SPARK_CART_ABAND,  color: '#FF6F61' },
    'AOV':              { full: 'Avg Order Value · YTD',     data: SPARK_AOV,         color: '#94A3B8' },
  };
  const cfg = config[label] || { full: label, data: [] as number[], color: '#94A3B8' };
  const fmt = format || ((n: number) => usd0(Math.max(0, n)));
  return (
    <div className="px-6 pb-5 pt-5" data-testid={testId}>
      <div className="flex min-h-[26px] items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>{cfg.full}</p>
        <span data-testid={`${testId}-delta`}>{delta}</span>
      </div>
      <p className="mt-3 font-semibold" style={{ ...TABULAR, fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.02em', color: INK }}>
        {fmt(v)}
      </p>
      <p className="mt-2 text-[11px] font-medium" style={{ ...TABULAR, color: '#64748B' }}>{caption}</p>
      {cfg.data.length > 0 && (
        <div className="mt-2.5" style={{ height: 28 }} data-testid={`${testId}-spark`}>
          <MiniSpark data={cfg.data} color={cfg.color} />
        </div>
      )}
    </div>
  );
}

function SectionAnchorNav() {
  const [active, setActive] = useState<string>('hero-module');
  useEffect(() => {
    const ids = ['hero-module', 'kpi-row', 'rev-by-month', 'channel-mix', 'sales-vs-goal', 'top-accounts'];
    const els = ids.map((id) => document.querySelector(`[data-testid="${id}"]`)).filter(Boolean) as Element[];
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.getAttribute('data-testid') || ''); });
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const items: Array<{ id: string; label: string }> = [
    { id: 'hero-module',    label: 'Overview' },
    { id: 'kpi-row',        label: 'KPIs' },
    { id: 'rev-by-month',   label: 'Revenue & Segments' },
    { id: 'channel-mix',    label: 'Channel Mix' },
    { id: 'sales-vs-goal',  label: 'Sales vs Goal' },
    { id: 'top-accounts',   label: 'Top Accounts & Items' },
  ];
  return (
    <nav
      className="hidden xl:block"
      style={{
        position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)',
        width: 180, zIndex: 20,
        background: 'rgba(248,250,252,0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 12, padding: 12,
      }}
      data-testid="section-anchor-nav"
      aria-label="Dashboard sections"
    >
      <ul className="flex flex-col gap-1">
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.querySelector(`[data-testid="${it.id}"]`) as HTMLElement | null;
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 24;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
                className="block text-[12px] font-medium transition-colors duration-150 hover:text-slate-900"
                style={{
                  color: isActive ? '#0F172A' : '#64748B',
                  paddingLeft: 10, paddingTop: 4, paddingBottom: 4,
                  borderLeft: `2px solid ${isActive ? '#FF6F61' : 'transparent'}`,
                }}
                data-testid={`anchor-${it.id}`}
              >
                {it.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PaceTrack({ actual, expected }: { actual: number; expected: number }) {
  const diff = Math.round(actual - expected);
  const dotColor = Math.abs(diff) <= 1 ? '#475569' : diff < 0 ? '#FF6F61' : '#059669';
  const clamped = Math.min(Math.max(actual, 2), 98);
  return (
    <div className="flex justify-end" data-testid="svg-pace-track" aria-label={Math.abs(diff) <= 1 ? 'On pace' : diff < 0 ? `${Math.abs(diff)} pts behind` : `${diff} pts ahead`}>
      <div className="relative" style={{ width: 50, height: 10 }}>
        <div style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 2, background: '#F1F5F9', borderRadius: 999 }} />
        <div style={{ position: 'absolute', top: 1, left: `${expected}%`, width: 1, height: 8, background: '#94A3B8', transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', top: 2, left: `${clamped}%`, width: 6, height: 6, borderRadius: 999, background: dotColor, transform: 'translateX(-50%)', transition: 'left 400ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage({ onNavigate }: Props) {
  const [seg, setSeg] = useState<SegKey>('All');
  const [range, setRange] = usePageRange('dashboard');
  const [drilldownIdx, setDrilldownIdx] = useState<number | null>(null);

  const scale = SEG_SCALE[seg];
  const segKey = SEG_KEY[seg];
  const isAll = seg === 'All';

  const rScale = RANGE_SCALE[range] ?? 1;
  const rLabel = RANGE_LABEL[range] ?? 'YTD';
  const monthsToShow = MONTHS_VISIBLE[range] ?? 12;
  const combined = scale * rScale;

  const netSalesYTD = 9_166_708 * combined;
  const netSalesCountUp = useCountUp(netSalesYTD, 700);
  const openOrders = 4_182_650 * combined;
  const forecastVal = 25_980_800 * combined;
  const goalValue = 17_510_000 * combined;
  const atRiskCount = Math.max(1, Math.round(7 * combined));
  const atRiskDollars = 1_240_000 * combined;
  const goalMax = 25_980_000;
  const goalPct = Math.round((goalValue / goalMax) * 100);
  const pace = 75;
  const onPace = goalPct >= pace;

  // Filtered monthly data (only selected segment bars when not All)
  const monthlyData = useMemo(() => {
    const source = monthsToShow >= 12 ? MONTHLY_BASE : MONTHLY_BASE.slice(-monthsToShow);
    return source.map((row) => {
      const scaled: any = { m: row.m };
      const segFields = ['usw', 'dist', 'retail', 'ecom', 'amzn'];
      if (isAll) {
        segFields.forEach((k) => { scaled[k] = (row as any)[k] * rScale; });
        scaled.open = row.open * rScale;
      } else {
        segFields.forEach((k) => { scaled[k] = (k === segKey) ? (row as any)[k] * rScale : 0; });
        scaled.open = (segKey === 'usw' || segKey === 'dist') ? row.open * rScale : 0;
      }
      scaled.total = row.total * combined;
      scaled.forecast = row.forecast * combined;
      scaled.ly = row.ly * combined;
      return scaled;
    });
  }, [isAll, segKey, combined, rScale, monthsToShow]);

  const highlightSegRow = (rowKey: string) => isAll || rowKey === seg;
  const emphasizeName = isAll ? null : seg;

  const segmentRowsScaled = useMemo(() => SEGMENT_ROWS.map((s) => {
    const cur = s.cur * combined;
    return { ...s, cur, pct: Math.round((cur / s.tgt) * 100) };
  }), [combined]);

  const topAccountsScaled = useMemo(() => TOP_ACCOUNTS.map((a) => ({ ...a, net: a.net * combined })), [combined]);
  const topItemsScaled = useMemo(() => TOP_ITEMS.map((it) => ({ ...it, rev: it.rev * combined })), [combined]);

  // Channel Performance — unified rows (merges Segments + Channel Mix + Sales vs Goal)
  const channelPerfRows = useMemo(() => {
    const base = SVG_ROWS.map((r) => {
      const revenue = r.net * combined;
      return {
        name: r.name,
        c: r.c,
        revenue,
        target: r.annual,                                   // full-year target
        attainment: Math.round((revenue / r.annual) * 100), // vs annual target
        yoy: CHANNEL_YOY[r.name] ?? 0,
      };
    });
    const totalRev = base.reduce((s, b) => s + b.revenue, 0) || 1;
    return base
      .map((b) => ({ ...b, share: (b.revenue / totalRev) * 100 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [combined]);

  const drilldownData = useMemo(() => {
    if (drilldownIdx == null) return null;
    const a = topAccountsScaled[drilldownIdx];
    const raw = TOP_ACCOUNTS[drilldownIdx];
    const totalTop = topAccountsScaled.reduce((sum, x) => sum + x.net, 0);
    const REPS = [
      { name: 'Marta Ellison',   initials: 'ME' },
      { name: 'Devon Park',      initials: 'DP' },
      { name: 'Chris Iwazaki',   initials: 'CI' },
      { name: 'Priya Rao',       initials: 'PR' },
      { name: 'James Whittaker', initials: 'JW' },
    ];
    return {
      name: a.name,
      rank: drilldownIdx + 1,
      net: a.net,
      yoy: a.yoy,
      spark: raw.spark,
      shareOfTotal: totalTop > 0 ? (a.net / totalTop) * 100 : 0,
      rep: REPS[drilldownIdx].name,
      repInitials: REPS[drilldownIdx].initials,
      repTitle: 'Senior AE',
    };
  }, [drilldownIdx, topAccountsScaled]);

  const topAcctMax = topAccountsScaled[0]?.net || 1;
  const topItemMax = topItemsScaled[0]?.rev || 1;
  const yTicks = useMemo(() => [0, 2e6, 4e6, 6e6], []);

  // Stagger animation helper
  const enter = (i: number) => ({
    animation: 'dashFadeSlideUp 400ms ease-out both',
    animationDelay: `${i * 60}ms`,
  }) as React.CSSProperties;

  return (
    <div className="min-h-full" data-testid="dashboard-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div style={{ padding: '32px' }}>

        {/* ── Report header ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-6" data-testid="report-header">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.12em', color: '#94A3B8' }}>Goorin Reporting · Dashboard</p>
            <h1 className="mt-2 font-semibold" style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: '-0.015em', color: '#0F172A' }} data-testid="report-title">Q3 Net Sales Brief</h1>
            <p className="mt-3 font-normal" style={{ fontSize: 16, lineHeight: 1.5, color: '#64748B', maxWidth: 760 }}>
              Year-to-date performance across US Wholesale, Distributors, Retail, Ecommerce, and Amazon.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <DateRangePicker value={range} onChange={setRange} testId="dashboard-range" />
            <SegTabs tabs={SEGMENTS} value={seg} onChange={(v: any) => setSeg(v as SegKey)} testId="segment-tabs" slugPrefix="seg" />
          </div>
        </div>

        <ContextChips seg={seg} rLabel={rLabel} onResetSeg={() => setSeg('All')} onResetRange={() => setRange('YTD')} />

        <hr style={{ margin: '24px 0 32px', border: 'none', borderTop: '1px solid #E2E8F0' }} />

        {/* ── Overview strip — 5-column KPI ribbon ─────────── */}
        <section
          className="grid grid-cols-2 md:grid-cols-5"
          style={{ borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }}
          data-testid="kpi-ribbon"
        >
          {[
            { key: 'net-sales',   eyebrow: 'Net Sales',             value: usd0(netSalesCountUp),           pillColor: 'emerald', pillText: '↑ 25.6% YoY' },
            { key: 'annual-goal', eyebrow: 'Annual Goal · 2026',    value: `${goalPct}%`,                   pillColor: 'muted',   pillText: `${fmtM(Math.max(0, goalMax - goalValue))} to go` },
            { key: 'forecast',    eyebrow: 'Forecast · 2026 EOY',   value: fmtM(forecastVal),                pillColor: 'coral',   pillText: 'Trailing' },
            { key: 'open-orders', eyebrow: 'Open Orders · In Flight', value: fmtM(openOrders),              pillColor: 'emerald', pillText: '↑ 12.4%' },
            { key: 'at-risk',     eyebrow: 'At Risk · Accounts',    value: atRiskCount.toLocaleString('en-US'), pillColor: 'coral',   pillText: `${fmtM(atRiskDollars)} at risk`, bigColor: '#C9422E' },
          ].map((k, i) => {
            const pillStyle =
              k.pillColor === 'emerald' ? { background: '#ECFDF5', color: '#047857' } :
              k.pillColor === 'coral'   ? { background: '#FFF1EF', color: '#C9422E' } :
                                          { background: '#F1F5F9', color: '#64748B' };
            return (
              <div
                key={k.key}
                className="flex flex-col justify-center"
                style={{ padding: '24px 24px', borderLeft: i > 0 ? '1px solid #F1F5F9' : 'none' }}
                data-testid={`ribbon-${k.key}`}
              >
                <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>{k.eyebrow}</p>
                <p
                  className="mt-2 font-semibold"
                  style={{ ...TABULAR, fontSize: 'clamp(32px, 2.6vw, 44px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: k.bigColor || '#0F172A' }}
                  data-testid={`ribbon-${k.key}-value`}
                >
                  {k.value}
                </p>
                <span className="mt-3 inline-flex w-fit items-center rounded-full text-[12px] font-semibold" style={{ ...TABULAR, ...pillStyle, padding: '3px 10px' }}>{k.pillText}</span>
              </div>
            );
          })}
        </section>

        {/* ── 01 / Pacing figure ────────────────────────────── */}
        <section className="mt-14" data-testid="section-pacing">
          <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#94A3B8' }}>01 / Pacing</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="font-semibold" style={{ fontSize: 24, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#0F172A' }}>YTD attainment by channel</h2>
            <span className="text-[14px]" style={{ color: '#64748B' }}>At current pace</span>
          </div>

          <div className="mt-8" data-testid="figure-1">
            <div className="relative" style={{ height: 28 }}>
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2" style={{ height: 1, background: '#E2E8F0' }} />
              <div className="absolute" style={{ left: `${pace}%`, top: 'calc(50% - 8px)', height: 16, width: 2, background: '#94A3B8' }} aria-hidden="true" />
              {channelPerfRows.map((row) => {
                const size = Math.max(10, Math.min(24, 8 + (row.share / 40) * 16));
                return (
                  <div
                    key={row.name}
                    className="absolute rounded-full"
                    style={{ left: `${Math.min(100, Math.max(0, row.attainment))}%`, top: '50%', width: size, height: size, background: row.c, transform: 'translate(-50%, -50%)', border: '2px solid #FAFAFA' }}
                    data-testid={`figure1-dot-${row.name.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                );
              })}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
              {channelPerfRows.map((row) => (
                <div key={row.name} className="flex items-center gap-2" data-testid={`figure1-legend-${row.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: row.c }} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium" style={{ color: '#475569' }}>{row.name}</span>
                  <span className="text-[12px] font-semibold tabular-nums" style={{ color: '#0F172A' }}>{row.attainment}%</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[11px] italic" style={{ color: '#94A3B8' }}>Figure 1 · Dot size = revenue share. Grey tick = today's expected pace.</p>
          </div>
        </section>

        {/* ── 02 / Revenue trend ────────────────────────────── */}
        <section className="mt-14" data-testid="section-revenue">
          <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#94A3B8' }}>02 / Revenue</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="font-semibold" style={{ fontSize: 24, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#0F172A' }}>Monthly revenue trend</h2>
            <span className="text-[14px]" style={{ color: '#64748B' }}>Twelve-month view, stacked by channel</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Swatch color={!isAll && seg === 'US Wholesale' ? CORAL : C_USW}      label="US Wholesale" dim={!isAll && seg !== 'US Wholesale'} />
            <Swatch color={!isAll && seg === 'Distributors' ? CORAL : C_DIST}     label="Distributors" dim={!isAll && seg !== 'Distributors'} />
            <Swatch color={!isAll && seg === 'Retail' ? CORAL : C_RETAIL}         label="Retail"       dim={!isAll && seg !== 'Retail'} />
            <Swatch color={!isAll && seg === 'Ecommerce' ? CORAL : C_ECOM}        label="Ecommerce"    dim={!isAll && seg !== 'Ecommerce'} />
            <Swatch color={!isAll && seg === 'Amazon' ? CORAL : C_AMZN}           label="Amazon"       dim={!isAll && seg !== 'Amazon'} />
            <Swatch color={INK}        label="Total"    line />
            <Swatch color={CORAL}      label="Forecast" line dashed />
            <Swatch color={LY_GRAY}    label="vs LY"    line dashed />
          </div>

          <div className="relative mt-5" style={{ height: 360 }} data-testid="figure-2">
            <span
              className="pointer-events-none absolute right-0 top-0 z-10 inline-flex items-center rounded-full text-[12px] font-medium"
              style={{ background: '#FFF1EF', color: '#C9422E', padding: '4px 10px' }}
              data-testid="rev-insight-callout"
            >
              Distributors trailing $510K vs plan
            </span>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} barCategoryGap="22%">
                <CartesianGrid stroke="#F1F5F9" vertical={false} strokeDasharray="0" />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500, letterSpacing: '0.06em' }} tickFormatter={(m: string) => m.toUpperCase()} tickMargin={8} />
                <YAxis
                  ticks={yTicks} domain={[0, 6e6]}
                  tickFormatter={fmtMShort}
                  tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} width={56}
                />
                <Tooltip content={<RevTooltip monthly={monthlyData} />} cursor={{ stroke: FAINT, strokeDasharray: '3 3', strokeWidth: 1 }} />
                <Bar dataKey="usw"    stackId="s" fill={!isAll && seg === 'US Wholesale' ? CORAL : C_USW}    fillOpacity={1} isAnimationActive animationDuration={400} />
                <Bar dataKey="dist"   stackId="s" fill={!isAll && seg === 'Distributors' ? CORAL : C_DIST}   fillOpacity={1} isAnimationActive animationDuration={400} />
                <Bar dataKey="retail" stackId="s" fill={!isAll && seg === 'Retail' ? CORAL : C_RETAIL}       fillOpacity={1} isAnimationActive animationDuration={400} />
                <Bar dataKey="ecom"   stackId="s" fill={!isAll && seg === 'Ecommerce' ? CORAL : C_ECOM}      fillOpacity={1} isAnimationActive animationDuration={400} />
                <Bar dataKey="amzn"   stackId="s" fill={!isAll && seg === 'Amazon' ? CORAL : C_AMZN}         fillOpacity={1} isAnimationActive animationDuration={400} />
                <Bar dataKey="open"   stackId="s" fill={C_OPEN}   fillOpacity={1} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="ly"       stroke={LY_GRAY}    strokeWidth={1.5} dot={false} strokeDasharray="3 3" isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="total"    stroke="#0F172A"    strokeWidth={2}   dot={false} isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="forecast" stroke={CORAL}      strokeWidth={1.5} dot={false} strokeDasharray="5 4" isAnimationActive animationDuration={400} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[11px] italic" style={{ color: '#94A3B8' }}>Figure 2 · Monthly net sales by channel with total, forecast, and prior-year overlay</p>
        </section>

        {/* ── 03 / Channel performance table ──────────────── */}
        <section className="mt-14" data-testid="section-channels">
          <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#94A3B8' }}>03 / Channels</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="font-semibold" style={{ fontSize: 24, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#0F172A' }}>Channel performance</h2>
            <span className="text-[14px]" style={{ color: '#64748B' }}>YTD ranked by revenue</span>
          </div>

          <div className="mt-6" data-testid="figure-3">
            <div
              className="grid items-center gap-x-6 pb-3 text-[11px] font-semibold uppercase"
              style={{ gridTemplateColumns: '2fr 1fr 0.8fr 0.9fr 1fr 100px', letterSpacing: '0.08em', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}
            >
              <span>Channel</span>
              <span className="text-right">Revenue</span>
              <span className="text-right">Share</span>
              <span className="text-right">YoY</span>
              <span className="text-right">Attainment</span>
              <span className="text-right">Pace</span>
            </div>
            {channelPerfRows.map((row) => {
              const attainColor = row.attainment < 70 ? '#C9422E' : '#0F172A';
              return (
                <div
                  key={row.name}
                  className="grid items-center gap-x-6 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded px-3"
                  style={{ gridTemplateColumns: '2fr 1fr 0.8fr 0.9fr 1fr 100px', borderBottom: '1px solid #F1F5F9', minHeight: 56 }}
                  data-testid={`perf-row-${row.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: row.c }} />
                    <span className="truncate text-[15px] font-medium" style={{ color: '#0F172A' }}>{row.name}</span>
                  </div>
                  <span className="text-right text-[15px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(row.revenue)}</span>
                  <span className="text-right text-[14px] font-medium" style={{ ...TABULAR, color: '#475569' }}>{row.share.toFixed(1)}%</span>
                  <div className="flex justify-end"><DeltaPill v={row.yoy} /></div>
                  <span className="text-right text-[15px] font-semibold" style={{ ...TABULAR, color: attainColor }}>{row.attainment}%</span>
                  <div className="flex justify-end"><PaceTrack actual={row.attainment} expected={pace} /></div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] italic" style={{ color: '#94A3B8' }}>Figure 3 · Channel performance ranked by revenue at current pace</p>
        </section>

        {/* ── 04 / Movers ───────────────────────────────────── */}
        <section className="mt-14" data-testid="section-movers">
          <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#94A3B8' }}>04 / Movers</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="font-semibold" style={{ fontSize: 24, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#0F172A' }}>Biggest changes YTD</h2>
            <span className="text-[14px]" style={{ color: '#64748B' }}>Gainers and decliners</span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-x-10 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
            <div data-testid="movers-gainers">
              <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>Top gainers</p>
              <ul className="mt-2">
                {GAINERS.map((m, i) => (
                  <li
                    key={m.name}
                    className="flex items-center gap-3 cursor-pointer transition-colors duration-150 hover:bg-slate-50 -mx-3 px-3 rounded"
                    style={{ borderBottom: '1px solid #F1F5F9', minHeight: 56 }}
                    data-testid={`mover-gain-${i}`}
                    role="button"
                    tabIndex={0}
                  >
                    <b className="min-w-0 flex-1 truncate text-[16px] font-semibold" style={{ color: '#0F172A' }}>{m.name}</b>
                    <span className="inline-flex items-center rounded-md text-[11px] font-semibold uppercase" style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 6px', letterSpacing: '0.06em' }}>{m.type}</span>
                    <span className="text-[14px] font-bold tabular-nums whitespace-nowrap" style={{ color: '#047857' }}>↑ {m.yoy}%</span>
                    <span className="w-[88px] text-right text-[15px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>+{fmtM(m.v * combined)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden lg:block" style={{ background: '#F1F5F9' }} aria-hidden="true" />
            <div data-testid="movers-decliners">
              <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>Top decliners</p>
              <ul className="mt-2">
                {DECLINERS.map((m, i) => (
                  <li
                    key={m.name}
                    className="flex items-center gap-3 cursor-pointer transition-colors duration-150 hover:bg-slate-50 -mx-3 px-3 rounded"
                    style={{ borderBottom: '1px solid #F1F5F9', minHeight: 56 }}
                    data-testid={`mover-decline-${i}`}
                    role="button"
                    tabIndex={0}
                  >
                    <b className="min-w-0 flex-1 truncate text-[16px] font-semibold" style={{ color: '#0F172A' }}>{m.name}</b>
                    <span className="inline-flex items-center rounded-md text-[11px] font-semibold uppercase" style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 6px', letterSpacing: '0.06em' }}>{m.type}</span>
                    <span className="text-[14px] font-bold tabular-nums whitespace-nowrap" style={{ color: '#C9422E' }}>↓ {Math.abs(m.yoy)}%</span>
                    <span className="w-[88px] text-right text-[15px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>−{fmtM(Math.abs(m.v * combined))}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 05 / Rankings — Top accounts + Top items ───── */}
        <section className="mt-14" data-testid="section-rankings">
          <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#94A3B8' }}>05 / Rankings</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="font-semibold" style={{ fontSize: 24, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#0F172A' }}>Top accounts &amp; top items</h2>
            <span className="text-[14px]" style={{ color: '#64748B' }}>At current pace</span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-2">
            <div data-testid="top-accounts">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Accounts</h3>
                <span className="text-[12px] font-medium" style={{ color: '#64748B' }}>Net Sales</span>
              </div>
              <ol className="mt-3">
                {topAccountsScaled.map((a, i) => (
                  <li
                    key={a.name}
                    className="group flex items-center gap-3 cursor-pointer transition-colors duration-150 hover:bg-slate-50 -mx-3 px-3 rounded"
                    style={{ borderBottom: '1px solid #F1F5F9', minHeight: 60 }}
                    data-testid={`top-acct-${i}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDrilldownIdx(i)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrilldownIdx(i); } }}
                  >
                    <span className="w-7 text-right text-[11px] font-medium tabular-nums" style={{ color: '#94A3B8' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: '#0F172A' }}>{a.name}</span>
                    <DeltaPill v={a.yoy} />
                    <span className="w-[96px] text-right text-[15px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(a.net)}</span>
                    <span className="text-[14px] font-medium opacity-0 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:translate-x-0.5" style={{ color: CORAL, lineHeight: 1 }}>›</span>
                  </li>
                ))}
              </ol>
            </div>

            <div data-testid="top-items">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Items</h3>
                <span className="text-[12px] font-medium" style={{ color: '#64748B' }}>Revenue</span>
              </div>
              <ol className="mt-3">
                {topItemsScaled.map((it, i) => (
                  <li
                    key={it.sku}
                    className="flex flex-col justify-center -mx-3 px-3 transition-colors duration-150 hover:bg-slate-50 rounded"
                    style={{ borderBottom: '1px solid #F1F5F9', minHeight: 60 }}
                    data-testid={`top-item-${i}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 text-right text-[11px] font-medium tabular-nums" style={{ color: '#94A3B8' }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: '#0F172A' }}>{it.name}</span>
                      <span className="w-[96px] text-right text-[15px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(it.rev)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 pl-10">
                      <span className="text-[12px] font-medium" style={{ color: '#64748B' }}>{it.variant}</span>
                      <span className="min-w-0 flex-1 text-[11px] font-medium" style={{ ...MONO, color: '#94A3B8' }}>{it.sku}</span>
                      <span className="text-[12px] font-medium tabular-nums" style={{ color: '#64748B' }}>{it.units.toLocaleString('en-US')} units</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="mt-16 pt-5 flex flex-wrap items-center justify-between gap-3" style={{ borderTop: '1px solid #F1F5F9' }} data-testid="report-footer">
          <div>
            <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.12em', color: '#94A3B8' }}>Generated</p>
            <p className="mt-1 text-[12px]" style={{ ...TABULAR, color: '#64748B' }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <p className="text-[12px]" style={{ color: '#94A3B8' }}>Data: internal mock · Reporting v1.0</p>
        </div>

        {drilldownData && (
          <AccountDrilldown account={drilldownData} onClose={() => setDrilldownIdx(null)} />
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
