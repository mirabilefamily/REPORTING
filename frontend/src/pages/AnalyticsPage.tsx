import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, Users } from 'lucide-react';
import { SEG_COLORS, SegTabs, DeltaPill } from '../DashboardPage';
import { usePageRange } from '../lib/pageRange';

// ─── Tokens (mirror Dashboard) ─────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = {
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  WebkitFontSmoothing: 'antialiased',
} as const;

const fmtM = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
};

// ─── Mock data ─────────────────────────────────────────────────────────
const CHANNELS = ['All', 'US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'] as const;
const PERIODS = ['YTD', 'Last 12 mo', 'This quarter', 'Last quarter', 'Custom'] as const;
const TREND_MODES = ['Daily', 'Weekly', 'Monthly'] as const;

// Map Analytics Period pill → DateRangePicker value (drives data)
const PERIOD_TO_RANGE: Record<typeof PERIODS[number], 'YTD' | 'QTD' | 'Last 30d' | 'Custom'> = {
  'YTD':          'YTD',
  'Last 12 mo':   'YTD',
  'This quarter': 'QTD',
  'Last quarter': 'QTD',
  'Custom':       'Custom',
};

const KPIS = [
  { label: 'Net Sales',        value: '$17.51M', delta:  6.2, sub: 'vs $16.49M prior' },
  { label: 'Units',            value: '312,480', delta: -2.1, sub: 'vs 319,204 prior' },
  { label: 'Orders',           value: '8,204',   delta:  4.7, sub: 'vs 7,836 prior' },
  { label: 'AOV',              value: '$2,134',  delta:  3.1, sub: 'vs $2,070 prior' },
  { label: 'ASP',              value: '$56.10',  delta:  1.4, sub: 'vs $55.32 prior' },
  { label: 'Active Customers', value: '1,247',   delta: -1.2, sub: 'vs 1,262 prior' },
];

const TREND_MONTHLY = [
  { m: 'Jan', v: 1.35e6 }, { m: 'Feb', v: 2.45e6 }, { m: 'Mar', v: 1.55e6 },
  { m: 'Apr', v: 1.75e6 }, { m: 'May', v: 1.90e6 }, { m: 'Jun', v: 1.85e6 },
  { m: 'Jul', v: 2.45e6 }, { m: 'Aug', v: 2.65e6 }, { m: 'Sep', v: 1.55e6 },
  { m: 'Oct', v: 1.30e6 }, { m: 'Nov', v: 2.30e6 }, { m: 'Dec', v: 2.10e6 },
];
const TREND_WEEKLY = Array.from({ length: 12 }, (_, i) => ({ m: `W${i + 1}`, v: (0.4 + Math.random() * 0.6) * 1e6 }));
const TREND_DAILY  = Array.from({ length: 14 }, (_, i) => ({ m: `D${i + 1}`, v: (0.08 + Math.random() * 0.12) * 1e6 }));

const CHANNEL_MIX = [
  { name: 'US Wholesale', v: 6_480_000, share: 37.0, delta:  5.8 },
  { name: 'Distributors', v: 5_240_000, share: 29.9, delta:  8.4 },
  { name: 'Ecommerce',    v: 4_550_000, share: 26.0, delta: 12.1 },
  { name: 'Amazon',       v:   785_000, share:  4.5, delta: -3.6 },
  { name: 'Retail',       v:   462_000, share:  2.6, delta: -8.9 },
];

const SALES_REPS = [
  { name: 'Jovon Clements',   accounts: 34, net: 4_820_000, yoy:  12.6 },
  { name: 'Erwin Samson',     accounts: 28, net: 3_940_000, yoy:   6.3 },
  { name: 'Priya Rao',        accounts: 22, net: 2_710_000, yoy:  -4.1 },
  { name: 'Devon Park',       accounts: 19, net: 2_180_000, yoy:   9.2 },
  { name: 'James Whittaker',  accounts: 16, net: 1_860_000, yoy: -11.4 },
];

const TOP_CUSTOMERS = [
  { name: 'Lids',                       net: 2_720_000, share: 15.5 },
  { name: 'SASAtrend',                  net: 1_460_000, share:  8.3 },
  { name: 'Industrias Mercury, S.A.',   net: 1_030_000, share:  5.9 },
  { name: 'Nordstrom Accounts Payable', net:   726_000, share:  4.1 },
  { name: 'Buckle Inc., The',           net:   617_000, share:  3.5 },
  { name: 'Zumiez',                     net:   548_000, share:  3.1 },
  { name: 'Journeys',                   net:   492_000, share:  2.8 },
  { name: 'Tilly\u2019s',               net:   436_000, share:  2.5 },
  { name: 'Urban Outfitters',           net:   398_000, share:  2.3 },
  { name: 'Nordstrom Rack',             net:   356_000, share:  2.0 },
];

// ─── Atoms ─────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#64748B' }}>
      {children}
    </p>
  );
}

function InlineDelta({ v, showArrow = true }: { v: number; showArrow?: boolean }) {
  const up = v >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-medium"
      style={{
        ...TABULAR,
        color: up ? '#047857' : '#C7452E',
        background: up ? '#ECFDF5' : '#FFF1EE',
        padding: '3px 8px',
      }}
    >
      {showArrow && (up ? <ArrowUp size={10} strokeWidth={2.6} /> : <ArrowDown size={10} strokeWidth={2.6} />)}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)',
        minWidth: 180,
        ...TABULAR,
      }}
    >
      <p style={{ color: '#0F172A', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ color: '#0F172A', fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em', margin: 0 }}>{fmtM(v)}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [channel, setChannel] = useState<typeof CHANNELS[number]>('All');
  const [period, setPeriod] = useState<typeof PERIODS[number]>('YTD');
  const [trendMode, setTrendMode] = useState<typeof TREND_MODES[number]>('Monthly');
  const [range, setRange] = usePageRange('analytics');

  const handlePeriodChange = (v: typeof PERIODS[number]) => {
    setPeriod(v);
    setRange(PERIOD_TO_RANGE[v]);
  };

  const trendData = useMemo(() => {
    if (trendMode === 'Daily')  return TREND_DAILY;
    if (trendMode === 'Weekly') return TREND_WEEKLY;
    return TREND_MONTHLY;
  }, [trendMode]);

  const trendMax = Math.max(...trendData.map((d) => d.v));
  const yMax = trendMax > 2.5e6 ? 3e6 : trendMax > 1.5e6 ? 2.5e6 : 1.5e6;
  const yTicks = yMax === 3e6 ? [0, 1e6, 2e6, 3e6] : yMax === 2.5e6 ? [0, 0.5e6, 1e6, 1.5e6, 2e6, 2.5e6] : [0, 0.5e6, 1e6, 1.5e6];

  const cardShell = 'rounded-2xl bg-white p-6';
  const shellStyle = { boxShadow: CARD_SHADOW } as React.CSSProperties;

  return (
    <div className="p-1 space-y-4" data-testid="analytics-page" style={{ ...INTER, ...TABULAR }}>
      {/* 1) Filter bar */}
      <section className={cardShell} style={{ ...shellStyle, paddingTop: 20, paddingBottom: 20 }} data-testid="analytics-filter-bar">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <SegTabs tabs={CHANNELS as unknown as readonly string[]} value={channel} onChange={(v: any) => setChannel(v)} testId="a-channel-tabs" slugPrefix="a-ch" />
          <SegTabs tabs={PERIODS as unknown as readonly string[]} value={period} onChange={(v: any) => handlePeriodChange(v)} testId="a-period-tabs" slugPrefix="a-pd" />
        </div>
      </section>

      {/* 2) KPI row (6 metrics) */}
      <section
        className="overflow-hidden rounded-2xl bg-white"
        style={shellStyle}
        data-testid="analytics-kpi-row"
      >
        <div className="grid grid-cols-1 md:grid-cols-6">
          {KPIS.map((k, i) => (
            <div
              key={k.label}
              className="px-5 py-5"
              style={{ borderLeft: i > 0 ? '1px solid #F1F5F9' : 'none' }}
              data-testid={`akpi-${k.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Eyebrow>{k.label}</Eyebrow>
              <p className="mt-3 font-semibold" style={{ ...TABULAR, fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#0F172A' }}>
                {k.value}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <InlineDelta v={k.delta} />
                <span className="text-[11px] font-medium" style={{ color: '#64748B' }}>{k.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3) Net Sales Trend */}
      <section className={cardShell} style={shellStyle} data-testid="analytics-trend">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Net Sales Trend</h2>
            <p className="mt-1.5 text-[12px] font-medium" style={{ color: '#64748B' }}>{trendMode} view · {period}</p>
          </div>
          <SegTabs tabs={TREND_MODES as unknown as readonly string[]} value={trendMode} onChange={(v: any) => setTrendMode(v)} testId="a-trend-mode" slugPrefix="a-trend" />
        </div>
        <div className="mt-5 h-[320px]" style={TABULAR}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} barCategoryGap="22%">
              <defs>
                <linearGradient id="analyticsBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#10B981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0.92} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="m" tickLine={false} axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500, letterSpacing: '0.06em' }}
                tickFormatter={(m: string) => m.toUpperCase()}
                tickMargin={8}
              />
              <YAxis
                ticks={yTicks} domain={[0, yMax]}
                tickFormatter={(v: number) => `$${v / 1_000_000}M`}
                tickLine={false} axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                width={56}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
              <Bar dataKey="v" fill="url(#analyticsBarGrad)" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={400} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4) Channel Mix (60%) + Returns & Credits + Customer Concentration (40%) */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Channel Mix */}
        <div className={cardShell} style={shellStyle} data-testid="analytics-channel-mix">
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Channel Mix</h2>
          <div className="mt-5">
            {CHANNEL_MIX.map((c, i) => (
              <div
                key={c.name}
                className="grid grid-cols-[140px_minmax(0,1fr)_56px_84px_72px] items-center gap-3 transition-colors duration-150 ease-out hover:bg-slate-50 -mx-3 rounded-lg px-3"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 44 }}
                data-testid={`amix-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SEG_COLORS[c.name] }} />
                  <span className="truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{c.name}</span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#F1F5F9' }}>
                  <span
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ width: `${c.share}%`, background: SEG_COLORS[c.name], transition: 'width 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                  />
                </div>
                <span className="text-right text-[13px] font-medium tabular-nums" style={{ color: '#64748B' }}>{c.share.toFixed(1)}%</span>
                <span className="text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(c.v)}</span>
                <div className="flex justify-end"><InlineDelta v={c.delta} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Returns & Credits + Customer Concentration (stacked) */}
        <div className="flex flex-col gap-4">
          <div className={cardShell} style={shellStyle} data-testid="analytics-returns">
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Returns &amp; Credits</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold" style={{ ...TABULAR, fontSize: 28, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#0F172A' }}>2.4%</p>
                <p className="mt-1 text-[11px] font-medium" style={{ color: '#64748B' }}>Credit rate</p>
              </div>
              <div style={{ borderLeft: '1px solid #F1F5F9', paddingLeft: 16 }}>
                <p className="font-semibold" style={{ ...TABULAR, fontSize: 16, lineHeight: 1.2, letterSpacing: '-0.005em', color: '#0F172A' }}>$448K</p>
                <p className="mt-1 text-[11px] font-medium" style={{ color: '#64748B' }}>Credits on $18.7M gross</p>
              </div>
            </div>
          </div>

          <div className={cardShell} style={{ ...shellStyle, paddingTop: 20, paddingBottom: 20 }} data-testid="analytics-concentration">
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Customer Concentration</h2>
            <div className="mt-3 flex items-center gap-2">
              <Users size={16} color="#64748B" strokeWidth={1.8} />
              <p className="text-[13px] font-medium" style={{ color: '#0F172A' }}>
                Top 10 customers = <b className="font-semibold" style={TABULAR}>75.7%</b> of net sales
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5) Sales Rep Leaderboard + Top Customers */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <div className={cardShell} style={shellStyle} data-testid="analytics-reps">
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Sales Rep Leaderboard</h2>
          <div className="mt-5">
            <div
              className="grid grid-cols-[minmax(0,1.4fr)_80px_100px_80px] items-center gap-3 pb-3 text-[11px] font-semibold uppercase"
              style={{ letterSpacing: '0.08em', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}
            >
              <span>Rep</span>
              <span className="text-right">Accounts</span>
              <span className="text-right">Net Sales</span>
              <span className="text-right">YoY</span>
            </div>
            {SALES_REPS.map((r, i) => (
              <div
                key={r.name}
                className="grid grid-cols-[minmax(0,1.4fr)_80px_100px_80px] items-center gap-3 transition-colors duration-150 ease-out hover:bg-slate-50 -mx-3 rounded-lg px-3"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 44 }}
                data-testid={`arep-${i}`}
              >
                <span className="truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{r.name}</span>
                <span className="text-right text-[14px] font-medium" style={{ ...TABULAR, color: '#0F172A' }}>{r.accounts}</span>
                <span className="text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(r.net)}</span>
                <div className="flex justify-end"><DeltaPill v={r.yoy} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className={cardShell} style={shellStyle} data-testid="analytics-top-customers">
          <h2 className="text-[15px] font-semibold leading-none" style={{ color: '#0F172A', letterSpacing: '-0.005em' }}>Top Customers</h2>
          <div className="mt-5">
            <div
              className="grid grid-cols-[minmax(0,1.6fr)_100px_72px] items-center gap-3 pb-3 text-[11px] font-semibold uppercase"
              style={{ letterSpacing: '0.08em', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}
            >
              <span>Customer</span>
              <span className="text-right">Net Sales</span>
              <span className="text-right">Share</span>
            </div>
            {TOP_CUSTOMERS.map((c, i) => (
              <div
                key={c.name}
                className="grid grid-cols-[minmax(0,1.6fr)_100px_72px] items-center gap-3 transition-colors duration-150 ease-out hover:bg-slate-50 -mx-3 rounded-lg px-3"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', minHeight: 44 }}
                data-testid={`acust-${i}`}
              >
                <span className="truncate text-[14px] font-medium" style={{ color: '#0F172A' }}>{c.name}</span>
                <span className="text-right text-[14px] font-semibold whitespace-nowrap" style={{ ...TABULAR, color: '#0F172A' }}>{fmtM(c.net)}</span>
                <span className="text-right text-[14px] font-medium tabular-nums" style={{ color: '#64748B' }}>{c.share.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
