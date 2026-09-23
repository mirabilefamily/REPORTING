import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown, Box, Calendar, ChevronRight, CreditCard, DollarSign, Download, FileText, LayoutList, Package, RotateCcw, Search, Truck, X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { money } from '@/lib/money';
import { useCart } from '@/lib/cart';
import { products } from '@/lib/products';
import { orders, orderTotal, orderUnits, type Order } from '@/lib/orders';
import { useBackable } from '@/lib/nav';
import './marketplace.css';
import './dashboard.css';
import './prebook.css';
import './orders.css';

const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const statusTone: Record<Order['status'], string> = { Open: 'blue', Invoiced: 'green', Shipped: 'teal', Delivered: 'green', Cancelled: 'grey' };
const payTone: Record<Order['payment'], string> = { 'Paid in full': 'green', 'Partially Paid': 'amber', 'Not invoiced': 'grey', Refunded: 'grey' };
const payments = ['All payments', 'Paid in full', 'Partially Paid', 'Not invoiced', 'Refunded'];
type Scope = 'All' | 'Open' | 'Invoiced';
type SortKey = 'id' | 'date' | 'ship' | 'total';

function Detail({ o, onBack }: { o: Order; onBack: () => void }) {
  const notify = useToast();
  const cart = useCart();
  const reorder = () => {
    let n = 0;
    o.lines.forEach((l) => { const p = products.find((x) => x.sku === l.sku || x.name === l.name); if (p) { cart.add(p, l.qty); n += l.qty; } });
    notify(n ? `${n} units from ${o.id} added to your cart` : 'These styles are no longer in the Marketplace', n ? 'success' : 'info');
  };
  const total = orderTotal(o);
  return (
    <div className="od" data-testid="order-detail">
      <div className="od-top">
        <button className="pb-back" onClick={onBack} data-testid="order-back"><ArrowLeft /> Back to orders</button>
        <div className="od-actions">
          <button className="od-btn od-btn--dark" onClick={reorder} data-testid="order-reorder"><RotateCcw /> Re-order</button>
          <button className="od-btn" onClick={() => notify(`Sales order ${o.id}.pdf downloading…`)} data-testid="order-so"><Download /> Sales order</button>
          <button className="od-btn" onClick={() => notify(o.payment === 'Not invoiced' ? 'No invoice issued yet for this order.' : `Invoice for ${o.id} downloading…`, o.payment === 'Not invoiced' ? 'info' : 'success')} data-testid="order-invoice"><Download /> Invoice</button>
        </div>
      </div>
      <section className="od-hero">
        <div className="od-hero-head">
          <div><p className="pb-eyebrow">Sales order</p><h1>{o.id}</h1><p className="od-sub">Placed {fmt(o.date)} · ref {o.ref} | {o.id} · {o.lines.length} lines · {orderUnits(o)} units</p></div>
          <span className={`dash-pill tone-${statusTone[o.status]}`}><i />{o.status}</span>
        </div>
        <div className="od-stats">
          <div><small>Order date <Calendar /></small><strong>{fmt(o.date)}</strong></div>
          <div><small>Ship window <Truck /></small><strong>{fmt(o.shipStart)} → {fmt(o.shipEnd)}</strong><span className={o.status === 'Cancelled' ? 'muted' : 'ok'}>{o.estimated ? 'Estimated' : o.status}</span></div>
          <div><small>Order value <DollarSign /></small><strong className="ok">{money(total)}</strong><span className="muted">USD</span></div>
          <div><small>Payment <CreditCard /></small><strong className={o.payment === 'Paid in full' ? 'ok' : ''}>{o.payment}</strong>{o.payment === 'Partially Paid' && <span className="muted">{money(total / 2)} due · Net 60</span>}</div>
        </div>
      </section>
      <section className="od-lines">
        <header><h2>Line items <span>{o.lines.length} items</span></h2><span>{orderUnits(o)} units</span></header>
        <div className="dash-table-wrap"><table className="dash-table od-table">
          <thead><tr><th /><th>SKU</th><th>Product</th><th>UPC</th><th>Qty</th><th>Unit price</th><th>MSRP</th><th>Factory</th><th className="r">Extended</th></tr></thead>
          <tbody>
            {o.lines.map((l) => (
              <tr key={l.sku}>
                <td><span className="od-thumb">{l.image ? <img src={l.image} alt="" /> : <Box />}</span></td>
                <td className="mono">{l.sku}</td><td className="dash-td-id">{l.name}</td><td className="mono muted">{l.upc}</td><td>{l.qty}</td><td>{money(l.price)}</td><td className="muted">{money(l.msrp)}</td><td>{o.factory}</td><td className="dash-td-total r">{money(l.qty * l.price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={7} /><td>Lines subtotal</td><td className="r">{money(total)}</td></tr><tr className="grand"><td colSpan={7} /><td>Order total</td><td className="r">{money(total)}</td></tr></tfoot>
        </table></div>
      </section>
    </div>
  );
}

export default function MyOrdersPage() {
  const [scope, setScope] = useState<Scope>('All');
  const [mode, setMode] = useState<'orders' | 'lines'>('orders');
  const [query, setQuery] = useState('');
  const [pay, setPay] = useState(payments[0]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const [open, setOpen] = useState<Order | null>(null);
  useBackable(!!open, () => setOpen(null));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const r = orders.filter((o) => (scope === 'All' || (scope === 'Open' ? o.status === 'Open' : o.status === 'Invoiced')) && (pay === payments[0] || o.payment === pay) && (!q || o.id.toLowerCase().includes(q) || o.ref.toLowerCase().includes(q) || o.lines.some((l) => l.sku.toLowerCase().includes(q) || l.name.toLowerCase().includes(q))));
    const v = (o: Order) => sort.key === 'id' ? o.id : sort.key === 'date' ? o.date : sort.key === 'ship' ? o.shipStart : orderTotal(o);
    return [...r].sort((a, b) => { const c = typeof v(a) === 'number' ? (v(a) as number) - (v(b) as number) : String(v(a)).localeCompare(String(v(b))); return sort.dir === 'asc' ? c : -c; });
  }, [scope, query, pay, sort]);

  const total = list.reduce((s, o) => s + orderTotal(o), 0);
  const lineRows = list.flatMap((o) => o.lines.map((l) => ({ o, l })));
  const toggle = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const Th = ({ k, label }: { k: SortKey; label: string }) => <th><button onClick={() => toggle(k)} className={sort.key === k ? 'sorted' : ''} data-testid={`orders-sort-${k}`}>{label}{sort.key === k ? (sort.dir === 'asc' ? <ArrowUp /> : <ArrowDown />) : <ArrowUpDown />}</button></th>;
  const exportCsv = () => {
    const rows = mode === 'orders' ? ['Order,Date,Ship,Status,Payment,Units,Total', ...list.map((o) => [o.id, o.date, o.shipStart, o.status, o.payment, orderUnits(o), orderTotal(o).toFixed(2)].join(','))] : ['Order,Date,SKU,Product,Qty,Unit,Amount', ...lineRows.map(({ o, l }) => [o.id, o.date, l.sku, l.name, l.qty, l.price.toFixed(2), (l.qty * l.price).toFixed(2)].join(','))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = `goorin-${mode}.csv`; a.click();
  };

  if (open) return <Detail o={open} onBack={() => setOpen(null)} />;

  return (
    <div className="ord" data-testid="orders-page">
      <div className="ord-bar">
        <div className="dash-segment" role="tablist">{(['All', 'Open', 'Invoiced'] as Scope[]).map((s) => <button key={s} role="tab" aria-selected={scope === s} className={scope === s ? 'active' : ''} onClick={() => setScope(s)} data-testid={`orders-scope-${s.toLowerCase()}`}>{s === 'All' ? 'All Orders' : s}<em>{s === 'All' ? orders.length : orders.filter((o) => o.status === s).length}</em></button>)}</div>
        <div className="dash-segment" role="tablist"><button role="tab" aria-selected={mode === 'orders'} className={mode === 'orders' ? 'active' : ''} onClick={() => setMode('orders')} data-testid="orders-mode-orders"><Package /> Orders</button><button role="tab" aria-selected={mode === 'lines'} className={mode === 'lines' ? 'active' : ''} onClick={() => setMode('lines')} data-testid="orders-mode-lines"><LayoutList /> Line Items</button></div>
        <button className="mk-btn" onClick={exportCsv} data-testid="orders-export"><Download /> Export</button>
      </div>
      <section className="dash-orders ord-card">
        <div className="dash-orders-tools ord-tools">
          <label className="dash-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === 'orders' ? 'Search by order #, reference…' : 'Search by order #, SKU, or product…'} data-testid="orders-search" />{query && <button onClick={() => setQuery('')} aria-label="Clear"><X /></button>}</label>
          <select className="mk-select" value={pay} onChange={(e) => setPay(e.target.value)} data-testid="orders-payment">{payments.map((p) => <option key={p}>{p}</option>)}</select>
          <div className="ord-summary"><span data-testid="orders-count"><strong>{mode === 'orders' ? list.length : lineRows.length}</strong> {mode === 'orders' ? 'orders' : 'line items'}</span><i /><span>Total <strong>{money(total)}</strong></span></div>
        </div>
        <div className="dash-table-wrap"><table className={`dash-table ord-table ${mode === 'orders' ? 'ord-table--orders' : 'ord-table--lines'}`}>
          {mode === 'orders' ? (
            <>
              <thead><tr><Th k="id" label="Order" /><Th k="date" label="Order date" /><Th k="ship" label="Est. ship date" /><th>Factory</th><th>Shipment</th><th>Status</th><th>Payment</th><th>Units</th><Th k="total" label="Total" /><th /></tr></thead>
              <tbody>{list.map((o) => (
                <tr key={o.id} onClick={() => setOpen(o)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(o)} data-testid={`order-row-${o.id}`}>
                  <td><div className="ord-id"><strong>{o.id}</strong><span>{o.ref} | {o.id}</span></div></td>
                  <td>{fmt(o.date)}</td><td>{o.estimated ? 'Est. ' : ''}{fmt(o.shipStart)}</td><td className="muted">{o.factory}</td>
                  <td>{o.shipment ? <span className="dash-pill tone-blue">{o.shipment}</span> : <span className="muted">—</span>}</td>
                  <td><span className={`dash-pill tone-${statusTone[o.status]}`}><i />{o.status}</span></td>
                  <td><span className={`dash-pill tone-${payTone[o.payment]}`}>{o.payment}</span></td>
                  <td>{orderUnits(o)}</td><td className="dash-td-total">{money(orderTotal(o))}</td><td className="dash-td-chevron"><ChevronRight /></td>
                </tr>
              ))}</tbody>
            </>
          ) : (
            <>
              <thead><tr><Th k="id" label="Order" /><Th k="date" label="Order date" /><th>Status</th><th>SKU</th><th>Product</th><Th k="ship" label="Est. ship date" /><th>Shipment</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
              <tbody>{lineRows.map(({ o, l }) => (
                <tr key={o.id + l.sku} onClick={() => setOpen(o)} data-testid={`line-row-${o.id}-${l.sku}`}>
                  <td className="dash-td-id">{o.id}</td><td>{fmt(o.date)}</td><td><span className={`dash-pill tone-${statusTone[o.status]}`}><i />{o.status}</span></td>
                  <td className="mono">{l.sku}</td><td><div className="ord-prod">{l.name}</div></td>
                  <td>{o.estimated ? 'Est. ' : ''}{fmt(o.shipStart)}</td><td>{o.shipment ? <span className="dash-pill tone-blue">{o.shipment}</span> : <span className="muted">—</span>}</td><td>{l.qty}</td><td>{money(l.price)}</td><td className="dash-td-total">{money(l.qty * l.price)}</td>
                </tr>
              ))}</tbody>
            </>
          )}
        </table></div>
        {list.length === 0 && <div className="mk-empty ord-empty" data-testid="orders-empty"><FileText /><strong>No orders match</strong><span>Try another search or clear the filters.</span><button onClick={() => { setQuery(''); setPay(payments[0]); setScope('All'); }}>Clear filters</button></div>}
      </section>
    </div>
  );
}
