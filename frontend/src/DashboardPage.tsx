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
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
} from 'lucide-react';
import DateRangePicker from './components/DateRangePicker';
import { usePageRange } from './lib/pageRange';

type Props = { name?: string; onNavigate?: (label: string) => void };

// ─── Design tokens ────────────────────────────────────────────────────
const CORAL = '#FC7460';
const CORAL_LIGHT = '#FF9678';
const CORAL_SOFT = '#FF8A76';
const INK = '#0F1214';
const TOTAL_NAVY = '#1E3A8A';
const LY_GRAY = 'rgb(160,170,180)';
const BORDER = 'rgb(232 236 240)';
const RULE = '#EDEEEA';
const TRACK = '#F0F1F2';
const MUTED = '#8A8E93';

// Segment palette
const C_USW = '#22C55E';
const C_DIST = '#3B82F6';
const C_RETAIL = '#F59E0B';
const C_ECOM = '#8B5CF6';
const C_AMZN = '#EC4899';
const C_OPEN = '#86EFAC';

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.14em]';
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
function useCountUp(target: number, duration = 700) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = prev.current;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const val = from + (target - from) * ease(t);
      setV(val);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

// ─── Atoms ────────────────────────────────────────────────────────────
function SegTabs({ tabs, value, onChange, testId, slugPrefix }: { tabs: readonly string[]; value: string; onChange: (v: any) => void; testId: string; slugPrefix: string }) {
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
            className="rounded-[10px] px-4 py-2 text-[14px] tracking-tight transition focus:outline-none"
            style={
              active
                ? {
                    background: '#FFFFFF',
                    color: '#0F1214',
                    fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(15,17,20,0.06), 0 2px 6px rgba(15,17,20,0.04)',
                    border: '1px solid rgba(15,17,20,0.06)',
                  }
                : {
                    color: '#8A8E93',
                    fontWeight: 500,
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
      className="inline-flex items-center gap-0.5 rounded-[8px] px-1.5 py-0.5 text-[11px] font-semibold"
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

function Spark({ data, stroke = CORAL, gradId, width = 72, height = 20 }: { data: number[]; stroke?: string; gradId: string; width?: number; height?: number }) {
  const rows = useMemo(() => data.map((v, i) => ({ i, v })), [data]);
  return (
    <div style={{ width, height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 1, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.6} fill={`url(#${gradId})`} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function HeroKPI({ label, target, sub, testId }: { label: string; target: number; sub?: string; testId: string }) {
  const v = useCountUp(target, 700);
  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <p className={EYEBROW} style={eyebrowStyle}>{label}</p>
      <p
        className="text-[40px] font-bold leading-none"
        style={{ ...TABULAR, letterSpacing: '-0.01em', color: INK }}
      >
        {usd0(Math.max(0, v))}
      </p>
      {sub && <p className="text-[12px] font-medium leading-snug" style={{ ...TABULAR, color: MUTED }}>{sub}</p>}
    </div>
  );
}

function RevTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const nameMap: Record<string, string> = {
    usw: 'US Wholesale', dist: 'Distributors', retail: 'Retail', ecom: 'Ecommerce',
    amzn: 'Amazon', open: 'Open Orders', total: 'Total', forecast: 'Forecast', ly: 'vs LY',
  };
  const visible = payload.filter((p: any) => p.value != null && p.value !== 0);
  return (
    <div
      style={{
        background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 10,
        padding: '10px 14px', boxShadow: '0 8px 24px rgba(15,17,20,0.06)',
        minWidth: 176, ...TABULAR,
      }}
    >
      <p style={{ color: INK, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 8 }}>{label}</p>
      {visible.map((p: any, idx: number) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4B5058', padding: '3px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color || p.stroke, flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: 500 }}>{nameMap[p.dataKey] || p.dataKey}</span>
          <b style={{ color: INK, minWidth: 56, textAlign: 'right' }}>{fmtM(p.value)}</b>
        </div>
      ))}
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
      className="rounded-3xl bg-white p-8"
      style={{ border: `1px solid ${BORDER}` }}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={EYEBROW} style={eyebrowStyle}>Channel Mix — {title}</p>
        {headerRight && <span className="text-[12px] font-medium uppercase tracking-[0.12em]" style={{ color: MUTED }}>{headerRight}</span>}
      </div>
      <div className="mt-6 flex items-center gap-8">
        <div className="relative h-[200px] w-[200px] shrink-0">
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
              <p className="text-[12px] font-medium uppercase tracking-[0.12em]" style={{ color: MUTED }}>
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
      className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600"
      style={{ ...TABULAR, opacity: dim ? 0.35 : 1, transition: 'opacity 200ms ease' }}
    >
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
  const [seg, setSeg] = useState<SegKey>('All');
  const [svgTab, setSvgTab] = useState<'By Class' | 'By Month'>('By Class');
  const [range, setRange] = usePageRange('dashboard');

  const scale = SEG_SCALE[seg];
  const segKey = SEG_KEY[seg];
  const isAll = seg === 'All';

  const netSalesYTD = 9_166_708 * scale;
  const openOrders = 26_679_135 * scale;
  const total = 26_679_135 * scale;
  const forecastVal = 25_980_800 * scale;
  const goalValue = 17_510_000 * scale;
  const goalMax = 25_980_000 * scale;
  const goalPct = Math.round((goalValue / goalMax) * 100);

  // Filtered monthly data (only selected segment bars when not All)
  const monthlyData = useMemo(() => {
    return MONTHLY_BASE.map((row) => {
      const scaled: any = { m: row.m };
      const segFields = ['usw', 'dist', 'retail', 'ecom', 'amzn'];
      if (isAll) {
        segFields.forEach((k) => { scaled[k] = (row as any)[k]; });
        scaled.open = row.open;
      } else {
        segFields.forEach((k) => { scaled[k] = (k === segKey) ? (row as any)[k] : 0; });
        scaled.open = (segKey === 'usw' || segKey === 'dist') ? row.open : 0;
      }
      scaled.total = row.total * scale;
      scaled.forecast = row.forecast * scale;
      scaled.ly = row.ly * scale;
      return scaled;
    });
  }, [isAll, segKey, scale]);

  const highlightSegRow = (rowKey: string) => isAll || rowKey === seg;
  const emphasizeName = isAll ? null : seg;
  const emphasizeB2B = seg === 'US Wholesale' || seg === 'Distributors' ? 'B2B' : (isAll ? null : seg);

  const svgVisibleRows = useMemo(() => (isAll ? SVG_ROWS : SVG_ROWS.filter((r) => r.name === seg)), [seg, isAll]);
  const svgTotalScaled = useMemo(() => ({
    net: SVG_TOTAL.net * scale,
    goal: SVG_TOTAL.goal * scale,
    variance: SVG_TOTAL.variance * scale,
    pct: SVG_TOTAL.pct,
    annual: SVG_TOTAL.annual * scale,
  }), [scale]);

  const topAcctMax = TOP_ACCOUNTS[0].net;
  const topItemMax = TOP_ITEMS[0].rev;
  const yTicks = useMemo(() => [0, 1.7e6, 3.3e6, 5e6], []);

  // Stagger animation helper
  const enter = (i: number) => ({
    animation: 'dashFadeSlideUp 400ms ease-out both',
    animationDelay: `${i * 60}ms`,
  }) as React.CSSProperties;

  return (
    <div className="min-h-full space-y-8 p-1" data-testid="dashboard-page" style={{ ...INTER, ...TABULAR }}>
      {/* ── 1) Segment tabs + Date range ───────────────────────────── */}
      <header className="flex h-11 flex-wrap items-center justify-between gap-3" data-testid="dashboard-header" style={enter(0)}>
        <SegTabs tabs={SEGMENTS} value={seg} onChange={(v: any) => setSeg(v as SegKey)} testId="segment-tabs" slugPrefix="seg" />
        <DateRangePicker value={range} onChange={setRange} testId="dashboard-range" />
      </header>

      {/* ── 2) Light Hero Card (4 KPIs + Annual Goal) ───────────────── */}
      <section
        className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8"
        style={{
          border: `1px solid ${BORDER}`,
          backgroundImage: 'linear-gradient(135deg, rgba(252,116,96,0.03) 0%, rgba(252,116,96,0) 60%)',
          ...enter(1),
        }}
        data-testid="hero-card"
      >
        <div className="grid grid-cols-2 gap-8 xl:grid-cols-4 xl:gap-10">
          {/* Net Sales YTD (anchor) */}
          <div
            data-testid="kpi-net-sales"
            className="relative xl:border-r xl:pr-8"
            style={{ borderColor: BORDER }}
          >
            <p className={EYEBROW} style={eyebrowStyle}>Net Sales YTD</p>
            <div className="mt-3">
              <NetSalesValue target={netSalesYTD} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="block h-[2px] w-10 rounded-full" style={{ background: 'rgba(252,116,96,0.7)' }} />
              <span
                className="inline-flex items-center gap-0.5 rounded-[8px] px-2 py-0.5 text-[12px] font-semibold"
                style={{ ...TABULAR, background: 'rgba(16,185,129,0.10)', color: '#059669' }}
              >
                <ArrowUp size={11} strokeWidth={2.6} />25.6% YoY
              </span>
            </div>
            <p className="mt-3 text-[12px] font-medium leading-snug" style={{ color: MUTED }}>After discounts, returns &amp; tax · shipping included</p>
          </div>
          <div className="xl:border-r xl:pr-8" style={{ borderColor: BORDER }}>
            <HeroKPI label="Open Orders" target={openOrders} testId="kpi-open-orders" />
          </div>
          <div className="xl:border-r xl:pr-8" style={{ borderColor: BORDER }}>
            <HeroKPI label="Total" target={total} sub="Net Sales + Open Orders" testId="kpi-total" />
          </div>
          <HeroKPI label="Forecast" target={forecastVal} testId="kpi-forecast" />
        </div>

        {/* Annual Goal Progress */}
        <div className="mt-8 pt-8" style={{ borderTop: `1px solid ${BORDER}` }} data-testid="annual-goal">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={EYEBROW} style={eyebrowStyle}>Annual Goal Progress</p>
              <div className="mt-2 flex items-baseline gap-3">
                <p
                  className="text-[40px] font-bold leading-none"
                  style={{ ...TABULAR, letterSpacing: '-0.01em', color: INK }}
                >
                  {goalPct}%
                </p>
                <span className="text-[12px] font-medium" style={{ ...TABULAR, color: MUTED }}>
                  {fmtM(goalValue)} of {fmtM(goalMax)}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#B45309' }}
                data-testid="behind-pace-pill"
              >
                Behind pace
              </span>
              <span className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ ...TABULAR, color: MUTED }}>
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: MUTED }} /> Pace 75%
              </span>
            </div>
          </div>
          <div className="mt-4 h-[8px] w-full overflow-hidden rounded-full" style={{ background: TRACK }} data-testid="goal-bar">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${goalPct}%`,
                background: `linear-gradient(90deg, ${CORAL} 0%, ${CORAL_LIGHT} 100%)`,
                transition: BAR_TRANS,
              }}
            />
          </div>
        </div>

      </section>

      {/* ── 3) AI Assist Strip ──────────────────────────────────────── */}
      <section
        className="rounded-3xl bg-white px-6 py-3.5"
        style={{ border: `1px solid ${BORDER}`, ...enter(2) }}
        data-testid="ai-strip"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="grid h-6 w-6 place-items-center rounded-full"
              style={{ border: `1.5px solid ${CORAL}`, background: 'transparent' }}
            >
              <Sparkles size={13} color={CORAL} strokeWidth={2} />
            </span>
            <p className="text-[14px] font-medium" style={{ color: '#4B5058' }}>
              <span className="font-semibold" style={{ color: INK }}>Claude</span> is analyzing your data…
            </p>
          </div>
          <button
            data-testid="ai-strip-view-insights"
            className="inline-flex items-center gap-1 text-[13px] font-semibold transition hover:underline"
            style={{ color: CORAL }}
          >
            View insights <ArrowUpRight size={14} />
          </button>
        </div>
      </section>

      {/* ── 4) Revenue by Month + Segments ──────────────────────────── */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)]" style={enter(3)}>
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
              <Swatch color={C_USW}      label="US Wholesale" dim={!isAll && seg !== 'US Wholesale'} />
              <Swatch color={C_DIST}     label="Distributors" dim={!isAll && seg !== 'Distributors'} />
              <Swatch color={C_RETAIL}   label="Retail"       dim={!isAll && seg !== 'Retail'} />
              <Swatch color={C_ECOM}     label="Ecommerce"    dim={!isAll && seg !== 'Ecommerce'} />
              <Swatch color={C_AMZN}     label="Amazon"       dim={!isAll && seg !== 'Amazon'} />
              <Swatch color={C_OPEN}     label="Open Orders"  dim={!isAll && seg !== 'US Wholesale' && seg !== 'Distributors'} />
              <Swatch color={INK}        label="Total"    line />
              <Swatch color={CORAL}      label="Forecast" line dashed />
              <Swatch color={LY_GRAY}    label="vs LY"    line dashed />
              <button
                data-testid="rev-export"
                className="ml-1 inline-flex items-center gap-1.5 rounded-[10px] h-8 px-2.5 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <Download size={16} strokeWidth={1.9} /> Export
              </button>
            </div>
          </div>

          <div className="mt-6 h-[340px]" style={TABULAR}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgb(240 242 244)" vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: MUTED, fontWeight: 500 }} tickFormatter={(m: string) => m.toUpperCase()} />
                <YAxis
                  ticks={yTicks} domain={[0, 5e6]}
                  tickFormatter={fmtMShort}
                  tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: MUTED, fontWeight: 500 }} width={56}
                />
                <Tooltip content={<RevTooltip />} cursor={{ stroke: 'rgb(160,170,180)', strokeDasharray: '3 3', strokeWidth: 1 }} />
                <Bar dataKey="usw"    stackId="s" fill={C_USW}    isAnimationActive animationDuration={400} />
                <Bar dataKey="dist"   stackId="s" fill={C_DIST}   isAnimationActive animationDuration={400} />
                <Bar dataKey="retail" stackId="s" fill={C_RETAIL} isAnimationActive animationDuration={400} />
                <Bar dataKey="ecom"   stackId="s" fill={C_ECOM}   isAnimationActive animationDuration={400} />
                <Bar dataKey="amzn"   stackId="s" fill={C_AMZN}   isAnimationActive animationDuration={400} />
                <Bar dataKey="open"   stackId="s" fill={C_OPEN}   radius={[4, 4, 0, 0]} isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="ly"       stroke={LY_GRAY}    strokeWidth={1.5} dot={false} strokeDasharray="4 4" isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="total"    stroke={INK}        strokeWidth={2}   dot={false} isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="forecast" stroke={CORAL}      strokeWidth={1.5} dot={false} strokeDasharray="5 4" isAnimationActive animationDuration={400} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="rounded-3xl bg-white p-6"
          style={{ border: `1px solid ${BORDER}` }}
          data-testid="segment-panel"
        >
          <p className={EYEBROW} style={eyebrowStyle}>Segments</p>
          <ul className="mt-6">
            {SEGMENT_ROWS.map((s, idx) => {
              const active = highlightSegRow(s.key);
              return (
                <li
                  key={s.key}
                  data-testid={`seg-row-${s.key.toLowerCase().replace(/\s+/g, '-')}`}
                  className="py-5"
                  style={{
                    opacity: active ? 1 : 0.4,
                    transition: 'opacity 250ms ease',
                    borderTop: idx === 0 ? 'none' : `1px solid ${RULE}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: INK }}>
                      <i className="h-2 w-2 rounded-full" style={{ background: s.c }} />
                      {s.key}
                    </span>
                    <b className="text-[20px] font-bold" style={{ ...TABULAR, color: INK }}>{s.pct}%</b>
                  </div>
                  <div className="mt-2.5 h-[4px] w-full overflow-hidden rounded-full" style={{ background: '#F5F6F5' }}>
                    <span className="block h-full rounded-full" style={{ width: `${s.pct}%`, background: s.c, transition: BAR_TRANS }} />
                  </div>
                  <div className="mt-2 text-[12px] font-medium" style={{ ...TABULAR, color: MUTED }}>
                    {fmtM(s.cur)} · target {fmtM(s.tgt)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── 5) Channel Mix — two side-by-side donuts ───────────────── */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2" style={enter(4)} data-testid="channel-mix">
        <Donut title="All Channels" headerRight="% of Net Sales YTD" data={DONUT_ALL} testId="donut-all" emphasizeName={emphasizeName} />
        <Donut title="B2B Combined" headerRight="% of Net Sales YTD" data={DONUT_B2B} testId="donut-b2b" emphasizeName={emphasizeB2B} />
      </section>

      {/* ── 6) Sales vs Goal — table ───────────────────────────────── */}
      <section
        className="rounded-3xl bg-white p-8"
        style={{ border: `1px solid ${BORDER}`, ...enter(5) }}
        data-testid="sales-vs-goal"
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className={EYEBROW} style={eyebrowStyle}>Pacing</p>
            <h2 className="mt-1.5 text-[16px] font-bold" style={{ color: INK, letterSpacing: '-0.01em' }}>Sales vs Goal</h2>
            <p className="mt-1 text-[12px] font-medium" style={{ color: MUTED }}>2026 goal pacing through September</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                data-testid="svg-export-excel"
                className="inline-flex items-center gap-1.5 rounded-[10px] h-8 px-2.5 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <FileSpreadsheet size={16} strokeWidth={1.9} /> Excel
              </button>
              <button
                data-testid="svg-export-pdf"
                className="inline-flex items-center gap-1.5 rounded-[10px] h-8 px-2.5 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <FileText size={16} strokeWidth={1.9} /> PDF
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-x-8" data-testid="svg-kpis">
            <div className="text-right">
              <p className={EYEBROW} style={eyebrowStyle}>Net Sales YTD</p>
              <p className="mt-1.5 text-[20px] font-bold" style={{ ...TABULAR, color: INK }}>{fmtM(svgTotalScaled.net)}</p>
            </div>
            <span className="hidden h-6 w-px md:block" style={{ background: BORDER }} aria-hidden="true" />
            <div className="text-right">
              <p className={EYEBROW} style={eyebrowStyle}>Goal YTD</p>
              <p className="mt-1.5 text-[20px] font-bold" style={{ ...TABULAR, color: INK }}>{fmtM(svgTotalScaled.goal)}</p>
            </div>
            <span className="hidden h-6 w-px md:block" style={{ background: BORDER }} aria-hidden="true" />
            <div className="text-right">
              <p className={EYEBROW} style={eyebrowStyle}>Variance</p>
              <p className="mt-1.5 text-[20px] font-bold text-rose-600" style={TABULAR}>{fmtM(svgTotalScaled.variance)}</p>
            </div>
            <span className="hidden h-6 w-px md:block" style={{ background: BORDER }} aria-hidden="true" />
            <div className="text-right">
              <p className={EYEBROW} style={eyebrowStyle}>% to Goal</p>
              <p className="mt-1.5 text-[20px] font-bold" style={{ ...TABULAR, color: CORAL }}>{svgTotalScaled.pct}%</p>
            </div>
          </div>
        </div>

        <div className="mt-6" data-testid="svg-tabs-wrap">
          <SegTabs tabs={['By Class', 'By Month']} value={svgTab} onChange={(v: any) => setSvgTab(v)} testId="svg-tabs" slugPrefix="svg-tab" />
        </div>

        <div className="mt-6 overflow-x-auto">
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
          {svgVisibleRows.map((r) => (
            <div
              key={r.name}
              className="grid grid-cols-[minmax(180px,1.4fr)_120px_110px_110px_minmax(160px,1.2fr)_120px] items-center gap-x-4 h-11 text-[14px] transition-colors hover:bg-[rgba(15,17,20,0.02)]"
              style={{ borderBottom: `1px solid ${BORDER}` }}
              data-testid={`svg-row-${r.name.toLowerCase().replace(/\s+/g, '-')}`}
              title={`${r.pct}% to goal (${fmtM(r.net)} of ${fmtM(r.goal)})`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <i className="h-2 w-2 rounded-full" style={{ background: r.c }} />
                <b className="truncate font-semibold" style={{ color: INK }}>{r.name}</b>
              </span>
              <b className="text-right" style={{ ...TABULAR, color: INK }}>{fmtM(r.net)}</b>
              <span className="text-right font-medium" style={{ ...TABULAR, color: '#4B5058' }}>{fmtM(r.goal)}</span>
              <span className="text-right font-semibold text-rose-600" style={TABULAR}>{fmtM(r.variance)}</span>
              <span className="flex items-center gap-3">
                <span className="relative h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: '#F5F6F5' }}>
                  <span
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: `${r.pct}%`,
                      background: `linear-gradient(90deg, ${CORAL} 0%, ${CORAL_LIGHT} 100%)`,
                      transition: BAR_TRANS,
                    }}
                  />
                </span>
                <b className="w-10 text-right text-[13px] font-bold" style={{ ...TABULAR, color: CORAL }}>{r.pct}%</b>
              </span>
              <span className="text-right font-medium" style={{ ...TABULAR, color: '#4B5058' }}>{fmtM(r.annual)}</span>
            </div>
          ))}
          <div
            className="grid grid-cols-[minmax(180px,1.4fr)_120px_110px_110px_minmax(160px,1.2fr)_120px] items-center gap-x-4 h-11 text-[14px] font-bold"
            style={{ borderTop: `1px solid ${BORDER}` }}
            data-testid="svg-total-row"
          >
            <span style={{ color: INK }}>Total</span>
            <b className="text-right" style={{ ...TABULAR, color: INK }}>{fmtM(svgTotalScaled.net)}</b>
            <span className="text-right" style={{ ...TABULAR, color: INK }}>{fmtM(svgTotalScaled.goal)}</span>
            <span className="text-right text-rose-600" style={TABULAR}>{fmtM(svgTotalScaled.variance)}</span>
            <span className="flex items-center gap-3">
              <span className="relative h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: '#F5F6F5' }}>
                <span
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${svgTotalScaled.pct}%`,
                    background: `linear-gradient(90deg, ${CORAL} 0%, ${CORAL_LIGHT} 100%)`,
                    transition: BAR_TRANS,
                  }}
                />
              </span>
              <b className="w-10 text-right text-[13px] font-bold" style={{ ...TABULAR, color: CORAL }}>{svgTotalScaled.pct}%</b>
            </span>
            <span className="text-right" style={{ ...TABULAR, color: INK }}>{fmtM(svgTotalScaled.annual)}</span>
          </div>
        </div>
      </section>

      {/* ── 7) Top Accounts + Top Items — vertical numbered lists ──── */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2" style={enter(6)}>
        {/* Top Accounts */}
        <div
          className="rounded-3xl bg-white p-8"
          style={{ border: `1px solid ${BORDER}` }}
          data-testid="top-accounts"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className={EYEBROW} style={eyebrowStyle}>Leaderboard</p>
              <h2 className="mt-1.5 text-[16px] font-bold" style={{ color: INK, letterSpacing: '-0.01em' }}>Top Accounts</h2>
            </div>
            <span className="text-[12px] font-medium uppercase tracking-[0.12em]" style={{ color: MUTED }}>Net Sales · YTD</span>
          </div>
          <ol className="mt-5">
            {TOP_ACCOUNTS.map((a, i) => {
              const share = (a.net / topAcctMax) * 100;
              const isFirst = i === 0;
              const stroke = a.trend === 'up' ? '#10B981' : '#F43F5E';
              return (
                <li
                  key={a.name}
                  className="py-3 transition-colors hover:bg-[rgba(15,17,20,0.02)] -mx-3 rounded-lg px-3"
                  style={{ borderTop: i === 0 ? 'none' : `1px solid ${RULE}` }}
                  data-testid={`top-acct-${i}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-[22px] w-[22px] place-items-center rounded-[6px] text-[11px] font-bold shrink-0"
                      style={{ background: isFirst ? CORAL_SOFT : TRACK, color: isFirst ? '#fff' : '#3d3f3c' }}
                    >
                      {i + 1}
                    </span>
                    <b className="min-w-0 flex-1 truncate text-[14px] font-semibold" style={{ color: INK }}>{a.name}</b>
                    <Spark data={a.spark} stroke={stroke} gradId={`spark-acct-${i}`} width={72} height={20} />
                    <DeltaPill v={a.yoy} />
                    <b className="w-[92px] text-right text-[20px] font-bold" style={{ ...TABULAR, color: INK }}>{fmtM(a.net)}</b>
                  </div>
                  <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full" style={{ background: '#F5F6F5' }}>
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${share}%`,
                        background: `linear-gradient(90deg, ${INK} 0%, ${CORAL} 100%)`,
                        transition: BAR_TRANS,
                      }}
                    />
                  </div>
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
              <h2 className="mt-1.5 text-[16px] font-bold" style={{ color: INK, letterSpacing: '-0.01em' }}>Top Items</h2>
            </div>
            <span className="text-[12px] font-medium uppercase tracking-[0.12em]" style={{ color: MUTED }}>Revenue · YTD</span>
          </div>
          <ol className="mt-5">
            {TOP_ITEMS.map((it, i) => {
              const share = (it.rev / topItemMax) * 100;
              const isFirst = i === 0;
              return (
                <li
                  key={it.sku}
                  className="py-3 transition-colors hover:bg-[rgba(15,17,20,0.02)] -mx-3 rounded-lg px-3"
                  style={{ borderTop: i === 0 ? 'none' : `1px solid ${RULE}` }}
                  data-testid={`top-item-${i}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid h-[22px] w-[22px] place-items-center rounded-[6px] text-[11px] font-bold shrink-0"
                      style={{ background: isFirst ? CORAL_SOFT : TRACK, color: isFirst ? '#fff' : '#3d3f3c' }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <b className="text-[14px] font-semibold" style={{ color: INK }}>{it.name}</b>
                        <span className="text-[12px] font-medium" style={{ color: MUTED }}>· {it.variant}</span>
                      </div>
                      <p className="mt-1 text-[11px] tracking-[0.05em] text-neutral-400" style={{ ...MONO, ...TABULAR }}>{it.sku}</p>
                    </div>
                    <div className="text-right">
                      <b className="block text-[20px] font-bold" style={{ ...TABULAR, color: INK }}>{fmtM(it.rev)}</b>
                      <span className="text-[12px] font-medium" style={{ ...TABULAR, color: MUTED }}>{it.units.toLocaleString('en-US')} units</span>
                    </div>
                  </div>
                  <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full" style={{ background: '#F5F6F5' }}>
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${share}%`,
                        background: `linear-gradient(90deg, ${INK} 0%, ${CORAL} 100%)`,
                        transition: BAR_TRANS,
                      }}
                    />
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

// Net Sales hero anchor (bigger)
function NetSalesValue({ target }: { target: number }) {
  const v = useCountUp(target, 700);
  return (
    <p
      className="font-bold"
      style={{ ...TABULAR, fontSize: 'clamp(40px, 4.2vw, 60px)', lineHeight: 0.95, letterSpacing: '-0.02em', color: INK }}
    >
      {usd0(Math.max(0, v))}
    </p>
  );
}
