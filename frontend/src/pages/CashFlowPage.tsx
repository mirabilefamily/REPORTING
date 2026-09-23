import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Page, Kpi, Card, usd, usdM, MONTHS } from './_shared';

const KPIS = [
  { label: 'Cash on Hand', value: '$8.42M', sublabel: 'As of Sep 21, 2026' },
  { label: 'Accounts Receivable', value: '$3.18M', delta: '−$180K WoW', tone: 'up' as const, sublabel: '31 days outstanding' },
  { label: 'Accounts Payable', value: '$2.04M', delta: '+$95K WoW', tone: 'down' as const, sublabel: '24 days outstanding' },
  { label: 'Runway', value: '14.6 mo', sublabel: 'at current burn' },
];

const MONTHLY = MONTHS.map((m, i) => {
  const inflow = [1_180, 1_340, 980, 1_260, 1_420, 1_580, 1_610, 1_380, 1_140, 1_290, 1_460, 1_540][i] * 1000;
  const outflow = [980, 1_080, 1_020, 1_140, 1_200, 1_280, 1_310, 1_190, 1_060, 1_140, 1_210, 1_280][i] * 1000;
  return { m, inflow, outflow: -outflow, net: inflow - outflow };
});

type FlowRow = { date: string; label: string; kind: 'inflow' | 'outflow'; amount: number };
const UPCOMING: FlowRow[] = [
  { date: 'Sep 25', label: 'Lids · SO58611 wire', kind: 'inflow', amount: 176_800 },
  { date: 'Sep 27', label: 'ASI Global Ltd · PO1291 deposit', kind: 'outflow', amount: 218_400 },
  { date: 'Sep 30', label: 'Nordstrom · Sep invoices net-30', kind: 'inflow', amount: 96_400 },
  { date: 'Oct 03', label: 'Payroll · Sep 2H', kind: 'outflow', amount: 342_100 },
  { date: 'Oct 05', label: 'DTC settlement (Stripe)', kind: 'inflow', amount: 84_600 },
  { date: 'Oct 08', label: 'Warehouse lease · Q4', kind: 'outflow', amount: 78_000 },
  { date: 'Oct 12', label: 'SASAtrend · IS-0011 balance', kind: 'inflow', amount: 214_700 },
  { date: 'Oct 15', label: 'Marketing spend · agency', kind: 'outflow', amount: 62_300 },
];

export default function CashFlowPage() {
  return (
    <Page title="Cash Flow" subtitle="Working capital, monthly cash movement and 30-day outlook." testId="cash-flow-page">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => <Kpi key={k.label} {...k} deltaTone={k.tone as any} testId={`kpi-${k.label.toLowerCase().replace(/[^a-z]/g, '-')}`} />)}
      </div>

      <Card title="Monthly cash in vs cash out" description="Positive bars are inflows; negative bars are outflows. The dashed line is net." testId="chart-cash-monthly">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef1ef" vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a938e' }} />
              <YAxis tickFormatter={(v) => usdM(Math.abs(v))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a3aaa5' }} width={60} />
              <Tooltip formatter={(v: number) => usdM(Math.abs(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <ReferenceLine y={0} stroke="#c5ccc8" />
              <Bar dataKey="inflow" fill="#0f8a66" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="outflow" fill="#f97066" radius={[0, 0, 6, 6]} isAnimationActive={false} />
              <Bar dataKey="net" fill="#3b6ef6" radius={[4, 4, 4, 4]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Next 30 days · inflows and outflows" description="Scheduled AR and AP activity." testId="table-cash-30d">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
              <th className="pb-2 font-semibold">Date</th>
              <th className="pb-2 font-semibold">Description</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {UPCOMING.map((r, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="py-2.5 text-neutral-700">{r.date}</td>
                <td className="py-2.5 text-neutral-800">{r.label}</td>
                <td className={`py-2.5 text-right font-semibold ${r.kind === 'inflow' ? 'text-emerald-600' : 'text-rose-600'}`}>{r.kind === 'inflow' ? '+' : '−'}{usd(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}
