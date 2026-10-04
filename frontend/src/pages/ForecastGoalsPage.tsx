import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Lock, RotateCw, TrendingUp, Target, Flag } from 'lucide-react';
import { SegTabs } from '../DashboardPage';
import PageHeader from '../components/PageHeader';
import DsSelect from '../components/DsSelect';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = {
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  WebkitFontSmoothing: 'antialiased',
} as const;

const INK       = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50  = '#F8FAFC';
const EMERALD   = '#047857';
const EMERALD_BG = '#ECFDF5';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';
const CORAL_BG  = '#FFF1EF';
const CORAL_200 = '#FFD2CB';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const CURRENT_MONTH_IDX = 9; // October

const SEG_COLORS: Record<string, string> = {
  'US Wholesale': '#0F172A',
  'Distributors': '#C9422E',
  'Retail':       '#FFD2CB',
  'Ecommerce':    '#FF6F61',
  'Amazon':       '#FFA195',
};

const YEARS = [2026, 2027, 2028] as const;

type Year = typeof YEARS[number];
type Channel = { name: string; sync: boolean; months: (number | null)[] };

// ─── Mock data ─────────────────────────────────────────────────────────
const DATA_2026: Channel[] = [
  { name: 'US Wholesale', sync: true,  months: [720_000, 760_000, 820_000, 790_000, 740_000, 710_000, 690_000, 820_000, 870_000, 760_000, 710_000, 710_000] },
  { name: 'Distributors', sync: true,  months: [640_000, 680_000, 740_000,  -13_000,    -768, 820_000, 710_000, 790_000, 820_000, 740_000, 690_000, 980_000] },
  { name: 'Retail',       sync: false, months: [ 48_000,  52_000,  54_000,  51_000,  49_000,  58_000,  54_000,  56_000,  58_000,  54_000,  51_000,  55_000] },
  { name: 'Ecommerce',    sync: false, months: [480_000, 510_000, 540_000, 560_000, 570_000, 590_000, 580_000, 600_000, 620_000, 580_000, 540_000, 530_000] },
  { name: 'Amazon',       sync: false, months: [ 72_000,  78_000,  84_000,  86_000,  88_000,  92_000,  90_000,  94_000,  96_000,  88_000,  82_000,  80_000] },
];
const DATA_2027: Channel[] = DATA_2026.map((c) => ({
  ...c,
  months: c.months.map((m) => (m === null ? null : Math.round(m * 1.08))),
}));
const DATA_2028: Channel[] = DATA_2026.map((c) => ({
  ...c,
  months: c.months.map((m) => (m === null ? null : Math.round(m * 1.17))),
}));
const DATA: Record<Year, Channel[]> = { 2026: DATA_2026, 2027: DATA_2027, 2028: DATA_2028 };

const LOCKED: Record<Year, boolean> = { 2026: true, 2027: false, 2028: false };

// ─── Formatters ────────────────────────────────────────────────────────
const fmtK = (n: number) => {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs < 1_000) return `${sign}$${Math.round(abs)}`;
  if (abs < 1_000_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
};
const fmtAnnual = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  return `${sign}$${Math.round(abs / 1_000).toLocaleString('en-US')}K`;
};

// ─── Page ──────────────────────────────────────────────────────────────
export default function ForecastGoalsPage() {
  const [year, setYear] = useState<Year>(2026);
  const [fade, setFade] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [scenario, setScenario] = useState<'Conservative' | 'Base' | 'Stretch'>('Base');
  const [compareTo, setCompareTo] = useState<string>('Prior year');

  const locked = LOCKED[year];

  useEffect(() => {
    setFade(0.4);
    const t = setTimeout(() => setFade(1), 20);
    return () => clearTimeout(t);
  }, [year]);

  const rows = DATA[year];

  // Combine base data with pending edits for display
  const applied = useMemo(() => rows.map((c) => ({
    ...c,
    months: c.months.map((m, mi) => {
      const k = `${year}:${c.name}:${mi}`;
      return edits[k] !== undefined ? edits[k] : m;
    }),
  })), [rows, edits, year]);

  const totals = useMemo(() => MONTHS.map((_, mi) =>
    applied.reduce((s, c) => s + (c.months[mi] ?? 0), 0),
  ), [applied]);
  const grandTotal = totals.reduce((s, v) => s + v, 0);

  const unsavedCount = Object.keys(edits).length;

  // Scenario multipliers
  const scenarioMult = scenario === 'Conservative' ? 0.92 : scenario === 'Stretch' ? 1.08 : 1.0;
  const planFY = grandTotal;
  const forecastFY = Math.round(planFY * scenarioMult);
  const varianceFY = forecastFY - planFY;
  const ytdPlan = useMemo(() => applied.reduce((s, c) => s + c.months.slice(0, CURRENT_MONTH_IDX + 1).reduce((a: number, v) => a + (v ?? 0), 0), 0), [applied]);
  const ytdActual = Math.round(ytdPlan * 0.962); // mock actuals
  const attainment = ytdPlan > 0 ? (ytdActual / ytdPlan) * 100 : 0;

  // Per-channel plan + forecast totals (for Annual Viz)
  const channelTotals = useMemo(() => applied.map((c) => {
    const plan = c.months.reduce((s: number, v) => s + (v ?? 0), 0);
    return { name: c.name, plan, forecast: Math.round(plan * scenarioMult) };
  }), [applied, scenarioMult]);
  const maxChannel = Math.max(1, ...channelTotals.map((c) => Math.max(c.plan, c.forecast)));

  function startEdit(key: string, current: number | null) {
    if (locked) return;
    setEditing(key);
    setEditVal(current === null || current === undefined ? '' : String(current));
  }
  function commitEdit() {
    if (!editing) return;
    const n = parseFloat(editVal.replace(/[^0-9.-]/g, ''));
    if (!isNaN(n)) setEdits((s) => ({ ...s, [editing]: Math.round(n) }));
    setEditing(null);
  }

  function doRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }

  const cardShellStyle = { boxShadow: CARD_SHADOW } as React.CSSProperties;

  return (
    <div className="min-h-full" data-testid="forecast-goals-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas" style={{ paddingBottom: unsavedCount > 0 ? 100 : 24 }}>

        {/* ── Editorial header ───────────────────────────────── */}
        <PageHeader
          title="Forecast & Goals"
          testIdPrefix="fg"
          right={
            <div data-testid="fg-year-tabs">
              <SegTabs
                tabs={YEARS.map((y) => String(y)) as unknown as readonly string[]}
                value={String(year)}
                onChange={(v: string) => setYear(Number(v) as Year)}
                testId="fg-year-tabs-inner"
                slugPrefix="fg-year"
              />
            </div>
          }
        />


        {/* ── Lock banner (contained card) ───────────────────── */}
        {locked && (
          <div
            className="flex items-center gap-3 rounded-2xl"
            style={{
              background: CORAL_BG,
              padding: '16px 20px',
            }}
            data-testid="fg-lock-banner"
          >
            <Lock size={18} strokeWidth={2} style={{ color: CORAL_DK, flexShrink: 0 }} />
            <p style={{ margin: 0, flex: 1, fontSize: 13, color: '#1E293B', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: INK }}>FY {year} is locked.</span>{' '}
              All goals are read-only. Locked by <span style={{ fontWeight: 600, color: INK }}>Ryan Mirabile</span> on{' '}
              <span style={{ fontWeight: 600, color: INK }}>9/28/2026</span>.
            </p>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="transition-colors duration-150 shrink-0"
              style={{ color: CORAL_DK, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = CORAL; e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = CORAL_DK; e.currentTarget.style.textDecoration = 'none'; }}
              data-testid="fg-unlock-link"
            >
              Unlock from Settings
            </a>
          </div>
        )}

        {/* ── Data source status ─────────────────────────────── */}
        <section
          className={`${locked ? 'mt-4' : ''} flex items-center gap-4 rounded-2xl bg-white`}
          style={{ padding: 20, boxShadow: CARD_SHADOW }}
          data-testid="fg-datasource"
        >
          <div style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 999, background: EMERALD_BG, flexShrink: 0 }}>
            <CheckCircle2 size={20} strokeWidth={2} style={{ color: EMERALD }} />
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>{year} · US Wholesale &amp; Distributor · B2B Operations Platform</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>
              Last successful refresh: <span style={{ fontWeight: 600, color: SLATE_700 }}>5d ago</span> · 24 months
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>
              Last attempt: <span style={{ fontWeight: 600, color: SLATE_700 }}>5d ago</span>
            </p>
          </div>
          <button
            type="button"
            onClick={doRefresh}
            className="btn-secondary btn-sm inline-flex items-center"
            style={{ gap: 6 }}
            data-testid="fg-refresh-btn"
          >
            <RotateCw
              size={13}
              strokeWidth={2}
              style={{
                color: SLATE_500,
                animation: refreshing ? 'fg-spin 0.9s linear infinite' : 'none',
              }}
            />
            Refresh
          </button>
        </section>

        {/* ── KPI strip (4-up: Attainment / Plan FY / Forecast FY / Variance) ── */}
        <section className="mt-4 grid grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }} data-testid="fg-kpi-row">
          {[
            { label: 'Attainment', value: `${attainment.toFixed(1)}%`, caption: `${fmtAnnual(ytdActual)} of ${fmtAnnual(ytdPlan)} YTD`, tone: attainment >= 100 ? 'emerald' : attainment >= 90 ? 'ink' : 'coral', test: 'attainment' },
            { label: 'Plan FY',    value: fmtAnnual(planFY),    caption: `${year} plan commit`,                     tone: 'ink',     test: 'plan' },
            { label: 'Forecast FY',value: fmtAnnual(forecastFY),caption: `${scenario} scenario · ${scenarioMult.toFixed(2)}×`, tone: 'ink',     test: 'forecast' },
            { label: 'Variance',   value: `${varianceFY >= 0 ? '+' : ''}${fmtAnnual(varianceFY)}`, caption: `${varianceFY >= 0 ? 'Above' : 'Below'} plan`, tone: varianceFY >= 0 ? 'emerald' : 'coral', test: 'variance' },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid={`fg-kpi-${k.test}`}>
              <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: '#6E6E73', margin: 0 }}>{k.label}</p>
              <p className="mt-2" style={{ ...TABULAR, fontSize: 'clamp(28px, 3vw, 38px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: k.tone === 'emerald' ? EMERALD : k.tone === 'coral' ? CORAL_DK : '#0A0A0B', margin: 0 }}>{k.value}</p>
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: SLATE_500 }}>{k.caption}</p>
            </div>
          ))}
        </section>

        {/* ── Scenario bar ─────────────────────────────────────── */}
        <section className="mt-4 flex flex-wrap items-center rounded-2xl bg-white" style={{ padding: '14px 20px', boxShadow: CARD_SHADOW, gap: 16 }} data-testid="fg-scenario-bar">
          <div className="flex items-center" style={{ gap: 10 }}>
            <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: '#6E6E73', margin: 0 }}>Scenario</p>
            <SegTabs
              tabs={['Conservative', 'Base', 'Stretch'] as const}
              value={scenario}
              onChange={(v: string) => setScenario(v as 'Conservative' | 'Base' | 'Stretch')}
              testId="fg-scenario-tabs"
              slugPrefix="fg-scenario"
            />
          </div>
          <span aria-hidden="true" style={{ width: 1, height: 24, background: SLATE_200 }} />
          <div className="flex items-center" style={{ gap: 10 }}>
            <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: '#6E6E73', margin: 0 }}>Compare to</p>
            <DsSelect value={compareTo} options={['Prior year', 'Plan', 'Previous forecast', 'None']} onChange={setCompareTo} minWidth={180} testId="fg-compare-to" />
          </div>
        </section>

        {/* ── 4. Monthly Forecast by Channel ────────────────── */}
        <section
          className="mt-4 overflow-hidden rounded-2xl bg-white"
          style={cardShellStyle}
          data-testid="fg-forecast-card"
        >
          <header style={{ padding: '20px 24px 16px' }}>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} aria-hidden="true" />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Monthly Forecast by Channel</h2>
            </div>
            <p style={{ margin: '4px 0 0 14px', fontSize: 12, color: SLATE_500 }}>Plan monthly revenue targets for {year}</p>
          </header>

          <div style={{ overflowX: 'auto', opacity: fade, transition: 'opacity 180ms ease-out' }}>
            <table className="data-numeric-center" style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1180 }} data-testid="fg-forecast-table">
              <thead>
                <tr style={{ boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                  <th
                    className="fg-channel-header"
                    style={{
                      padding: '0 20px',
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: SLATE_500,
                      height: 44,
                      position: 'sticky',
                      left: 0,
                      background: '#FFFFFF',
                      zIndex: 1,
                      minWidth: 180,
                    }}
                  >
                    Channel
                  </th>
                  {MONTHS.map((m, mi) => {
                    const isCurrent = mi === CURRENT_MONTH_IDX && year === 2026;
                    return (
                      <th
                        key={m}
                        style={{
                          padding: '0 12px',
                          textAlign: 'right',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: isCurrent ? CORAL_DK : SLATE_500,
                          background: isCurrent ? CORAL_BG : 'transparent',
                          height: 44,
                          minWidth: 72,
                        }}
                      >
                        {m}
                      </th>
                    );
                  })}
                  <th
                    style={{
                      padding: '0 20px',
                      textAlign: 'right',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: SLATE_500,
                      height: 44,
                      minWidth: 100,
                    }}
                  >
                    Annual
                  </th>
                </tr>
              </thead>
              <tbody>
                {applied.map((c) => {
                  const annual = c.months.reduce((s: number, v) => s + (v ?? 0), 0);
                  return (
                    <tr
                      key={c.name}
                      style={{ borderTop: `1px solid ${SLATE_100}`, height: 72 }}
                      data-testid={`fg-row-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <td style={{ padding: '0 20px', position: 'sticky', left: 0, background: '#FFFFFF', textAlign: 'center', verticalAlign: 'middle', height: 72 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%', minHeight: 44 }}>
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SEG_COLORS[c.name] || SLATE_500 }} />
                          <span style={{ fontSize: 14, fontWeight: 500, color: INK }}>{c.name}</span>
                          {c.sync && (
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                color: SLATE_500,
                                background: SLATE_100,
                                border: `1px solid ${SLATE_200}`,
                                borderRadius: 4,
                                padding: '2px 6px',
                              }}
                            >
                              B2B SYNC
                            </span>
                          )}
                        </div>
                      </td>
                      {c.months.map((v, mi) => {
                        const isCurrent = mi === CURRENT_MONTH_IDX && year === 2026;
                        const key = `${year}:${c.name}:${mi}`;
                        const isEditing = editing === key;
                        const neg = typeof v === 'number' && v < 0;
                        const empty = v === null || v === undefined;
                        return (
                          <td
                            key={mi}
                            onClick={() => !isEditing && startEdit(key, v as number | null)}
                            className="transition-colors duration-150"
                            style={{
                              padding: '0 12px',
                              textAlign: 'right',
                              fontSize: 13,
                              color: empty ? SLATE_400 : neg ? CORAL_DK : INK,
                              background: isCurrent ? CORAL_BG : 'transparent',
                              cursor: locked ? 'not-allowed' : 'cell',
                              userSelect: 'none',
                            }}
                            onMouseEnter={(e) => { if (!locked && !isCurrent) e.currentTarget.style.background = SLATE_50; }}
                            onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                            data-testid={`fg-cell-${c.name.toLowerCase().replace(/\s+/g, '-')}-${mi}`}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                type="text"
                                inputMode="numeric"
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                                  if (e.key === 'Escape') { e.preventDefault(); setEditing(null); }
                                }}
                                className="fg-cell-input"
                                data-testid={`fg-input-${c.name.toLowerCase().replace(/\s+/g, '-')}-${mi}`}
                              />
                            ) : (
                              empty ? '—' : fmtK(v as number)
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: '0 20px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: INK }}>
                        {fmtAnnual(annual)}
                      </td>
                    </tr>
                  );
                })}

                {/* TOTAL row */}
                <tr style={{ borderTop: `1px solid ${SLATE_200}`, height: 60 }} data-testid="fg-total-row">
                  <td style={{ padding: '0 20px', position: 'sticky', left: 0, background: '#FFFFFF', textAlign: 'center', verticalAlign: 'middle', height: 60 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500 }}>
                      Total
                    </div>
                  </td>
                  {totals.map((t, mi) => {
                    const isCurrent = mi === CURRENT_MONTH_IDX && year === 2026;
                    return (
                      <td
                        key={mi}
                        style={{
                          padding: '0 12px',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          height: 60,
                          background: isCurrent ? CORAL_BG : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 14, fontWeight: 600, color: INK }}>
                          {fmtK(t)}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: '0 20px', textAlign: 'center', verticalAlign: 'middle', height: 60 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, fontWeight: 700, color: INK }}>
                      {fmtAnnual(grandTotal)}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Annual Visualization ─────────────────────────────── */}
        <section className="mt-4 rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="fg-annual-viz">
          <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
            <TrendingUp size={14} strokeWidth={2.2} style={{ color: CORAL }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Annual visualization</h2>
          </div>
          <p style={{ margin: '2px 0 20px 22px', fontSize: 12, color: SLATE_500 }}>Plan vs {scenario.toLowerCase()} forecast by channel</p>

          {/* Legend */}
          <div className="flex items-center" style={{ gap: 16, marginBottom: 16 }}>
            <div className="inline-flex items-center" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: SLATE_300 }} /><span style={{ fontSize: 12, color: SLATE_700 }}>Plan</span></div>
            <div className="inline-flex items-center" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: CORAL }} /><span style={{ fontSize: 12, color: SLATE_700 }}>Forecast</span></div>
          </div>

          <div className="flex flex-col" style={{ gap: 14 }}>
            {channelTotals.map((c) => {
              const planW = (c.plan / maxChannel) * 100;
              const fcW   = (c.forecast / maxChannel) * 100;
              const delta = c.forecast - c.plan;
              return (
                <div key={c.name} data-testid={`fg-viz-${c.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <div className="inline-flex items-center" style={{ gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: SEG_COLORS[c.name] || SLATE_400 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{c.name}</span>
                    </div>
                    <div className="inline-flex items-center" style={{ gap: 12, fontSize: 12.5, color: SLATE_700, ...TABULAR }}>
                      <span>Plan {fmtAnnual(c.plan)}</span>
                      <span>·</span>
                      <span style={{ color: INK, fontWeight: 600 }}>Fcst {fmtAnnual(c.forecast)}</span>
                      <span style={{ color: delta >= 0 ? EMERALD : CORAL_DK, fontWeight: 600, minWidth: 48, textAlign: 'right' }}>{delta >= 0 ? '+' : ''}{fmtAnnual(delta)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ width: `${planW}%`, height: 10, background: SLATE_300, borderRadius: 999 }} />
                    <div style={{ width: `${fcW}%`,   height: 10, background: CORAL,     borderRadius: 999, transition: 'width 240ms ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Goals Checklist ──────────────────────────────────── */}
        <section className="mt-4 rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid="fg-goals-checklist">
          <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
            <Flag size={14} strokeWidth={2.2} style={{ color: CORAL }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Goals checklist</h2>
          </div>
          <p style={{ margin: '2px 0 20px 22px', fontSize: 12, color: SLATE_500 }}>Executive goals for FY {year}</p>

          <div className="flex flex-col" style={{ gap: 10 }}>
            {([
              { label: 'Hit $12M US Wholesale revenue',          target: 12_000_000, actual: 10_240_000, status: 'On track' as const },
              { label: 'Grow DTC Ecommerce 15% YoY',             target: 15,         actual: 18,         status: 'Ahead' as const,  unit: '%' },
              { label: 'Maintain Amazon Buy Box ≥ 90%',          target: 90,         actual: 86,         status: 'At risk' as const, unit: '%' },
              { label: 'Launch 2 new Distributor accounts (Q4)', target: 2,          actual: 1,          status: 'On track' as const, unit: '' },
              { label: 'Reduce backorders below 500 units',      target: 500,        actual: 724,        status: 'Behind' as const,  unit: ' units' },
            ] as const).map((g, i) => {
              const chipMap = {
                'On track': { bg: '#ECFDF5', fg: EMERALD,  bd: '#A7F3D0' },
                'Ahead':    { bg: '#ECFDF5', fg: EMERALD,  bd: '#A7F3D0' },
                'At risk':  { bg: '#FFF1EF', fg: CORAL_DK, bd: '#FFD2CB' },
                'Behind':   { bg: '#FFF1EF', fg: CORAL_DK, bd: '#FFD2CB' },
              };
              const chip = chipMap[g.status];
              return (
                <div key={i} className="flex items-center justify-between" style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${SLATE_100}`, background: SLATE_50 }} data-testid={`fg-goal-${i}`}>
                  <div className="inline-flex items-center" style={{ gap: 10 }}>
                    <Target size={14} strokeWidth={2} style={{ color: SLATE_500 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: INK }}>{g.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500, ...TABULAR }}>
                        Actual <span style={{ color: INK, fontWeight: 600 }}>{typeof g.actual === 'number' && g.actual >= 1000 ? fmtAnnual(g.actual) : `${g.actual}${(g as any).unit || ''}`}</span>
                        <span> · Target </span>
                        <span style={{ color: SLATE_700, fontWeight: 600 }}>{typeof g.target === 'number' && g.target >= 1000 ? fmtAnnual(g.target) : `${g.target}${(g as any).unit || ''}`}</span>
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center" style={{ height: 22, padding: '0 10px', borderRadius: 6, background: chip.bg, color: chip.fg, fontSize: 11.5, fontWeight: 600, border: `1px solid ${chip.bd}` }}>{g.status}</span>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* ── 5. Save bar (conditional) ───────────────────────── */}
      {unsavedCount > 0 && (
        <div
          className="fg-save-bar"
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            height: 56,
            padding: '0 24px',
            background: '#FFFFFF',
            boxShadow: '0 -1px 2px rgba(0,0,0,0.04), 0 -4px 12px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            animation: 'fg-slide-up 180ms ease-out',
          }}
          data-testid="fg-save-bar"
        >
          <p style={{ margin: 0, fontSize: 14, color: '#1E293B' }}>
            You have <span style={{ fontWeight: 600, color: INK }}>{unsavedCount} unsaved change{unsavedCount === 1 ? '' : 's'}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEdits({})}
              className="btn-ghost btn-sm"
              data-testid="fg-discard"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => setEdits({})}
              className="btn-coral btn-sm"
              data-testid="fg-save"
            >
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
