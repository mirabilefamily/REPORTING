import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Page, Kpi, Card, usd } from './_shared';
import DateRangePicker from '../components/DateRangePicker';
import { usePageRange } from '../lib/pageRange';

const KPIS = [
  { label: 'Gross Margin', value: '49.8%', delta: '+1.2 pts', tone: 'up' as const, sublabel: 'vs prior year' },
  { label: 'Net Margin', value: '18.4%', delta: '+0.6 pts', tone: 'up' as const, sublabel: 'vs prior year' },
  { label: 'Contribution Margin', value: '38.2%', delta: '−0.4 pts', tone: 'down' as const, sublabel: 'vs prior year' },
  { label: 'ROIC', value: '14.7%', delta: '+2.1 pts', tone: 'up' as const, sublabel: 'trailing 12 months' },
];

const BY_CATEGORY = [
  { name: 'Fedora', margin: 54.2 },
  { name: 'Baseball', margin: 48.6 },
  { name: 'Beanie', margin: 41.3 },
  { name: 'Bucket', margin: 46.8 },
  { name: 'Straw', margin: 38.5 },
];

const BY_SEGMENT = [
  { name: 'Wholesale', margin: 44.1 },
  { name: 'DTC', margin: 62.4 },
  { name: 'Retail Partners', margin: 39.2 },
  { name: 'International', margin: 33.8 },
];

const TOP5 = [
  { sku: '101-0442', name: 'Classic Fedora', margin: 61.4, rev: 231_200 },
  { sku: '101-1284', name: 'The Panther', margin: 58.7, rev: 298_500 },
  { sku: '101-0385', name: 'The GOAT', margin: 56.9, rev: 485_200 },
  { sku: '101-1912', name: 'The Rooster', margin: 55.2, rev: 264_700 },
  { sku: '101-2814', name: 'Baseball Vintage', margin: 52.6, rev: 189_400 },
];

const BOTTOM5 = [
  { sku: '101-0917', name: 'Straw Panama', margin: 24.8, rev: 171_800 },
  { sku: '101-3117', name: 'Bourbon Bucket', margin: 27.1, rev: 205_600 },
  { sku: '101-2457', name: 'Black Sheep Trucker', margin: 31.6, rev: 341_900 },
  { sku: '101-0386', name: 'The Gorilla', margin: 33.4, rev: 386_400 },
  { sku: '101-2449', name: 'Lone Wolf Trucker', margin: 35.9, rev: 412_800 },
];

function SkuTable({ rows, testId }: { rows: typeof TOP5; testId: string }) {
  return (
    <div data-testid={testId}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
            <th className="pb-2 font-semibold">SKU</th>
            <th className="pb-2 font-semibold">Product</th>
            <th className="pb-2 text-right font-semibold">Revenue</th>
            <th className="pb-2 text-right font-semibold">Margin %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sku} className="border-t border-neutral-100">
              <td className="py-2.5 font-mono text-xs text-neutral-700">{r.sku}</td>
              <td className="py-2.5 text-neutral-800">{r.name}</td>
              <td className="py-2.5 text-right text-neutral-700">{usd(r.rev)}</td>
              <td className="py-2.5 text-right font-semibold text-neutral-900">{r.margin.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarginBars({ data, testId }: { data: { name: string; margin: number }[]; testId: string }) {
  return (
    <div className="h-64" data-testid={testId}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eef1ef" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a938e' }} />
          <YAxis tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a3aaa5' }} width={44} />
          <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="margin" fill="#0f8a66" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ProfitabilityPage() {
  const [range, setRange] = usePageRange('profitability');
  return (
    <Page title="Profitability" subtitle="Margins by category, segment and product." testId="profitability-page" actions={<DateRangePicker value={range} onChange={setRange} testId="profitability-range" />}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => <Kpi key={k.label} {...k} deltaTone={k.tone} testId={`kpi-${k.label.toLowerCase().replace(/\s+/g, '-')}`} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Margin by product category" description="Gross margin percentage." testId="chart-margin-category">
          <MarginBars data={BY_CATEGORY} testId="bars-category" />
        </Card>
        <Card title="Margin by customer segment" description="Contribution margin percentage." testId="chart-margin-segment">
          <MarginBars data={BY_SEGMENT} testId="bars-segment" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Top 5 most profitable SKUs" testId="table-top-skus">
          <SkuTable rows={TOP5} testId="top-skus" />
        </Card>
        <Card title="Bottom 5 SKUs by margin" testId="table-bottom-skus">
          <SkuTable rows={BOTTOM5} testId="bottom-skus" />
        </Card>
      </div>
    </Page>
  );
}
