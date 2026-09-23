import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { Page, Kpi, Card, Badge, usd, usdM } from './_shared';
import DateRangePicker from '../components/DateRangePicker';
import { usePageRange } from '../lib/pageRange';

const SERIES = [
  { m: 'Oct 25', actual: 1_040_000 },
  { m: 'Nov 25', actual: 1_180_000 },
  { m: 'Dec 25', actual: 1_320_000 },
  { m: 'Jan 26', actual: 980_000 },
  { m: 'Feb 26', actual: 1_120_000 },
  { m: 'Mar 26', actual: 890_000 },
  { m: 'Apr 26', actual: 1_040_000 },
  { m: 'May 26', actual: 1_180_000 },
  { m: 'Jun 26', actual: 1_250_000 },
  { m: 'Jul 26', actual: 1_310_000 },
  { m: 'Aug 26', actual: 1_290_000 },
  { m: 'Sep 26', actual: 940_000 },
  { m: 'Oct 26', forecast: 1_180_000 },
  { m: 'Nov 26', forecast: 1_420_000 },
  { m: 'Dec 26', forecast: 1_580_000 },
  { m: 'Jan 27', forecast: 1_060_000 },
  { m: 'Feb 27', forecast: 1_210_000 },
  { m: 'Mar 27', forecast: 980_000 },
];

const KPIS = [
  { label: 'FY Forecast', value: '$17.3M', sublabel: 'FY 2026' },
  { label: 'YTD Actual', value: '$11.57M', sublabel: 'through Sep 21' },
  { label: 'Variance', value: '−4.2%', delta: 'vs plan', tone: 'down' as const, sublabel: 'weighted average' },
];

const SEG = [
  { name: 'US Wholesale', forecast: 8_900_000, actual: 6_412_880 },
  { name: 'Distributors', forecast: 8_400_000, actual: 5_159_536 },
  { name: 'DTC', forecast: 2_600_000, actual: 1_814_600 },
  { name: 'Amazon', forecast: 1_400_000, actual: 986_900 },
];

export default function ForecastingPage() {
  const [range, setRange] = usePageRange('forecasting');
  const projStart = SERIES.findIndex((d) => d.forecast !== undefined);
  return (
    <Page title="Forecasting" subtitle="Actuals through the current period plus a 6-month projection." testId="forecasting-page" actions={<DateRangePicker value={range} onChange={setRange} testId="forecasting-range" />}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => <Kpi key={k.label} {...k} deltaTone={k.tone as any} testId={`kpi-${k.label.toLowerCase().replace(/\s+/g, '-')}`} />)}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5" data-testid="kpi-confidence">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Confidence</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-bold text-neutral-900">Medium</span>
            <Badge tone="amber">Medium</Badge>
          </div>
          <p className="mt-1 text-xs text-neutral-500">Distributor pipeline still soft.</p>
        </div>
      </div>

      <Card title="Actual vs forecast revenue" description="Solid line: actuals through Sep 2026. Dashed line: 6-month projection." testId="chart-forecast">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={SERIES} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef1ef" vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8a938e' }} interval={1} />
              <YAxis tickFormatter={usdM} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a3aaa5' }} width={60} />
              <Tooltip formatter={(v: number) => usdM(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <ReferenceLine x={SERIES[projStart - 1]?.m} stroke="#c5ccc8" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="actual" stroke="#0f8a66" strokeWidth={2.6} dot={false} name="Actual" isAnimationActive={false} />
              <Line type="monotone" dataKey="forecast" stroke="#3b6ef6" strokeWidth={2.4} strokeDasharray="6 4" dot={false} name="Forecast" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Segment-level forecast vs actual" description="Year-to-date, weighted by close probability." testId="table-forecast-segments">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
              <th className="pb-2 font-semibold">Segment</th>
              <th className="pb-2 text-right font-semibold">Forecast</th>
              <th className="pb-2 text-right font-semibold">Actual</th>
              <th className="pb-2 text-right font-semibold">Variance</th>
              <th className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {SEG.map((s) => {
              const variance = ((s.actual - s.forecast) / s.forecast) * 100;
              const tone = variance >= -5 ? 'green' : variance >= -15 ? 'amber' : 'red';
              return (
                <tr key={s.name} className="border-t border-neutral-100">
                  <td className="py-2.5 font-medium text-neutral-800">{s.name}</td>
                  <td className="py-2.5 text-right text-neutral-700">{usd(s.forecast)}</td>
                  <td className="py-2.5 text-right font-semibold text-neutral-900">{usd(s.actual)}</td>
                  <td className={`py-2.5 text-right font-semibold ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{variance >= 0 ? '+' : ''}{variance.toFixed(1)}%</td>
                  <td className="py-2.5"><Badge tone={tone as any}>{variance >= -5 ? 'On Track' : variance >= -15 ? 'At Risk' : 'Behind'}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}
