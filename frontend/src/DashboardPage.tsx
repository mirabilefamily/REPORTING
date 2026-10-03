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

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const w = 100, h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = (max - min) || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  const lastX = w;
  const lastY = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX - 1.5} cy={lastY} r={2.4} fill={color} />
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

function MiniKPI({ label, target, delta, caption, testId }: { label: string; target: number; delta: React.ReactNode; caption: string; testId: string }) {
  const v = useCountUp(target, 700);
  // Map KPI label to its sparkline data + color
  const sparkMap: Record<string, { data: number[]; color: string }> = {
    'Open Orders': { data: SPARK_OPEN_ORDERS, color: '#94A3B8' },
    'Total':       { data: SPARK_TOTAL,       color: '#94A3B8' },
    'Forecast':    { data: SPARK_FORECAST,    color: '#FF6F61' },
  };
  const spark = sparkMap[label];
  const titleMap: Record<string, string> = {
    'Open Orders': 'Dollar value of orders currently in-flight (not yet shipped).',
    'Total':       'Period-to-date total net sales across all selected channels.',
    'Forecast':    'Projected period-end total using current pace and seasonality.',
  };
  return (
    <div className="px-6 pb-5 pt-5" data-testid={testId}>
      <div className="flex min-h-[26px] items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>{label}</p>
        <span data-testid={`${testId}-delta`}>{delta}</span>
      </div>
      <p className="mt-3 font-semibold" style={{ ...TABULAR, fontSize: 22, lineHeight: 1.05, letterSpacing: '-0.02em', color: INK }} title={titleMap[label]}>
        {usd0(Math.max(0, v))}
      </p>
      <p className="mt-2 text-[11px] font-medium" style={{ ...TABULAR, color: '#64748B' }}>{caption}</p>
      {spark && (
        <div className="mt-2.5" style={{ height: 28 }} data-testid={`${testId}-spark`}>
          <MiniSpark data={spark.data} color={spark.color} />
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage({ onNavigate }: Props) {
  const [seg, setSeg] = useState<SegKey>('All');
  const [svgTab, setSvgTab] = useState<'By Class' | 'By Month'>('By Class');
  const [mixTab, setMixTab] = useState<'All Channels' | 'B2B Combined'>('All Channels');
  const [range, setRange] = usePageRange('dashboard');
  const [drilldownIdx, setDrilldownIdx] = useState<number | null>(null);

  const scale = SEG_SCALE[seg];
  const segKey = SEG_KEY[seg];
  const isAll = seg === 'All';

  const rScale = RANGE_SCALE[range] ?? 1;
  const rLabel = RANGE_LABEL[range] ?? 'YTD';
  const svgSubtitle = SVG_SUBTITLE[range] ?? SVG_SUBTITLE.YTD;
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
  const emphasizeB2B = seg === 'US Wholesale' || seg === 'Distributors' ? 'B2B' : (isAll ? null : seg);

  const segmentRowsScaled = useMemo(() => SEGMENT_ROWS.map((s) => {
    const cur = s.cur * combined;
    return { ...s, cur, pct: Math.round((cur / s.tgt) * 100) };
  }), [combined]);

  const svgRowsScaled = useMemo(() => SVG_ROWS.map((r) => {
    const net = r.net * combined;
    return { ...r, net, variance: net - r.goal, pct: Math.round((net / r.goal) * 100) };
  }), [combined]);
  const svgVisibleRows = useMemo(() => (isAll ? svgRowsScaled : svgRowsScaled.filter((r) => r.name === seg)), [seg, isAll, svgRowsScaled]);
  const svgTotalScaled = useMemo(() => {
    const net = SVG_TOTAL.net * combined;
    return {
      net,
      goal: SVG_TOTAL.goal,
      variance: net - SVG_TOTAL.goal,
      pct: Math.round((net / SVG_TOTAL.goal) * 100),
      annual: SVG_TOTAL.annual,
    };
  }, [combined]);

  const donutAllScaled = useMemo(() => DONUT_ALL.map((d) => ({ ...d, v: d.v * combined })), [combined]);
  const donutB2BScaled = useMemo(() => DONUT_B2B.map((d) => ({ ...d, v: d.v * combined })), [combined]);

  const topAccountsScaled = useMemo(() => TOP_ACCOUNTS.map((a) => ({ ...a, net: a.net * combined })), [combined]);
  const topItemsScaled = useMemo(() => TOP_ITEMS.map((it) => ({ ...it, rev: it.rev * combined })), [combined]);

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
      <InsightStrip
        goalPct={goalPct}
        pace={pace}
        segmentRows={segmentRowsScaled}
        period={rLabel}
      />
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
          <div className="px-6 py-5" data-testid="kpi-net-sales">
            <div className="flex min-h-[26px] items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>
                Net Sales · {rLabel}
              </p>
            </div>
          <div className="mt-2.5 flex min-h-[58px] flex-wrap items-end gap-x-4 gap-y-2">
            <NetSalesValue target={netSalesYTD} />
            <span
              className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-semibold"
              style={{ ...TABULAR, background: '#ECFDF5', color: '#047857', padding: '3px 8px' }}
              data-testid="net-sales-delta"
            >
              <ArrowUp size={10} strokeWidth={2.6} />25.6% YoY
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-0.5 text-[12px] font-medium" style={{ ...TABULAR, color: '#047857' }}>
              <ArrowUp size={10} strokeWidth={2.6} />8.2% <span className="ml-1" style={{ color: '#475569' }}>MoM</span>
            </span>
            <span className="inline-flex items-center gap-0.5 text-[12px] font-medium" style={{ ...TABULAR, color: '#047857' }}>
              <ArrowUp size={10} strokeWidth={2.6} />12.4% <span className="ml-1" style={{ color: '#475569' }}>QoQ</span>
            </span>
            <span className="inline-flex items-center gap-0.5 text-[12px] font-medium" style={{ ...TABULAR, color: '#047857' }}>
              <ArrowUp size={10} strokeWidth={2.6} />25.6% <span className="ml-1" style={{ color: '#475569' }}>YoY</span>
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium leading-snug" style={{ color: '#64748B' }}>After discounts, returns &amp; tax · shipping included</p>
          <div className="mt-4" data-testid="hero-sparkline">
            <div style={{ height: 110 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="heroSparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CORAL} stopOpacity={0.16} />
                      <stop offset="100%" stopColor={CORAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="total" stroke={CORAL} strokeWidth={2} fill="url(#heroSparkGrad)" isAnimationActive animationDuration={500} dot={false} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1.5 flex text-[10px] font-medium" style={{ color: FAINT, letterSpacing: '0.06em' }}>
              {monthlyData.map((d) => (
                <span key={d.m} style={{ flex: 1, textAlign: 'center' }}>{d.m}</span>
              ))}
            </div>
          </div>
        </div>

          <div className="hidden min-[900px]:block" style={{ background: '#F1F5F9' }} aria-hidden="true" />

          <div className="border-t border-[#F1F5F9] px-6 py-5 min-[900px]:border-t-0" data-testid="annual-goal">
          <div className="flex min-h-[26px] items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>Annual Goal</p>
            <span
              className="inline-flex items-center rounded-full text-[11px] font-semibold"
              style={{
                ...TABULAR,
                background: onPace ? '#ECFDF5' : '#FFF1EF',
                color: onPace ? '#047857' : '#C9422E',
                padding: '3px 8px',
              }}
              data-testid="annual-goal-pct-pill"
            >
              {goalPct}%
            </span>
          </div>
          <div className="mt-2.5 flex min-h-[58px] items-end">
            <p className="text-[26px] font-semibold" style={{ ...TABULAR, lineHeight: 1.05, letterSpacing: '-0.02em', color: INK }} data-testid="annual-goal-amount">
              {fmtM(goalValue)}
            </p>
          </div>
          <p className="mt-1 text-[12px] font-medium" style={{ ...TABULAR, color: '#64748B' }}>
            of {fmtM(goalMax)} · {fmtM(Math.max(0, goalMax - goalValue))} to go
          </p>
          <div className="relative mt-4">
            <span
              className="absolute -top-4 whitespace-nowrap text-[10px] font-semibold uppercase"
              style={{ ...TABULAR, color: MUTED, letterSpacing: '0.10em', left: `${pace}%`, transform: 'translateX(-100%)', paddingRight: 4 }}
            >
              Pace {pace}%
            </span>
            <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: '#EFEFEF' }} data-testid="goal-bar">
              <span
                className="absolute inset-y-0 left-0"
                style={{ width: `${Math.min(goalPct, pace)}%`, background: CORAL, transition: BAR_TRANS }}
              />
              {goalPct < pace && (
                <span
                  className="absolute inset-y-0"
                  style={{ left: `${goalPct}%`, width: `${pace - goalPct}%`, background: 'rgba(252,116,96,0.35)', transition: BAR_TRANS }}
                />
              )}
              {goalPct > pace && (
                <span
                  className="absolute inset-y-0"
                  style={{ left: `${pace}%`, width: `${goalPct - pace}%`, background: CORAL, transition: BAR_TRANS }}
                />
              )}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-[2px]"
                style={{ left: `${pace}%`, background: 'rgba(10,10,10,0.6)' }}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5" data-testid="behind-pace-pill">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: onPace ? '#047857' : CORAL }} aria-hidden="true" />
            <span className="text-[12px] font-medium" style={{ ...TABULAR, color: onPace ? '#047857' : CORAL }}>
              {onPace ? 'On pace' : `${Math.abs(pace - goalPct)} pts behind pace`}
            </span>
          </div>
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid #F1F5F9` }}>
            {[...segmentRowsScaled].sort((a, b) => b.cur - a.cur).slice(0, 2).map((s, i) => (
              <div
                key={s.key}
                className="flex h-8 items-center gap-3"
                style={{ borderTop: i === 0 ? 'none' : `1px solid #F1F5F9` }}
                data-testid={`goal-seg-${s.key.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#0F172A' }} aria-hidden="true" />
                <b className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: '#1E293B' }}>{s.key}</b>
                <span className="text-[13px] font-semibold" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(s.cur)}</span>
                <span className="w-[76px] text-right text-[11px] font-medium" style={{ ...TABULAR, color: '#64748B' }}>{s.pct}% of goal</span>
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

      {/* ── 2b) Unified KPI row: Open Orders / Total / Forecast ────── */}
      <section
        className="overflow-hidden rounded-2xl bg-white"
        style={{ boxShadow: CARD_SHADOW, ...enter(2) }}
        data-testid="kpi-row"
      >
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)]">
          <MiniKPI
            label="Open Orders"
            target={openOrders}
            delta={<span className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-semibold" style={{ ...TABULAR, background: '#ECFDF5', color: '#047857', padding: '3px 8px' }}><ArrowUp size={10} strokeWidth={2.6} />12.4%</span>}
            caption="vs prior 30d"
            testId="kpi-open-orders"
          />
          <div className="hidden md:block" style={{ background: '#F1F5F9' }} aria-hidden="true" />
          <MiniKPI
            label="Total"
            target={total}
            delta={<span className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-semibold" style={{ ...TABULAR, background: '#ECFDF5', color: '#047857', padding: '3px 8px' }}><ArrowUp size={10} strokeWidth={2.6} />8.1%</span>}
            caption="vs LY"
            testId="kpi-total"
          />
          <div className="hidden md:block" style={{ background: '#F1F5F9' }} aria-hidden="true" />
          <MiniKPI
            label="Forecast"
            target={forecastVal}
            delta={<span className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-semibold" style={{ ...TABULAR, background: '#FFF1EF', color: '#C9422E', padding: '3px 8px' }}><ArrowDown size={10} strokeWidth={2.6} />Trailing</span>}
            caption="attainment vs plan"
            testId="kpi-forecast"
          />
        </div>
      </section>

      {/* ── 3) AI Assist meta line — moved to bottom (footer) ───────── */}

      {/* ── 4) Revenue by Month + Segments ──────────────────────────── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" style={enter(3)}>
        <div
          className="rounded-2xl bg-white p-6"
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

          <div className="mt-5 h-[240px]" style={TABULAR}>
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

        <div
          className="rounded-2xl bg-white p-6 flex flex-col h-full"
          style={{ boxShadow: CARD_SHADOW }}
          data-testid="segment-panel"
        >
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Segments</h2>
          <div className="mt-3 flex flex-nowrap items-center gap-x-3 whitespace-nowrap" data-testid="segments-legend">
            {(['US Wholesale', 'Distributors', 'Ecommerce', 'Amazon', 'Retail'] as const).map((name) => (
              <div key={name} className="inline-flex items-center gap-1">
                <span className="inline-block rounded-full shrink-0" style={{ width: 5, height: 5, background: SEG_COLORS[name] }} />
                <span className="text-[11px] font-medium" style={{ color: '#475569' }}>{name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-1 flex-col">
            <div className="grid grid-cols-[minmax(0,1fr)_96px_96px_88px] items-center gap-3 pb-3 text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }} data-testid="segments-header">
              <span>Segment</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Target</span>
              <span className="text-right">Attainment</span>
            </div>
            {[...segmentRowsScaled].sort((a, b) => b.pct - a.pct).map((s, idx) => {
              const active = highlightSegRow(s.key);
              const onPace = s.pct >= 70;
              return (
                <div
                  key={s.key}
                  data-testid={`seg-row-${s.key.toLowerCase().replace(/\s+/g, '-')}`}
                  className="grid flex-1 grid-cols-[minmax(0,1fr)_96px_96px_88px] items-center gap-3"
                  style={{
                    opacity: active ? 1 : 0.4,
                    transition: 'opacity 250ms ease',
                    borderTop: idx === 0 ? 'none' : `1px solid #F1F5F9`,
                    minHeight: 44,
                  }}
                >
                  <span className="truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{s.key}</span>
                  <span className="text-right text-[14px] font-medium" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(s.cur)}</span>
                  <span className="text-right text-[14px] font-medium" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(s.tgt)}</span>
                  <span className="text-right text-[14px] font-semibold" style={{ ...TABULAR, color: onPace ? '#0F172A' : '#C9422E' }}>{s.pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5) Channel Mix — horizontal stacked bar ─────────────────── */}
      <section
        className="rounded-2xl bg-white p-6"
        style={{ boxShadow: CARD_SHADOW, ...enter(4) }}
        data-testid="channel-mix"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Channel mix</h2>
          <SegTabs tabs={['All Channels', 'B2B Combined']} value={mixTab} onChange={(v: any) => setMixTab(v)} testId="mix-tabs" slugPrefix="mix" />
        </div>
        {(() => {
          const slices = mixTab === 'B2B Combined' ? donutB2BScaled : donutAllScaled;
          const totalV = slices.reduce((sum, s) => sum + s.v, 0) || 1;
          return (
            <>
              <div className="mt-6 flex h-8 w-full overflow-hidden rounded-lg" style={{ background: TRACK }}>
                {slices.map((s, i) => {
                  const w = (s.v / totalV) * 100;
                  const dim = emphasizeName && s.name !== emphasizeName && !(mixTab === 'B2B Combined' && emphasizeB2B === s.name);
                  return (
                    <div
                      key={s.name}
                      title={`${s.name} · ${fmtM(s.v)} · ${((s.v/totalV)*100).toFixed(1)}%`}
                      className="h-full transition-opacity duration-200"
                      style={{
                        width: `${w}%`,
                        background: s.c,
                        borderRight: i < slices.length - 1 ? '3px solid #FFFFFF' : 'none',
                        opacity: dim ? 0.35 : 1,
                      }}
                      data-testid={`mix-slice-${s.name.toLowerCase().replace(/\s+/g, '-')}`}
                    />
                  );
                })}
              </div>
              <ul className="mt-6">
                {slices.map((s, i) => {
                  const share = (s.v / totalV) * 100;
                  return (
                    <li
                      key={s.name}
                      className="flex h-10 items-center justify-between gap-3"
                      style={{ borderTop: i === 0 ? 'none' : `1px solid ${BORDER}` }}
                      data-testid={`mix-legend-${s.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <i className="h-2 w-2 rounded-full shrink-0" style={{ background: s.c }} />
                        <span className="truncate text-[14px] font-medium" style={{ color: BODY }}>{s.name}</span>
                      </div>
                      <span className="shrink-0 text-[14px] font-medium" style={{ ...TABULAR, color: BODY }}>
                        <b style={{ color: INK }}>{fmtM(s.v)}</b>
                        <span style={{ color: MUTED }}> · {share.toFixed(1)}%</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          );
        })()}
      </section>

      {/* ── 6) Sales vs Goal — table ───────────────────────────────── */}
      <section
        className="rounded-2xl bg-white p-6"
        style={{ boxShadow: CARD_SHADOW, ...enter(5) }}
        data-testid="sales-vs-goal"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Sales vs goal</h2>
            <p className="mt-1.5 text-[12px] font-medium" style={{ color: '#64748B' }}>{svgSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div data-testid="svg-tabs-wrap">
              <SegTabs tabs={['By Class', 'By Month']} value={svgTab} onChange={(v: any) => setSvgTab(v)} testId="svg-tabs" slugPrefix="svg-tab" />
            </div>
            <button
              data-testid="svg-export"
              className="inline-flex items-center gap-1 text-[12px] font-medium transition-colors duration-150"
              style={{ color: '#475569' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
            >
              Export <ArrowUpRight size={12} />
            </button>
          </div>
        </div>

        <div className="mt-6 svg-scroll-wrap overflow-x-auto md:overflow-visible">
          <div
            className="grid min-w-[820px] md:min-w-0 grid-cols-[minmax(180px,1.4fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(160px,200px)_minmax(110px,1fr)] items-center gap-x-4 pb-2.5 text-[11px] font-semibold uppercase"
            style={{ letterSpacing: '0.08em', color: '#64748B', borderBottom: `1px solid #F1F5F9` }}
          >
            <span className="svg-sticky-col">Class</span>
            <span className="text-right">Net Sales YTD</span>
            <span className="text-right">Goal YTD</span>
            <span className="text-right">Variance</span>
            <span className="text-right">% to Goal</span>
            <span className="text-right">Annual Goal</span>
          </div>
          {svgVisibleRows.map((r) => {
            const onPace = r.pct >= 70;
            const barColor = onPace ? '#0F172A' : '#FF6F61';
            const pctColor = onPace ? '#0F172A' : '#C9422E';
            const varColor = r.variance < 0 ? '#C9422E' : r.variance > 0 ? '#0F172A' : '#64748B';
            return (
              <div
                key={r.name}
                className="group grid min-w-[820px] md:min-w-0 grid-cols-[minmax(180px,1.4fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(160px,200px)_minmax(110px,1fr)] items-center gap-x-4 h-12 text-[14px] transition-colors duration-150 ease-out hover:bg-slate-50"
                style={{ borderBottom: `1px solid #F1F5F9` }}
                data-testid={`svg-row-${r.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="svg-sticky-col flex min-w-0 items-center gap-2">
                  <i className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: r.c }} />
                  <span className="truncate font-medium" style={{ color: '#0F172A' }}>{r.name}</span>
                </span>
                <span className="text-right font-medium whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(r.net)}</span>
                <span className="text-right font-medium whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(r.goal)}</span>
                <span className="text-right font-medium whitespace-nowrap" style={{ ...TABULAR, color: varColor }}>{fmtM(r.variance)}</span>
                <div className="flex items-center gap-3">
                  <span className="relative h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#F1F5F9' }}>
                    <span
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{ width: `${Math.min(100, r.pct)}%`, background: barColor, transition: BAR_TRANS }}
                    />
                  </span>
                  <span className="text-right text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ color: pctColor, minWidth: 36 }}>{r.pct}%</span>
                </div>
                <span className="text-right font-medium whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(r.annual)}</span>
              </div>
            );
          })}
          {(() => {
            const onPace = svgTotalScaled.pct >= 70;
            const barColor = onPace ? '#0F172A' : '#FF6F61';
            const pctColor = onPace ? '#0F172A' : '#C9422E';
            const varColor = svgTotalScaled.variance < 0 ? '#C9422E' : svgTotalScaled.variance > 0 ? '#0F172A' : '#64748B';
            return (
              <div
                className="grid min-w-[820px] md:min-w-0 grid-cols-[minmax(180px,1.4fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(160px,200px)_minmax(110px,1fr)] items-center gap-x-4 h-[52px] text-[15px] font-semibold"
                style={{ borderTop: `1px solid #E2E8F0`, color: '#0F172A' }}
                data-testid="svg-total-row"
              >
                <span className="svg-sticky-col">Total</span>
                <span className="text-right whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(svgTotalScaled.net)}</span>
                <span className="text-right whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(svgTotalScaled.goal)}</span>
                <span className="text-right whitespace-nowrap" style={{ ...TABULAR, color: varColor }}>{fmtM(svgTotalScaled.variance)}</span>
                <div className="flex items-center gap-3">
                  <span className="relative h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#F1F5F9' }}>
                    <span
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{ width: `${Math.min(100, svgTotalScaled.pct)}%`, background: barColor, transition: BAR_TRANS }}
                    />
                  </span>
                  <span className="text-right text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ color: pctColor, minWidth: 36 }}>{svgTotalScaled.pct}%</span>
                </div>
                <span className="text-right whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(svgTotalScaled.annual)}</span>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── 7) Top Accounts + Top Items — vertical numbered lists ──── */}
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

// Net Sales hero anchor (display size)
function NetSalesValue({ target }: { target: number }) {
  const v = useCountUp(target, 700);
  return (
    <p
      className="font-semibold"
      style={{ ...TABULAR, fontSize: 'clamp(40px, 4.2vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: INK }}
    >
      {usd0(Math.max(0, v))}
    </p>
  );
}
