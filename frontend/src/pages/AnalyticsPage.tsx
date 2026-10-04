import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Box, CheckCircle2, Package, Store } from 'lucide-react';
import PageHeader from '../components/PageHeader';

// ─── Tokens ────────────────────────────────────────────────────────────
const INK = '#0A0A0B';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';
const SLATE_500 = '#6E6E73';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E5E5E7';
const SLATE_100 = '#F1F1F3';
const SLATE_50  = '#FAFAFA';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';
const CORAL_50  = '#FFF1EF';
const CORAL_100 = '#FFE1DC';
const CORAL_200 = '#FDD7D2';
const CORAL_300 = '#FDB8AE';
const CORAL_400 = '#FF8E7F';
const CORAL_500 = '#FF6F61';
const CORAL_600 = '#E85A4D';
const CORAL_700 = '#B04435';
const EMERALD   = '#047857';
const EMERALD_500 = '#10B981';
const EMERALD_50  = '#ECFDF5';

const TNUM = { fontVariantNumeric: 'tabular-nums' } as const;
const fmtK = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${n}`;
const fmtMoney = (n: number) => `$${fmtK(n)}`;
const fmtInt = (n: number) => n.toLocaleString('en-US');

// ─── Channels ──────────────────────────────────────────────────────────
const CHANNELS = ['All', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
type Channel = typeof CHANNELS[number];

// Date range placeholder (visual only)
const DATE_LABEL = 'YTD · Oct 3, 2026';

// ─── Mock data: channel revenue mix (for All view) ─────────────────────
const CHANNEL_MIX = [
  { name: 'US Wholesale',  revenue: 8_120_000, orders: 972,   aov: 8_354, yoy: 4.1,  color: CORAL_700 },
  { name: 'Distributors',  revenue: 4_110_000, orders: 318,   aov: 12_924, yoy: -0.3, color: CORAL_500 },
  { name: 'Retail',        revenue: 1_120_000, orders: 1_260, aov: 889,   yoy: -4.2, color: CORAL_300 },
  { name: 'Ecommerce',     revenue: 2_820_000, orders: 25_640, aov: 110,  yoy: 12.4, color: SLATE_700 },
  { name: 'Amazon',        revenue: 1_820_000, orders: 16_540, aov: 110,  yoy: 18.6, color: SLATE_400 },
];

const REV_TREND = [
  { m: 'Nov', usw: 760, dist: 390, ret: 108, ecom: 240, amz: 140 },
  { m: 'Dec', usw: 820, dist: 405, ret: 115, ecom: 268, amz: 160 },
  { m: 'Jan', usw: 710, dist: 360, ret: 95,  ecom: 220, amz: 148 },
  { m: 'Feb', usw: 690, dist: 348, ret: 92,  ecom: 232, amz: 152 },
  { m: 'Mar', usw: 740, dist: 372, ret: 102, ecom: 260, amz: 168 },
  { m: 'Apr', usw: 780, dist: 388, ret: 98,  ecom: 272, amz: 176 },
  { m: 'May', usw: 810, dist: 402, ret: 110, ecom: 284, amz: 180 },
  { m: 'Jun', usw: 795, dist: 395, ret: 105, ecom: 288, amz: 184 },
  { m: 'Jul', usw: 870, dist: 420, ret: 118, ecom: 302, amz: 192 },
  { m: 'Aug', usw: 910, dist: 436, ret: 120, ecom: 318, amz: 204 },
  { m: 'Sep', usw: 905, dist: 428, ret: 115, ecom: 326, amz: 216 },
  { m: 'Oct', usw: 930, dist: 440, ret: 112, ecom: 340, amz: 228 },
];
const RETURN_RATE = [4.2, 4.0, 4.3, 4.5, 4.1, 3.9, 3.6, 3.4, 3.3, 3.2, 3.1, 3.2];

// Ecommerce
const ECOM_KPIS = [
  { label: 'Revenue YTD',        value: '$4.64M',  delta: 12.4, suffix: '%', positive: true },
  { label: 'Orders YTD',         value: '42,180',  delta: 8.1,  suffix: '%', positive: true },
  { label: 'Average Order Value',value: '$110',    delta: -2.3, suffix: '%', positive: false },
  { label: 'Conversion Rate',    value: '2.84%',   delta: 0.3,  suffix: 'pp', positive: true },
];
const ECOM_FUNNEL = [
  { stage: 'Sessions',         count: 1_480_000 },
  { stage: 'Product views',    count: 892_000 },
  { stage: 'Added to cart',    count: 184_000 },
  { stage: 'Checkout started', count: 68_000 },
  { stage: 'Purchased',        count: 42_180 },
];
const TRAFFIC_SLICES = [
  { label: 'Organic',     value: 38, color: CORAL_700, revenue: 1_765_000, orders: 15_650 },
  { label: 'Paid Social', value: 24, color: CORAL_500, revenue: 1_114_000, orders: 9_880 },
  { label: 'Email',       value: 18, color: CORAL_400, revenue: 835_000,   orders: 7_410 },
  { label: 'Direct',      value: 12, color: CORAL_300, revenue: 556_000,   orders: 4_940 },
  { label: 'Referral',    value: 5,  color: CORAL_200, revenue: 232_000,   orders: 2_060 },
  { label: 'Other',       value: 3,  color: CORAL_100, revenue: 139_000,   orders: 1_240 },
];
const TOP_PRODUCTS = [
  { name: 'Dean Cap', sku: 'DN-010', units: 7_820, revenue: 802_300, aov: 103, cr: 3.21 },
  { name: 'Brood IV Trucker', sku: 'BRD-04', units: 6_410, revenue: 648_200, aov: 101, cr: 2.98 },
  { name: 'The Sundowner', sku: 'SDN-11', units: 5_630, revenue: 598_900, aov: 106, cr: 3.42 },
  { name: 'Playa Linda', sku: 'PLA-02', units: 4_280, revenue: 476_000, aov: 111, cr: 2.72 },
  { name: 'Everyday Watchman', sku: 'EWM-01', units: 3_960, revenue: 384_000, aov: 97, cr: 2.44 },
  { name: 'Striped Boonie', sku: 'BNE-07', units: 3_280, revenue: 298_000, aov: 91, cr: 2.11 },
  { name: 'Classic Beanie', sku: 'BNY-00', units: 2_540, revenue: 182_000, aov: 72, cr: 1.84 },
  { name: 'Snapback Pro', sku: 'SNP-05', units: 2_100, revenue: 142_000, aov: 68, cr: 1.62 },
];
const COHORT_MONTHS = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'];
const COHORT_DATA: number[][] = [
  [100, 48, 36, 29, 24, 21, 19, 17, 16, 15, 14, 13],
  [100, 52, 38, 31, 26, 22, 20, 18, 17, 16, 15, 0],
  [100, 54, 40, 32, 27, 24, 21, 19, 18, 17, 0, 0],
  [100, 56, 42, 34, 29, 25, 22, 20, 19, 0, 0, 0],
  [100, 58, 44, 36, 30, 26, 23, 21, 0, 0, 0, 0],
  [100, 61, 46, 38, 32, 28, 25, 0, 0, 0, 0, 0],
];
const COHORT_COUNTS = [3842, 4210, 4680, 5120, 5540, 6120];
const SEGMENTS = [
  { label: 'New customers', value: 62, color: CORAL_500, revenue: 2_877_000, aov: 102 },
  { label: 'Returning',     value: 24, color: CORAL_300, revenue: 1_114_000, aov: 118 },
  { label: 'Repeat 2+',     value: 14, color: EMERALD_500, revenue: 649_000, aov: 162 },
];

// Wholesale generic (US / Distributors share schema)
const WHOL_PIPELINE = [
  { stage: 'Prospecting leads', count: 420 },
  { stage: 'Quoted',            count: 184 },
  { stage: 'PO received',       count: 142 },
  { stage: 'In production',     count: 96 },
  { stage: 'Shipped QTD',       count: 78 },
];
const SHIP_TREND = [84, 85, 86, 88, 90, 89, 88, 87, 86, 87, 88, 88.4];
const BACKORDERS = [
  { label: 'Snapbacks', value: 42 }, { label: 'Dad hats', value: 28 },
  { label: 'Truckers', value: 18 }, { label: 'Beanies', value: 12 }, { label: 'Boonies', value: 6 },
];

// Per-channel account rosters
const US_ACCOUNTS = [
  { name: 'Lids',               open: 14, lastDays: 2,  ytd: 982_000, cadence: '4w',      status: 'Healthy' as const },
  { name: 'Hat Cult Boutique',  open: 11, lastDays: 5,  ytd: 742_000, cadence: '6w',      status: 'Healthy' as const },
  { name: 'Nordstrom AP',       open: 9,  lastDays: 3,  ytd: 684_000, cadence: 'monthly', status: 'Healthy' as const },
  { name: 'Headwear Co',        open: 8,  lastDays: 7,  ytd: 458_000, cadence: '6w',      status: 'Healthy' as const },
  { name: 'Urban Outfitters',   open: 6,  lastDays: 11, ytd: 342_000, cadence: '8w',      status: 'Healthy' as const },
  { name: 'Zumiez',             open: 1,  lastDays: 42, ytd: 268_000, cadence: '6w',      status: 'At risk' as const },
  { name: 'Buckle',             open: 0,  lastDays: 91, ytd: 184_000, cadence: '12w',     status: 'Churned' as const },
  { name: 'Scheels Sports',     open: 4,  lastDays: 9,  ytd: 128_000, cadence: '6w',      status: 'Healthy' as const },
];
const DIST_ACCOUNTS = [
  { name: 'Industrias Mercury', open: 2,  lastDays: 68, ytd: 1_240_000, cadence: '8w',  status: 'At risk' as const },
  { name: 'Hat Cult Boutique',  open: 7,  lastDays: 12, ytd: 892_000,   cadence: '6w',  status: 'Healthy' as const },
  { name: 'Scheels Sports',     open: 5,  lastDays: 18, ytd: 648_000,   cadence: '8w',  status: 'Healthy' as const },
  { name: 'Journeys',           open: 3,  lastDays: 24, ytd: 462_000,   cadence: '12w', status: 'Healthy' as const },
  { name: 'Western Supply Co',  open: 2,  lastDays: 36, ytd: 328_000,   cadence: '10w', status: 'At risk' as const },
  { name: 'Boonie Outfitters',  open: 4,  lastDays: 16, ytd: 240_000,   cadence: '8w',  status: 'Healthy' as const },
];

const AR_AGING = [
  { bucket: 'Current',    value: 1_820_000, color: EMERALD_500 },
  { bucket: '1-30 days',  value: 920_000,   color: CORAL_300 },
  { bucket: '31-60 days', value: 384_000,   color: CORAL_500 },
  { bucket: '61-90 days', value: 142_000,   color: CORAL_600 },
  { bucket: '90+ days',   value: 48_000,    color: CORAL_700 },
];

// Retail
const RETAIL_STORES = [
  { name: 'San Francisco Pop Up', revenue: 648_000, orders: 820,  aov: 790, trend: [38,42,48,52,54,56,58,60,62,64,66,68] },
];

// Amazon
const TOP_ASINS = [
  { name: 'Brood IV Trucker',  asin: 'B07XQZ2', units: 4_820, revenue: 538_000, buybox: 94, reviews: 4.7 },
  { name: 'The Sundowner',     asin: 'B08JYZ8', units: 3_610, revenue: 384_000, buybox: 88, reviews: 4.6 },
  { name: 'Dean Cap',          asin: 'B06AMV1', units: 2_980, revenue: 302_000, buybox: 92, reviews: 4.8 },
  { name: 'Playa Linda',       asin: 'B09LKR4', units: 2_120, revenue: 234_000, buybox: 76, reviews: 4.4 },
  { name: 'Everyday Watchman', asin: 'B0CBXY2', units: 1_680, revenue: 162_000, buybox: 82, reviews: 4.5 },
];
const AD_SPEND_TREND = [20, 24, 28, 34, 32, 38, 42, 46, 48, 52, 54, 58];
const AD_REV_TREND   = [84, 102, 118, 142, 136, 162, 180, 204, 218, 238, 252, 268];

// ─── Reusable visualizations ───────────────────────────────────────────
function Delta({ value, suffix = '%', positive }: { value: number; suffix?: string; positive?: boolean }) {
  const good = positive === undefined ? value >= 0 : positive;
  const bg = good ? EMERALD_50 : CORAL_50;
  const color = good ? EMERALD : CORAL_700;
  const Icon = good ? ArrowUp : ArrowDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 6px', background: bg, color, borderRadius: 6, fontSize: 11, fontWeight: 600, ...TNUM }}>
      <Icon size={11} strokeWidth={2.4} />
      {Math.abs(value).toFixed(suffix === 'pp' ? 1 : 1)}{suffix}
    </span>
  );
}

function KpiCard({ label, value, delta, suffix, positive }: { label: string; value: string; delta?: number; suffix?: string; positive?: boolean }) {
  return (
    <div className="card card-compact" style={{ padding: 20, borderRadius: 14, background: '#FFFFFF' }} data-testid={`kpi-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500 }}>{label}</p>
      <div className="flex items-end" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 'clamp(18px, 1.8vw, 22px)', fontWeight: 600, lineHeight: 1.15, color: INK, letterSpacing: '-0.02em', ...TNUM }}>{value}</p>
        {delta !== undefined && <Delta value={delta} suffix={suffix} positive={positive} />}
      </div>
    </div>
  );
}

function Sparkline({ data, w = 72, h = 24, color = CORAL }: { data: number[]; w?: number; h?: number; color?: string }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 2) - 1}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity={0.12} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Donut({ slices, size = 160, inner = 58 }: { slices: { label: string; value: number; color: string }[]; size?: number; inner?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2;
  let acc = 0;
  const toXY = (frac: number) => { const a = frac * 2 * Math.PI - Math.PI / 2; return [r + r * Math.cos(a), r + r * Math.sin(a)] as const; };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s) => {
        const start = acc / total; acc += s.value; const end = acc / total;
        const [x0, y0] = toXY(start); const [x1, y1] = toXY(end);
        const large = end - start > 0.5 ? 1 : 0;
        return <path key={s.label} d={`M ${r} ${r} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`} fill={s.color} />;
      })}
      <circle cx={r} cy={r} r={inner} fill="#FFFFFF" />
    </svg>
  );
}

function GaugeRing({ value, label, tone = 'emerald', size = 72 }: { value: number; label: string; tone?: 'emerald' | 'coral' | 'coral-soft'; size?: number }) {
  const r = size / 2 - 4; const circ = 2 * Math.PI * r;
  const stroke = tone === 'emerald' ? EMERALD_500 : tone === 'coral' ? CORAL_600 : CORAL_400;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={SLATE_100} strokeWidth={6} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth={6} strokeDasharray={`${(value / 100) * circ} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </svg>
        <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, color: INK, ...TNUM }}>{value.toFixed(1)}%</span>
      </div>
      <span style={{ fontSize: 11.5, color: SLATE_500 }}>{label}</span>
    </div>
  );
}

function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  const top = data[0].count;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map((row, i) => {
        const pct = (row.count / top) * 100;
        const prev = i === 0 ? null : data[i - 1].count;
        const drop = prev ? ((prev - row.count) / prev) * 100 : null;
        return (
          <div key={row.stage}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>{row.stage}</span>
              <div className="flex items-center" style={{ gap: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: INK, ...TNUM }}>{fmtInt(row.count)}</span>
                <span style={{ fontSize: 11.5, color: SLATE_500, ...TNUM, minWidth: 48, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
              </div>
            </div>
            <div style={{ height: 8, background: SLATE_100, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: CORAL }} />
            </div>
            {drop !== null && <p style={{ margin: '4px 0 0', fontSize: 10.5, color: SLATE_500 }}>↓ {drop.toFixed(1)}% drop-off from {data[i - 1].stage.toLowerCase()}</p>}
          </div>
        );
      })}
    </div>
  );
}

function MiniBars({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
            <span style={{ fontSize: 12, color: SLATE_700, fontWeight: 500 }}>{d.label}</span>
            <span style={{ fontSize: 12, color: INK, fontWeight: 600, ...TNUM }}>{d.value}</span>
          </div>
          <div style={{ height: 6, background: SLATE_100, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, series, h = 180 }: { data: Record<string, number | string>[]; series: { key: string; label: string; color: string }[]; h?: number }) {
  const w = 640;
  const padL = 36, padR = 10, padT = 10, padB = 24;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const all = series.flatMap((s) => data.map((d) => d[s.key] as number));
  const minV = Math.min(...all, 0), maxV = Math.max(...all);
  const range = maxV - minV || 1;
  const xStep = innerW / (data.length - 1);
  const yFor = (v: number) => padT + innerH - ((v - minV) / range) * innerH;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = padT + innerH - f * innerH;
        return <line key={i} x1={padL} x2={w - padR} y1={y} y2={y} stroke={SLATE_100} strokeWidth={1} />;
      })}
      {data.map((d, i) => (
        <text key={i} x={padL + i * xStep} y={h - 6} fill={SLATE_500} fontSize={10} textAnchor="middle">{d.m as string}</text>
      ))}
      {series.map((s) => {
        const pts = data.map((d, i) => `${padL + i * xStep},${yFor(d[s.key] as number)}`).join(' ');
        return <polyline key={s.key} points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </svg>
  );
}

function CohortHeatmap({ months, data, counts }: { months: string[]; data: number[][]; counts: number[] }) {
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const colorFor = (v: number) => {
    if (v === 0) return { bg: SLATE_50, color: SLATE_400 };
    if (v < 10)  return { bg: CORAL_50,  color: CORAL_700 };
    if (v < 20)  return { bg: CORAL_100, color: CORAL_700 };
    if (v < 35)  return { bg: CORAL_300, color: '#FFFFFF' };
    if (v < 60)  return { bg: CORAL_500, color: '#FFFFFF' };
    return { bg: CORAL_700, color: '#FFFFFF' };
  };
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(12, 1fr)`, gap: 2, minWidth: 640 }}>
          <div />
          {Array.from({ length: 12 }).map((_, i) => (<div key={i} style={{ fontSize: 10.5, color: SLATE_500, textAlign: 'center', padding: '0 0 6px' }}>W{i + 1}</div>))}
          {months.map((m, ri) => (
            <>
              <div key={`r-${ri}`} style={{ fontSize: 11, color: SLATE_500, display: 'flex', alignItems: 'center' }}>{m}</div>
              {data[ri].map((v, ci) => {
                const { bg, color } = colorFor(v);
                const active = sel && sel.r === ri && sel.c === ci;
                return (
                  <button key={`c-${ri}-${ci}`} type="button" onClick={() => setSel({ r: ri, c: ci })} style={{ height: 28, borderRadius: 4, background: bg, color, border: active ? `1.5px solid ${INK}` : 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', ...TNUM, padding: 0 }}>{v > 0 ? `${v}%` : ''}</button>
                );
              })}
            </>
          ))}
        </div>
      </div>
      {sel && <p style={{ margin: '12px 0 0', fontSize: 12, color: SLATE_600 }}>{fmtInt(Math.round(counts[sel.r] * (data[sel.r][sel.c] / 100)))} customers from {months[sel.r]} cohort active in W{sel.c + 1}.</p>}
    </div>
  );
}

function StackedBar({ segments, height = 32 }: { segments: { label: string; value: number; color: string }[]; height?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div style={{ display: 'flex', height, borderRadius: 10, overflow: 'hidden' }}>
      {segments.map((s, i) => (
        <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color, borderRight: i < segments.length - 1 ? '1px solid rgba(255,255,255,0.4)' : 'none' }} />
      ))}
    </div>
  );
}

function CardHeader({ title, help }: { title: string; help?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK }}>{title}</h3>
      {help && <p style={{ margin: '2px 0 0', fontSize: 12.5, color: SLATE_500 }}>{help}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [channel, setChannel] = useState<Channel>('All');

  return (
    <div className="min-h-full" data-testid="analytics-page" style={{ background: '#FAFAFA', fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div className="page-canvas" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHeader
          title="Analytics"
          channels={CHANNELS}
          activeChannel={channel}
          onChannelChange={(c) => setChannel(c as Channel)}
          testIdPrefix="analytics"
        />

        <p style={{ margin: 0, fontSize: 12.5, color: SLATE_500 }} data-testid="analytics-crumb">
          Showing <strong style={{ color: INK, fontWeight: 600 }}>{channel}</strong> metrics · {DATE_LABEL}
        </p>

        <div key={channel} style={{ animation: 'ai-msg-in 180ms ease-out', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {channel === 'All' && <AllView />}
          {channel === 'Ecommerce' && <EcommerceView />}
          {channel === 'Amazon' && <AmazonView />}
          {channel === 'Retail' && <RetailView />}
          {channel === 'US Wholesale' && <WholesaleView mode="us" />}
          {channel === 'Distributors' && <WholesaleView mode="dist" />}
        </div>
      </div>
    </div>
  );
}

// ─── All view ──────────────────────────────────────────────────────────
function AllView() {
  const totalRev = CHANNEL_MIX.reduce((s, c) => s + c.revenue, 0);
  const totalOrd = CHANNEL_MIX.reduce((s, c) => s + c.orders, 0);
  return (
    <>
      {/* 6-up KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6" style={{ gap: 16 }} data-testid="all-kpis">
        <KpiCard label="Total Revenue YTD" value={fmtMoney(totalRev)}   delta={10.2} suffix="%"  positive />
        <KpiCard label="Total Orders YTD"  value={fmtInt(totalOrd)}     delta={8.4}  suffix="%"  positive />
        <KpiCard label="Blended AOV"       value={`$${Math.round(totalRev / totalOrd)}`} delta={1.6}  suffix="%" positive />
        <KpiCard label="Active Accounts"   value="284"                  delta={12}   suffix=" accts" positive />
        <KpiCard label="DTC Conversion"    value="2.84%"                delta={0.3}  suffix="pp" positive />
        <KpiCard label="Gross Margin"      value="42.6%"                delta={1.2}  suffix="pp" positive />
      </div>

      {/* Business line summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 20 }} data-testid="all-biz-lines">
        {[
          { title: 'Ecommerce (DTC)', revenue: '$4.64M', metricA: ['Orders', '42,180'], metricB: ['AOV', '$110'], metricC: ['Conversion', '2.84%'], delta: 12.4, dest: 'Ecommerce' as Channel },
          { title: 'Wholesale (B2B)', revenue: '$12.23M', metricA: ['Accounts', '284'],   metricB: ['AOV', '$8,420'], metricC: ['Reorder rate', '68%'], delta: 18.6, dest: 'US Wholesale' as Channel },
        ].map((b) => (
          <div key={b.title} className="card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
            <div className="flex items-start justify-between" style={{ gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{b.title}</p>
                <div className="flex items-end" style={{ gap: 10, marginTop: 8 }}>
                  <p style={{ margin: 0, fontSize: 'clamp(20px, 2vw, 26px)', fontWeight: 600, color: INK, letterSpacing: '-0.02em', ...TNUM }}>{b.revenue}</p>
                  <Delta value={b.delta} positive />
                </div>
              </div>
              <ArrowRight size={16} style={{ color: SLATE_400 }} />
            </div>
            <div className="grid grid-cols-3" style={{ gap: 12, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${SLATE_100}` }}>
              {[b.metricA, b.metricB, b.metricC].map(([lab, val]) => (
                <div key={lab}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SLATE_500 }}>{lab}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600, color: INK, ...TNUM }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Channel revenue mix */}
      <div className="card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }} data-testid="all-mix">
        <CardHeader title="Channel revenue mix" help="Share of YTD revenue" />
        <StackedBar segments={CHANNEL_MIX.map((c) => ({ label: c.name, value: c.revenue, color: c.color }))} />
        <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: 12, marginTop: 16 }}>
          {CHANNEL_MIX.map((c) => (
            <div key={c.name} style={{ padding: 12, border: `1px solid ${SLATE_100}`, borderRadius: 10 }}>
              <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{c.name}</span>
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, ...TNUM }}>{fmtMoney(c.revenue)}</p>
              <div className="flex items-center justify-between" style={{ marginTop: 6, gap: 8 }}>
                <span style={{ fontSize: 11, color: SLATE_500, ...TNUM }}>{fmtInt(c.orders)} ord · ${fmtInt(c.aov)} AOV</span>
                <Delta value={c.yoy} positive={c.yoy >= 0} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 20 }}>
        <div className="card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title="Revenue trend by channel" help="12-month rolling · indexed thousands" />
          <LineChart
            data={REV_TREND}
            series={[
              { key: 'usw', label: 'US Wholesale', color: CORAL_700 },
              { key: 'dist', label: 'Distributors', color: CORAL_500 },
              { key: 'ret', label: 'Retail',        color: CORAL_300 },
              { key: 'ecom', label: 'Ecommerce',    color: SLATE_700 },
              { key: 'amz', label: 'Amazon',        color: SLATE_400 },
            ]}
          />
          <div className="flex flex-wrap" style={{ gap: 10, marginTop: 10 }}>
            {[['US Wholesale', CORAL_700], ['Distributors', CORAL_500], ['Retail', CORAL_300], ['Ecommerce', SLATE_700], ['Amazon', SLATE_400]].map(([n, c]) => (
              <span key={n as string} className="flex items-center" style={{ gap: 6, fontSize: 11, color: SLATE_600 }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c as string }} />{n}
              </span>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title="Return rate trend" help="All channels · last 12 months" />
          <LineChart
            data={REV_TREND.map((d, i) => ({ m: d.m, rate: RETURN_RATE[i] }))}
            series={[{ key: 'rate', label: 'Return rate', color: CORAL_600 }]}
          />
          <div className="flex items-center justify-between" style={{ marginTop: 10, fontSize: 11.5, color: SLATE_500 }}>
            <span>Target ≤ 4%</span>
            <span style={{ color: EMERALD, fontWeight: 600 }}>Current 3.2% · on track</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Ecommerce view ────────────────────────────────────────────────────
function EcommerceView() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 20 }}>
        {ECOM_KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
        <CardHeader title="Conversion funnel" help="Last 30 days · all channels" />
        <FunnelChart data={ECOM_FUNNEL} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 20 }}>
        <div className="lg:col-span-5 card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title="Traffic sources" help="Share of sessions · last 30 days" />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Donut slices={TRAFFIC_SLICES} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TRAFFIC_SLICES.map((s) => (
              <div key={s.label} className="flex items-center justify-between" style={{ gap: 10 }}>
                <div className="flex items-center" style={{ gap: 8 }}><span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span style={{ fontSize: 12.5, color: SLATE_700, fontWeight: 500 }}>{s.label}</span></div>
                <div className="flex items-center" style={{ gap: 10 }}><span style={{ fontSize: 12, color: SLATE_500, ...TNUM }}>{fmtMoney(s.revenue)}</span><span style={{ fontSize: 12, color: SLATE_400, ...TNUM }}>{fmtInt(s.orders)}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-7 card" style={{ padding: 0, borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px' }}><CardHeader title="Top products" help="Ranked by revenue · last 90 days" /></div>
          <div style={{ height: 1, background: '#EDEDEF' }} />
          <ProductTable data={TOP_PRODUCTS} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 20 }}>
        <div className="lg:col-span-7 card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title="Retention cohorts" help="% of cohort active each week after signup" />
          <CohortHeatmap months={COHORT_MONTHS} data={COHORT_DATA} counts={COHORT_COUNTS} />
        </div>
        <div className="lg:col-span-5 card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title="Customer segments" help="Share of revenue by loyalty tier" />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Donut slices={SEGMENTS} size={180} inner={64} /></div>
          {SEGMENTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between" style={{ padding: '8px 0', borderTop: `1px solid ${SLATE_100}` }}>
              <div className="flex items-center" style={{ gap: 8 }}><span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span style={{ fontSize: 13, color: INK, fontWeight: 500 }}>{s.label}</span></div>
              <div className="flex items-center" style={{ gap: 12 }}><span style={{ fontSize: 12.5, color: SLATE_500, ...TNUM }}>{fmtMoney(s.revenue)}</span><span style={{ fontSize: 12, color: SLATE_400, ...TNUM }}>AOV ${s.aov}</span></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ProductTable({ data }: { data: typeof TOP_PRODUCTS }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="w-full" style={{ borderCollapse: 'collapse', ...TNUM, minWidth: 620 }}>
        <thead>
          <tr style={{ background: SLATE_50, borderBottom: `1px solid ${SLATE_100}` }}>
            {['#', 'Product', 'Units', 'Revenue', 'AOV', 'CR'].map((h, i) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: i === 1 ? 'left' : 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => (
            <tr key={p.sku} style={{ borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}>
              <td style={{ padding: '14px', textAlign: 'center', width: 48 }}>
                <span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 6, background: CORAL_50, color: CORAL_700, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
              </td>
              <td style={{ padding: '12px 14px' }}>
                <div className="flex items-center" style={{ gap: 10 }}>
                  <span style={{ display: 'inline-grid', placeItems: 'center', width: 32, height: 32, background: CORAL_50, color: CORAL_700, borderRadius: 8 }}><Box size={15} strokeWidth={1.8} /></span>
                  <div><p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: INK }}>{p.name}</p><p style={{ margin: '2px 0 0', fontSize: 11, color: SLATE_500 }}>SKU · {p.sku}</p></div>
                </div>
              </td>
              <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: INK }}>{fmtInt(p.units)}</td>
              <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: INK, fontWeight: 600 }}>{fmtMoney(p.revenue)}</td>
              <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: SLATE_700 }}>${p.aov}</td>
              <td style={{ padding: '14px', textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '2px 8px', background: SLATE_100, color: SLATE_700, borderRadius: 6, fontSize: 11.5, fontWeight: 500 }}>{p.cr.toFixed(2)}%</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Wholesale view (US / Distributors) ───────────────────────────────
function WholesaleView({ mode }: { mode: 'us' | 'dist' }) {
  const accounts = mode === 'us' ? US_ACCOUNTS : DIST_ACCOUNTS;
  const kpis = mode === 'us'
    ? [
        { label: 'Revenue YTD', value: '$8.12M', delta: 4.1,  suffix: '%', positive: true },
        { label: 'Active Accounts', value: '184', delta: 8,  suffix: ' accts', positive: true },
        { label: 'Average Order Value', value: '$8,354', delta: 2.6, suffix: '%', positive: true },
        { label: 'Reorder Rate', value: '72%', delta: 3.1, suffix: 'pp', positive: true },
      ]
    : [
        { label: 'Revenue YTD', value: '$4.11M', delta: -0.3, suffix: '%', positive: false },
        { label: 'Active Accounts', value: '48', delta: 2,  suffix: ' accts', positive: true },
        { label: 'Average Order Value', value: '$12,924', delta: 6.4, suffix: '%', positive: true },
        { label: 'Days to Ship', value: '4.2d', delta: -0.6, suffix: 'd', positive: true },
      ];
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 20 }}>
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 20 }}>
        <div className="lg:col-span-8 card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title="Order pipeline" help="Current quarter" />
          <FunnelChart data={WHOL_PIPELINE} />
        </div>
        <div className="lg:col-span-4 card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title={mode === 'us' ? 'Fill rate & ship' : 'AR aging'} help={mode === 'us' ? 'SLA against 95% target' : 'Open receivables by bucket'} />
          {mode === 'us' ? (
            <>
              <div className="flex items-center justify-around" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <GaugeRing value={94.2} label="Line fill"   tone="coral-soft" />
                <GaugeRing value={91.7} label="Order fill"  tone="emerald" />
                <GaugeRing value={88.4} label="On-time ship" tone="coral" />
              </div>
              <div style={{ borderTop: `1px solid ${SLATE_100}`, paddingTop: 12 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500 }}>On-time ship · 12w</span>
                  <span style={{ fontSize: 12, color: SLATE_700, fontWeight: 600, ...TNUM }}>88.4%</span>
                </div>
                <Sparkline data={SHIP_TREND} w={280} h={44} color={CORAL_600} />
              </div>
            </>
          ) : (
            <>
              <StackedBar segments={AR_AGING.map((a) => ({ label: a.bucket, value: a.value, color: a.color }))} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                {AR_AGING.map((a) => (
                  <div key={a.bucket} className="flex items-center justify-between">
                    <div className="flex items-center" style={{ gap: 8 }}><span className="h-2 w-2 rounded-full" style={{ background: a.color }} /><span style={{ fontSize: 12.5, color: SLATE_700, fontWeight: 500 }}>{a.bucket}</span></div>
                    <span style={{ fontSize: 12.5, color: INK, fontWeight: 600, ...TNUM }}>{fmtMoney(a.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px' }}><CardHeader title="Top accounts" help={`${mode === 'us' ? 'US Wholesale' : 'Distributors'} · ranked by YTD revenue`} /></div>
        <div style={{ height: 1, background: '#EDEDEF' }} />
        <AccountTable data={accounts} />
      </div>

      <div className="card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
        <CardHeader title="Backorders" help="Open units by category" />
        <MiniBars data={BACKORDERS} color={CORAL_500} />
      </div>
    </>
  );
}

function AccountTable({ data }: { data: typeof US_ACCOUNTS }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="w-full" style={{ borderCollapse: 'collapse', ...TNUM, minWidth: 820 }}>
        <thead>
          <tr style={{ background: SLATE_50, borderBottom: `1px solid ${SLATE_100}` }}>
            {['#', 'Account', 'Open', 'Last order', 'YTD revenue', 'Cadence', 'Status'].map((h, i) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: i === 1 ? 'left' : 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((a, i) => (
            <tr key={a.name} style={{ borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}>
              <td style={{ padding: '14px', textAlign: 'center', width: 48 }}>
                <span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 6, background: SLATE_100, color: SLATE_700, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
              </td>
              <td style={{ padding: '12px 14px' }}>
                <div className="flex items-center" style={{ gap: 10 }}>
                  <span style={{ display: 'inline-grid', placeItems: 'center', width: 32, height: 32, background: SLATE_100, color: SLATE_700, borderRadius: 8 }}><Package size={15} strokeWidth={1.8} /></span>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: INK }}>{a.name}</p>
                </div>
              </td>
              <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: INK }}>{a.open}</td>
              <td style={{ padding: '14px', textAlign: 'center', fontSize: 12.5, color: SLATE_500 }}>{a.lastDays}d ago</td>
              <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: INK, fontWeight: 600 }}>{fmtMoney(a.ytd)}</td>
              <td style={{ padding: '14px', textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '2px 8px', background: SLATE_100, color: SLATE_700, borderRadius: 6, fontSize: 11.5 }}>{a.cadence}</span></td>
              <td style={{ padding: '14px', textAlign: 'center' }}>
                <span className={a.status === 'Healthy' ? 'chip-emerald' : 'chip-coral'} style={{ whiteSpace: 'nowrap' }}>
                  {a.status === 'Healthy' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}{a.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Retail view ───────────────────────────────────────────────────────
function RetailView() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 20 }}>
        <KpiCard label="Revenue YTD" value="$1.12M" delta={-4.2} suffix="%" positive={false} />
        <KpiCard label="Orders YTD" value="1,260" delta={-2.1} suffix="%" positive={false} />
        <KpiCard label="Average Order Value" value="$889" delta={3.4} suffix="%" positive />
        <KpiCard label="Store Count" value="1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 20 }}>
        <div className="lg:col-span-7 card" style={{ padding: 0, borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px' }}><CardHeader title="Top stores by revenue" help="YTD" /></div>
          <div style={{ height: 1, background: '#EDEDEF' }} />
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', ...TNUM, minWidth: 480 }}>
              <thead>
                <tr style={{ background: SLATE_50, borderBottom: `1px solid ${SLATE_100}` }}>
                  {['Store', 'Revenue', 'Orders', 'AOV', 'Trend'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: i === 0 ? 'left' : 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RETAIL_STORES.map((s) => (
                  <tr key={s.name}>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center" style={{ gap: 10 }}>
                        <span style={{ display: 'inline-grid', placeItems: 'center', width: 32, height: 32, background: CORAL_50, color: CORAL_700, borderRadius: 8 }}><Store size={15} strokeWidth={1.8} /></span>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: INK }}>{s.name}</p>
                      </div>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: INK, fontWeight: 600 }}>{fmtMoney(s.revenue)}</td>
                    <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: INK }}>{fmtInt(s.orders)}</td>
                    <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: SLATE_700 }}>${s.aov}</td>
                    <td style={{ padding: '14px', textAlign: 'center' }}><div style={{ display: 'inline-block' }}><Sparkline data={s.trend} w={100} h={28} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-5 card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title="Foot traffic trend" help="12-week rolling visitors" />
          <Sparkline data={[480, 520, 560, 590, 540, 620, 680, 710, 740, 780, 820, 860]} w={320} h={80} color={CORAL_500} />
          <p style={{ margin: '12px 0 0', fontSize: 12, color: SLATE_500 }}>Average 672 visits/week · +14.6% vs last quarter</p>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${SLATE_100}` }}>
            <CardHeader title="Return rate trend" help="Last 12 months" />
            <Sparkline data={[5.4, 5.0, 4.8, 4.6, 4.2, 4.0, 3.8, 3.6, 3.4, 3.3, 3.2, 3.1]} w={320} h={60} color={CORAL_600} />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Amazon view ───────────────────────────────────────────────────────
function AmazonView() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 20 }}>
        <KpiCard label="Revenue YTD" value="$1.82M" delta={18.6} suffix="%" positive />
        <KpiCard label="Orders YTD" value="16,540" delta={14.2} suffix="%" positive />
        <KpiCard label="Average Order Value" value="$110" delta={2.1} suffix="%" positive />
        <KpiCard label="Buy Box %" value="88%" delta={1.4} suffix="pp" positive />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 20 }}>
        <div className="lg:col-span-8 card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title="Ad spend vs attributed revenue" help="12-month trend · indexed thousands" />
          <LineChart
            data={REV_TREND.map((d, i) => ({ m: d.m, spend: AD_SPEND_TREND[i], rev: AD_REV_TREND[i] }))}
            series={[
              { key: 'spend', label: 'Ad spend', color: CORAL_600 },
              { key: 'rev',   label: 'Attributed revenue', color: SLATE_700 },
            ]}
          />
          <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
            <div className="flex items-center" style={{ gap: 14 }}>
              <span className="flex items-center" style={{ gap: 6, fontSize: 11, color: SLATE_600 }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL_600 }} />Ad spend</span>
              <span className="flex items-center" style={{ gap: 6, fontSize: 11, color: SLATE_600 }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: SLATE_700 }} />Attributed revenue</span>
            </div>
            <span style={{ fontSize: 11.5, color: SLATE_500 }}>ROAS <strong style={{ color: INK, fontWeight: 600 }}>4.6x</strong></span>
          </div>
        </div>
        <div className="lg:col-span-4 card" style={{ padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
          <CardHeader title="FBA vs MFN split" help="Share of orders YTD" />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Donut slices={[{ label: 'FBA', value: 72, color: CORAL_600 }, { label: 'MFN', value: 28, color: SLATE_400 }]} />
          </div>
          <div style={{ borderTop: `1px solid ${SLATE_100}`, paddingTop: 12 }}>
            <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
              <div className="flex items-center" style={{ gap: 8 }}><span className="h-2 w-2 rounded-full" style={{ background: CORAL_600 }} /><span style={{ fontSize: 13, color: INK, fontWeight: 500 }}>FBA</span></div>
              <span style={{ fontSize: 12.5, color: SLATE_500, ...TNUM }}>11,908 orders · $1.31M</span>
            </div>
            <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
              <div className="flex items-center" style={{ gap: 8 }}><span className="h-2 w-2 rounded-full" style={{ background: SLATE_400 }} /><span style={{ fontSize: 13, color: INK, fontWeight: 500 }}>MFN</span></div>
              <span style={{ fontSize: 12.5, color: SLATE_500, ...TNUM }}>4,632 orders · $510K</span>
            </div>
            <div className="flex items-center justify-between" style={{ padding: '8px 0', marginTop: 8, background: CORAL_50, borderRadius: 8, paddingLeft: 10, paddingRight: 10 }}>
              <span style={{ fontSize: 12.5, color: CORAL_700, fontWeight: 500 }}>Suppressed listings</span>
              <span style={{ fontSize: 13, color: CORAL_700, fontWeight: 600, ...TNUM }}>3</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px' }}><CardHeader title="Top ASINs" help="Ranked by YTD revenue" /></div>
        <div style={{ height: 1, background: '#EDEDEF' }} />
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse', ...TNUM, minWidth: 720 }}>
            <thead>
              <tr style={{ background: SLATE_50, borderBottom: `1px solid ${SLATE_100}` }}>
                {['#', 'Product · ASIN', 'Units', 'Revenue', 'Buy Box', 'Review score'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: i === 1 ? 'left' : 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOP_ASINS.map((p, i) => (
                <tr key={p.asin} style={{ borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}>
                  <td style={{ padding: '14px', textAlign: 'center', width: 48 }}>
                    <span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 6, background: CORAL_50, color: CORAL_700, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div className="flex items-center" style={{ gap: 10 }}>
                      <span style={{ display: 'inline-grid', placeItems: 'center', width: 32, height: 32, background: CORAL_50, color: CORAL_700, borderRadius: 8 }}><Box size={15} strokeWidth={1.8} /></span>
                      <div><p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: INK }}>{p.name}</p><p style={{ margin: '2px 0 0', fontSize: 11, color: SLATE_500 }}>ASIN · {p.asin}</p></div>
                    </div>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: INK }}>{fmtInt(p.units)}</td>
                  <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: INK, fontWeight: 600 }}>{fmtMoney(p.revenue)}</td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', background: p.buybox >= 90 ? EMERALD_50 : p.buybox >= 80 ? SLATE_100 : CORAL_50, color: p.buybox >= 90 ? EMERALD : p.buybox >= 80 ? SLATE_700 : CORAL_700, borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>{p.buybox}%</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: INK, fontWeight: 500 }}>★ {p.reviews.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
