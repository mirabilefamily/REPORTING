import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Page, Card, Badge, usd } from './_shared';

type Goal = { title: string; target: string; current: string; pct: number; status: 'On Track' | 'At Risk' | 'Behind'; category: string };

const GOALS: Goal[] = [
  { title: 'FY Revenue', target: '$42.0M', current: '$28.4M', pct: 68, status: 'On Track', category: 'Revenue' },
  { title: 'Wholesale Bookings', target: '$18.0M', current: '$11.6M', pct: 64, status: 'On Track', category: 'Revenue' },
  { title: 'DTC Revenue', target: '$6.5M', current: '$3.8M', pct: 58, status: 'At Risk', category: 'Revenue' },
  { title: 'New Customers', target: '120', current: '78', pct: 65, status: 'On Track', category: 'Growth' },
  { title: 'Gross Margin ≥ 48%', target: '48.0%', current: '49.8%', pct: 100, status: 'On Track', category: 'Margin' },
  { title: 'International Expansion', target: '8 markets', current: '5 markets', pct: 62, status: 'At Risk', category: 'Growth' },
  { title: 'Inventory Turnover', target: '4.5x', current: '3.2x', pct: 71, status: 'At Risk', category: 'Ops' },
  { title: 'Return Rate ≤ 2%', target: '2.0%', current: '2.4%', pct: 45, status: 'Behind', category: 'Ops' },
];

const tone: Record<Goal['status'], 'green' | 'amber' | 'red'> = { 'On Track': 'green', 'At Risk': 'amber', 'Behind': 'red' };

export default function ForecastGoalsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Page
      title="Forecast Goals"
      subtitle="Track progress against FY 2026 targets across revenue, growth, margin and operations."
      testId="forecast-goals-page"
      actions={<button onClick={() => setDialogOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-neutral-700" data-testid="add-goal-btn"><Plus size={15} /> Add Goal</button>}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GOALS.map((g) => (
          <Card key={g.title} testId={`goal-${g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{g.category}</p>
                <h3 className="mt-0.5 text-base font-semibold text-neutral-900">{g.title}</h3>
              </div>
              <Badge tone={tone[g.status]}>{g.status}</Badge>
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-500">Current</p>
                <p className="mt-0.5 text-xl font-bold text-neutral-900">{g.current}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-neutral-500">Target</p>
                <p className="mt-0.5 text-sm font-semibold text-neutral-700">{g.target}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-800">{g.pct}%</span>
                <span className="text-neutral-500">attainment</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div className={`h-full rounded-full ${g.status === 'On Track' ? 'bg-emerald-500' : g.status === 'At Risk' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, g.pct)}%` }} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {dialogOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="add-goal-dialog">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Add a new goal</h2>
                  <p className="mt-0.5 text-xs text-neutral-500">This form is a preview — saving is not yet enabled.</p>
                </div>
                <button onClick={() => setDialogOpen(false)} aria-label="Close" className="rounded-lg p-1 hover:bg-neutral-100"><X size={18} /></button>
              </div>
              <form className="space-y-3 opacity-60 pointer-events-none">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Goal title
                  <input disabled className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="e.g. FY 2027 Revenue" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Category
                  <select disabled className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
                    <option>Revenue</option><option>Growth</option><option>Margin</option><option>Ops</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Target value
                  <input disabled className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="e.g. $50M" />
                </label>
                <button disabled className="w-full rounded-lg bg-neutral-300 px-4 py-2.5 text-sm font-semibold text-white">Save goal</button>
              </form>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
