import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Page, Kpi, Card, Badge } from './_shared';

const KPIS = [
  { label: 'SKUs Active', value: '184', sublabel: 'across 5 categories' },
  { label: 'Units on Hand', value: '52,830', delta: '−3.4% MoM', tone: 'down' as const, sublabel: 'incl. reserved' },
  { label: 'Units Reserved', value: '11,240', sublabel: 'against open orders' },
  { label: 'Weeks of Supply', value: '9.2 wk', delta: '+0.6 wk', tone: 'up' as const, sublabel: 'rolling 4-wk demand' },
];

type Row = { sku: string; name: string; category: 'Fedora' | 'Baseball' | 'Beanie' | 'Bucket' | 'Straw'; onHand: number; incoming: number; reserved: number; reorder: number };

const RAW: Row[] = [
  { sku: '101-0385', name: 'The GOAT', category: 'Baseball', onHand: 4820, incoming: 1200, reserved: 640, reorder: 800 },
  { sku: '101-0386', name: 'The Gorilla', category: 'Baseball', onHand: 2680, incoming: 800, reserved: 480, reorder: 700 },
  { sku: '101-2449', name: 'Lone Wolf Trucker', category: 'Baseball', onHand: 3910, incoming: 0, reserved: 720, reorder: 1000 },
  { sku: '101-2457', name: 'Black Sheep Trucker', category: 'Baseball', onHand: 2140, incoming: 500, reserved: 390, reorder: 800 },
  { sku: '101-1284', name: 'The Panther', category: 'Fedora', onHand: 1580, incoming: 300, reserved: 210, reorder: 500 },
  { sku: '101-1912', name: 'The Rooster', category: 'Fedora', onHand: 1240, incoming: 0, reserved: 180, reorder: 400 },
  { sku: '101-0442', name: 'Classic Fedora', category: 'Fedora', onHand: 3210, incoming: 800, reserved: 310, reorder: 700 },
  { sku: '101-2814', name: 'Baseball Vintage', category: 'Baseball', onHand: 1980, incoming: 400, reserved: 240, reorder: 600 },
  { sku: '101-3117', name: 'Bourbon Bucket', category: 'Bucket', onHand: 2120, incoming: 300, reserved: 190, reorder: 500 },
  { sku: '101-0917', name: 'Straw Panama', category: 'Straw', onHand: 640, incoming: 1200, reserved: 80, reorder: 800 },
  { sku: '101-4408', name: 'Farm Beanie', category: 'Beanie', onHand: 4180, incoming: 0, reserved: 520, reorder: 900 },
  { sku: '101-4412', name: 'Cable Beanie', category: 'Beanie', onHand: 2740, incoming: 400, reserved: 340, reorder: 700 },
  { sku: '101-4419', name: 'Fisherman Beanie', category: 'Beanie', onHand: 1120, incoming: 0, reserved: 260, reorder: 500 },
  { sku: '101-5210', name: 'Straw Wide-Brim', category: 'Straw', onHand: 380, incoming: 800, reserved: 70, reorder: 500 },
  { sku: '101-5240', name: 'Straw Boater', category: 'Straw', onHand: 1620, incoming: 0, reserved: 110, reorder: 400 },
  { sku: '101-3220', name: 'Canvas Bucket', category: 'Bucket', onHand: 3810, incoming: 500, reserved: 270, reorder: 700 },
  { sku: '101-3245', name: 'Reversible Bucket', category: 'Bucket', onHand: 2140, incoming: 0, reserved: 190, reorder: 500 },
  { sku: '101-1408', name: 'Wool Fedora', category: 'Fedora', onHand: 890, incoming: 300, reserved: 120, reorder: 400 },
  { sku: '101-2905', name: 'Trucker Pro', category: 'Baseball', onHand: 5010, incoming: 0, reserved: 810, reorder: 1200 },
  { sku: '101-2917', name: 'Trucker Classic', category: 'Baseball', onHand: 4320, incoming: 400, reserved: 690, reorder: 1000 },
  { sku: '101-4501', name: 'Ribbed Beanie', category: 'Beanie', onHand: 2810, incoming: 600, reserved: 380, reorder: 800 },
  { sku: '101-5301', name: 'Straw Cowboy', category: 'Straw', onHand: 470, incoming: 400, reserved: 90, reorder: 500 },
  { sku: '101-3280', name: 'Denim Bucket', category: 'Bucket', onHand: 1860, incoming: 200, reserved: 210, reorder: 400 },
  { sku: '101-1520', name: 'Felt Cattleman', category: 'Fedora', onHand: 720, incoming: 0, reserved: 130, reorder: 400 },
  { sku: '101-4600', name: 'Slouch Beanie', category: 'Beanie', onHand: 3220, incoming: 300, reserved: 410, reorder: 800 },
];

const status = (r: Row) => {
  const available = r.onHand - r.reserved;
  if (available <= 0) return { label: 'Out', tone: 'red' as const };
  if (available < r.reorder) return { label: 'Low', tone: 'amber' as const };
  return { label: 'OK', tone: 'green' as const };
};

const CATS = ['Fedora', 'Baseball', 'Beanie', 'Bucket', 'Straw'] as const;
const STACK = CATS.map((c) => {
  const rows = RAW.filter((r) => r.category === c);
  return {
    name: c,
    onHand: rows.reduce((s, r) => s + (r.onHand - r.reserved), 0),
    reserved: rows.reduce((s, r) => s + r.reserved, 0),
  };
});

export default function InventoryPage() {
  return (
    <Page title="Inventory" subtitle="Stock position across SKUs and categories, with reorder alerts." testId="inventory-page">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => <Kpi key={k.label} {...k} deltaTone={k.tone as any} testId={`kpi-${k.label.toLowerCase().replace(/\s+/g, '-')}`} />)}
      </div>

      <Card title="On hand vs reserved · by category" description="Stacked units across the 5 main categories." testId="chart-inventory-category">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={STACK} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef1ef" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a938e' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a3aaa5' }} width={44} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="onHand" stackId="s" fill="#0f8a66" radius={[0, 0, 0, 0]} name="On Hand" isAnimationActive={false} />
              <Bar dataKey="reserved" stackId="s" fill="#f59f00" radius={[6, 6, 0, 0]} name="Reserved" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="SKU inventory · all categories" description="Available = On Hand − Reserved. Status is triggered when Available falls below the reorder point." testId="table-inventory">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="pb-2 font-semibold">SKU</th>
                <th className="pb-2 font-semibold">Product</th>
                <th className="pb-2 font-semibold">Category</th>
                <th className="pb-2 text-right font-semibold">On Hand</th>
                <th className="pb-2 text-right font-semibold">Incoming</th>
                <th className="pb-2 text-right font-semibold">Reserved</th>
                <th className="pb-2 text-right font-semibold">Available</th>
                <th className="pb-2 text-right font-semibold">Reorder Pt.</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {RAW.map((r) => {
                const s = status(r);
                const available = r.onHand - r.reserved;
                return (
                  <tr key={r.sku} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="py-2 font-mono text-xs text-neutral-700">{r.sku}</td>
                    <td className="py-2 text-neutral-800">{r.name}</td>
                    <td className="py-2 text-neutral-600">{r.category}</td>
                    <td className="py-2 text-right text-neutral-800">{r.onHand.toLocaleString('en-US')}</td>
                    <td className="py-2 text-right text-neutral-600">{r.incoming.toLocaleString('en-US')}</td>
                    <td className="py-2 text-right text-neutral-600">{r.reserved.toLocaleString('en-US')}</td>
                    <td className="py-2 text-right font-semibold text-neutral-900">{available.toLocaleString('en-US')}</td>
                    <td className="py-2 text-right text-neutral-500">{r.reorder.toLocaleString('en-US')}</td>
                    <td className="py-2"><Badge tone={s.tone}>{s.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}
