import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lock, RotateCw } from 'lucide-react';
import { SegTabs } from '../DashboardPage';
import PageHeader from '../components/PageHeader';

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
      <div style={{ padding: '24px', paddingBottom: unsavedCount > 0 ? 100 : 24 }}>

        {/* ── Editorial header ───────────────────────────────── */}
        <PageHeader
          eyebrow="Goorin Reporting · Planning"
          title="Forecast & Goals"
          subtitle="Set monthly targets across all channels to compare against actual performance."
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
            className="inline-flex items-center gap-1.5 transition-colors duration-150"
            style={{
              height: 36,
              padding: '0 12px',
              background: SLATE_100,
              color: SLATE_700,
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              border: `1px solid ${SLATE_200}`,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_200; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = SLATE_100; }}
            data-testid="fg-refresh-btn"
          >
            <RotateCw
              size={14}
              strokeWidth={2}
              style={{
                color: SLATE_500,
                animation: refreshing ? 'fg-spin 0.9s linear infinite' : 'none',
              }}
            />
            Refresh
          </button>
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
            <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1180 }} data-testid="fg-forecast-table">
              <thead>
                <tr style={{ boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                  <th
                    style={{
                      padding: '0 20px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
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
                          letterSpacing: '0.08em',
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
                      letterSpacing: '0.08em',
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
                      <td style={{ padding: '0 20px', position: 'sticky', left: 0, background: '#FFFFFF' }}>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SEG_COLORS[c.name] || SLATE_500 }} />
                          <span style={{ fontSize: 14, fontWeight: 500, color: INK }}>{c.name}</span>
                        </div>
                        {c.sync && (
                          <span
                            style={{
                              marginTop: 6,
                              marginLeft: 14,
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
                  <td style={{ padding: '0 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500, position: 'sticky', left: 0, background: '#FFFFFF' }}>
                    Total
                  </td>
                  {totals.map((t, mi) => {
                    const isCurrent = mi === CURRENT_MONTH_IDX && year === 2026;
                    return (
                      <td
                        key={mi}
                        style={{
                          padding: '0 12px',
                          textAlign: 'right',
                          fontSize: 14,
                          fontWeight: 600,
                          color: INK,
                          background: isCurrent ? CORAL_BG : 'transparent',
                        }}
                      >
                        {fmtK(t)}
                      </td>
                    );
                  })}
                  <td style={{ padding: '0 20px', textAlign: 'right', fontSize: 16, fontWeight: 700, color: INK }}>
                    {fmtAnnual(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
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
              className="transition-colors duration-150"
              style={{ height: 32, padding: '0 12px', background: 'transparent', color: SLATE_500, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = INK; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; }}
              data-testid="fg-discard"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => setEdits({})}
              className="transition-colors duration-150"
              style={{ height: 32, padding: '0 14px', background: CORAL, color: '#FFFFFF', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = CORAL_DK; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = CORAL; }}
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
