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
import PageHeader from './components/PageHeader';
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
  'Today':    0.0027,
  'Yesterday':0.0027,
  'Last 7d':  0.019,
  'Last 30d': 0.083,
  'Last 90d': 0.25,
  'MTD':      0.083,
  'QTD':      0.28,
  'YTD':      1.00,
  'Custom':   1.00,
};
const RANGE_LABEL: Record<string, string> = {
  'Today':    'TODAY',
  'Yesterday':'YESTERDAY',
  'Last 7d':  'LAST 7D',
  'Last 30d': 'LAST 30D',
  'Last 90d': 'LAST 90D',
  'MTD':      'MTD',
  'QTD':      'QTD',
  'YTD':      'YTD',
  'Custom':   'CUSTOM RANGE',
};
const SVG_SUBTITLE: Record<string, string> = {
  'Today':    'Today',
  'Yesterday':'Yesterday',
  'Last 7d':  'Last 7 days',
  'Last 30d': 'Last 30 days',
  'Last 90d': 'Last 90 days',
  'MTD':      'Month-to-date',
  'QTD':      'Q3 2026 pacing',
  'YTD':      '2026 goal pacing through September',
  'Custom':   'Custom range',
};
const MONTHS_VISIBLE: Record<string, number> = {
  'Today':    1,
  'Yesterday':1,
  'Last 7d':  2,
  'Last 30d': 4,
  'Last 90d': 6,
  'MTD':      3,
  'QTD':      3,
  'YTD':      12,
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
  { name: 'Lids',                       rank: 1, net: 2_720_000, yoy: -24.8, shareOfTotal: 41.5, spark: [1.85, 1.70, 1.58, 1.42, 1.30, 1.18, 1.22, 1.05, 0.95, 0.82, 0.75, 0.68], trend: 'down' as const, rep: 'Jovon Clements', repInitials: 'JC', repTitle: 'Senior Account Manager' },
  { name: 'SASAtrend',                  rank: 2, net: 1_460_000, yoy:  -4.7, shareOfTotal: 22.3, spark: [1.20, 1.15, 1.18, 1.12, 1.10, 1.08, 1.05, 1.02, 1.00, 0.98, 0.95, 0.98], trend: 'down' as const, rep: 'Erwin Samson',   repInitials: 'ES', repTitle: 'International Lead' },
  { name: 'Industrias Mercury, S.A.',   rank: 3, net: 1_030_000, yoy:  53.7, shareOfTotal: 15.7, spark: [0.55, 0.60, 0.62, 0.68, 0.72, 0.80, 0.85, 0.90, 0.95, 1.00, 1.08, 1.14], trend: 'up' as const,   rep: 'Priya Narayan',  repInitials: 'PN', repTitle: 'LATAM Account Director' },
  { name: 'Nordstrom Accounts Payable', rank: 4, net:   726_000, yoy: -20.2, shareOfTotal: 11.1, spark: [0.95, 0.92, 0.88, 0.84, 0.80, 0.78, 0.75, 0.72, 0.68, 0.66, 0.62, 0.60], trend: 'down' as const, rep: 'Devon Rhodes',   repInitials: 'DR', repTitle: 'Key Accounts Manager' },
  { name: 'Buckle Inc., The',           rank: 5, net:   617_000, yoy: -54.8, shareOfTotal:  9.4, spark: [1.38, 1.25, 1.10, 0.95, 0.82, 0.74, 0.70, 0.64, 0.58, 0.52, 0.48, 0.45], trend: 'down' as const, rep: 'James Lee',      repInitials: 'JL', repTitle: 'Specialty Retail Lead' },
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
export function SegTabs({ tabs, value, onChange, testId, slugPrefix }: { tabs: readonly string[]; value: string; onChange: (v: any) => void; testId: string; slugPrefix: string; background?: string }) {
  return (
    <div
      className="inline-flex items-center"
      role="tablist"
      style={{ gap: 2 }}
      data-testid={testId}
    >
      {tabs.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t)}
            data-testid={`${slugPrefix}-${t.toLowerCase().replace(/\s+/g, '-')}`}
            className="ph-tab"
            data-active={active}
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
type DashProps = { name?: string; onNavigate?: (label: string) => void };

// Hero Net Sales trend: 12 months, in $ (will be scaled by combined factor)
const HERO_TREND_BASE = [
  { m: 'Jan', v: 1_120_000 }, { m: 'Feb', v: 1_240_000 }, { m: 'Mar', v: 1_480_000 },
  { m: 'Apr', v: 1_380_000 }, { m: 'May', v: 1_540_000 }, { m: 'Jun', v: 1_720_000 },
  { m: 'Jul', v: 1_980_000 }, { m: 'Aug', v: 2_180_000 }, { m: 'Sep', v: 2_240_000 },
  { m: 'Oct', v: 2_120_000 }, { m: 'Nov', v: 1_820_000 }, { m: 'Dec', v: 1_320_000 },
];

// Monthly revenue by channel (base $K, scaled by combined)
const REV_BY_MONTH_BASE = [
  { m: 'Jan', usw: 680, dist: 540, retail:  38, ecom: 420, amzn:  72, open: 180 },
  { m: 'Feb', usw: 720, dist: 580, retail:  42, ecom: 460, amzn:  78, open: 180 },
  { m: 'Mar', usw: 820, dist: 640, retail:  48, ecom: 520, amzn:  84, open: 180 },
  { m: 'Apr', usw: 780, dist: 610, retail:  46, ecom: 500, amzn:  86, open: 180 },
  { m: 'May', usw: 740, dist: 580, retail:  44, ecom: 480, amzn:  88, open: 180 },
  { m: 'Jun', usw: 860, dist: 680, retail:  52, ecom: 580, amzn:  92, open: 180 },
  { m: 'Jul', usw: 940, dist: 740, retail:  58, ecom: 620, amzn:  94, open: 180 },
  { m: 'Aug', usw:1020, dist: 820, retail:  62, ecom: 680, amzn:  96, open: 220 },
  { m: 'Sep', usw:1040, dist: 850, retail:  64, ecom: 700, amzn: 100, open: 260 },
  { m: 'Oct', usw: 920, dist: 740, retail:  58, ecom: 620, amzn:  88, open: 310 },
  { m: 'Nov', usw: 820, dist: 660, retail:  52, ecom: 540, amzn:  82, open: 310 },
  { m: 'Dec', usw: 760, dist: 600, retail:  48, ecom: 490, amzn:  80, open: 310 },
];

// Segment table (goals in $M, actual computed from scale)
const SEG_TABLE_BASE = [
  { name: 'US Wholesale', actual: 6_900_000, target:  9_120_000 },
  { name: 'Distributors', actual: 5_320_000, target:  8_410_000 },
  { name: 'Retail',       actual:   460_000, target:    640_000 },
  { name: 'Ecommerce',    actual: 4_650_000, target:  6_730_000 },
  { name: 'Amazon',       actual:   810_000, target:  1_020_000 },
];

function HeroAreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 10, padding: 10, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)', ...TABULAR }}>
      <p style={{ color: MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{label}</p>
      <p style={{ color: '#0F172A', fontSize: 13, fontWeight: 600, margin: '4px 0 0' }}>{fmtM(payload[0].value)}</p>
    </div>
  );
}

function RevByMonthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => ['usw','dist','retail','ecom','amzn','open'].includes(p.dataKey));
  const total = payload.find((p: any) => p.dataKey === 'total');
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 12, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)', minWidth: 200, ...TABULAR }}>
      <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{label}</p>
      {rows.map((r: any) => (
        <div key={r.dataKey} className="flex items-baseline justify-between gap-3" style={{ marginTop: 4 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: r.color }} />
            {r.name}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{fmtM(r.value * 1000)}</span>
        </div>
      ))}
      {total && (
        <div className="flex items-baseline justify-between gap-3" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>Total</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{fmtM(total.value * 1000)}</span>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage(props: DashProps) {
  const [seg, setSeg] = useState<SegKey>('All');
  const [range, setRange] = usePageRange('dashboard');
  const [drilldownIdx, setDrilldownIdx] = useState<number | null>(null);
  const [hoveredMix, setHoveredMix] = useState<string | null>(null);

  const scale = SEG_SCALE[seg] ?? 1;
  const rScale = RANGE_SCALE[range] ?? 1;
  const combined = scale * rScale;

  // Hero figure (reference uses $18.14M mid-year)
  const netSales = 18_139_417 * combined;

  // Annual goal values
  const annualGoal = 25_700_000;
  const goalPct = Math.min(100, (netSales / annualGoal) * 100);
  const expectedPct = 75; // today marker ~Sep 30 of 12mo plan
  const paceDelta = Math.round(goalPct - expectedPct);

  // 3-col KPI row
  const openOrders = 8_931_497 * scale;
  const total = netSales + openOrders;
  const forecast = 25_701_800 * scale;

  // Hero smoothed trend (apply combined scale)
  const heroTrend = useMemo(() => HERO_TREND_BASE.map((d) => ({ m: d.m, v: d.v * combined })), [combined]);

  // Revenue by month in $K (apply combined)
  const revByMonth = useMemo(() => REV_BY_MONTH_BASE.map((d) => {
    const usw = d.usw * combined, dist = d.dist * combined, retail = d.retail * combined;
    const ecom = d.ecom * combined, amzn = d.amzn * combined, open = d.open * combined;
    const total = usw + dist + retail + ecom + amzn + open;
    const forecast = total * 1.05;
    return { ...d, usw, dist, retail, ecom, amzn, open, total, forecast };
  }), [combined]);

  // Segment table (scaled)
  const segRows = useMemo(() => SEG_TABLE_BASE.map((r) => ({
    ...r,
    actual: r.actual * scale,
    target: r.target * scale,
    attainment: Math.round((r.actual / r.target) * 100),
  })).sort((a, b) => b.attainment - a.attainment), [scale]);

  // US Wholesale & Distributors breakdown values for Annual Goal card
  const uswBreakdown = SEG_TABLE_BASE[0].actual * scale;
  const distBreakdown = SEG_TABLE_BASE[1].actual * scale;
  const uswPct = Math.round((uswBreakdown / (SEG_TABLE_BASE[0].target * scale)) * 100);
  const distPct = Math.round((distBreakdown / (SEG_TABLE_BASE[1].target * scale)) * 100);

  const cardStyle: React.CSSProperties = { background: '#FFFFFF', borderRadius: 16, boxShadow: CARD_SHADOW, padding: 24, overflow: 'hidden' };

  return (
    <div className="min-h-full" data-testid="dashboard-page" style={{ ...INTER, ...TABULAR, background: CANVAS }}>
      <div className="page-canvas">
        {/* ── 1. Unified editorial header ────────────────────── */}
        <PageHeader
          title="Dashboard"
          testIdPrefix="dashboard"
          channels={SEGMENTS}
          activeChannel={seg}
          onChannelChange={(v: string) => setSeg(v as any)}
          dateControl={<DateRangePicker value={range} onChange={setRange} testId="dashboard-range" />}
        />

        {/* ── 2. Hero row 70/30 ─────────────────────────────────── */}
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[7fr_3fr]" data-testid="dashboard-hero-row">
          {/* Net Sales card */}
          <div style={cardStyle} data-testid="hero-netsales">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: MUTED }}>Net Sales · YTD</span>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
              <p style={{ ...TABULAR, margin: 0, fontSize: 'clamp(36px, 3vw, 48px)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#0A0A0B' }} data-testid="hero-netsales-value">{fmtM(netSales)}</p>
              <span className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-medium" style={{ ...TABULAR, color: '#047857', background: '#ECFDF5', padding: '3px 8px' }}>
                <ArrowUp size={10} strokeWidth={2.6} />26.3% YoY
              </span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: MUTED }}>After discounts, returns &amp; tax · shipping included ($1K)</p>
            <div className="mt-5" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={heroTrend} margin={{ top: 6, right: 4, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CORAL} stopOpacity={0.14} />
                      <stop offset="100%" stopColor={CORAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: MUTED, fontWeight: 500 }} tickMargin={6} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<HeroAreaTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="v" stroke={CORAL} strokeWidth={2} fill="url(#heroArea)" dot={false} isAnimationActive animationDuration={400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Annual Goal card */}
          <div style={cardStyle} data-testid="hero-annual-goal">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: MUTED }}>Annual Goal</span>
              </div>
              <span className="inline-flex items-center rounded-full text-[12px] font-semibold" style={{ ...TABULAR, color: '#C9422E', background: '#FFF1EF', padding: '3px 10px' }}>{Math.round(goalPct)}%</span>
            </div>
            <p style={{ ...TABULAR, margin: '10px 0 0', fontSize: 36, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em', color: '#0F172A' }} data-testid="hero-goal-value">{fmtM(netSales)}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED }}>of {fmtM(annualGoal)} · {fmtM(annualGoal - netSales)} to go</p>

            <div className="mt-5 flex items-center justify-between">
              <span style={{ fontSize: 11, fontWeight: 500, color: MUTED, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Pace</span>
              <span style={{ ...TABULAR, fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{Math.round(goalPct)}%</span>
            </div>
            <div className="relative mt-1.5 h-2 overflow-visible rounded-full" style={{ background: '#F1F5F9' }}>
              <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${goalPct}%`, background: CORAL }} />
              <span className="absolute top-[-3px] h-[14px] w-[2px]" style={{ left: `${expectedPct}%`, background: '#0F172A' }} aria-label="Today marker" />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 500, color: '#C9422E' }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle" style={{ background: CORAL }} />
              {paceDelta >= 0 ? `${paceDelta} pts ahead of pace` : `${Math.abs(paceDelta)} pts behind pace`}
            </p>

            <hr style={{ margin: '16px 0 10px', border: 'none', borderTop: `1px solid #F1F5F9` }} />

            {[
              { label: 'US Wholesale', dot: SEG_COLORS['US Wholesale'], value: uswBreakdown,  pct: uswPct },
              { label: 'Distributors', dot: SEG_COLORS['Distributors'], value: distBreakdown, pct: distPct },
            ].map((r, i) => (
              <div key={r.label} className="grid items-center" style={{ gridTemplateColumns: '1.3fr 1fr 1fr', minHeight: 32, borderTop: i === 0 ? 'none' : '1px solid #F1F5F9' }} data-testid={`goal-break-${r.label.toLowerCase().replace(/\s+/g,'-')}`}>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: r.dot }} />
                  <span style={{ fontSize: 13, color: '#1E293B' }}>{r.label}</span>
                </span>
                <span style={{ ...TABULAR, fontSize: 13, color: '#334155', textAlign: 'center' }}>{fmtM(r.value)}</span>
                <span style={{ fontSize: 11, color: MUTED, textAlign: 'right' }}>{r.pct}% of goal</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. 3-col KPI row ───────────────────────────────────── */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="dashboard-kpi-row">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr_1px_1fr]">
            {/* Open Orders */}
            <div style={{ padding: '20px 24px' }} data-testid="kpi-open-orders">
              <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: MUTED }}>Open Orders</span>
              <p style={{ ...TABULAR, margin: '6px 0 4px', fontSize: 'clamp(24px, 2vw, 32px)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#0A0A0B' }}>{fmtM(openOrders)}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>Booked, not yet invoiced</p>
            </div>
            <div className="hidden md:block" style={{ background: '#F1F5F9' }} aria-hidden="true" />
            {/* Total */}
            <div style={{ padding: '20px 24px' }} data-testid="kpi-total">
              <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: MUTED }}>Total</span>
              <p style={{ ...TABULAR, margin: '6px 0 4px', fontSize: 'clamp(24px, 2vw, 32px)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#0A0A0B' }}>{fmtM(total)}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>Net Sales + Open Orders</p>
            </div>
            <div className="hidden md:block" style={{ background: '#F1F5F9' }} aria-hidden="true" />
            {/* Forecast */}
            <div style={{ padding: '20px 24px' }} data-testid="kpi-forecast">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: MUTED }}>Forecast</span>
                <span className="inline-flex items-center gap-1 rounded-full text-[12px] font-medium" style={{ color: '#C9422E', background: '#FFF1EF', padding: '3px 8px' }}>
                  <ArrowDown size={10} strokeWidth={2.6} />Trailing
                </span>
              </div>
              <p style={{ ...TABULAR, margin: '6px 0 4px', fontSize: 'clamp(24px, 2vw, 32px)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#0A0A0B' }}>{fmtM(forecast)}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: MUTED }}>attainment vs plan</p>
            </div>
          </div>
        </section>

        {/* ── 4. Revenue + Segments row 65/35 ─────────────────── */}
        <section className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[65fr_35fr]" data-testid="dashboard-rev-seg-row">
          <div style={cardStyle} data-testid="revenue-by-month">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.005em' }}>Revenue by month</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED }}>Twelve-month view · Net sales, open orders and forecast</p>
              </div>
              <a href="#" onClick={(e) => e.preventDefault()} className="transition-colors duration-150" style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}
                 onMouseEnter={(e) => { e.currentTarget.style.color = '#0F172A'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}>
                Export ↗
              </a>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium" style={{ color: MUTED }}>
              {[
                { label: 'US Wholesale', color: SEG_COLORS['US Wholesale'] },
                { label: 'Distributors', color: SEG_COLORS['Distributors'] },
                { label: 'Retail',       color: SEG_COLORS['Retail'] },
                { label: 'Ecommerce',    color: SEG_COLORS['Ecommerce'] },
                { label: 'Amazon',       color: SEG_COLORS['Amazon'] },
                { label: 'Open Orders',  color: '#CBD5E1' },
              ].map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: '#0F172A' }} />Total</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: CORAL, borderTop: `1px dashed ${CORAL}` }} />Forecast</span>
            </div>
            <div className="mt-4" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revByMonth} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: MUTED, fontWeight: 500 }} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: MUTED, fontWeight: 500 }} width={56} tickFormatter={(v) => fmtM(v * 1000)} />
                  <Tooltip content={<RevByMonthTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                  <Bar dataKey="usw"    stackId="rev" name="US Wholesale" fill={SEG_COLORS['US Wholesale']} radius={[0,0,0,0]} isAnimationActive animationDuration={400} />
                  <Bar dataKey="dist"   stackId="rev" name="Distributors" fill={SEG_COLORS['Distributors']} radius={[0,0,0,0]} isAnimationActive animationDuration={400} />
                  <Bar dataKey="retail" stackId="rev" name="Retail"       fill={SEG_COLORS['Retail']}       radius={[0,0,0,0]} isAnimationActive animationDuration={400} />
                  <Bar dataKey="ecom"   stackId="rev" name="Ecommerce"    fill={SEG_COLORS['Ecommerce']}    radius={[0,0,0,0]} isAnimationActive animationDuration={400} />
                  <Bar dataKey="amzn"   stackId="rev" name="Amazon"       fill={SEG_COLORS['Amazon']}       radius={[0,0,0,0]} isAnimationActive animationDuration={400} />
                  <Bar dataKey="open"   stackId="rev" name="Open Orders"  fill="#CBD5E1"                     radius={[3,3,0,0]} isAnimationActive animationDuration={400} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="#0F172A" strokeWidth={2} dot={false} isAnimationActive animationDuration={400} />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke={CORAL} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive animationDuration={400} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle} data-testid="segments-card">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.005em' }}>Segments</h2>
            <p style={{ margin: '4px 0 16px', fontSize: 12, color: MUTED }}>Attainment vs annual goal</p>
            <div className="grid gap-x-3 pb-3 text-[11px] font-semibold uppercase" style={{ gridTemplateColumns: '1.3fr 1fr 1fr 72px', letterSpacing: '0.08em', color: MUTED, borderBottom: '1px solid #F1F5F9' }}>
              <span>Segment</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Goal</span>
              <span className="text-right">Attain</span>
            </div>
            {segRows.map((r, i) => {
              const low = r.attainment < 70;
              return (
                <div
                  key={r.name}
                  className="grid items-center gap-x-3 transition-colors duration-150"
                  style={{ gridTemplateColumns: '1.3fr 1fr 1fr 72px', minHeight: 56, borderTop: i === 0 ? 'none' : '1px solid #F1F5F9' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  data-testid={`segrow-${r.name.toLowerCase().replace(/\s+/g,'-')}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SEG_COLORS[r.name] }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{r.name}</span>
                  </span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 14, color: '#0F172A' }}>{fmtM(r.actual)}</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 14, color: '#0F172A' }}>{fmtM(r.target)}</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 14, fontWeight: 600, color: low ? '#C9422E' : '#0F172A' }}>{r.attainment}%</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 5. Channel Mix (full width) ─────────────────────── */}
        <section className="mt-4" style={cardStyle} data-testid="dashboard-channel-mix">
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.005em' }}>Channel mix</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED }}>Revenue share across all channels</p>
          </div>
          {(() => {
            const totalMix = segRows.reduce((s, r) => s + r.actual, 0);
            const mixOrder = ['US Wholesale','Distributors','Ecommerce','Amazon','Retail'];
            const rows = mixOrder.map((name) => {
              const r = segRows.find((x) => x.name === name)!;
              return { name, actual: r.actual, share: totalMix > 0 ? (r.actual / totalMix) * 100 : 0 };
            });
            return (
              <>
                <div className="mt-4 flex overflow-hidden" style={{ height: 32, borderRadius: 999, gap: 2 }} data-testid="channel-mix-bar">
                  {rows.map((r, i) => {
                    const dim = hoveredMix !== null && hoveredMix !== r.name;
                    return (
                      <div
                        key={r.name}
                        onMouseEnter={() => setHoveredMix(r.name)}
                        onMouseLeave={() => setHoveredMix(null)}
                        style={{
                          flexBasis: `${r.share}%`,
                          background: `linear-gradient(180deg, ${SEG_COLORS[r.name]} 0%, ${SEG_COLORS[r.name]} 100%)`,
                          opacity: dim ? 0.35 : 1,
                          transition: 'opacity 150ms ease, flex-basis 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                          borderTopLeftRadius: i === 0 ? 999 : 0,
                          borderBottomLeftRadius: i === 0 ? 999 : 0,
                          borderTopRightRadius: i === rows.length - 1 ? 999 : 0,
                          borderBottomRightRadius: i === rows.length - 1 ? 999 : 0,
                        }}
                        title={`${r.name} · ${fmtM(r.actual)} · ${r.share.toFixed(1)}%`}
                        data-testid={`channel-mix-slice-${r.name.toLowerCase().replace(/\s+/g,'-')}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-5">
                  <div className="grid gap-x-4 pb-2 text-[11px] font-semibold uppercase" style={{ gridTemplateColumns: '1.6fr 1fr 100px', letterSpacing: '0.08em', color: MUTED, borderBottom: '1px solid #F1F5F9' }}>
                    <span>Channel</span>
                    <span className="text-right">Revenue</span>
                    <span className="text-right">Share</span>
                  </div>
                  {rows.map((r, i) => {
                    const dim = hoveredMix !== null && hoveredMix !== r.name;
                    return (
                      <div
                        key={r.name}
                        onMouseEnter={() => setHoveredMix(r.name)}
                        onMouseLeave={() => setHoveredMix(null)}
                        className="grid items-center gap-x-4 transition-colors duration-150"
                        style={{ gridTemplateColumns: '1.6fr 1fr 100px', minHeight: 44, borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', background: hoveredMix === r.name ? '#F8FAFC' : 'transparent', opacity: dim ? 0.55 : 1 }}
                        data-testid={`channel-mix-row-${r.name.toLowerCase().replace(/\s+/g,'-')}`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SEG_COLORS[r.name] }} />
                          <span style={{ fontSize: 14, color: '#0F172A' }}>{r.name}</span>
                        </span>
                        <span style={{ ...TABULAR, fontSize: 14, color: '#0F172A', textAlign: 'right' }}>{fmtM(r.actual)}</span>
                        <span style={{ ...TABULAR, fontSize: 14, fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>{r.share.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </section>

        {/* ── 6. Top Accounts + Top Items (50/50) ─────────────── */}
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="dashboard-top-row">
          <div style={cardStyle} data-testid="top-accounts-card">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.005em' }}>Top accounts</h2>
            <p style={{ margin: '4px 0 12px', fontSize: 12, color: MUTED }}>YTD net sales</p>
            {TOP_ACCOUNTS.map((a, i) => (
              <div
                key={a.name}
                onClick={() => setDrilldownIdx(i)}
                role="button"
                tabIndex={0}
                className="grid items-center transition-colors duration-150 cursor-pointer"
                style={{ gridTemplateColumns: '32px 1fr auto auto', gap: 12, minHeight: 60, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #F1F5F9' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                data-testid={`top-account-${i}`}
              >
                <span style={{ ...TABULAR, fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <DeltaPill v={a.yoy} />
                <span style={{ ...TABULAR, fontSize: 14, fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>{fmtM(a.net * scale)}</span>
              </div>
            ))}
          </div>

          <div style={cardStyle} data-testid="top-items-card">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.005em' }}>Top items</h2>
            <p style={{ margin: '4px 0 12px', fontSize: 12, color: MUTED }}>YTD revenue</p>
            {TOP_ITEMS.map((it, i) => (
              <div
                key={it.sku}
                className="grid items-center transition-colors duration-150"
                style={{ gridTemplateColumns: '32px 1fr auto', gap: 12, minHeight: 60, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #F1F5F9' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                data-testid={`top-item-${i}`}
              >
                <span style={{ ...TABULAR, fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</p>
                  <p style={{ margin: '2px 0 0', ...TABULAR, fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.variant} · {it.sku}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span style={{ ...TABULAR, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{fmtM(it.rev * scale)}</span>
                  <span style={{ ...TABULAR, fontSize: 11, color: '#64748B' }}>{Math.round(it.units * scale).toLocaleString('en-US')} units</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Account Drilldown slide-over */}
        {drilldownIdx !== null && (
          <AccountDrilldown
            account={TOP_ACCOUNTS[drilldownIdx]}
            onClose={() => setDrilldownIdx(null)}
          />
        )}

      </div>
    </div>
  );
}

