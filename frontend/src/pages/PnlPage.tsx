import { useState } from 'react';
import { Page, Card, usd } from './_shared';

type Period = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY';
type Row = { label: string; current: number; prior: number; bold?: boolean; indent?: boolean; muted?: boolean };

const DATA: Record<Period, Row[]> = {
  Q1: build(3_100_000, 1_620_000, [190_000, 620_000, 280_000, 110_000]),
  Q2: build(3_580_000, 1_780_000, [220_000, 640_000, 280_000, 120_000]),
  Q3: build(4_120_000, 2_010_000, [260_000, 660_000, 290_000, 135_000]),
  Q4: build(4_780_000, 2_350_000, [310_000, 680_000, 300_000, 145_000]),
  FY: build(15_580_000, 7_760_000, [980_000, 2_600_000, 1_150_000, 510_000]),
};

function build(rev: number, cogs: number, opex: [number, number, number, number]): Row[] {
  const gp = rev - cogs;
  const gm = (gp / rev) * 100;
  const totalOpex = opex.reduce((a, b) => a + b, 0);
  const ebitda = gp - totalOpex;
  const ebitdaPct = (ebitda / rev) * 100;
  const tax = ebitda * 0.24;
  const net = ebitda - tax;
  return [
    { label: 'Revenue', current: rev, prior: rev * 1.14, bold: true },
    { label: 'Cost of Goods Sold', current: -cogs, prior: -cogs * 1.10 },
    { label: 'Gross Profit', current: gp, prior: gp * 1.16, bold: true },
    { label: 'Gross Margin %', current: gm, prior: gm + 1.2, muted: true },
    { label: 'Operating Expenses', current: -totalOpex, prior: -totalOpex * 1.05, bold: true },
    { label: 'Marketing', current: -opex[0], prior: -opex[0] * 1.08, indent: true },
    { label: 'Salaries', current: -opex[1], prior: -opex[1] * 1.03, indent: true },
    { label: 'Rent', current: -opex[2], prior: -opex[2], indent: true },
    { label: 'Other', current: -opex[3], prior: -opex[3] * 1.02, indent: true },
    { label: 'EBITDA', current: ebitda, prior: ebitda * 1.18, bold: true },
    { label: 'EBITDA %', current: ebitdaPct, prior: ebitdaPct + 1.4, muted: true },
    { label: 'Net Income', current: net, prior: net * 1.20, bold: true },
  ];
}

const isPercentRow = (label: string) => label.includes('%');

export default function PnlPage() {
  const [period, setPeriod] = useState<Period>('FY');
  const rows = DATA[period];

  return (
    <Page title="P&L" subtitle="Income statement — current quarter vs prior year." testId="pnl-page">
      <Card>
        <div className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1" role="tablist" aria-label="P&L period">
          {(['Q1', 'Q2', 'Q3', 'Q4', 'FY'] as Period[]).map((q) => (
            <button
              key={q}
              role="tab"
              aria-selected={period === q}
              onClick={() => setPeriod(q)}
              className={`flex-1 min-w-[64px] rounded-lg px-3 py-2 text-sm font-semibold transition ${period === q ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              data-testid={`pnl-tab-${q.toLowerCase()}`}
            >{q}</button>
          ))}
        </div>
      </Card>

      <Card title={`Income statement — ${period === 'FY' ? 'FY 2026' : `${period} 2026`}`} description="Positive numbers are inflows; parentheses indicate outflows." testId="pnl-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-neutral-500">
              <th className="pb-3 text-left font-semibold">Line item</th>
              <th className="pb-3 text-right font-semibold">Current</th>
              <th className="pb-3 text-right font-semibold">Prior year</th>
              <th className="pb-3 text-right font-semibold">YoY Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct = isPercentRow(r.label);
              const yoy = pct ? (r.current - r.prior) : (r.prior === 0 ? 0 : ((r.current - r.prior) / Math.abs(r.prior)) * 100);
              const fmt = (n: number) => pct ? `${n.toFixed(1)}%` : (n < 0 ? `(${usd(Math.abs(n))})` : usd(n));
              return (
                <tr key={r.label} className={`border-t border-neutral-100 ${r.bold ? 'bg-neutral-50/50' : ''}`}>
                  <td className={`py-2.5 ${r.indent ? 'pl-6 text-neutral-600' : ''} ${r.bold ? 'font-semibold text-neutral-900' : 'text-neutral-700'} ${r.muted ? 'text-neutral-500 italic' : ''}`}>{r.label}</td>
                  <td className={`py-2.5 text-right ${r.bold ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}>{fmt(r.current)}</td>
                  <td className="py-2.5 text-right text-neutral-500">{fmt(r.prior)}</td>
                  <td className={`py-2.5 text-right text-xs font-semibold ${yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}{pct ? ' pts' : '%'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}
