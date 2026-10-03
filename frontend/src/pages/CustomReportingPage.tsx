import { useState } from 'react';
import {
  Boxes,
  Edit3,
  MoreHorizontal,
  Play,
  Plus,
  Receipt,
  RotateCcw,
  Users,
  Workflow,
  Activity,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = {
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  WebkitFontSmoothing: 'antialiased',
} as const;

const INK      = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50  = '#F8FAFC';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';

type SavedReport = {
  name: string;
  owner: string;
  dimensions: string;
  measures: string;
  lastRun: string;
  schedule: string;
};

const SAVED: SavedReport[] = [
  { name: 'Wholesale Reorder Health', owner: 'Ryan Mirabile',  dimensions: 'Channel, Rep, Days-since-order', measures: 'Reorder rate, Avg order size',       lastRun: '2h ago',  schedule: 'Weekly · Mon 9AM' },
  { name: 'DTC Funnel Weekly',        owner: 'Ryan Mirabile',  dimensions: 'Channel, Week',                   measures: 'Sessions, Conversion rate, CAC',     lastRun: '1d ago',  schedule: 'Weekly' },
  { name: 'Retail Slow Movers',       owner: 'Priya Narayan',  dimensions: 'SKU, Location',                   measures: 'Days of supply, Units sold',          lastRun: '4d ago',  schedule: 'Manual' },
  { name: 'Top 50 Accounts YTD',      owner: 'Erwin Samson',   dimensions: 'Account, Rep',                    measures: 'Net sales, YoY',                     lastRun: '1w ago',  schedule: 'Monthly · 1st' },
  { name: 'Returns by Reason',        owner: 'Ryan Mirabile',  dimensions: 'Reason, Channel, Month',          measures: 'Return rate, $ returned',            lastRun: '2w ago',  schedule: 'Manual' },
];

const SOURCES = [
  { icon: Receipt,  title: 'Orders',       desc: 'All B2B + DTC orders with line items' },
  { icon: Users,    title: 'Customers',    desc: 'Customer-level attributes and LTV' },
  { icon: Boxes,    title: 'SKUs',         desc: 'Product catalog and inventory' },
  { icon: RotateCcw,title: 'Returns',      desc: 'Return events with reasons' },
  { icon: Workflow, title: 'Pipeline',     desc: 'Open quotes and forecasted deals' },
  { icon: Activity, title: 'Rep Activity', desc: 'Rep touches, meetings, calls' },
];

const DELIVERIES = [
  { name: 'Wholesale Reorder Health', recipients: 'ryan@goorin.com, ops-leads@goorin.com', cadence: 'Weekly · Mon 9:00 AM', nextRun: 'Mon Oct 6, 9:00 AM', enabled: true },
  { name: 'DTC Funnel Weekly',        recipients: 'ryan@goorin.com, growth@goorin.com',     cadence: 'Weekly · Fri 4:00 PM', nextRun: 'Fri Oct 3, 4:00 PM', enabled: true },
  { name: 'Top 50 Accounts YTD',      recipients: 'erwin@goorin.com',                        cadence: 'Monthly · 1st · 8:00 AM', nextRun: 'Fri Nov 1, 8:00 AM', enabled: false },
];

function StepDot({ n, label, active, done }: { n: number; label: string; active?: boolean; done?: boolean }) {
  const bg = active ? CORAL : done ? SLATE_700 : 'transparent';
  const border = active || done ? bg : SLATE_300;
  const color = active || done ? '#FFFFFF' : SLATE_400;
  return (
    <div className="inline-flex items-center gap-2" data-testid={`cr-step-${n}`}>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 24,
          height: 24,
          borderRadius: 999,
          background: bg,
          border: `1.5px solid ${border}`,
          color,
          fontSize: 12,
          fontWeight: 600,
          ...TABULAR,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? INK : SLATE_500 }}>{label}</span>
    </div>
  );
}

function Toggle({ on, onToggle, testId }: { on: boolean; onToggle: () => void; testId: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      data-testid={testId}
      style={{
        position: 'relative',
        width: 34,
        height: 20,
        borderRadius: 999,
        background: on ? CORAL : SLATE_200,
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: 999,
          background: '#FFFFFF',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          transition: 'left 0.15s ease',
        }}
      />
    </button>
  );
}

export default function CustomReportingPage() {
  const [delivery, setDelivery] = useState(DELIVERIES);
  const [activeStep] = useState(1);
  const [newToast, setNewToast] = useState(false);

  function stubAction() {
    setNewToast(true);
    setTimeout(() => setNewToast(false), 1600);
  }

  return (
    <div className="min-h-full" data-testid="custom-reporting-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div style={{ padding: '24px' }}>
        {/* ── Editorial header ───────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-6" data-testid="cr-report-header">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.12em', color: SLATE_400 }}>Goorin Reporting · Analytics</p>
            <h1 className="mt-2 font-semibold" style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: '-0.015em', color: INK }} data-testid="cr-title">Custom Reporting</h1>
            <p className="mt-3 font-normal" style={{ fontSize: 16, lineHeight: 1.5, color: SLATE_500, maxWidth: 760 }}>
              Build pivoted reports from any dimension and measure. Save, share, and schedule.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={stubAction}
              className="inline-flex items-center gap-1.5 transition-colors duration-150"
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 8,
                background: CORAL,
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = CORAL_DK; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = CORAL; }}
              data-testid="cr-new-report"
            >
              <Plus size={14} strokeWidth={2.2} />
              New Report
            </button>
          </div>
        </div>

        {/* ── Module 1: Saved reports ─────────────────────── */}
        <section className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="cr-saved-card">
          <header style={{ padding: '20px 24px 16px' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Saved reports</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: SLATE_500 }}>Pinned and recent</p>
          </header>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...TABULAR, borderCollapse: 'collapse', width: '100%', minWidth: 1120 }} data-testid="cr-saved-table">
              <thead>
                <tr style={{ boxShadow: `inset 0 -1px 0 ${SLATE_100}` }}>
                  {['Name', 'Owner', 'Dimensions', 'Measures', 'Last run', 'Schedule'].map((h) => (
                    <th key={h} style={{ padding: '0 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500, height: 44 }}>{h}</th>
                  ))}
                  <th style={{ padding: '0 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE_500, height: 44, width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {SAVED.map((r, i) => (
                  <tr
                    key={r.name}
                    className="transition-colors duration-150"
                    style={{ borderTop: `1px solid ${SLATE_100}`, height: 56 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    data-testid={`cr-saved-row-${i}`}
                  >
                    <td style={{ padding: '0 16px', fontSize: 14, fontWeight: 500, color: INK, cursor: 'pointer' }} onClick={stubAction}>{r.name}</td>
                    <td style={{ padding: '0 16px', fontSize: 13, color: SLATE_700 }}>{r.owner}</td>
                    <td style={{ padding: '0 16px', fontSize: 13, color: SLATE_700 }}>{r.dimensions}</td>
                    <td style={{ padding: '0 16px', fontSize: 13, color: SLATE_700 }}>{r.measures}</td>
                    <td style={{ padding: '0 16px', fontSize: 13, color: SLATE_500 }}>{r.lastRun}</td>
                    <td style={{ padding: '0 16px', fontSize: 13, color: SLATE_700 }}>{r.schedule}</td>
                    <td style={{ padding: '0 16px', textAlign: 'right' }}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={stubAction}
                          aria-label={`Run ${r.name}`}
                          className="transition-colors duration-150"
                          style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 6, background: 'transparent', color: CORAL, cursor: 'pointer' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF1EF'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          data-testid={`cr-run-${i}`}
                        >
                          <Play size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={stubAction}
                          aria-label={`Edit ${r.name}`}
                          className="transition-colors duration-150"
                          style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 6, background: 'transparent', color: SLATE_500, cursor: 'pointer' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_100; e.currentTarget.style.color = INK; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SLATE_500; }}
                          data-testid={`cr-edit-${i}`}
                        >
                          <Edit3 size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={stubAction}
                          aria-label={`More options for ${r.name}`}
                          className="transition-colors duration-150"
                          style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 6, background: 'transparent', color: SLATE_500, cursor: 'pointer' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_100; e.currentTarget.style.color = INK; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SLATE_500; }}
                          data-testid={`cr-more-${i}`}
                        >
                          <MoreHorizontal size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Module 2: Report Builder scaffold ─────────────── */}
        <section className="mt-4 rounded-2xl bg-white" style={{ padding: '20px 24px 24px', boxShadow: CARD_SHADOW }} data-testid="cr-builder-card">
          <header className="mb-4">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Report builder</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: SLATE_500 }}>Pick a data source, drag dimensions and measures, preview</p>
          </header>

          <div className="flex flex-wrap items-center gap-3" data-testid="cr-stepper">
            <StepDot n={1} label="Data source" active={activeStep === 1} />
            <span aria-hidden="true" style={{ flex: '0 0 48px', height: 1, background: SLATE_200 }} />
            <StepDot n={2} label="Dimensions & measures" />
            <span aria-hidden="true" style={{ flex: '0 0 48px', height: 1, background: SLATE_200 }} />
            <StepDot n={3} label="Preview & save" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="cr-sources-grid">
            {SOURCES.map((s) => (
              <button
                key={s.title}
                type="button"
                onClick={stubAction}
                className="text-left transition-colors duration-150"
                style={{
                  background: SLATE_50,
                  border: `1px solid ${SLATE_200}`,
                  borderRadius: 16,
                  padding: 20,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_100; e.currentTarget.style.borderColor = SLATE_300; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = SLATE_50; e.currentTarget.style.borderColor = SLATE_200; }}
                data-testid={`cr-source-${s.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <s.icon size={16} strokeWidth={1.9} style={{ color: SLATE_700 }} />
                <p style={{ margin: '10px 0 2px', fontSize: 14, fontWeight: 500, color: INK }}>{s.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: SLATE_500, lineHeight: 1.4 }}>{s.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Module 3: Delivery schedule ───────────────────── */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }} data-testid="cr-delivery-card">
          <header style={{ padding: '20px 24px 16px' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Delivery schedule</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: SLATE_500 }}>Automated runs and recipients</p>
          </header>
          <div>
            {delivery.map((d, i) => (
              <div
                key={d.name}
                className="grid items-center gap-x-5 transition-colors duration-150"
                style={{
                  gridTemplateColumns: '1.5fr 2fr 1.4fr 1.2fr 72px',
                  padding: '0 24px',
                  borderTop: `1px solid ${SLATE_100}`,
                  minHeight: 56,
                }}
                data-testid={`cr-delivery-row-${i}`}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: INK }}>{d.name}</span>
                <span style={{ fontSize: 13, color: SLATE_700 }}>{d.recipients}</span>
                <span style={{ fontSize: 13, color: SLATE_700 }}>{d.cadence}</span>
                <span style={{ fontSize: 13, color: SLATE_500 }}>Next: {d.nextRun}</span>
                <div className="flex justify-end">
                  <Toggle
                    on={d.enabled}
                    onToggle={() => setDelivery((s) => s.map((row, ri) => ri === i ? { ...row, enabled: !row.enabled } : row))}
                    testId={`cr-toggle-${i}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {newToast && (
          <div
            data-testid="cr-toast"
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: INK,
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 500,
              padding: '10px 16px',
              borderRadius: 10,
              boxShadow: '0 10px 24px rgba(15,17,20,0.2)',
              zIndex: 50,
            }}
          >
            Coming soon
          </div>
        )}
      </div>
    </div>
  );
}
