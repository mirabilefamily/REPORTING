import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Page, Kpi, Card, usdM, MONTHS } from './_shared';

const KPIS = [
  { label: 'Total Revenue', value: '$11.57M', delta: '−14.7%', tone: 'down' as const, sublabel: 'vs prior year' },
  { label: 'Units Sold', value: '312,480', delta: '−8.2%', tone: 'down' as const, sublabel: 'vs prior year' },
  { label: 'Avg Order Value', value: '$1,842', delta: '+3.1%', tone: 'up' as const, sublabel: 'vs prior year' },
  { label: 'Return Rate', value: '2.4%', delta: '−0.3 pts', tone: 'up' as const, sublabel: 'vs prior year' },
];

const REV_VS_LY = MONTHS.map((m, i) => {
  const cy = [980, 1_120, 890, 1_040, 1_180, 1_250, 1_310, 1_290, 940, 1_150, 1_380, 1_420][i] * 1000;
  const ly = [1_050, 1_180, 1_020, 1_140, 1_240, 1_390, 1_450, 1_360, 1_100, 1_310, 1_420, 1_500][i] * 1000;
  return { m, cy, ly };
});

const TOP_SKUS = [
  { sku: '101-0385', name: 'The GOAT', rev: 485_200 },
  { sku: '101-2449', name: 'Lone Wolf Trucker', rev: 412_800 },
  { sku: '101-0386', name: 'The Gorilla', rev: 386_400 },
  { sku: '101-2457', name: 'Black Sheep Trucker', rev: 341_900 },
  { sku: '101-1284', name: 'The Panther', rev: 298_500 },
  { sku: '101-1912', name: 'The Rooster', rev: 264_700 },
  { sku: '101-0442', name: 'Classic Fedora', rev: 231_200 },
  { sku: '101-3117', name: 'Bourbon Bucket', rev: 205_600 },
  { sku: '101-2814', name: 'Baseball Vintage', rev: 189_400 },
  { sku: '101-0917', name: 'Straw Panama', rev: 171_800 },
];

const CHANNELS = [
  { name: 'Wholesale', rev: 6_412_880, units: 158_320, share: 55.4 },
  { name: 'DTC', rev: 2_814_600, units: 82_140, share: 24.3 },
  { name: 'Amazon', rev: 1_356_900, units: 47_820, share: 11.7 },
  { name: 'Retail Partners', rev: 988_036, units: 24_200, share: 8.6 },
];

export default function AnalyticsPage() {
  return (
    <Page title="Analytics" subtitle="Cross-channel revenue, units and sell-through — last 12 months." testId="analytics-page">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => <Kpi key={k.label} {...k} deltaTone={k.tone} testId={`kpi-${k.label.toLowerCase().replace(/\s+/g, '-')}`} />)}
      </div>

      <Card title="Revenue vs Prior Year" description="Monthly invoiced revenue, current year (green) vs prior year (grey)." testId="chart-rev-vs-ly">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={REV_VS_LY} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef1ef" vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a938e' }} />
              <YAxis tickFormatter={usdM} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a3aaa5' }} width={60} />
              <Tooltip formatter={(v: number) => usdM(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Line type="monotone" dataKey="ly" stroke="#a3a3a3" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Prior Year" isAnimationActive={false} />
              <Line type="monotone" dataKey="cy" stroke="#0f8a66" strokeWidth={2.6} dot={false} activeDot={{ r: 4 }} name="Current Year" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Top 10 SKUs by Revenue" description="Year-to-date invoiced revenue." className="lg:col-span-2" testId="chart-top-skus">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOP_SKUS} margin={{ top: 8, right: 12, left: 0, bottom: 16 }}>
                <CartesianGrid stroke="#eef1ef" vertical={false} />
                <XAxis dataKey="sku" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8a938e' }} angle={-30} textAnchor="end" height={40} />
                <YAxis tickFormatter={usdM} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a3aaa5' }} width={60} />
                <Tooltip formatter={(v: number) => usdM(v)} labelFormatter={(l) => `SKU ${l}`} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="rev" fill="#0f8a66" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Channel Breakdown" description="Revenue share by channel." testId="table-channels">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="pb-2 font-semibold">Channel</th>
                <th className="pb-2 text-right font-semibold">Revenue</th>
                <th className="pb-2 text-right font-semibold">Share</th>
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map((c) => (
                <tr key={c.name} className="border-t border-neutral-100">
                  <td className="py-2.5">
                    <div className="font-medium text-neutral-800">{c.name}</div>
                    <div className="text-[11px] text-neutral-500">{c.units.toLocaleString('en-US')} units</div>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-neutral-900">{usdM(c.rev)}</td>
                  <td className="py-2.5 text-right text-neutral-600">{c.share.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </Page>
  );
}
