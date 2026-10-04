import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { SegTabs } from '../DashboardPage';
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
const GREEN_300 = '#6EE7B7';

const SEGS = ['All','US Wholesale','Distributors','Retail','Ecommerce','Amazon'] as const;

const CF_TREND = [
  { m: 'Jan', ocf:  420_000, cash: 3_120_000 }, { m: 'Feb', ocf:  380_000, cash: 3_380_000 },
  { m: 'Mar', ocf:  520_000, cash: 3_720_000 }, { m: 'Apr', ocf: -180_000, cash: 3_540_000 },
  { m: 'May', ocf:  410_000, cash: 3_720_000 }, { m: 'Jun', ocf:  480_000, cash: 3_980_000 },
  { m: 'Jul', ocf:  620_000, cash: 4_320_000 }, { m: 'Aug', ocf:  560_000, cash: 4_480_000 },
  { m: 'Sep', ocf:  280_000, cash: 4_180_000 }, { m: 'Oct', ocf:  420_000, cash: 4_200_000 },
  { m: 'Nov', ocf:  520_000, cash: 4_380_000 }, { m: 'Dec', ocf:  620_000, cash: 4_620_000 },
];

type Flow = { label: string; value: number; pct: number; color: string };
const SOURCES: Flow[] = [
  { label: 'Collections from AR',    value: 16_820_000, pct: 65, color: '#0F172A' },
  { label: 'Operating revenue',      value:  7_240_000, pct: 28, color: '#334155' },
  { label: 'Financing proceeds',     value:  1_300_000, pct:  5, color: '#64748B' },
  { label: 'Investment returns',     value:    520_000, pct:  2, color: '#94A3B8' },
];
const USES: Flow[] = [
  { label: 'COGS payments',          value: 10_460_000, pct: 42, color: '#FF6F61' },
  { label: 'Payroll',                value:  5_980_000, pct: 24, color: '#FFA195' },
  { label: 'Operating expenses',     value:  4_480_000, pct: 18, color: '#FFD2CB' },
  { label: 'Taxes',                  value:  2_240_000, pct:  9, color: '#C9422E' },
  { label: 'Inventory purchases',    value:  1_740_000, pct:  7, color: '#64748B' },
];

type WcCard = { label: string; value: number; unit: string; spark: number[]; delta: number; benchmark?: number };
const WC_CARDS: WcCard[] = [
  { label: 'AR days outstanding',   value:  38, unit: 'days', spark: [42,41,41,40,39,39,38,38,38,38], delta: -2.0, benchmark: 45 },
  { label: 'AP days outstanding',   value:  46, unit: 'days', spark: [43,44,44,45,45,46,46,46,46,46], delta:  2.0 },
  { label: 'Days of inventory',     value: 112, unit: 'days', spark: [96,100,104,108,110,110,112,112,112,112], delta: 10.0, benchmark: 130 },
];

type AgingRow = { bucket: string; accounts: number; total: number; pct: number; avgDays: number };
const AGING: AgingRow[] = [
  { bucket: 'Current (0-30d)', accounts: 142, total: 2_780_000, pct: 68, avgDays: 18 },
  { bucket: '31-60 days',      accounts:  48, total:   720_000, pct: 18, avgDays: 42 },
  { bucket: '61-90 days',      accounts:  18, total:   240_000, pct:  6, avgDays: 74 },
  { bucket: '90+ days',        accounts:  12, total:   340_000, pct:  8, avgDays: 128 },
];

const fmtM = (n: number) => { const a = Math.abs(n); const s = n < 0 ? '-' : ''; if (a >= 1_000_000) return `${s}$${(a / 1_000_000).toFixed(2)}M`; if (a >= 1_000) return `${s}$${Math.round(a / 1_000)}K`; return `${s}$${Math.round(a)}`; };
const fmtInt = (n: number) => n.toLocaleString('en-US');

function InlineDelta({ v, invert = false, unit = '%' }: { v: number; invert?: boolean; unit?: string }) {
  const positive = invert ? v <= 0 : v >= 0;
  const Arrow = v >= 0 ? ArrowUp : ArrowDown;
  return (<span className="inline-flex items-center gap-0.5 rounded-full text-[12px] font-medium" style={{ ...TABULAR, color: positive ? GREEN : CORAL_DK, background: positive ? GREEN_BG : CORAL_BG, padding: '3px 8px' }}><Arrow size={10} strokeWidth={2.6} />{Math.abs(v).toFixed(1)}{unit}</span>);
}

function MiniSpark({ data, color = SLATE_400 }: { data: number[]; color?: string }) {
  const w = 100, h = 28;
  const max = Math.max(...data), min = Math.min(...data);
  const range = (max - min) || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (<svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>);
}

function Eyebrow({ children }: { children: React.ReactNode }) { return <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500, margin: 0 }}>{children}</p>; }
function Section({ children }: { children: React.ReactNode }) { return <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: SLATE_400, margin: 0 }}>{children}</p>; }

export default function CashFlowPage() {
  const [seg, setSeg] = useState<string>('All');
  const [range, setRange] = usePageRange('cashflow');

  const cashOnHand = CF_TREND[CF_TREND.length - 3].cash; // Oct value
  const ocfYtd = useMemo(() => CF_TREND.slice(0, 10).reduce((s, t) => s + t.ocf, 0), []);
  const netChange = cashOnHand - CF_TREND[0].cash + CF_TREND[0].ocf; // approx

  const agingTotal = AGING.reduce((s, r) => s + r.total, 0);

  return (
    <div className="min-h-full" data-testid="cashflow-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        {/* Header */}
        <PageHeader
          title="Cash Flow"
          testIdPrefix="cf"
          channels={SEGS}
          activeChannel={seg}
          onChannelChange={(v: string) => setSeg(v)}
          dateControl={<DateRangePicker value={range} onChange={setRange} testId="cf-range" />}
        />

        {/* Hero */}
        <section className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="cf-hero">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr_1px_1fr]">
            {[
              { eyebrow: 'Cash on hand',             value: fmtM(cashOnHand), delta:  5.4, caption: 'Change this month: +$120K' },
              { eyebrow: 'Operating cash flow · YTD',value: fmtM(ocfYtd),     delta: 12.1, caption: 'vs $4.55M prior YTD' },
              { eyebrow: 'Net change in cash · YTD', value: fmtM(netChange),  delta:  8.2, caption: 'Positive across 9 of 10 months' },
            ].map((k, i, arr) => (
              <>
                <div key={k.eyebrow} className="px-6 py-6 md:px-8 md:py-7" data-testid={`cf-kpi-${i}`}>
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

        {/* Monthly trend */}
        <section className="mt-10 rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="cf-trend">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Monthly cash flow</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: SLATE_500 }}>Operating cash flow bars with cash on hand overlay</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium uppercase" style={{ letterSpacing: '0.14em', color: SLATE_500 }}>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: GREEN }} /> Positive OCF</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: CORAL }} /> Negative OCF</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: INK }} /> Cash on hand</span>
            </div>
          </div>
          <div className="mt-5" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={CF_TREND} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={SLATE_100} vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickMargin={8} />
                <YAxis yAxisId="ocf" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickFormatter={(v) => fmtM(v)} width={56} />
                <YAxis yAxisId="cash" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE_500, fontWeight: 500 }} tickFormatter={(v) => fmtM(v)} width={56} />
                <Tooltip
                  cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                  content={({ active, payload, label }: any) => (!active || !payload?.length) ? null : (
                    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 12, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)', minWidth: 180, ...TABULAR }}>
                      <p style={{ color: SLATE_500, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0 }}>{label}</p>
                      {payload.find((p: any) => p.dataKey === 'ocf') && (
                        <div className="flex items-baseline justify-between gap-3" style={{ marginTop: 4 }}><span style={{ fontSize: 11, color: SLATE_500 }}>OCF</span><span style={{ fontSize: 13, fontWeight: 600, color: payload.find((p: any) => p.dataKey === 'ocf').value >= 0 ? GREEN : CORAL_DK }}>{fmtM(payload.find((p: any) => p.dataKey === 'ocf').value)}</span></div>
                      )}
                      {payload.find((p: any) => p.dataKey === 'cash') && (
                        <div className="flex items-baseline justify-between gap-3" style={{ marginTop: 2 }}><span style={{ fontSize: 11, color: SLATE_500 }}>Cash</span><span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{fmtM(payload.find((p: any) => p.dataKey === 'cash').value)}</span></div>
                      )}
                    </div>
                  )}
                />
                <Bar yAxisId="ocf" dataKey="ocf" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={400}>
                  {CF_TREND.map((d, i) => <Cell key={i} fill={d.ocf >= 0 ? GREEN_300 : CORAL} />)}
                </Bar>
                <Line yAxisId="cash" type="monotone" dataKey="cash" stroke={INK} strokeWidth={2} dot={false} isAnimationActive animationDuration={400} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Sources vs Uses */}
        <section className="mt-10 overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="cf-sources-uses">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
            <div style={{ padding: 24 }} data-testid="cf-sources">
              <Eyebrow>Sources of cash</Eyebrow>
              <p style={{ margin: '2px 0 16px', fontSize: 12, color: SLATE_500 }}>Where cash came in from, YTD</p>
              {SOURCES.map((s) => (
                <div key={s.label} style={{ padding: '10px 0', borderTop: `1px solid ${SLATE_100}` }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>{s.label}</span>
                    <span style={{ ...TABULAR, fontSize: 13, fontWeight: 600, color: INK }}>{fmtM(s.value)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: SLATE_100 }}>
                      <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color, transition: 'width 400ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
                    </div>
                    <span style={{ ...TABULAR, fontSize: 11, color: SLATE_500, width: 36, textAlign: 'right' }}>{s.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block" style={{ background: SLATE_100 }} aria-hidden="true" />
            <div style={{ padding: 24, borderTop: `1px solid ${SLATE_100}`, borderTopWidth: 1 }} className="lg:border-t-0" data-testid="cf-uses">
              <Eyebrow>Uses of cash</Eyebrow>
              <p style={{ margin: '2px 0 16px', fontSize: 12, color: SLATE_500 }}>Where cash was spent, YTD</p>
              {USES.map((u) => (
                <div key={u.label} style={{ padding: '10px 0', borderTop: `1px solid ${SLATE_100}` }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>{u.label}</span>
                    <span style={{ ...TABULAR, fontSize: 13, fontWeight: 600, color: INK }}>{fmtM(u.value)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: SLATE_100 }}>
                      <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${u.pct}%`, background: u.color, transition: 'width 400ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
                    </div>
                    <span style={{ ...TABULAR, fontSize: 11, color: SLATE_500, width: 36, textAlign: 'right' }}>{u.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Working capital */}
        <section className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {WC_CARDS.map((w, i) => {
            const over = w.benchmark !== undefined && w.value > w.benchmark;
            return (
              <div key={w.label} className="rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid={`cf-wc-${i}`}>
                <Eyebrow>{w.label}</Eyebrow>
                <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                  <p className="font-semibold" style={{ ...TABULAR, fontSize: 'clamp(22px, 2vw, 24px)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: over ? CORAL_DK : INK, margin: 0 }}>{w.value}</p>
                  <span style={{ fontSize: 13, color: SLATE_500 }}>{w.unit}</span>
                  <InlineDelta v={w.delta} invert={w.benchmark !== undefined} unit=" pts" />
                </div>
                {w.benchmark !== undefined && (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: SLATE_500 }}>
                    Benchmark: <span style={{ color: SLATE_700, fontWeight: 600 }}>{w.benchmark}</span> days {over && <span style={{ color: CORAL_DK, fontWeight: 600, marginLeft: 4 }}>· watch</span>}
                  </p>
                )}
                <div className="mt-3" style={{ height: 32 }}><MiniSpark data={w.spark} color={over ? CORAL : SLATE_400} /></div>
              </div>
            );
          })}
        </section>

        {/* AR aging */}
        <section className="mt-10 rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="cf-aging">
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Accounts receivable aging</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: SLATE_500 }}>${fmtInt(agingTotal)} total outstanding · across {AGING.reduce((s, a) => s + a.accounts, 0)} accounts</p>
          </div>
          <div className="mt-5">
            <div className="grid gap-x-4 pb-3 text-[11px] font-semibold uppercase" style={{ gridTemplateColumns: '1.4fr 90px 120px 1.2fr 100px 90px', letterSpacing: '0.14em', color: SLATE_500, borderBottom: `1px solid ${SLATE_100}` }}>
              <span>Bucket</span>
              <span className="text-right">Accounts</span>
              <span className="text-right">Total $</span>
              <span>% of AR</span>
              <span className="text-right">Avg days</span>
              <span className="text-right">Share</span>
            </div>
            {AGING.map((row, i) => {
              const danger = row.bucket.startsWith('90');
              return (
                <div key={row.bucket} className="grid items-center gap-x-4" style={{ gridTemplateColumns: '1.4fr 90px 120px 1.2fr 100px 90px', minHeight: 48, borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }} data-testid={`cf-aging-row-${i}`}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: danger ? CORAL_DK : INK }}>{row.bucket}</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, color: SLATE_700 }}>{row.accounts}</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 14, fontWeight: 600, color: danger ? CORAL_DK : INK }}>{fmtM(row.total)}</span>
                  <div className="relative h-1.5 overflow-hidden rounded-full" style={{ background: SLATE_100 }}>
                    <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${row.pct}%`, background: danger ? CORAL : INK, transition: 'width 400ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
                  </div>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, color: SLATE_700 }}>{row.avgDays}</span>
                  <span style={{ ...TABULAR, textAlign: 'right', fontSize: 13, fontWeight: 600, color: danger ? CORAL_DK : INK }}>{row.pct}%</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
