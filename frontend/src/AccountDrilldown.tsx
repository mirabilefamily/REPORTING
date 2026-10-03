import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, ArrowUpRight, X } from 'lucide-react';

const CORAL = '#FF6F61';
const INK = '#0A0A0A';
const BODY = '#171717';
const MUTED = '#525252';
const FAINT = '#A3A3A3';
const HAIRLINE = '#EEEEEE';

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.14em]';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtM = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
};

export type DrilldownAccount = {
  name: string;
  rank: number;
  net: number;
  yoy: number;
  shareOfTotal: number;
  spark: number[];
  rep: string;
  repInitials: string;
  repTitle: string;
};

const OPEN_ORDERS = [
  { po: 'PO-2148', ship: 'Oct 12, 2026', amount: '$384,220', status: 'In production', statusColor: '#D97706' },
  { po: 'PO-2151', ship: 'Oct 24, 2026', amount: '$167,500', status: 'Awaiting PO',   statusColor: '#DC2626' },
  { po: 'PO-2153', ship: 'Nov 03, 2026', amount: '$528,900', status: 'Confirmed',     statusColor: '#059669' },
];

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 10,
        padding: '10px 12px',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.08)',
        ...TABULAR,
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: MUTED, textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <b style={{ fontSize: 14, color: INK, display: 'block', marginTop: 2 }}>{fmtM(v)}</b>
    </div>
  );
}

export default function AccountDrilldown({ account, onClose }: { account: DrilldownAccount; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const sparkSum = account.spark.reduce((s, v) => s + v, 0) || 1;
  const monthlyData = MONTHS.map((m, i) => ({ m, v: (account.spark[i] / sparkSum) * account.net }));

  const up = account.yoy >= 0;
  const deltaColor = up ? '#059669' : '#DC2626';

  const panel = (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      data-testid="account-drilldown"
      style={INTER}
    >
      <style>{`
        @keyframes drillFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes drillSlide { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.2)', animation: 'drillFade 220ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
        onClick={onClose}
        data-testid="drilldown-backdrop"
      />

      {/* Panel */}
      <div
        className="relative flex h-full w-full flex-col overflow-y-auto bg-white p-6 md:w-[480px]"
        style={{
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          boxShadow: '-12px 0 32px rgba(15,17,20,0.10)',
          animation: 'drillSlide 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h3
              className="truncate text-[20px] font-bold leading-tight"
              style={{ color: INK, letterSpacing: '-0.02em' }}
              data-testid="drilldown-name"
            >
              {account.name}
            </h3>
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums"
              style={{ ...MONO, color: FAINT, background: '#F5F5F5' }}
              data-testid="drilldown-rank"
            >
              {String(account.rank).padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 transition-colors duration-150 ease-out hover:bg-[rgba(10,10,10,0.04)]"
            aria-label="Close"
            data-testid="drilldown-close"
          >
            <X size={16} color={MUTED} strokeWidth={2} />
          </button>
        </div>
        <p className={`${EYEBROW} mt-1.5`} style={{ color: MUTED }}>Top account · YTD</p>

        <hr className="my-5 border-0" style={{ borderTop: `1px solid ${HAIRLINE}` }} />

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4" data-testid="drilldown-kpis">
          <div>
            <p className={EYEBROW} style={{ color: MUTED }}>Net Sales · YTD</p>
            <p className="mt-1.5 text-[22px] font-bold leading-none" style={{ ...TABULAR, color: INK, letterSpacing: '-0.015em' }}>
              {fmtM(account.net)}
            </p>
          </div>
          <div>
            <p className={EYEBROW} style={{ color: MUTED }}>Share of Total</p>
            <p className="mt-1.5 text-[22px] font-bold leading-none" style={{ ...TABULAR, color: INK, letterSpacing: '-0.015em' }}>
              {account.shareOfTotal.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className={EYEBROW} style={{ color: MUTED }}>YoY Delta</p>
            <p
              className="mt-1.5 inline-flex items-center gap-0.5 text-[22px] font-bold leading-none"
              style={{ ...TABULAR, color: deltaColor, letterSpacing: '-0.015em' }}
            >
              {up ? <ArrowUp size={14} strokeWidth={2.6} /> : <ArrowDown size={14} strokeWidth={2.6} />}
              {Math.abs(account.yoy).toFixed(1)}%
            </p>
          </div>
        </div>

        <hr className="my-5 border-0" style={{ borderTop: `1px solid ${HAIRLINE}` }} />

        {/* Monthly trend */}
        <div data-testid="drilldown-trend">
          <p className={EYEBROW} style={{ color: MUTED }}>Monthly Revenue</p>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="drillAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CORAL} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={CORAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F1F1" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" hide />
                <YAxis hide domain={[0, 'auto']} tickCount={3} />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: FAINT, strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={CORAL}
                  strokeWidth={2}
                  fill="url(#drillAreaGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: CORAL, strokeWidth: 0 }}
                  isAnimationActive
                  animationDuration={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <hr className="my-5 border-0" style={{ borderTop: `1px solid ${HAIRLINE}` }} />

        {/* Open orders */}
        <div data-testid="drilldown-open-orders">
          <p className={EYEBROW} style={{ color: MUTED }}>Open Orders</p>
          <div className="mt-3">
            <div
              className="grid grid-cols-[minmax(72px,0.9fr)_minmax(88px,1fr)_minmax(88px,1fr)_minmax(100px,1.1fr)] items-center gap-x-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.10em]"
              style={{ color: FAINT }}
            >
              <span>Order #</span>
              <span>Ship date</span>
              <span className="text-right">Amount</span>
              <span>Status</span>
            </div>
            {OPEN_ORDERS.map((o) => (
              <div
                key={o.po}
                className="grid h-9 grid-cols-[minmax(72px,0.9fr)_minmax(88px,1fr)_minmax(88px,1fr)_minmax(100px,1.1fr)] items-center gap-x-2 text-[13px]"
                style={{ borderTop: `1px solid ${HAIRLINE}`, ...TABULAR }}
              >
                <span className="font-semibold" style={{ ...MONO, color: BODY, fontSize: 12 }}>{o.po}</span>
                <span style={{ color: BODY }}>{o.ship}</span>
                <b className="text-right whitespace-nowrap" style={{ color: INK }}>{o.amount}</b>
                <span className="font-semibold text-[12px]" style={{ color: o.statusColor }}>{o.status}</span>
              </div>
            ))}
          </div>
        </div>

        <hr className="my-5 border-0" style={{ borderTop: `1px solid ${HAIRLINE}` }} />

        {/* Rep + Last touched */}
        <div className="grid grid-cols-2 gap-4">
          <div data-testid="drilldown-rep">
            <p className={EYEBROW} style={{ color: MUTED }}>Sales Rep</p>
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                style={{ background: '#E5E5E5', color: BODY }}
              >
                {account.repInitials}
              </span>
              <div className="min-w-0">
                <b className="block truncate text-[13px] font-semibold leading-tight" style={{ color: BODY }}>{account.rep}</b>
                <span className="text-[11px] font-medium" style={{ color: MUTED }}>{account.repTitle}</span>
              </div>
            </div>
          </div>
          <div data-testid="drilldown-last-touched">
            <p className={EYEBROW} style={{ color: MUTED }}>Last Touched</p>
            <div className="mt-2.5">
              <b className="block text-[13px] font-semibold leading-tight" style={{ color: BODY }}>Sep 18, 2026</b>
              <span className="text-[11px] font-medium" style={{ color: MUTED }}>Quarterly review call · 42 min</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <button
            className="inline-flex items-center gap-1 text-[13px] font-semibold transition hover:underline"
            style={{ color: CORAL, textUnderlineOffset: 4 }}
            data-testid="drilldown-view-profile"
          >
            View full profile <ArrowUpRight size={13} />
          </button>
          <button
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#111318' }}
            data-testid="drilldown-log-note"
          >
            Log a note
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
