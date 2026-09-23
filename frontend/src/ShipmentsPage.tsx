import { useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Download, FileText, Lock, MessageSquare, Pencil, Search, Send, Ship, X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { money } from '@/lib/money';
import { orders, type Order } from '@/lib/orders';
import { useBackable } from '@/lib/nav';
import { CountrySelect } from './CountrySelect';
import './marketplace.css';
import './dashboard.css';
import './prebook.css';
import './orders.css';
import './shipments.css';

type Shipment = { id: string; order: Order; created: string; stage: number; coo: boolean; incoterms: string; transport: string; forwarder: string; prepaidAt: string };
const stages = ['Draft', 'Ready', 'Shipping Instructions', 'Pre-payment', 'Released', 'Shipped', 'Invoiced'];
const shipments: Shipment[] = orders.filter((o) => o.shipment).map((o) => ({
  id: o.shipment!, order: o, created: o.date, coo: o.status !== 'Open',
  stage: o.status === 'Open' ? 4 : o.status === 'Shipped' ? 5 : 6,
  incoterms: 'FOB', transport: 'Ocean', forwarder: 'FF 123', prepaidAt: `${o.date} 12:49 AM`,
}));
const styleNames = ['The GOAT', 'The Gorilla', 'Lone Wolf', 'Black Sheep', 'The Panther', 'El Gallo', 'Crush', 'Floater', 'The Koala', 'The Deer Rack', 'Papa Core', 'The Cancelled Skull'];
const colors = ['BLK01', 'DEN01', 'WHT02', 'OLV01', 'NVY01', 'GRY02', 'GRN04', 'BIS01', 'VOI01', 'EDG01'];
type ShipLine = { sku: string; name: string; qty: number; price: number };
const shipLines = (s: Shipment): ShipLine[] => {
  if (s.order.status !== 'Open') return s.order.lines.map((l) => ({ sku: l.sku, name: l.name, qty: l.qty, price: l.price }));
  const seed = parseInt(s.id.replace(/\D/g, ''), 10) || 1;
  return Array.from({ length: 100 }, (_, i) => {
    const n = (i * 7 + seed) % styleNames.length;
    const c = (i * 3 + seed) % colors.length;
    return { sku: `101-${String(175 + ((i * 37 + seed * 11) % 2400)).padStart(4, '0')}-${colors[c]}-O/S`, name: styleNames[n], qty: 6 + ((i * 3 + seed) % 5) * 6, price: i % 4 === 0 ? 16 : 8.5 };
  });
};
const shipTotal = (s: Shipment) => shipLines(s).reduce((t, l) => t + l.qty * l.price, 0);
const shipUnits = (s: Shipment) => shipLines(s).reduce((t, l) => t + l.qty, 0);
const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const stageLabel = (s: Shipment) => (s.stage >= 6 ? 'Invoiced' : s.stage === 5 ? 'Shipped' : 'Prepaid');
const stageTone = (s: Shipment) => (s.stage >= 6 ? 'green' : s.stage === 5 ? 'teal' : 'blue');

function Detail({ s, onBack, coo, setCoo }: { s: Shipment; onBack: () => void; coo: boolean; setCoo: (v: boolean) => void }) {
  const notify = useToast();
  const [msgs, setMsgs] = useState<{ who: string; text: string; at: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [si, setSi] = useState({ method: 'Freight forwarder' as 'Freight forwarder' | 'Customer pickup', forwarder: s.forwarder, contact: 'Name', email: 'name@ff123.com', phone: '3213444590', country: 'United States', transport: s.transport, notes: '' });
  const [form, setForm] = useState(si);
  const [edit, setEdit] = useState(false);
  const [docs, setDocs] = useState<string[]>([]);
  const pickDocs = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.pdf,.png,.jpg,.jpeg'; inp.onchange = () => { const names = Array.from(inp.files ?? []).map((f) => f.name); if (names.length) { setDocs((d) => [...names, ...d]); notify(`${names.length} document${names.length === 1 ? '' : 's'} uploaded`); } }; inp.click(); };
  const send = () => { if (!draft.trim()) return; setMsgs((m) => [...m, { who: 'Ryan M', text: draft.trim(), at: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }]); setDraft(''); };
  const lines = shipLines(s);
  const total = shipTotal(s);
  const units = shipUnits(s);
  const eta = fmt(s.order.shipStart);
  const docsList = ['Packing List', 'Commercial Invoice', ...(coo ? ['Certificate of Origin'] : [])];
  return (
    <div className="sh sh--v2" data-testid="shipment-detail">
      <div className="sh-head">
        <button className="pb-back" onClick={onBack} data-testid="shipment-back"><ArrowLeft /> Shipments</button>
      </div>

      <section className="sh-hero" data-testid="shipment-hero">
        <div className="sh-hero-top">
          <div className="sh-hero-id">
            <p className="pb-eyebrow">Shipment · {s.order.id}</p>
            <h1><Ship /> {s.id} <span className={`dash-pill tone-${stageTone(s)}`}><i />{stageLabel(s)}</span></h1>
            <p className="sh-hero-sub">{s.order.factory} · {s.transport} · {s.incoterms} · Created {fmt(s.created)}</p>
          </div>
          <div className="sh-hero-stats">
            <div><small>Declared value</small><strong>{money(total)}</strong></div>
            <div><small>Lines · units</small><strong>{lines.length} <em>·</em> {units.toLocaleString()}</strong></div>
            <div><small>{s.order.estimated ? 'Est. ship' : 'Ship date'}</small><strong>{eta}</strong></div>
          </div>
        </div>
        <div className="sh-rail" data-testid="shipment-stages">
          <div className="sh-rail-head"><strong>{stages[s.stage]}</strong><span>Stage {s.stage + 1} of {stages.length}</span></div>
          <ol className="sh-rail-track">{stages.map((st, i) => <li key={st} className={i < s.stage ? 'done' : i === s.stage ? 'current' : ''}><i /><span>{st}</span></li>)}</ol>
        </div>
      </section>

      <div className="sh-grid sh-grid--v2">
        <div className="sh-col sh-main">
          <section className="sh-card sh-checklist" data-testid="shipment-requirements">
            <header><div><h2>Release requirements</h2><p>Both must be complete before the factory releases the shipment.</p></div><span className="stat-chip stat-chip--good"><CheckCircle2 /> 2 of 2 complete</span></header>
            <ul className="sh-checks">
              <li className="done"><i><Check /></i><div><strong>Payment</strong><span>Prepayment received {fmt(s.created)}, 12:49 AM</span></div><em>Complete</em></li>
              <li className="done"><i><Check /></i><div><strong>Shipping instructions</strong><span>{si.method} · {si.transport}{si.method === 'Freight forwarder' ? ` · ${si.forwarder}` : ''}</span></div><em>Complete</em></li>
            </ul>
            <p className="sh-lock"><Lock /> Requirements are locked. Your shipment is being prepared for release to the factory.</p>
          </section>

          <section className="od-lines sh-lines" data-testid="shipment-lines"><header><h2>Line items <span>· {s.id}</span></h2><span>{lines.length} lines · {units.toLocaleString()} units</span></header>
            <div className="dash-table-wrap sh-lines-scroll" data-testid="shipment-lines-scroll"><table className="dash-table od-table"><thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Order</th><th>Qty</th><th>Unit value</th><th className="r">Amount</th></tr></thead>
              <tbody>{lines.map((l, i) => <tr key={l.sku + i}><td className="sh-ln">{i + 1}</td><td className="mono">{l.sku}</td><td className="dash-td-id">{l.name}</td><td>{s.order.id}</td><td>{l.qty}</td><td>{money(l.price)}</td><td className="dash-td-total r">{money(l.qty * l.price)}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={4}>Declared value · {lines.length} lines</td><td>{units.toLocaleString()}</td><td /><td className="dash-td-total r" data-testid="shipment-subtotal">{money(total)}</td></tr></tfoot></table></div>
          </section>

          <section className="sh-card sh-chat" data-testid="shipment-chat">
            <header><MessageSquare /><div><h2>Shipment conversation</h2><p>Replies notify the Goorin Bros. team.</p></div></header>
            <div className="sh-msgs">
              {msgs.length === 0 ? <div className="sh-empty"><MessageSquare /><strong>No messages yet</strong><span>Questions about this shipment? Start the thread here.</span></div>
                : msgs.map((m, i) => <div key={i} className="sh-msg" data-testid={`chat-msg-${i}`}><b>{m.who}</b><span>{m.at}</span><p>{m.text}</p></div>)}
            </div>
            <div className="sh-compose"><span className="sh-avatar">RM</span><textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Write a message..." data-testid="chat-input" /><button className="co-primary" onClick={send} disabled={!draft.trim()} data-testid="chat-send"><Send /> Send</button></div>
            <small>Enter to send · Shift + Enter for a new line</small>
          </section>
        </div>

        <aside className="sh-col sh-side">
          <section className="sh-card"><h3>Documents</h3>
            <ul className="sh-docs">
              {docsList.map((d, i) => <li key={d}><button className="sh-doc" onClick={() => notify(`${d}.pdf downloading…`)} data-testid={`doc-${d.toLowerCase().replace(/\s+/g, '-')}`}><FileText /><span><b>{d}</b><small>PDF · {[184, 96, 72][i] ?? 80} KB</small></span><Download /></button></li>)}
            </ul>
            <button className="mk-btn sh-dlall" onClick={() => notify(`${docsList.length} documents downloading…`)} data-testid="docs-download-all"><Download /> Download all</button>
          </section>
          <section className="sh-card" data-testid="shipping-instructions">
            <div className="sh-sechead"><h3>Shipping instructions</h3>{!edit && <button className="co-edit" onClick={() => { setForm(si); setEdit(true); }} data-testid="si-edit"><Pencil /> Edit</button>}</div>
            {edit ? (
              <div className="co-form sh-form" data-testid="si-form">
                <label className="co-field"><span>Booking method</span><div className="co-segment">{(['Freight forwarder', 'Customer pickup'] as const).map((m) => <button key={m} type="button" className={form.method === m ? 'active' : ''} onClick={() => setForm({ ...form, method: m })} data-testid={`si-method-${m.split(' ')[0].toLowerCase()}`}>{m}</button>)}</div></label>
                {form.method === 'Freight forwarder' && <>
                  <div className="co-row"><label className="co-field"><span>Forwarder</span><input value={form.forwarder} onChange={(e) => setForm({ ...form, forwarder: e.target.value })} data-testid="si-forwarder" /></label><label className="co-field"><span>Contact name</span><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} data-testid="si-contact" /></label></div>
                  <div className="co-row"><label className="co-field"><span>Email</span><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="si-email" /></label><label className="co-field"><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="si-phone" /></label></div>
                </>}
                <div className="co-row"><label className="co-field"><span>Transport</span><select className="mk-select" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} data-testid="si-transport">{['Ocean', 'Air', 'Ground'].map((t) => <option key={t}>{t}</option>)}</select></label><CountrySelect value={form.country} onChange={(v) => setForm({ ...form, country: v })} testId="si-country" /></div>
                <label className="co-field"><span>Notes for the factory <em>(optional)</em></span><textarea className="co-input sh-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Carrier account #, pickup windows, labeling…" data-testid="si-notes" /></label>
                <div className="co-actions"><button className="co-secondary" onClick={() => setEdit(false)} data-testid="si-cancel">Cancel</button><button className="co-primary" disabled={form.method === 'Freight forwarder' && (!form.forwarder.trim() || !form.email.trim())} onClick={() => { setSi(form); setEdit(false); notify('Shipping instructions updated · factory notified'); }} data-testid="si-save">Save instructions</button></div>
              </div>
            ) : (
              <dl className="sh-facts"><div className="full"><dt>Booking method</dt><dd data-testid="si-method">{si.method}</dd></div>{si.method === 'Freight forwarder' && <div className="full"><dt>{si.forwarder}</dt><dd className="muted">{si.contact} · {si.email} · {si.phone} · {si.country}</dd></div>}<div><dt>Transport</dt><dd data-testid="si-transport-value">{si.transport}</dd></div><div><dt>Submitted</dt><dd>{fmt(s.created)}, 12:48 AM</dd></div>{si.notes && <div className="full"><dt>Notes</dt><dd className="muted">{si.notes}</dd></div>}</dl>
            )}
            <div className="sh-upload" onClick={pickDocs} data-testid="shipment-upload"><strong>Shipping labels &amp; documents</strong><span>Upload carrier labels or other shipping documents for the factory. PDF, PNG, and JPEG files are supported.</span>{docs.length > 0 && <ul className="sh-doclist" data-testid="uploaded-docs">{docs.map((d) => <li key={d}><FileText /> {d}</li>)}</ul>}</div>
          </section>
          <section className="sh-card sh-toggle"><div><strong>Require a Certificate of Origin</strong><span>Applies to new international shipments only.</span></div><button role="switch" aria-checked={coo} className={`sh-switch ${coo ? 'on' : ''}`} onClick={() => setCoo(!coo)} data-testid="coo-toggle-detail"><i /></button></section>
        </aside>
      </div>
    </div>
  );
}

export default function ShipmentsPage() {
  const notify = useToast();
  const [coo, setCoo] = useState(true);
  const [scope, setScope] = useState<'All' | 'Active' | 'Completed'>('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Shipment | null>(null);
  useBackable(!!open, () => setOpen(null));
  const list = useMemo(() => { const q = query.trim().toLowerCase(); return shipments.filter((s) => (scope === 'All' || (scope === 'Active' ? s.stage < 6 : s.stage >= 6)) && (!q || s.id.toLowerCase().includes(q) || s.order.id.toLowerCase().includes(q) || s.order.factory.toLowerCase().includes(q))); }, [scope, query]);
  const total = list.reduce((s, x) => s + shipTotal(x), 0);
  if (open) return <Detail s={open} onBack={() => setOpen(null)} coo={coo} setCoo={(v) => { setCoo(v); notify(v ? 'Certificate of Origin now required for new shipments' : 'Certificate of Origin requirement turned off'); }} />;
  return (
    <div className="ord" data-testid="shipments-page">
      <section className="sh-card sh-toggle"><div><strong>Require a Certificate of Origin for every shipment</strong><span>Applies to new international shipments only. Existing shipments are not altered.</span></div><button role="switch" aria-checked={coo} className={`sh-switch ${coo ? 'on' : ''}`} onClick={() => { setCoo(!coo); notify(!coo ? 'Certificate of Origin now required for new shipments' : 'Certificate of Origin requirement turned off'); }} data-testid="coo-toggle"><i /></button></section>
      <div className="ord-bar">
        <div className="dash-segment" role="tablist">{(['All', 'Active', 'Completed'] as const).map((s) => <button key={s} role="tab" aria-selected={scope === s} className={scope === s ? 'active' : ''} onClick={() => setScope(s)} data-testid={`shipments-scope-${s.toLowerCase()}`}>{s === 'All' ? 'All Shipments' : s}<em>{s === 'All' ? shipments.length : shipments.filter((x) => (s === 'Active' ? x.stage < 6 : x.stage >= 6)).length}</em></button>)}</div>
        <button className="mk-btn" onClick={() => { const rows = ['Shipment,SO,Factory,Est ship,Created,Lines,Value,Status', ...list.map((s) => [s.id, s.order.id, s.order.factory, s.order.shipStart, s.created, s.order.lines.length, shipTotal(s).toFixed(2), stageLabel(s)].join(','))]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = 'goorin-shipments.csv'; a.click(); }} data-testid="shipments-export"><Download /> Export</button>
      </div>
      <section className="dash-orders ord-card">
        <div className="dash-orders-tools ord-tools">
          <label className="dash-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by shipment #, SO, or factory…" data-testid="shipments-search" />{query && <button onClick={() => setQuery('')} aria-label="Clear"><X /></button>}</label>
          <div className="ord-summary"><span data-testid="shipments-count"><strong>{list.length}</strong> shipment{list.length === 1 ? '' : 's'}</span><i /><span>Total <strong>{money(total)}</strong></span></div>
        </div>
        <div className="dash-table-wrap"><table className="dash-table ord-table ord-table--ships">
          <thead><tr><th>Shipment</th><th>SO #(s)</th><th>Factory</th><th>Est. ship date</th><th>Created</th><th>Lines</th><th>Value</th><th>COO</th><th>Status</th><th /></tr></thead>
          <tbody>{list.map((s) => (
            <tr key={s.id} onClick={() => setOpen(s)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(s)} data-testid={`shipment-row-${s.id}`}>
              <td><div className="ord-id"><strong>{s.id}</strong><span>{s.transport} · {s.incoterms}</span></div></td><td className="dash-td-id">{s.order.id}</td><td className="muted">{s.order.factory}</td><td>{fmt(s.order.shipStart)}</td><td>{fmt(s.created)}</td><td>{shipLines(s).length}</td><td className="dash-td-total">{money(shipTotal(s))}</td>
              <td>{s.coo ? <span className="dash-pill tone-green"><Check /> On file</span> : <span className="muted">—</span>}</td><td><span className={`dash-pill tone-${stageTone(s)}`}><i />{stageLabel(s)}</span></td><td className="dash-td-chevron"><span className="sh-view">View details</span></td>
            </tr>
          ))}</tbody></table></div>
        {list.length === 0 && <div className="mk-empty ord-empty" data-testid="shipments-empty"><Ship /><strong>No shipments match</strong><span>Try another search or filter.</span><button onClick={() => { setQuery(''); setScope('All'); }}>Clear filters</button></div>}
      </section>
    </div>
  );
}
