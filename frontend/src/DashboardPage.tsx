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
  const openOrders = 4_182_650 * combined;
  const total = 26_679_135 * combined;
  const forecastVal = 25_980_800 * combined;
  const goalValue = 17_510_000 * combined;
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
    <div className="min-h-full space-y-4 p-1" data-testid="dashboard-page" style={{ ...INTER, ...TABULAR }}>
      {/* ── 1) Unified Hero — Header + Net Sales + Annual Goal ─────── */}
      <section
        className="overflow-hidden rounded-2xl"
        style={{ background: '#FFFFFF', boxShadow: CARD_SHADOW, ...enter(0) }}
        data-testid="hero-module"
      >
        <div className="relative z-30 flex flex-col gap-3 px-6 py-3 md:min-h-[56px] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-6 md:px-8 md:py-4" data-testid="dashboard-header">
          <div className="-mx-4 overflow-x-auto no-scrollbar px-4 md:mx-0 md:overflow-visible md:px-0">
            <SegTabs tabs={SEGMENTS} value={seg} onChange={(v: any) => setSeg(v as SegKey)} testId="segment-tabs" slugPrefix="seg" />
          </div>
          <div className="w-full md:w-auto [&_.date-range-wrap]:w-full md:[&_.date-range-wrap]:w-auto [&_.date-range-btn]:w-full md:[&_.date-range-btn]:w-auto">
            <DateRangePicker value={range} onChange={setRange} testId="dashboard-range" />
          </div>
        </div>
        <div className="grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,7fr)_1px_minmax(0,3fr)]" style={{ borderTop: '1px solid #F1F5F9' }}>
          <div className="px-6 py-6 md:px-8 md:py-7" data-testid="kpi-net-sales">
            <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>
              Net Sales · {rLabel}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
              <NetSalesValue target={netSalesYTD} />
              <span
                className="mb-2 inline-flex items-center gap-0.5 rounded-full text-[13px] font-semibold"
                style={{ ...TABULAR, background: '#ECFDF5', color: '#047857', padding: '4px 10px' }}
                data-testid="net-sales-delta"
              >
                <ArrowUp size={11} strokeWidth={2.6} />25.6% YoY
              </span>
            </div>
            <div className="mt-6" style={{ height: 48 }} data-testid="hero-sparkline">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="heroSparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F172A" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#0F172A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="total" stroke="#0F172A" strokeWidth={1.5} fill="url(#heroSparkGrad)" isAnimationActive animationDuration={500} dot={false} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6" data-testid="goal-pace-strip">
              <div className="relative h-1 w-full overflow-hidden rounded-full" style={{ background: '#F1F5F9' }}>
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, goalPct)}%`, background: CORAL, transition: BAR_TRANS }} />
                <span aria-hidden="true" className="pointer-events-none absolute w-[2px]" style={{ top: -5, bottom: -5, left: `${pace}%`, background: '#94A3B8' }} />
              </div>
              <p className="mt-2 text-[12px] font-medium" style={{ ...TABULAR, color: '#64748B' }}>
                {goalPct}% of {fmtM(goalMax)} goal · {Math.abs(pace - goalPct)} pts {goalPct < pace ? 'behind' : 'ahead of'} pace
              </p>
            </div>
          </div>

          <div className="hidden min-[900px]:block" style={{ background: '#F1F5F9' }} aria-hidden="true" />

          <div className="border-t border-[#F1F5F9] px-6 py-6 md:px-8 md:py-7 min-[900px]:border-t-0" data-testid="annual-goal">
            <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>Annual Goal · 2026</p>
            <p className="mt-3 font-semibold" style={{ ...TABULAR, fontSize: 40, lineHeight: 1, letterSpacing: '-0.02em', color: INK }} data-testid="annual-goal-amount">
              {fmtM(goalValue)}
            </p>
            <p className="mt-1.5 text-[12px] font-medium" style={{ ...TABULAR, color: '#64748B' }}>
              of {fmtM(goalMax)} · {fmtM(Math.max(0, goalMax - goalValue))} to go
            </p>
            <div className="relative mt-4 h-1 w-full overflow-hidden rounded-full" style={{ background: '#F1F5F9' }} data-testid="goal-bar">
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, goalPct)}%`, background: CORAL, transition: BAR_TRANS }} />
              <span aria-hidden="true" className="pointer-events-none absolute w-[2px]" style={{ top: -4, bottom: -4, left: `${pace}%`, background: '#94A3B8' }} />
            </div>
            <div className="mt-4 flex flex-col gap-1" data-testid="annual-goal-breakdown">
              {[...segmentRowsScaled].sort((a, b) => b.pct - a.pct).slice(0, 2).map((s) => (
                <div
                  key={s.key}
                  className="flex h-7 items-center gap-3"
                  data-testid={`goal-seg-${s.key.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SEG_COLORS[s.key] }} />
                  <b className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: '#0F172A' }}>{s.key}</b>
                  <span className="text-[13px] font-semibold" style={{ ...TABULAR, color: '#0F172A' }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ContextChips
        seg={seg}
        rLabel={rLabel}
        onResetSeg={() => setSeg('All')}
        onResetRange={() => setRange('YTD')}
      />

      {/* ── 2) Pacing Map — channel timelines vs expected pace ─────── */}
      <section
        className="rounded-2xl bg-white p-6 md:p-7"
        style={{ boxShadow: CARD_SHADOW, ...enter(1) }}
        data-testid="pacing-map"
      >
        <div>
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Channel pacing · {rLabel}</h2>
          <p className="mt-1.5 text-[12px] font-medium" style={{ color: '#64748B' }}>Where each channel sits vs expected position on 2026 goal</p>
        </div>
        <div className="mt-5">
          {channelPerfRows.map((row, i) => {
            const diff = row.attainment - pace;
            const dotColor = Math.abs(diff) <= 1 ? '#475569' : diff < 0 ? CORAL : '#059669';
            const stateLabel = Math.abs(diff) <= 1 ? 'On pace' : diff < 0 ? `${Math.abs(diff)} pts behind` : `${diff} pts ahead`;
            return (
              <div
                key={row.name}
                className="grid items-center gap-4 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded-lg px-3"
                style={{ gridTemplateColumns: '160px minmax(0,1fr) 180px', borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 56 }}
                data-testid={`pace-row-${row.name.toLowerCase().replace(/\s+/g, '-')}`}
                title={`${row.name}: ${row.attainment}% of ${fmtM(row.target)} · ${stateLabel}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: row.c }} />
                  <span className="truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{row.name}</span>
                </div>
                <div className="relative" style={{ height: 14 }}>
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full" style={{ height: 2, background: '#F1F5F9' }} />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full" style={{ height: 2, width: `${Math.min(100, row.attainment)}%`, background: row.c, transition: BAR_TRANS }} />
                  <div className="absolute" style={{ top: 0, bottom: 0, left: `${pace}%`, width: 2, background: '#94A3B8', transform: 'translateX(-50%)' }} aria-hidden="true" />
                  <div className="absolute rounded-full" style={{ top: '50%', left: `${Math.min(100, Math.max(0, row.attainment))}%`, width: 10, height: 10, background: dotColor, transform: 'translate(-50%, -50%)', boxShadow: '0 0 0 2px #FFFFFF' }} />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <span className="text-[14px] font-semibold tabular-nums" style={{ color: '#0F172A' }}>{row.attainment}%</span>
                  <DeltaPill v={row.attainment - pace} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3) Channel Scoreboard — ranked 5 mini cards ──────────────── */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-5" style={enter(2)} data-testid="channel-scoreboard">
        {channelPerfRows.map((row, i) => (
          <div
            key={row.name}
            className="rounded-2xl bg-white p-4"
            style={{ boxShadow: CARD_SHADOW }}
            data-testid={`score-card-${row.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium tabular-nums" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>{String(i + 1).padStart(2, '0')}</span>
              <DeltaPill v={row.yoy} />
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: row.c }} />
              <span className="truncate text-[13px] font-semibold" style={{ color: '#0F172A' }}>{row.name}</span>
            </div>
            <p className="mt-2 font-semibold" style={{ ...TABULAR, fontSize: 22, lineHeight: 1.05, letterSpacing: '-0.02em', color: INK }}>
              {fmtM(row.revenue)}
            </p>
            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full" style={{ background: '#F1F5F9' }}>
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, row.attainment)}%`, background: row.c, transition: BAR_TRANS }} />
            </div>
            <p className="mt-2 text-[11px] font-medium" style={{ ...TABULAR, color: '#64748B' }}>{row.share.toFixed(1)}% share · {row.attainment}% of goal</p>
          </div>
        ))}
      </section>

      {/* ── 4) Revenue by Month — full width + on-canvas insight ─── */}
      <section style={enter(3)}>
        <div
          className="rounded-2xl bg-white p-6 md:p-7"
          style={{ boxShadow: CARD_SHADOW }}
          data-testid="rev-by-month"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Revenue by month</h2>
              <p className="mt-1.5 text-[12px] font-medium" style={{ color: '#64748B' }}>Twelve-month view · Total, Forecast, and vs LY overlay</p>
            </div>
            <button
              data-testid="rev-export"
              className="inline-flex items-center gap-1 text-[12px] font-medium transition-colors duration-150"
              style={{ color: '#475569' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
            >
              Export <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Swatch color={!isAll && seg === 'US Wholesale' ? CORAL : C_USW}      label="US Wholesale" dim={!isAll && seg !== 'US Wholesale'} />
            <Swatch color={!isAll && seg === 'Distributors' ? CORAL : C_DIST}     label="Distributors" dim={!isAll && seg !== 'Distributors'} />
            <Swatch color={!isAll && seg === 'Retail' ? CORAL : C_RETAIL}   label="Retail"       dim={!isAll && seg !== 'Retail'} />
            <Swatch color={!isAll && seg === 'Ecommerce' ? CORAL : C_ECOM}     label="Ecommerce"    dim={!isAll && seg !== 'Ecommerce'} />
            <Swatch color={!isAll && seg === 'Amazon' ? CORAL : C_AMZN}     label="Amazon"       dim={!isAll && seg !== 'Amazon'} />
            <Swatch color={INK}        label="Total"    line />
            <Swatch color={CORAL}      label="Forecast" line dashed />
            <Swatch color={LY_GRAY}    label="vs LY"    line dashed />
          </div>

          <div className="relative mt-5 h-[280px]" style={TABULAR}>
            <span
              className="pointer-events-none absolute right-2 top-2 z-10 inline-flex items-center rounded-full text-[12px] font-medium"
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
                <Bar dataKey="retail" stackId="s" fill={!isAll && seg === 'Retail' ? CORAL : C_RETAIL} fillOpacity={1} isAnimationActive animationDuration={400} />
                <Bar dataKey="ecom"   stackId="s" fill={!isAll && seg === 'Ecommerce' ? CORAL : C_ECOM}   fillOpacity={1} isAnimationActive animationDuration={400} />
                <Bar dataKey="amzn"   stackId="s" fill={!isAll && seg === 'Amazon' ? CORAL : C_AMZN}   fillOpacity={1} isAnimationActive animationDuration={400} />
                <Bar dataKey="open"   stackId="s" fill={C_OPEN}   fillOpacity={1} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="ly"       stroke={LY_GRAY}    strokeWidth={1.5} dot={false} strokeDasharray="3 3" isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="total"    stroke="#0F172A"    strokeWidth={2}   dot={false} isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="forecast" stroke={CORAL}      strokeWidth={1.5} dot={false} strokeDasharray="5 4" isAnimationActive animationDuration={400} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── 5) Movers — gainers + decliners ────────────────────────── */}
      <section
        className="rounded-2xl bg-white p-6 md:p-7"
        style={{ boxShadow: CARD_SHADOW, ...enter(4) }}
        data-testid="movers"
      >
        <div>
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Movers · {rLabel}</h2>
          <p className="mt-1.5 text-[12px] font-medium" style={{ color: '#64748B' }}>Biggest changes vs prior period</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-x-7 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
          <div data-testid="movers-gainers">
            <p className="mb-2 text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>Top Gainers</p>
            {GAINERS.map((m, i) => (
              <div
                key={m.name}
                className="flex items-center gap-3 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded-lg px-3 cursor-pointer"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 48 }}
                data-testid={`mover-gain-${i}`}
                role="button"
                tabIndex={0}
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{m.name}</span>
                <span className="inline-flex items-center rounded-md text-[10px] font-semibold uppercase" style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 6px', letterSpacing: '0.06em' }}>{m.type}</span>
                <DeltaPill v={m.yoy} />
                <span className="w-[80px] text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(m.v * combined)}</span>
              </div>
            ))}
          </div>
          <div className="hidden md:block" style={{ background: '#F1F5F9' }} aria-hidden="true" />
          <div data-testid="movers-decliners">
            <p className="mb-2 text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>Top Decliners</p>
            {DECLINERS.map((m, i) => (
              <div
                key={m.name}
                className="flex items-center gap-3 transition-colors duration-150 hover:bg-slate-50 -mx-3 rounded-lg px-3 cursor-pointer"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 48 }}
                data-testid={`mover-decline-${i}`}
                role="button"
                tabIndex={0}
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{m.name}</span>
                <span className="inline-flex items-center rounded-md text-[10px] font-semibold uppercase" style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 6px', letterSpacing: '0.06em' }}>{m.type}</span>
                <DeltaPill v={m.yoy} />
                <span className="w-[80px] text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(m.v * combined)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
       {/* ── 6) Top Accounts + Top Items — vertical numbered lists ──── */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2" style={enter(6)}>
        {/* Top Accounts */}
        <div
          className="rounded-2xl bg-white p-6 flex flex-col h-full"
          style={{ boxShadow: CARD_SHADOW }}
          data-testid="top-accounts"
        >
          <div className="flex items-start justify-between">
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Top accounts</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#64748B' }}>Net Sales · YTD</span>
          </div>
          <ol className="mt-5 flex flex-1 flex-col">
            {topAccountsScaled.map((a, i) => (
              <li
                key={a.name}
                className="group flex flex-1 items-center gap-3 transition-colors duration-150 ease-out hover:bg-slate-50 -mx-3 rounded-lg px-3 cursor-pointer"
                style={{ borderTop: i === 0 ? 'none' : `1px solid #F1F5F9`, minHeight: 60 }}
                data-testid={`top-acct-${i}`}
                role="button"
                tabIndex={0}
                onClick={() => setDrilldownIdx(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrilldownIdx(i); } }}
              >
                <span className="w-7 text-right text-[11px] font-medium tabular-nums" style={{ color: '#94A3B8' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{a.name}</span>
                <DeltaPill v={a.yoy} />
                <span className="w-[96px] text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(a.net)}</span>
                <span className="text-[14px] font-medium opacity-0 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:translate-x-0.5" style={{ color: CORAL, lineHeight: 1 }}>›</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Top Items */}
        <div
          className="rounded-2xl bg-white p-6 flex flex-col h-full"
          style={{ boxShadow: CARD_SHADOW }}
          data-testid="top-items"
        >
          <div className="flex items-start justify-between">
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Top items</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#64748B' }}>Revenue · YTD</span>
          </div>
          <ol className="mt-5 flex flex-1 flex-col">
            {topItemsScaled.map((it, i) => (
              <li
                key={it.sku}
                className="group flex flex-1 flex-col justify-center py-2 transition-colors duration-150 ease-out hover:bg-slate-50 -mx-3 rounded-lg px-3"
                style={{ borderTop: i === 0 ? 'none' : `1px solid #F1F5F9`, minHeight: 60 }}
                data-testid={`top-item-${i}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-right text-[11px] font-medium tabular-nums" style={{ color: '#94A3B8' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{it.name}</span>
                  <span className="text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(it.rev)}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 pl-10">
                  <span className="text-[11px] font-medium" style={{ color: '#64748B' }}>{it.variant}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium" style={{ ...MONO, color: '#94A3B8' }}>{it.sku}</span>
                  <span className="text-right text-[11px] font-medium tabular-nums" style={{ color: '#64748B' }}>{it.units.toLocaleString('en-US')} units</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {drilldownData && (
        <AccountDrilldown account={drilldownData} onClose={() => setDrilldownIdx(null)} />
      )}
    </div>
  );
}

// Net Sales hero anchor — editorial scale (72-88px)
function NetSalesValue({ target }: { target: number }) {
  const v = useCountUp(target, 700);
  return (
    <p
      className="font-semibold"
      style={{ ...TABULAR, fontSize: 'clamp(72px, 7vw, 88px)', lineHeight: 1, letterSpacing: '-0.025em', color: INK }}
    >
      {usd0(Math.max(0, v))}
    </p>
  );
}
