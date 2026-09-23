import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  Download,
  Info,
  Layers,
  Search,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

type Props = { name?: string; onNavigate?: (label: string) => void };

const CORAL = '#FC7460';
const INV_GREEN = '#0F8A66';
const OPEN_GREEN = '#B8DBC9';
const TOTAL_NAVY = '#1E3A8A';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } as const;

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const usdM = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${n < 0 ? '-' : ''}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${n < 0 ? '-' : ''}$${Math.round(a / 1e3)}K`;
  return `${n < 0 ? '-' : ''}$${Math.round(a)}`;
};

// ─── Data (source-repo mocks, unchanged) ───────────────────────────────
const HERO_TABS = ['All', 'US Wholesale', 'Distributors'];
const REV_TABS = ['YTD', '12M', 'Quarter'];

const heroSpark = [
  { m: 'Jan', v: 1_180_000 }, { m: 'Feb', v: 1_260_000 }, { m: 'Mar', v: 1_080_000 },
  { m: 'Apr', v: 1_340_000 }, { m: 'May', v: 1_510_000 }, { m: 'Jun', v: 1_640_000 },
  { m: 'Jul', v: 1_780_000 }, { m: 'Aug', v: 1_640_000 }, { m: 'Sep', v: 1_286_665 },
];

const monthly = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => {
  const inv = [1_180, 1_260, 1_080, 1_340, 1_510, 1_640, 1_780, 2_060, 1_286, 0, 0, 0][i] * 1000;
  const open = [0, 0, 0, 0, 0, 0, 0, 540, 690, 890, 940, 1_010][i] * 1000;
  return { m, inv, open, total: inv + open };
});

type Acct = { id: string; name: string; segment: 'US Wholesale' | 'Distributors'; strategic?: boolean; invoiced: number; open: number; total: number; goal: number; vsGoal: number; yoy: number; priorYear: number; priorYtd: number };
const ACCOUNTS: Acct[] = [
  { id: 'lids',       name: 'Lids',                                    segment: 'US Wholesale', strategic: true, invoiced: 2_700_000, open: 1_744_320, total: 4_460_373, goal: 3_000_000, vsGoal:  48.7, yoy: -20.1, priorYear: 4_683_724, priorYtd: 3_400_000 },
  { id: 'sasa',       name: 'SASAtrend',                               segment: 'Distributors', strategic: true, invoiced: 1_400_000, open:   860_300, total: 2_200_000, goal: 2_200_000, vsGoal:   1.3, yoy: -10.4, priorYear: 2_460_000, priorYtd: 1_560_000 },
  { id: 'buckle',     name: 'Buckle Inc., The',                        segment: 'US Wholesale', strategic: true, invoiced:   616_600, open:   726_000, total: 1_300_000, goal: 1_000_000, vsGoal:  32.7, yoy: -54.8, priorYear: 1_365_000, priorYtd: 1_365_000 },
  { id: 'dtlr',       name: 'DTLR Inc.',                               segment: 'US Wholesale',                  invoiced:   569_400, open:   705_000, total: 1_300_000, goal:   810_000, vsGoal:  57.3, yoy: 267.7, priorYear:   346_000, priorYtd:   154_800 },
  { id: '313srl',     name: '313 SRL VAT 04640850238',                 segment: 'Distributors',                  invoiced:   603_800, open:   691_700, total: 1_300_000, goal: 1_800_000, vsGoal: -29.1, yoy: -11.3, priorYear: 1_460_000, priorYtd:   680_000 },
  { id: 'mercury',    name: 'Industrias Mercury, S.A.',                segment: 'Distributors',                  invoiced: 1_000_000, open:   524_100, total: 1_600_000, goal: 1_100_000, vsGoal:  37.8, yoy:  62.6, priorYear:   984_000, priorYtd:   615_000 },
  { id: 'fibelock',   name: 'Fibelock Mills SA (Energy Brands)',       segment: 'Distributors',                  invoiced:   508_600, open:   416_600, total:   925_100, goal:   514_100, vsGoal:  80.0, yoy:  57.6, priorYear:   587_000, priorYtd:   323_000 },
  { id: 'gardea',     name: 'Grupo Gardea SA DE CV',                   segment: 'Distributors',                  invoiced:   362_200, open:   365_400, total:   727_600, goal:   698_100, vsGoal:   4.2, yoy:  13.2, priorYear:   643_000, priorYtd:   320_000 },
  { id: 'petek',      name: 'Petek Tekstil San. VE Tc. A.S.',          segment: 'Distributors',                  invoiced:   240_200, open:   335_500, total:   575_700, goal:   540_200, vsGoal:   6.6, yoy: -62.2, priorYear:   635_000, priorYtd:   635_000 },
  { id: 'nordstrom',  name: 'Nordstrom Accounts Payable',              segment: 'US Wholesale',                  invoiced:   726_500, open:   298_000, total: 1_024_500, goal: 1_200_000, vsGoal: -14.6, yoy: -19.6, priorYear: 1_274_000, priorYtd:   903_000 },
  { id: 'manhattan',  name: 'Manhattan International Concepts Inc',    segment: 'US Wholesale',                  invoiced:   210_400, open:   188_000, total:   398_400, goal:   360_000, vsGoal:  10.7, yoy:   8.4, priorYear:   367_000, priorYtd:   194_000 },
  { id: 'zumiez',     name: 'Zumiez Services LLC',                     segment: 'US Wholesale',                  invoiced:   184_900, open:   142_600, total:   327_500, goal:   420_000, vsGoal: -22.0, yoy:  -4.1, priorYear:   341_000, priorYtd:   192_000 },
];
const SORTED = [...ACCOUNTS].sort((a, b) => b.invoiced - a.invoiced);
const TOP5 = new Set(SORTED.slice(0, 5).map((a) => a.id));
const initials = (name: string) => {
  const p = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? name[0]) + (p[1]?.[0] ?? '')).toUpperCase();
};

// ─── Small components ──────────────────────────────────────────────────
function SegTabs({ tabs, value, onChange, testIdPrefix }: { tabs: readonly string[]; value: string; onChange: (v: string) => void; testIdPrefix: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="tablist">
      {tabs.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t)}
            data-testid={`${testIdPrefix}-${t.toLowerCase().replace(/\s+/g, '-')}`}
            className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${active ? 'bg-white text-neutral-900 border border-slate-200 shadow-sm' : 'text-neutral-500 border border-transparent hover:text-neutral-800'}`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function Delta({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
      style={TABULAR}
    >
      {up ? <ArrowUp size={10} strokeWidth={2.6} /> : <ArrowDown size={10} strokeWidth={2.6} />}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function StatCard({ icon: Icon, label, value, caption, testId }: { icon: any; label: string; value: string; caption: string; testId: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6" data-testid={testId}>
      <div className="flex items-center gap-3">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-neutral-500"><Icon size={13} /></span>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{label}</p>
      </div>
      <p className="mt-3 text-[36px] font-bold leading-none tracking-tight text-neutral-900" style={TABULAR}>{value}</p>
      <p className="mt-2 text-[12px] text-neutral-500">{caption}</p>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage({ onNavigate }: Props) {
  const [heroTab, setHeroTab] = useState<string>('All');
  const [revTab, setRevTab] = useState<string>('YTD');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? SORTED.filter((a) => a.name.toLowerCase().includes(q) || a.segment.toLowerCase().includes(q)) : SORTED;
  }, [query]);

  return (
    <div className="min-h-full space-y-6 bg-[#F5F6F3] p-6 pt-6" data-testid="dashboard-page" style={TABULAR}>
      {/* Row 1: Hero + Annual Goal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2.35fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6" data-testid="hero-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full" style={{ background: CORAL }} />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Invoiced Revenue · YTD</p>
            </div>
            <SegTabs tabs={HERO_TABS} value={heroTab} onChange={setHeroTab} testIdPrefix="hero-tab" />
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-4">
            <strong className="text-[68px] font-bold leading-none tracking-tight text-neutral-900 sm:text-[76px] xl:text-[84px]" style={TABULAR}>{usd(11_717_665)}</strong>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-600" data-testid="hero-delta">
              <ArrowDown size={12} strokeWidth={2.5} />16.4% vs LY
            </span>
          </div>
          <div className="mt-6 h-[220px]" data-testid="hero-sparkline">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={heroSpark} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CORAL} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={CORAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a938e' }} interval={0} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => usd(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke={CORAL} strokeWidth={2.6} fill="url(#heroFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6" data-testid="annual-goal">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Annual Goal</p>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: CORAL }}>68%</span>
          </div>
          <p className="mt-3 text-[32px] font-bold leading-none tracking-tight text-neutral-900" style={TABULAR}>$11.7M</p>
          <p className="mt-1.5 text-[12px] text-neutral-500" style={TABULAR}>of $17.3M · $5.6M to go</p>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Pace 75%</p>
          <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <span className="h-full" style={{ width: '68%', background: CORAL }} />
            <span className="h-full" style={{ width: '7%', background: '#FFC0B0' }} />
          </div>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-neutral-500">
            <i className="h-1.5 w-1.5 rounded-full bg-amber-400" />7 pts behind pace
          </p>
          <div className="my-5 border-t border-slate-100" />
          <ul className="space-y-3">
            <li className="flex items-center gap-2 text-sm" data-testid="goal-us"><i className="h-2 w-2 rounded-full" style={{ background: INV_GREEN }} /><span className="flex-1 text-neutral-700">US Wholesale</span><b className="text-neutral-900" style={TABULAR}>$6.5M</b><span className="w-14 text-right text-xs font-semibold text-emerald-600" style={TABULAR}>73%</span></li>
            <li className="flex items-center gap-2 text-sm" data-testid="goal-dist"><i className="h-2 w-2 rounded-full" style={{ background: '#3B6EF6' }} /><span className="flex-1 text-neutral-700">Distributors</span><b className="text-neutral-900" style={TABULAR}>$5.2M</b><span className="w-14 text-right text-xs font-semibold text-neutral-500" style={TABULAR}>62%</span></li>
          </ul>
        </section>
      </div>

      {/* Row 2: 3 stat cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard icon={ShoppingBag} label="Open Orders" value="$9.2M" caption="booked, not yet invoiced" testId="stat-open-orders" />
        <StatCard icon={Layers} label="Total" value="$20.9M" caption="invoiced + open orders" testId="stat-total" />
        <StatCard icon={TrendingUp} label="Forecast" value="$17.3M" caption="full-year projection" testId="stat-forecast" />
      </div>

      {/* Row 3: Revenue by month */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6" data-testid="rev-by-month">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-neutral-900">Revenue by month</h2>
          <SegTabs tabs={REV_TABS} value={revTab} onChange={setRevTab} testIdPrefix="rev-tab" />
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-600">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: INV_GREEN }} />Invoiced</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: OPEN_GREEN }} />Open orders</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[2px] w-4 rounded" style={{ background: TOTAL_NAVY }} />Total</span>
            <button className="inline-flex items-center gap-1 font-semibold text-neutral-500 hover:text-neutral-800" data-testid="rev-export"><Download size={12} /> Export</button>
          </div>
        </div>
        <div className="mt-4 h-[360px]" style={TABULAR}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeWidth={1} vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a938e' }} />
              <YAxis tickFormatter={usdM} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a3aaa5' }} width={60} />
              <Tooltip formatter={(v: number) => usdM(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Bar dataKey="inv" stackId="s" fill={INV_GREEN} isAnimationActive={false} />
              <Bar dataKey="open" stackId="s" fill={OPEN_GREEN} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Line type="monotone" dataKey="total" stroke={TOTAL_NAVY} strokeWidth={2.4} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Row 4: Accounts (restored from source, exec styling) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6" data-testid="rv-account-detail">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Accounts</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Ranked by invoiced · top 5 pinned · click a row to expand</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-neutral-400">
              <Search size={13} className="text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search accounts..."
                aria-label="Search accounts"
                className="w-40 border-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                data-testid="rv-account-search"
              />
            </label>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{query.trim() ? `${rows.length} of 220` : '220 accounts'}</span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto" role="table">
          <div className="grid grid-cols-[minmax(240px,1.6fr)_minmax(140px,1.1fr)_100px_110px_100px_100px_100px_24px] items-center gap-x-4 border-b border-slate-200 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500" role="row">
            <span role="columnheader">Account</span>
            <span role="columnheader" className="text-right">Invoiced</span>
            <span role="columnheader" className="text-right">Open</span>
            <span role="columnheader" className="text-right">Total</span>
            <span role="columnheader" className="text-right">Goal</span>
            <span role="columnheader" className="text-right">vs Goal</span>
            <span role="columnheader" className="text-right">YoY</span>
            <span aria-hidden="true" />
          </div>

          {rows.map((a) => {
            const isOpen = expanded === a.id;
            const barPct = Math.min(100, (a.invoiced / a.goal) * 100);
            const rank = SORTED.indexOf(a) + 1;
            return (
              <div key={a.id} className={`border-b border-slate-100 last:border-b-0 ${isOpen ? 'bg-slate-50/40' : ''}`}>
                <div
                  role="row"
                  tabIndex={0}
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setExpanded(isOpen ? null : a.id)}
                  data-testid={`rv-account-row-${a.id}`}
                  className="grid cursor-pointer grid-cols-[minmax(240px,1.6fr)_minmax(140px,1.1fr)_100px_110px_100px_100px_100px_24px] items-center gap-x-4 py-3 text-sm outline-none transition hover:bg-slate-50/60 focus-visible:ring-2 focus-visible:ring-neutral-300"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-[10px] font-bold text-white" style={TABULAR}>{initials(a.name)}</span>
                    <span className="flex min-w-0 flex-col">
                      <b className="flex items-center gap-1.5 truncate text-neutral-900">
                        {a.name}
                        {TOP5.has(a.id) && !query.trim() ? (
                          <em className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold not-italic text-white" style={{ background: CORAL }}>Top {rank}</em>
                        ) : a.strategic ? (
                          <em className="inline-flex items-center rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-bold not-italic text-neutral-600">Strategic</em>
                        ) : null}
                      </b>
                      <small className="truncate text-[11px] text-neutral-500">{a.segment}</small>
                    </span>
                  </span>
                  <span className="flex items-center justify-end gap-2 text-right">
                    <b className="text-neutral-900" style={TABULAR}>{usdM(a.invoiced)}</b>
                    <span className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                      <i className="block h-full rounded-full" style={{ width: `${Math.max(6, barPct)}%`, background: a.vsGoal >= 0 ? CORAL : '#F59F00' }} />
                    </span>
                  </span>
                  <span className="text-right text-neutral-500" style={TABULAR}>{usdM(a.open)}</span>
                  <span className="text-right font-semibold text-neutral-900" style={TABULAR}>{usdM(a.total)}</span>
                  <span className="text-right text-neutral-500" style={TABULAR}>{usdM(a.goal)}</span>
                  <span className={`text-right text-xs font-semibold ${a.vsGoal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} style={TABULAR}>{a.vsGoal >= 0 ? '+' : ''}{a.vsGoal.toFixed(1)}%</span>
                  <span className="flex justify-end"><Delta v={a.yoy} /></span>
                  <span className="flex justify-end text-neutral-400"><ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></span>
                </div>

                {isOpen && (
                  <div className="grid gap-4 border-t border-slate-100 px-2 pb-5 pt-4 md:grid-cols-[repeat(5,minmax(0,1fr))_auto]" data-testid={`rv-account-expand-${a.id}`}>
                    {[
                      { s: 'Open pipeline', b: usd(a.open), t: 'in pipeline' },
                      { s: 'Conservative land', b: usd(a.total), t: 'invoiced + open', info: true },
                      { s: 'Full-year forecast', b: usd(a.total), t: `${a.total >= a.goal ? '+' : '-'}${usdM(Math.abs(a.total - a.goal))} vs goal`, green: true, info: true },
                      { s: 'Annual goal', b: usd(a.goal), t: 'target' },
                      { s: 'Prior year', b: usd(a.priorYear), t: `YTD ${usdM(a.priorYtd)} · ${a.yoy >= 0 ? '+' : ''}${a.yoy.toFixed(1)}% YoY` },
                    ].map((m, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                        <small className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{m.s}{m.info && <Info size={10} className="text-neutral-400" />}</small>
                        <strong className={`mt-1.5 block text-[15px] font-bold ${m.green ? 'text-emerald-600' : 'text-neutral-900'}`} style={TABULAR}>{m.b}</strong>
                        <span className="mt-0.5 block text-[11px] text-neutral-500" style={TABULAR}>{m.t}</span>
                      </div>
                    ))}
                    <button
                      onClick={(e) => { e.stopPropagation(); onNavigate?.('Open Orders'); }}
                      data-testid={`rv-open-account-${a.id}`}
                      className="inline-flex items-center gap-1 self-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:border-neutral-300"
                      style={{ color: CORAL }}
                    >
                      Open account <ArrowUpRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="py-8 text-center text-sm text-neutral-500" data-testid="rv-account-empty">No accounts match &ldquo;{query}&rdquo;.</div>
          )}
        </div>
      </section>
    </div>
  );
}
