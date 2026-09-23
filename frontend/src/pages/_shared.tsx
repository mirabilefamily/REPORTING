import type { ReactNode } from 'react';

type PageProps = { title: string; subtitle: string; testId: string; children: ReactNode; actions?: ReactNode };

export function Page({ title, subtitle, testId, children, actions }: PageProps) {
  return (
    <div className="p-8 space-y-6 max-w-[1400px]" data-testid={testId}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

type KpiProps = { label: string; value: string; delta?: string; deltaTone?: 'up' | 'down' | 'neutral'; sublabel?: string; testId?: string };

export function Kpi({ label, value, delta, deltaTone = 'neutral', sublabel, testId }: KpiProps) {
  const tone = deltaTone === 'up' ? 'text-emerald-600' : deltaTone === 'down' ? 'text-rose-600' : 'text-neutral-500';
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5" data-testid={testId}>
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">{value}</p>
      {(delta || sublabel) && (
        <p className="mt-1 flex items-center gap-2 text-xs">
          {delta && <span className={`font-semibold ${tone}`}>{delta}</span>}
          {sublabel && <span className="text-neutral-500">{sublabel}</span>}
        </p>
      )}
    </div>
  );
}

export function Card({ title, description, children, className = '', testId }: { title?: string; description?: string; children: ReactNode; className?: string; testId?: string }) {
  return (
    <section className={`rounded-2xl border border-neutral-200 bg-white p-6 ${className}`} data-testid={testId}>
      {(title || description) && (
        <header className="mb-4">
          {title && <h2 className="text-base font-semibold text-neutral-900">{title}</h2>}
          {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'blue' | 'grey'; children: ReactNode }) {
  const map = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    grey: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${map}`}>{children}</span>;
}

export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
export const usdM = (n: number) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`);
export const pct = (n: number, decimals = 1) => `${n >= 0 ? '' : ''}${n.toFixed(decimals)}%`;

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
