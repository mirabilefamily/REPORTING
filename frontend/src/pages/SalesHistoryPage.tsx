import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Page, Card, Badge, usd } from './_shared';

type Row = { date: string; order: string; customer: string; channel: string; units: number; revenue: number; margin: number; status: 'Invoiced' | 'Shipped' | 'Delivered' };

const CUSTOMERS = ['Lids', 'SASAtrend', 'Buckle Inc.', 'DTLR', 'Nordstrom', 'Zumiez', 'Manhattan Intl.', 'Fibelock Mills', 'Grupo Gardea', 'Petek Tekstil', 'Industrias Mercury', 'DTC Storefront', 'Amazon US'];
const CHANNELS = ['Wholesale', 'DTC', 'Amazon', 'Retail Partners'];

const rand = (seed: number) => {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};

const gen = (): Row[] => {
  const r = rand(42);
  return Array.from({ length: 30 }).map((_, i) => {
    const units = 40 + Math.floor(r() * 720);
    const revenue = units * (18 + r() * 26);
    const margin = 32 + r() * 22;
    const day = 28 - Math.floor(i * 0.9);
    const date = `2026-09-${String(Math.max(1, day)).padStart(2, '0')}`;
    return {
      date,
      order: `SO${58800 - i * 7}`,
      customer: CUSTOMERS[Math.floor(r() * CUSTOMERS.length)],
      channel: CHANNELS[Math.floor(r() * CHANNELS.length)],
      units,
      revenue,
      margin,
      status: (['Invoiced', 'Shipped', 'Delivered'] as const)[Math.floor(r() * 3)],
    };
  });
};

const ROWS = gen();
const tone: Record<Row['status'], 'green' | 'blue' | 'amber'> = { Invoiced: 'amber', Shipped: 'blue', Delivered: 'green' };

export default function SalesHistoryPage() {
  const [channel, setChannel] = useState('All channels');
  const [region, setRegion] = useState('All regions');
  const [range, setRange] = useState('Last 30 days');

  return (
    <Page title="Sales History" subtitle="All invoiced orders across channels and regions." testId="sales-history-page">
      <Card testId="sales-filters">
        <div className="flex flex-wrap items-center gap-3">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm" data-testid="filter-range">
            {['Last 7 days', 'Last 30 days', 'Last 90 days', 'FY 2026', 'Custom…'].map((o) => <option key={o}>{o}</option>)}
          </select>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm" data-testid="filter-channel">
            {['All channels', ...CHANNELS].map((o) => <option key={o}>{o}</option>)}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm" data-testid="filter-region">
            {['All regions', 'North America', 'EMEA', 'LATAM', 'APAC'].map((o) => <option key={o}>{o}</option>)}
          </select>
          <span className="ml-auto text-xs text-neutral-500">{ROWS.length} rows</span>
        </div>
      </Card>

      <Card title="Order-level history" description="Latest activity, most recent first." testId="sales-table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Order #</th>
                <th className="pb-2 font-semibold">Customer</th>
                <th className="pb-2 font-semibold">Channel</th>
                <th className="pb-2 text-right font-semibold">Units</th>
                <th className="pb-2 text-right font-semibold">Revenue</th>
                <th className="pb-2 text-right font-semibold">Margin %</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.order} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="py-2.5 text-neutral-700">{r.date}</td>
                  <td className="py-2.5 font-mono text-xs text-neutral-800">{r.order}</td>
                  <td className="py-2.5 text-neutral-800">{r.customer}</td>
                  <td className="py-2.5 text-neutral-600">{r.channel}</td>
                  <td className="py-2.5 text-right text-neutral-700">{r.units.toLocaleString('en-US')}</td>
                  <td className="py-2.5 text-right font-semibold text-neutral-900">{usd(r.revenue)}</td>
                  <td className="py-2.5 text-right text-neutral-700">{r.margin.toFixed(1)}%</td>
                  <td className="py-2.5"><Badge tone={tone[r.status]}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50" data-testid="paginate-prev"><ChevronLeft size={14} /> Prev</button>
          <span className="text-xs text-neutral-500">Page 1 of 4</span>
          <button className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50" data-testid="paginate-next">Next <ChevronRight size={14} /></button>
        </div>
      </Card>
    </Page>
  );
}
