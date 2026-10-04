import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { SEG_COLORS, SegTabs } from '../DashboardPage';
import DateRangePicker from '../components/DateRangePicker';
import PageHeader from '../components/PageHeader';
import { usePageRange } from '../lib/pageRange';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;
const INK = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50 = '#F8FAFC';
const CORAL = '#FF6F61';
const CORAL_DK = '#C9422E';
const CORAL_BG = '#FFF1EF';
const GREEN = '#047857';
const GREEN_BG = '#ECFDF5';

const SEGS = ['All','US Wholesale','Distributors','Retail','Ecommerce','Amazon'] as const;

const MARGIN_TREND = [
  { m: 'Jan', gross: 51.4, contrib: 33.1, op: 15.9 },
  { m: 'Feb', gross: 51.8, contrib: 33.4, op: 16.3 },
  { m: 'Mar', gross: 52.2, contrib: 33.8, op: 16.9 },
  { m: 'Apr', gross: 51.9, contrib: 33.6, op: 17.2 },
  { m: 'May', gross: 52.1, contrib: 33.9, op: 17.5 },
  { m: 'Jun', gross: 52.4, contrib: 34.1, op: 17.9 },
  { m: 'Jul', gross: 52.6, contrib: 34.3, op: 18.2 },
  { m: 'Aug', gross: 52.8, contrib: 34.5, op: 18.4 },
  { m: 'Sep', gross: 52.5, contrib: 34.4, op: 18.1 },
  { m: 'Oct', gross: 52.1, contrib: 34.2, op: 17.8 },
  { m: 'Nov', gross: 52.0, contrib: 34.0, op: 17.6 },
  { m: 'Dec', gross: 51.9, contrib: 34.0, op: 17.4 },
];

type ChannelProfit = { name: string; revenue: number; cogs: number; gmPct: number; contribPct: number; opPct: number; benchmark: number };
const CHANNEL_PROFIT: ChannelProfit[] = [
  { name: 'Retail',       revenue:  1_120_000, cogs:   470_400, gmPct: 58.0, contribPct: 39.2, opPct: 22.4, benchmark: 55 },
  { name: 'Ecommerce',    revenue:  6_738_000, cogs: 3_099_480, gmPct: 54.0, contribPct: 36.8, opPct: 20.1, benchmark: 50 },
  { name: 'US Wholesale', revenue:  9_620_000, cogs: 5_002_400, gmPct: 48.0, contribPct: 32.4, opPct: 16.8, benchmark: 45 },
  { name: 'Amazon',       revenue:  1_168_000, cogs:   642_400, gmPct: 45.0, contribPct: 30.2, opPct: 14.9, benchmark: 42 },
  { name: 'Distributors', revenue:  7_780_000, cogs: 4_512_400, gmPct: 42.0, contribPct: 27.4, opPct: 13.6, benchmark: 40 },
];

type Line = { name: string; revenue: number; units: number; gmDollars: number; gmPct: number };
const PRODUCT_LINES: Line[] = [
  { name: 'Flat Brims',       revenue: 6_820_000, units: 112_000, gmDollars: 4_160_200, gmPct: 61.0 },
  { name: 'Dad Hats',         revenue: 5_412_000, units:  98_400, gmDollars: 3_031_720, gmPct: 56.0 },
  { name: 'Classic Trucker',  revenue: 7_942_000, units: 160_200, gmDollars: 3_971_000, gmPct: 50.0 },
  { name: 'Cadet',            revenue: 1_240_000, units:  22_200, gmDollars:   607_600, gmPct: 49.0 },
  { name: 'Beanies',          revenue: 2_104_000, units:  48_600, gmDollars:   967_840, gmPct: 46.0 },
  { name: 'Visors',           revenue:   728_000, units:  18_400, gmDollars:   276_640, gmPct: 38.0 },
];

const LEADERS = [
  { name: 'Lids',               revenue: 1_820_000, margin: 61.4 },
  { name: 'Nordstrom',          revenue: 1_240_000, margin: 58.6 },
  { name: 'Hat Cult Boutique',  revenue:   412_000, margin: 57.2 },
  { name: 'Freewheel Outfitters', revenue: 318_000, margin: 55.8 },
  { name: 'Country Threads',    revenue:   286_000, margin: 54.6 },
];
const LAGGERS = [
  { name: 'Backcountry Ski Co', revenue:   214_000, margin: 32.1 },
  { name: 'SASAtrend',          revenue:   680_000, margin: 34.4 },
  { name: 'Zumiez Inc.',        revenue:   542_000, margin: 36.2 },
  { name: 'Panther Trading Co', revenue:   712_000, margin: 37.8 },
  { name: 'Big Bear Supply Co', revenue:   312_000, margin: 39.4 },
];

const fmtM = (n: number) => { const a = Math.abs(n); const s = n < 0 ? '-' : ''; if (a >= 1_000_000) return `${s}$${(a / 1_000_000).toFixed(2)}M`; if (a >= 1_000) return `${s}$${Math.round(a / 1_000)}K`; return `${s}$${Math.round(a)}`; };

function InlineDelta({ v, invert = false }: { v: number; invert?: boolean }) {
  const positive = invert ? v <= 0 : v >= 0;
  const Arrow = v >= 0 ? ArrowUp : ArrowDown;
  return (<span className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-medium" style={{ ...TABULAR, color: positive ? GREEN : CORAL_DK, background: positive ? GREEN_BG : CORAL_BG, padding: '3px 8px' }}><Arrow size={10} strokeWidth={2.6} />{Math.abs(v).toFixed(1)} pts</span>);
}

function Eyebrow({ children }: { children: React.ReactNode }) { return <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>{children}</p>; }
function Section({ children }: { children: React.ReactNode }) { return <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_400, margin: 0 }}>{children}</p>; }

export default function ProfitabilityPage() {
  const [seg, setSeg] = useState<string>('All');
  const [range, setRange] = usePageRange('profitability');

  const sorted = useMemo(() => [...CHANNEL_PROFIT].sort((a, b) => b.gmPct - a.gmPct), []);
  const linesSorted = useMemo(() => [...PRODUCT_LINES].sort((a, b) => b.gmDollars - a.gmDollars), []);
  const maxLineGm = linesSorted[0].gmDollars;

  const topLine = linesSorted[0];

  return (
    <div className="min-h-full" data-testid="profitability-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        {/* Header */}
        <PageHeader
          title="Profitability"
          testIdPrefix="prof"
          channels={SEGS}
          activeChannel={seg}
          onChannelChange={(v: string) => setSeg(v)}
          dateControl={<DateRangePicker value={range} onChange={setRange} testId="prof-range" />}
        />

        {/* Hero 3-col KPI */}
        <section className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="prof-hero">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr_1px_1fr]">
            {[
              { eyebrow: 'Gross Margin · YTD',        value: '52.1%', delta: 1.2, caption: 'Blended, after returns & discounts' },
              { eyebrow: 'Contribution Margin · YTD', value: '34.2%', delta: 0.8, caption: 'After variable channel costs' },
              { eyebrow: 'Operating Margin · YTD',    value: '17.8%', delta: 0.6, caption: 'After operating expenses' },
            ].map((k, i, arr) => (
              <>
                <div key={k.eyebrow} className="px-6 py-6 md:px-8 md:py-7" data-testid={`prof-kpi-${i}`}>
                  <Eyebrow>{k.eyebrow}</Eyebrow>
                  <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                    <p className="font-semibold" style={{ ...TABULAR, fontSize: 'clamp(28px, 3vw, 38px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: INK, margin: 0 }}>{k.value}</p>
                    <InlineDelta v={k.delta} />
                  </div>
                  <p className="mt-2 text-[12px] font-medium" style={{ color: SLATE_500, margin: 0 }}>{k.caption}</p>
                </div>
                {i < arr.length - 1 && <div key={`d-${i}`} className="hidden md:block" style={{ background: SLATE_100 }} aria-hidden="true" />}
              </>
            ))}
          </div>
        </section>

        {/* Margin trend */}
        <section className="mt-10 rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="prof-margin-trend">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Margin lanes · 12 months</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: SLATE_500 }}>Gross, contribution, and operating margins trending in parallel</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500 }}>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: INK }} /> Gross</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: CORAL }} /> Contribution</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: SLATE_500, borderTop: `1px dashed ${SLATE_500}` }} /> Operating</span>
            </div>
          </div>
          <div className="mt-5" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MARGIN_TREND} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={SLATE_100} vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickFormatter={(v) => `${v}%`} width={40} domain={[0, 60]} />
                <Tooltip
                  cursor={{ stroke: SLATE_200, strokeWidth: 1 }}
                  content={({ active, payload, label }: any) => (!active || !payload?.length) ? null : (
                    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 12, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)', minWidth: 180, ...TABULAR }}>
                      <p style={{ color: SLATE_500, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0 }}>{label}</p>
                      {payload.map((p: any) => (
                        <div key={p.dataKey} className="flex items-baseline justify-between gap-3" style={{ marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: SLATE_500, textTransform: 'capitalize' }}>{p.dataKey === 'contrib' ? 'contribution' : p.dataKey}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: p.color }}>{p.value.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                />
                <Line type="monotone" dataKey="gross"   stroke={INK}   strokeWidth={2} dot={false} isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="contrib" stroke={CORAL} strokeWidth={2} dot={false} isAnimationActive animationDuration={400} />
                <Line type="monotone" dataKey="op"      stroke={SLATE_500} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive animationDuration={400} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* By channel */}
        <section className="mt-10 rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="prof-by-channel">
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Profitability by channel</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: SLATE_500 }}>Sorted by Gross Margin %</p>
          <div className="mt-5">
            <div className="grid gap-x-4 pb-3 text-[11px] font-semibold uppercase" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr 90px 110px 100px', letterSpacing: '0.14em', color: SLATE_500, borderBottom: `1px solid ${SLATE_100}` }}>
              <span>Channel</span>
              <span className="text-right">Revenue</span>
              <span className="text-right">COGS</span>
              <span className="text-right">Gross Margin $</span>
              <span className="text-right">GM %</span>
              <span className="text-right">Contrib %</span>
              <span className="text-right">Op %</span>
            </div>
            {sorted.map((c, i) => {
              const gmDollars = c.revenue - c.cogs;
              const below = c.gmPct < c.benchmark;
              return (
                <div
                  key={c.name}
                  className="grid items-center gap-x-4 transition-colors duration-150"
                  style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr 90px 110px 100px', minHeight: 48, borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  data-testid={`prof-channel-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SEG_COLORS[c.name] || SLATE_500 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: INK }}>{c.name}</span>
                  </span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, color: SLATE_700 }}>{fmtM(c.revenue)}</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, color: SLATE_700 }}>{fmtM(c.cogs)}</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, fontWeight: 500, color: INK }}>{fmtM(gmDollars)}</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, fontWeight: 600, color: below ? CORAL_DK : INK }}>{c.gmPct.toFixed(1)}%</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, color: SLATE_700 }}>{c.contribPct.toFixed(1)}%</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, color: SLATE_700 }}>{c.opPct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* By product line */}
        <section className="mt-10 rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="prof-by-line">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Product line profitability</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: SLATE_500 }}>Ranked by gross margin dollars</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full text-[12px] font-medium" style={{ background: GREEN_BG, color: GREEN, padding: '4px 10px' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
              {topLine.name} leading at {topLine.gmPct.toFixed(0)}% GM
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_1px_minmax(0,1fr)]">
            {/* Horizontal bars */}
            <div data-testid="prof-line-bars">
              {linesSorted.map((l, i) => {
                const pct = (l.gmDollars / maxLineGm) * 100;
                const dot = SEG_COLORS[Object.keys(SEG_COLORS)[i % 5]];
                return (
                  <div key={l.name} className="grid items-center gap-4" style={{ gridTemplateColumns: '140px 1fr 110px', padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dot }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: INK, whiteSpace: 'nowrap' }}>{l.name}</span>
                    </span>
                    <div className="relative h-2 overflow-hidden rounded-full" style={{ background: SLATE_100 }}>
                      <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${pct}%`, background: dot, transition: 'width 400ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
                    </div>
                    <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, fontWeight: 600, color: INK }}>{fmtM(l.gmDollars)}</span>
                  </div>
                );
              })}
            </div>
            <div className="hidden lg:block" style={{ background: SLATE_100 }} aria-hidden="true" />
            {/* Right table */}
            <div data-testid="prof-line-table">
              <div className="grid gap-x-3 pb-2 text-[11px] font-semibold uppercase" style={{ gridTemplateColumns: '1.4fr 70px 90px', letterSpacing: '0.14em', color: SLATE_500, borderBottom: `1px solid ${SLATE_100}` }}>
                <span>Line</span>
                <span className="text-right">GM %</span>
                <span className="text-right">Revenue</span>
              </div>
              {linesSorted.map((l, i) => (
                <div key={l.name} className="grid items-center gap-x-3" style={{ gridTemplateColumns: '1.4fr 70px 90px', minHeight: 36, borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}>
                  <span style={{ fontSize: 13, color: SLATE_700 }}>{l.name}</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, fontWeight: 600, color: INK }}>{l.gmPct.toFixed(0)}%</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, color: SLATE_700 }}>{fmtM(l.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Leaders & Laggers */}
        <section className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="prof-leaders">
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>Top 5 margin leaders</h3>
            <p style={{ margin: '2px 0 12px', fontSize: 12, color: SLATE_500 }}>Highest margin %</p>
            {LEADERS.map((l, i) => (
              <div key={l.name} className="grid items-center gap-3" style={{ gridTemplateColumns: '2fr 100px 70px', padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>{l.name}</span>
                <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, color: SLATE_700 }}>{fmtM(l.revenue)}</span>
                <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, fontWeight: 600, color: GREEN }}>{l.margin.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="prof-laggers">
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>Top 5 margin laggers</h3>
            <p style={{ margin: '2px 0 12px', fontSize: 12, color: SLATE_500 }}>Lowest margin %</p>
            {LAGGERS.map((l, i) => (
              <div key={l.name} className="grid items-center gap-3" style={{ gridTemplateColumns: '2fr 100px 70px', padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>{l.name}</span>
                <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, color: SLATE_700 }}>{fmtM(l.revenue)}</span>
                <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, fontWeight: 600, color: CORAL_DK }}>{l.margin.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
