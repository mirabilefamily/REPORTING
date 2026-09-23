import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowLeft, ArrowUpDown, Filter, SlidersHorizontal, CalendarClock, Check, ChevronRight, CreditCard, Download, Ship, Factory, LayoutGrid, Truck, FileText, Folder, MessageSquare, MoreHorizontal, Pencil, Plus, Search, Send, Upload, X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { MultiSelect } from './MultiSelect';
import { IntlOpenOrders, OPEN_POS, daysOut, poUnits, poValue, type PO } from './IntlOpenOrders';
import './ops.css';
import './intlshipments.css';

type Status = 'draft' | 'ready' | 'instructions' | 'prepayment' | 'prepaid' | 'shipped' | 'invoiced';
const STEPS: { id: Status; label: string }[] = [
  { id: 'draft', label: 'Draft' }, { id: 'ready', label: 'Ready' }, { id: 'instructions', label: 'Shipping Instructions' },
  { id: 'prepayment', label: 'Pre-payment' }, { id: 'prepaid', label: 'Released' }, { id: 'shipped', label: 'Shipped' }, { id: 'invoiced', label: 'Invoiced' },
];
const STATUS_LABEL: Record<Status, string> = { draft: 'Draft', ready: 'Ready', instructions: 'Instructions', prepayment: 'Awaiting prepayment', prepaid: 'Prepaid', shipped: 'Shipped', invoiced: 'Invoiced' };
type Line = { sku: string; so: string; po: string; desc: string; qty: number; unit: number };
type Msg = { id: number; who: string; me?: boolean; text: string; at: string };
type Shipment = {
  id: string; customer: string; buyer: string; factory: string; factoryEmail: string; status: Status; created: string; ship: string;
  currency: string; incoterms: string; lines: Line[]; booking: { method: string; forwarder: string; contact: string; mode: string; submitted: string };
  prepay: number; bookingDocs?: string[]; activity: { title: string; detail?: string; at: string; by: string }[]; msgs: Msg[]; docs: string[]; packing: string;
};
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

const SEED: Shipment[] = [
  { id: 'IS-0012', customer: 'Mirabile Distribution', buyer: 'ryan.mirabile@me.com', factory: 'ASI Global Limited (China)', factoryEmail: 'ryan.mirabile@me.com', status: 'prepaid', created: '09-03-2026', ship: '01-06-2027', currency: 'USD', incoterms: 'FOB',
    lines: [{ sku: '101-0385-DEN01-O/S', so: 'SO58739', po: 'PO1299', desc: 'The GOAT', qty: 1, unit: 8.5 }, { sku: '101-0386-BLK01-O/S', so: 'SO58739', po: 'PO1299', desc: 'The Gorilla', qty: 1, unit: 8.5 }],
    booking: { method: 'Freight forwarder', forwarder: 'FF 123', contact: 'name@ff123.com · 3213444590 · USA', mode: 'Ocean', submitted: '09-03-2026, 12:48 AM' }, prepay: 8.5,
    activity: [
      { title: 'Customer message sent', detail: 'Customer replied in shipment chat', at: '09-11-2026, 3:29 AM', by: 'Ryan M' },
      { title: 'Status changed', detail: 'awaiting prepayment → prepaid — Prepayment received via Stripe — $8.50 USD', at: '09-03-2026, 12:49 AM', by: 'Stripe' },
      { title: 'Customer submitted booking', detail: 'Booking details submitted (ocean)', at: '09-03-2026, 12:48 AM', by: 'Ryan M' },
      { title: 'Packing list uploaded', detail: 'PL-PO1299-1.xlsx', at: '09-03-2026, 12:47 AM', by: 'Ryan Mirabile' },
      { title: 'Shipment created', at: '09-03-2026, 12:47 AM', by: 'Ryan Mirabile' },
    ],
    msgs: [{ id: 1, who: 'Ryan M', text: 'Booking confirmed with FF 123 — ocean, ETD mid-Dec.', at: '09-10-2026, 9:27 PM' }, { id: 2, who: 'Ryan Mirabile', me: true, text: 'Great — packing list is final. Releasing to factory once prepayment clears.', at: '09-10-2026, 9:31 PM' }, { id: 3, who: 'Ryan M', text: 'Prepayment sent via Stripe.', at: '09-11-2026, 3:28 AM' }],
    docs: ['Packing List (PDF)', 'Commercial Invoice (PDF)'], packing: 'PL-PO1299-1.xlsx' },
  { id: 'IS-0011', customer: 'SASAtrend', buyer: 'judith@sasatrend.com', factory: 'Hangzhou Headwear Co. (China)', factoryEmail: 'export@hzhw.cn', status: 'prepayment', created: '08-28-2026', ship: '12-12-2026', currency: 'USD', incoterms: 'FOB',
    lines: [{ sku: '101-9021-RED01-O/S', so: 'SO58702', po: 'PO1291', desc: 'Trailblazer', qty: 400, unit: 9.25 }, { sku: '101-7788-TAN01-O/S', so: 'SO58702', po: 'PO1291', desc: 'Coastal Snapback', qty: 300, unit: 8.9 }],
    booking: { method: 'Customer pickup', forwarder: '—', contact: '—', mode: 'Air', submitted: '—' }, prepay: 3182.5,
    activity: [{ title: 'Shipping instructions sent', detail: 'Awaiting prepayment', at: '08-29-2026, 10:02 AM', by: 'Ryan Mirabile' }, { title: 'Shipment created', at: '08-28-2026, 4:15 PM', by: 'Ryan Mirabile' }],
    msgs: [], docs: ['Packing List (PDF)'], packing: 'PL-PO1291-1.xlsx' },
  { id: 'IS-0010', customer: 'Industrias Mercury, S.A.', buyer: 'diego@mercury.com.es', factory: 'ASI Global Limited (China)', factoryEmail: 'ops@asiglobal.cn', status: 'shipped', created: '07-14-2026', ship: '09-02-2026', currency: 'USD', incoterms: 'CIF',
    lines: [{ sku: '101-6612-BLK01-O/S', so: 'SO58611', po: 'PO1270', desc: 'Wilderness Patch', qty: 1968, unit: 9.0 }],
    booking: { method: 'Freight forwarder', forwarder: 'Kuehne+Nagel', contact: 'madrid@kn.com · +34 91 000 000 · ES', mode: 'Ocean', submitted: '07-15-2026, 9:10 AM' }, prepay: 8856,
    activity: [{ title: 'Status changed', detail: 'released → shipped — BL received', at: '09-02-2026, 8:00 AM', by: 'Factory' }, { title: 'Shipment created', at: '07-14-2026, 11:20 AM', by: 'Ryan Mirabile' }],
    msgs: [{ id: 1, who: 'Diego R', text: 'Container departed Ningbo. Thanks!', at: '09-02-2026, 8:05 AM' }], docs: ['Packing List (PDF)', 'Commercial Invoice (PDF)', 'Bill of Lading (PDF)'], packing: 'PL-PO1270-1.xlsx' },
];

const OPEN_ORDERS = OPEN_POS.map((p) => ({ so: p.so, po: p.po, customer: p.customer, factory: p.factory, units: poUnits(p), value: poValue(p), due: p.shipDate }));
const FACTORIES = [
  { name: 'ASI Global Limited (China)', contact: 'ops@asiglobal.cn', region: 'Ningbo, CN', incoterms: 'FOB', lead: '45 days' },
  { name: 'Hangzhou Headwear Co. (China)', contact: 'export@hzhw.cn', region: 'Hangzhou, CN', incoterms: 'FOB', lead: '38 days' },
  { name: 'Tan Son Apparel (Vietnam)', contact: 'sales@tanson.vn', region: 'Ho Chi Minh City, VN', incoterms: 'CIF', lead: '52 days' },
];
const soTotal = (s: Shipment) => s.lines.reduce((a, l) => a + l.qty * l.unit, 0);
const poTotal = (s: Shipment) => Math.round(soTotal(s) * 0.4076 * 100) / 100;
const units = (s: Shipment) => s.lines.reduce((a, l) => a + l.qty, 0);
const stepIdx = (st: Status) => STEPS.findIndex((x) => x.id === st);
const DSTEPS = [{ id: 'draft', label: 'Draft' }, { id: 'ready', label: 'Ready' }, { id: 'booking', label: 'Booking & payment' }, { id: 'prepaid', label: 'Released' }, { id: 'shipped', label: 'Shipped' }, { id: 'invoiced', label: 'Invoiced' }];
const dStepIdx = (st: Status) => DSTEPS.findIndex((x) => x.id === (st === 'instructions' || st === 'prepayment' ? 'booking' : st));
const daysTo = (d: string) => { const [m, dd, y] = d.split('-').map(Number); if (!y) return null; return Math.ceil((new Date(y, m - 1, dd).getTime() - Date.now()) / 86_400_000); };

export default function IntlShipmentsPage() {
  const toast = useToast();
  const [list, setList] = useState<Shipment[]>(SEED);
  const [tab, setTab] = useState<'shipments' | 'orders'>('shipments');
  const [openId, setOpenId] = useState<string | null>(null);
  const [openTab, setOpenTab] = useState<DTab>('overview');
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('all');
  const [fCustomer, setFCustomer] = useState<Set<string>>(new Set());
  const [fFactory, setFFactory] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [factoriesOpen, setFactoriesOpen] = useState(false);
  const startFromOrder = (o: typeof OPEN_ORDERS[number]) => { setForm({ customer: o.customer, factory: o.factory, so: o.so, po: o.po, ship: o.due }); setCreating(true); };
  const [form, setForm] = useState({ customer: '', factory: '', so: '', po: '', ship: '' });
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [fMsg, setFMsg] = useState(false);
  const [sort, setSort] = useState<{ k: 'customer' | 'status' | 'ship' | 'units' | 'value'; d: 1 | -1 }>({ k: 'ship', d: 1 });
  const toggleSort = (k: typeof sort.k) => setSort((p) => p.k === k ? { k, d: p.d === 1 ? -1 : 1 } : { k, d: 1 });
  const [fQueue, setFQueue] = useState<'' | 'soon' | 'overdue' | 'nopack' | 'instr'>('');
  const dueSoon = (s: Shipment) => { const d = daysTo(s.ship); return d !== null && d >= 0 && d <= 30 && s.status !== 'shipped' && s.status !== 'invoiced'; };
  const isOverdue = (s: Shipment) => { const d = daysTo(s.ship); return d !== null && d < 0 && s.status !== 'shipped' && s.status !== 'invoiced'; };
  const noPack = (s: Shipment) => s.lines.length === 0 || s.packing === '—';
  const unanswered = (s: Shipment) => { const m = s.msgs[s.msgs.length - 1]; return !!m && !m.me && !ignored.has(`${s.id}:${m.id}`); };

  const rows = useMemo(() => list.filter((s) => {
    const t = q.trim().toLowerCase();
    if (t && ![s.id, s.customer, s.factory, ...s.lines.map((l) => l.so + l.po + l.sku)].join(' ').toLowerCase().includes(t)) return false;
    if (fStatus !== 'all' && s.status !== fStatus) return false;
    if (fMsg && !unanswered(s)) return false;
    if (fQueue === 'soon' && !dueSoon(s)) return false;
    if (fQueue === 'overdue' && !isOverdue(s)) return false;
    if (fQueue === 'nopack' && !noPack(s)) return false;
    if (fQueue === 'instr' && s.status !== 'ready' && s.status !== 'draft') return false;
    if (fCustomer.size && !fCustomer.has(s.customer)) return false;
    if (fFactory.size && !fFactory.has(s.factory)) return false;
    return true;
  }).sort((a, b) => { const v = (x: Shipment) => sort.k === 'customer' ? x.customer : sort.k === 'status' ? stepIdx(x.status) : sort.k === 'ship' ? (daysTo(x.ship) ?? 9999) : sort.k === 'units' ? units(x) : soTotal(x); const va = v(a), vb = v(b); return (va < vb ? -1 : va > vb ? 1 : 0) * sort.d; }), [list, q, fStatus, fCustomer, fFactory, fMsg, fQueue, ignored, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const attention = list.filter((s) => unanswered(s)).sort((a, b) => Date.parse(b.msgs[b.msgs.length - 1].at) - Date.parse(a.msgs[a.msgs.length - 1].at));
  const ignoreMsg = (s: Shipment) => { const m = s.msgs[s.msgs.length - 1]; setIgnored((x) => new Set(x).add(`${s.id}:${m.id}`)); toast(`Message alert dismissed for ${s.id}`); };
  const open = list.find((s) => s.id === openId);
  const update = (id: string, fn: (s: Shipment) => Shipment) => setList((l) => l.map((s) => (s.id === id ? fn(s) : s)));

  const create = () => {
    if (!form.customer || !form.factory) { toast('Customer and factory are required', 'error'); return; }
    const id = `IS-${String(13 + list.length - SEED.length).padStart(4, '0')}`;
    const now = new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const s: Shipment = { id, customer: form.customer, buyer: '—', factory: form.factory, factoryEmail: '—', status: 'draft', created: now.split(',')[0], ship: form.ship || 'TBD', currency: 'USD', incoterms: 'FOB',
      lines: form.so ? [{ sku: 'TBD', so: form.so, po: form.po || 'TBD', desc: 'Pending packing list', qty: OPEN_ORDERS.find((o) => o.so === form.so)?.units ?? 0, unit: (() => { const o = OPEN_ORDERS.find((x) => x.so === form.so); return o ? Math.round((o.value / o.units) * 100) / 100 : 0; })() }] : [], booking: { method: '—', forwarder: '—', contact: '—', mode: '—', submitted: '—' }, prepay: 0,
      activity: [{ title: 'Shipment created', at: now, by: 'Ryan Mirabile' }], msgs: [], docs: [], packing: '—' };
    setList((l) => [s, ...l]); setCreating(false); setForm({ customer: '', factory: '', so: '', po: '', ship: '' }); toast(`${id} created`); setOpenId(id);
  };

  if (open) return <Detail key={`${open.id}-${openTab}`} s={open} initialTab={openTab} onBack={() => { setOpenId(null); setOpenTab('overview'); }} update={(fn) => update(open.id, fn)} />;

  const customers = Array.from(new Set(list.map((s) => s.customer)));
  const factories = Array.from(new Set(list.map((s) => s.factory)));

  const active = list.filter((s) => s.status !== 'invoiced');
  const released = list.filter((s) => s.status === 'prepaid');
  const viewUnits = rows.reduce((a, s) => a + units(s), 0);
  const filtered = fStatus !== 'all' || fCustomer.size > 0 || fFactory.size > 0 || fMsg || !!fQueue || q;
  const dist = STEPS.map((st) => ({ ...st, n: list.filter((s) => s.status === st.id).length }));

  const prepayDue = list.filter((s) => s.status === 'prepayment');
  const late = list.filter(isOverdue);

  const stampNow = () => new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const setQueue = (k: typeof fQueue) => { setFQueue(fQueue === k ? '' : k); setFStatus('all'); setFMsg(false); };
  const nextUp = list.filter((s) => s.status !== 'shipped' && s.status !== 'invoiced' && daysTo(s.ship) !== null).sort((a, b) => daysTo(a.ship)! - daysTo(b.ship)!)[0];
  const needInstr = list.filter((s) => s.status === 'ready' || s.status === 'draft');
  const shipText = (s: Shipment) => {
    if (s.status === 'shipped' || s.status === 'invoiced') return { main: s.ship, sub: 'Shipped', tone: 'ok' };
    const d = daysTo(s.ship);
    if (d === null) return { main: 'TBD', sub: 'Ship date', tone: '' };
    if (d < 0) return { main: s.ship, sub: `${Math.abs(d)}d overdue`, tone: 'late' };
    return { main: s.ship, sub: `in ${d} days`, tone: d <= 14 ? 'soon' : '' };
  };


  return (
    <div className="is is-v10 is-v12" data-testid="intl-shipments-page">
      <section className="is-card is-ov" data-testid="is-priority-strip">
        <div className="is-ov-head" data-testid="is-modebar">
          <div className="ops-seg is-mode-seg" role="tablist">
            <button className={tab === 'shipments' ? 'active' : ''} onClick={() => setTab('shipments')} data-testid="is-tab-shipments">Shipments <b>{active.length}</b></button>
            <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')} data-testid="is-tab-orders">Open Orders <b>{OPEN_ORDERS.length}</b></button>
          </div>
          {tab === 'shipments' && <div className="is-ov-actions">
            <button className="ops-btn" onClick={() => setFactoriesOpen(true)} data-testid="is-factories"><Folder size={15} /> Factories</button>
            <button className="ops-btn" onClick={() => toast('Pipeline controls — stage rules, notifications and defaults coming soon')} data-testid="is-controls"><SlidersHorizontal size={15} /> Controls</button>
            <button className="ops-btn dark" onClick={() => setCreating(true)} data-testid="is-new-shipment"><Plus size={15} /> New Shipment</button>
          </div>}
        </div>
        {tab === 'shipments' ? (
        <div className="is-tiles">
          <button className={`is-tile ${!filtered ? 'on' : ''}`} onClick={() => { setFQueue(''); setFMsg(false); setFStatus('all'); setQ(''); setFCustomer(new Set()); setFFactory(new Set()); }} data-testid="is-kpi-all">
            <header><i className="ink"><Ship size={15} /></i><span>In pipeline</span><em className="is-tile-hint">{filtered ? 'Show all' : 'All'}</em></header>
            <strong>{active.length}<small>active</small></strong>
            <div className="is-tile-bar" aria-hidden="true">{dist.filter((d) => d.n > 0).map((d) => <b key={d.id} className={d.id} style={{ flex: d.n }} />)}</div>
            <small className="is-legend">{dist.filter((d) => d.n > 0).map((d) => <span key={d.id}><i className={`is-tile-dot ${d.id}`} />{d.n} {STATUS_LABEL[d.id].toLowerCase()}</span>)}</small>
            <ul className="is-tile-list">
              {nextUp && <li className="is-tile-next go" role="link" onClick={(e) => { e.stopPropagation(); setOpenId(nextUp.id); }} data-testid={`is-next-${nextUp.id}`}><CalendarClock size={12} /><span>Next ship · {nextUp.customer} · {nextUp.id}</span><b>{daysTo(nextUp.ship)}d</b></li>}
              {late.length > 0 && <li className="is-tile-late"><AlertTriangle size={12} /><span>{late.length} overdue · {late.map((s) => s.id).join(', ')}</span></li>}
            </ul>
          </button>
          <button className={`is-tile ${fMsg ? 'on' : ''}`} onClick={() => { setFQueue(''); setFStatus('all'); setFMsg((v) => !v); }} disabled={attention.length === 0} data-testid="is-attn-group-message">
            <header><i className="blue"><MessageSquare size={15} /></i><span>Messages</span><em className="is-tile-hint">{fMsg ? 'Focused' : 'Focus'}</em></header>
            <strong>{attention.length}<small>awaiting reply</small></strong>
            <ul className="is-tile-list">
              {attention.slice(0, 3).map((s) => { const m = s.msgs[s.msgs.length - 1]; return <li key={s.id} className="go" role="link" onClick={(e) => { e.stopPropagation(); setOpenTab('chat'); setOpenId(s.id); }} data-testid={`is-tile-msg-${s.id}`}><i className="is-mono-av xs">{mono(m.who)}</i><span><b>{m.who}</b> {m.text}</span><small>{s.id}</small></li>; })}
              {attention.length === 0 && <li className="is-tile-ok"><Check size={12} /><span>Inbox clear — every message answered</span></li>}
            </ul>
          </button>
          <button className={`is-tile ${fStatus === 'prepayment' ? 'on' : ''}`} onClick={() => { setFQueue(''); setFMsg(false); setFStatus(fStatus === 'prepayment' ? 'all' : 'prepayment'); }} disabled={prepayDue.length === 0} data-testid="is-kpi-released">
            <header><i className="amber"><CreditCard size={15} /></i><span>Needing payment</span><em className="is-tile-hint">{fStatus === 'prepayment' ? 'Focused' : 'Focus'}</em></header>
            <strong>{money(prepayDue.reduce((a, s) => a + s.prepay, 0))}<small>{prepayDue.length} shipment{prepayDue.length === 1 ? '' : 's'} due</small></strong>
            <ul className="is-tile-list">
              {prepayDue.slice(0, 3).map((s) => <li key={s.id} className="go" role="link" onClick={(e) => { e.stopPropagation(); setOpenId(s.id); }} data-testid={`is-tile-pay-${s.id}`}><i className="is-mono-av xs">{mono(s.customer)}</i><span><b>{s.customer}</b> {s.id}</span><small>{money(s.prepay)}</small></li>)}
              {prepayDue.length === 0 && <li className="is-tile-ok"><Check size={12} /><span>{money(released.reduce((a, s) => a + s.prepay, 0))} received · {released.length} released</span></li>}
            </ul>
          </button>
          <button className={`is-tile ${fQueue === 'instr' ? 'on' : ''}`} onClick={() => setQueue('instr')} data-testid="is-tile-instructions">
            <header><i className="violet"><Send size={15} /></i><span>Needs shipping instructions</span><em className="is-tile-hint">{fQueue === 'instr' ? 'Focused' : 'Focus'}</em></header>
            <strong>{needInstr.length}<small>shipment{needInstr.length === 1 ? '' : 's'} waiting</small></strong>
            <ul className="is-tile-list">
              {needInstr.slice(0, 3).map((s) => <li key={s.id} className="go" role="link" onClick={(e) => { e.stopPropagation(); setOpenId(s.id); }} data-testid={`is-tile-instr-${s.id}`}><i className="is-mono-av xs">{mono(s.customer)}</i><span><b>{s.customer}</b> {s.id}</span><small>{STATUS_LABEL[s.status]}</small></li>)}
              {needInstr.length === 0 && <li className="is-tile-ok"><Check size={12} /><span>All instructions sent</span></li>}
            </ul>
          </button>
        </div>
        ) : (() => {
            const oUnits = OPEN_POS.reduce((a, p) => a + poUnits(p), 0); const oValue = OPEN_POS.reduce((a, p) => a + poValue(p), 0);
            const due14 = OPEN_POS.filter((p) => daysOut(p.shipDate) <= 14); const lateOs = OPEN_POS.filter((p) => daysOut(p.shipDate) < 0);
            const gm = new Map<string, number>(); due14.forEach((p) => gm.set(`${p.customer}|${p.factory}`, (gm.get(`${p.customer}|${p.factory}`) ?? 0) + 1));
            const groups = Array.from(gm.values()).filter((n) => n > 1).length;
            return (
        <div className="is-tiles">
          <div className="is-tile static" data-testid="is-oo-kpi-open"><header><i className="ink"><FileText size={15} /></i><span>Open purchase orders</span></header><strong>{OPEN_POS.length}<small>{oUnits.toLocaleString()} units · {money(oValue)}</small></strong><small>Across {new Set(OPEN_POS.map((p) => p.factory)).size} factories · {new Set(OPEN_POS.map((p) => p.customer)).size} customers</small></div>
          <div className={`is-tile static ${lateOs.length ? 'alert' : ''}`} data-testid="is-oo-kpi-overdue"><header><i className={lateOs.length ? 'red' : 'violet'}><AlertTriangle size={15} /></i><span>Past ship date</span></header><strong>{lateOs.length}<small>overdue</small></strong><small>{lateOs.length ? lateOs.map((p) => p.po).join(', ') : 'All POs on schedule'}</small></div>
          <div className="is-tile static" data-testid="is-oo-kpi-due"><header><i className="amber"><CalendarClock size={15} /></i><span>Due within 14 days</span></header><strong>{due14.length}<small>{due14.reduce((a, p) => a + poUnits(p), 0).toLocaleString()} units to book</small></strong><small>{due14.length ? `Next: ${due14[0].customer} · ${due14[0].po}` : 'Nothing due soon'}</small></div>
          <div className="is-tile static" data-testid="is-oo-kpi-groups"><header><i className="blue"><Truck size={15} /></i><span>Consolidation</span></header><strong>{groups}<small>group{groups === 1 ? '' : 's'} suggested</small></strong><small>Same customer & factory · ship dates within 14 days</small></div>
        </div>
            ); })()}
      </section>

      {tab === 'orders' && (
        <IntlOpenOrders
          onCreate={(p: PO) => startFromOrder(OPEN_ORDERS.find((o) => o.po === p.po)!)}
          onCreateGroup={(g) => { const first = OPEN_ORDERS.find((o) => o.po === g.pos[0].po)!; setForm({ customer: g.customer, factory: g.factory, so: g.pos.map((p) => p.so).join(' + '), po: g.pos.map((p) => p.po).join(' + '), ship: first.due }); setCreating(true); toast(`Grouping ${g.pos.length} POs for ${g.customer}`); }}
        />
      )}

      {tab === 'shipments' && (
      <section className="is-card is-pipe" data-testid="is-board">
        <div className="is-pipe-top">
          <h2>Shipment pipeline <span className="is-muted">{rows.length} shown</span></h2>
          <div className="is-pipe-tools">
            <label className="is-search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shipment, customer, SO, PO…" data-testid="is-search" />{q && <button className="is-search-x" onClick={() => setQ('')} aria-label="Clear search"><X size={13} /></button>}</label>
          </div>
        </div>
        <div className="is-stages is-pills" role="tablist" data-testid="is-stages">
          <button className={`is-stage ${fStatus === 'all' && !fMsg && !fQueue ? 'on' : ''}`} onClick={() => { setFStatus('all'); setFMsg(false); setFQueue(''); }} data-testid="is-stage-all">All <b>{list.length}</b></button>
          {dist.map((d) => <button key={d.id} className={`is-stage ${fStatus === d.id ? 'on' : ''} ${d.n === 0 ? 'zero' : ''}`} onClick={() => { setFMsg(false); setFQueue(''); setFStatus(fStatus === d.id ? 'all' : d.id); }} data-testid={`is-stage-${d.id}`}>{STATUS_LABEL[d.id]} <b>{d.n}</b></button>)}
        </div>
        <div className="is-filters">
          <span className="is-flabel"><Filter size={14} /> Filters</span>
          <MultiSelect label="customers" testId="is-filter-customer" value={fCustomer} onChange={setFCustomer} options={customers.map((c) => ({ value: c, label: c, count: list.filter((s) => s.customer === c).length }))} />
          <MultiSelect label="factories" testId="is-filter-factory" value={fFactory} onChange={setFFactory} options={factories.map((c) => ({ value: c, label: c, count: list.filter((s) => s.factory === c).length }))} />
          <span className="is-fsep" />
          <button className={`is-fchip ${fQueue === 'instr' ? 'on' : ''} ${needInstr.length === 0 ? 'zero' : ''}`} onClick={() => setQueue('instr')} data-testid="is-stage-instr"><Send size={11} /> Missing instructions <b>{needInstr.length}</b></button>
          <button className={`is-fchip ${fMsg ? 'on' : ''} ${attention.length === 0 ? 'zero' : ''}`} onClick={() => { setFStatus('all'); setFQueue(''); setFMsg((v) => !v); }} data-testid="is-stage-msg"><MessageSquare size={11} /> Needs reply <b>{attention.length}</b></button>
          {filtered && <button className="is-clear" onClick={() => { setFStatus('all'); setFCustomer(new Set()); setFFactory(new Set()); setFMsg(false); setFQueue(''); setQ(''); }} data-testid="is-clear-filters"><X size={13} /> Clear</button>}
        </div>
        <div className="is-table" role="table">
          <div className="is-ptr is-pth">
            <button className={`is-sort ${sort.k === 'customer' ? 'on' : ''}`} onClick={() => toggleSort('customer')} data-testid="is-sort-customer">Shipment <ArrowUpDown size={11} /></button>
            <button className={`is-sort ${sort.k === 'status' ? 'on' : ''}`} onClick={() => toggleSort('status')} data-testid="is-sort-status">Stage <ArrowUpDown size={11} /></button>
            <span>Factory</span>
            <button className={`is-sort ${sort.k === 'value' ? 'on' : ''}`} onClick={() => toggleSort('value')} data-testid="is-sort-value">Orders & value <ArrowUpDown size={11} /></button>
            <button className={`is-sort ${sort.k === 'ship' ? 'on' : ''}`} onClick={() => toggleSort('ship')} data-testid="is-sort-ship">Shipping <ArrowUpDown size={11} /></button>
            <span />
          </div>
          {rows.map((s) => { const m = unanswered(s) ? s.msgs[s.msgs.length - 1] : null; const sh = shipText(s); const idx = stepIdx(s.status); return (
            <div key={s.id} className={`is-prow ${m ? 'has-msg' : ''}`} role="button" tabIndex={0} onClick={() => setOpenId(s.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(s.id)} data-testid={`is-row-${s.id}`}>
              <div className="is-ptr is-prow-main">
              <div className="is-pc-ship"><i className="is-mono-av">{mono(s.customer)}</i><div><strong>{s.customer}</strong><small><b className="is-id">{s.id}</b> · Created {s.created}</small></div></div>
              <div className="is-pc-stage"><em className={`is-status pill ${s.status}`}><i />{STATUS_LABEL[s.status]}</em><i className="is-prog">{STEPS.map((st, i) => <b key={st.id} className={i < idx ? 'd' : i === idx ? 'n' : ''} />)}</i></div>
              <div className="is-pc-fac"><strong>{s.factory}</strong><small>{s.incoterms} · {s.currency}{s.booking.mode !== '—' ? ` · ${s.booking.mode}` : ''}</small></div>
              <div className="is-pc-orders">
                <div><small>SO</small><code>{Array.from(new Set(s.lines.map((l) => l.so))).join(', ') || '—'}</code><b>{money(soTotal(s))}</b></div>
                <div><small>PO</small><code>{Array.from(new Set(s.lines.map((l) => l.po))).join(', ') || '—'}</code><b>{money(poTotal(s))}</b></div>
              </div>
              <div className="is-pc-shipping">
                <strong>{units(s).toLocaleString()} units <small>· {s.lines.length} line{s.lines.length === 1 ? '' : 's'}</small></strong>
                <span className={`is-ship ${sh.tone}`}>{sh.sub === 'Shipped' ? `Shipped · ${sh.main}` : sh.sub === 'Ship date' ? 'Ship date TBD' : `Ships ${sh.sub} · ${sh.main}`}</span>
              </div>
              <div className="is-pc-acts">
                <i className="is-chev" />
              </div>
            </div>
              {m && <div className="is-msgrow" data-testid={`is-attn-${s.id}`}>
                <i className="is-mono-av xs">{mono(m.who)}</i>
                <span className="is-msgrow-txt"><b>{m.who}</b> {m.text}<time>{m.at}</time></span>
                <span className="is-msgrow-acts"><button className="is-act primary" onClick={(e) => { e.stopPropagation(); setOpenTab('chat'); setOpenId(s.id); }} data-testid={`is-attn-reply-${s.id}`}><MessageSquare size={13} /> Reply</button><button className="is-act" onClick={(e) => { e.stopPropagation(); ignoreMsg(s); }} aria-label="Ignore" title="Dismiss — no reply needed" data-testid={`is-attn-ignore-${s.id}`}><Check size={14} /></button></span>
              </div>}
            </div>
          ); })}
          {rows.length === 0 && <div className="is-empty" data-testid="is-empty">No shipments match these filters.</div>}
        </div>
        <div className="is-foot" data-testid="is-footer"><span><b>{rows.length}</b> shipment{rows.length === 1 ? '' : 's'}</span><span>Units <b>{viewUnits.toLocaleString()}</b></span><span>SO total <b>{money(rows.reduce((a, s) => a + soTotal(s), 0))}</b></span><span>PO total <b>{money(rows.reduce((a, s) => a + poTotal(s), 0))}</b></span></div>
      </section>
      )}

      {factoriesOpen && (
        <>
          <div className="is-backdrop" onClick={() => setFactoriesOpen(false)} />
          <aside className="is-drawer" data-testid="is-factories-drawer">
            <div className="is-modal-head"><h2>Factories</h2><button className="is-x" onClick={() => setFactoriesOpen(false)} aria-label="Close"><X size={16} /></button></div>
            <small className="is-muted">Default partners for international shipments.</small>
            {FACTORIES.map((f) => (
              <div className="is-factory" key={f.name} data-testid="is-factory">
                <div><strong>{f.name}</strong><small>{f.region} · {f.contact}</small></div>
                <div className="is-factory-meta"><span>{f.incoterms}</span><span>Lead {f.lead}</span><span>{list.filter((x) => x.factory === f.name).length} shipments</span></div>
                <button className="is-btn sm" onClick={() => { setFactoriesOpen(false); setForm({ ...form, factory: f.name }); setCreating(true); }}>New shipment here</button>
              </div>
            ))}
          </aside>
        </>
      )}

      {creating && (
        <>
          <div className="is-backdrop" onClick={() => setCreating(false)} />
          <div className="is-modal" role="dialog" data-testid="is-create-modal">
            <div className="is-modal-head"><h2>New shipment</h2><button className="is-x" onClick={() => setCreating(false)} aria-label="Close"><X size={16} /></button></div>
            <label>Customer<input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="e.g. Mirabile Distribution" data-testid="is-form-customer" /></label>
            <label>Factory<input value={form.factory} onChange={(e) => setForm({ ...form, factory: e.target.value })} placeholder="e.g. ASI Global Limited (China)" data-testid="is-form-factory" /></label>
            <div className="is-form-row"><label>SO #<input value={form.so} onChange={(e) => setForm({ ...form, so: e.target.value })} placeholder="SO58740" data-testid="is-form-so" /></label><label>PO #<input value={form.po} onChange={(e) => setForm({ ...form, po: e.target.value })} placeholder="PO1300" /></label></div>
            <label>Target ship date<input value={form.ship} onChange={(e) => setForm({ ...form, ship: e.target.value })} placeholder="MM-DD-YYYY" /></label>
            <div className="is-modal-foot"><button className="is-btn" onClick={() => setCreating(false)}>Cancel</button><button className="is-btn dark" onClick={create} data-testid="is-form-submit"><Check size={15} /> Create shipment</button></div>
          </div>
        </>
      )}
    </div>
  );
}

const mono = (n: string) => { const w = n.split(/\s+/).filter((x) => /^[A-Za-z]/.test(x)); return (w.length > 1 ? w.slice(0, 2).map((x) => x[0]).join('') : (w[0] ?? '?').slice(0, 2)).toUpperCase(); };

type DTab = 'overview' | 'booking' | 'chat' | 'docs' | 'activity';
const fmtAt = (at: string) => { const m = at.match(/^(\d{2})-(\d{2})-(\d{4}),?\s*(.*)$/); if (!m) return at; const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])); return `${d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${m[4] ? `, ${m[4]}` : ''}`; };

function Detail({ s, onBack, update, initialTab = 'overview' }: { s: Shipment; onBack: () => void; update: (fn: (s: Shipment) => Shipment) => void; initialTab?: DTab }) {
  const toast = useToast();
  const [msg, setMsg] = useState('');
  const [menu, setMenu] = useState(false);
  const [dtab, setDtab] = useState<DTab>(initialTab);
  const idx = stepIdx(s.status);
  const total = soTotal(s);
  const stamp = () => new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const advance = () => {
    const next = STEPS[Math.min(idx + 1, STEPS.length - 1)].id;
    update((x) => ({ ...x, status: next, activity: [{ title: 'Status changed', detail: `${STATUS_LABEL[x.status].toLowerCase()} → ${STATUS_LABEL[next].toLowerCase()}`, at: stamp(), by: 'Ryan Mirabile' }, ...x.activity] }));
    toast(next === 'prepaid' ? 'Released to factory' : `Moved to ${STATUS_LABEL[next]}`);
  };
  const send = () => {
    const t = msg.trim(); if (!t) return;
    update((x) => ({ ...x, msgs: [...x.msgs, { id: Date.now(), who: 'Ryan Mirabile', me: true, text: t, at: stamp() }], activity: [{ title: 'Customer message sent', detail: t, at: stamp(), by: 'Ryan Mirabile' }, ...x.activity] }));
    setMsg('');
  };
  const cta = idx < STEPS.length - 1 ? (s.status === 'prepayment' ? 'Mark prepaid' : s.status === 'prepaid' ? 'Mark shipped' : s.status === 'shipped' ? 'Mark invoiced' : s.status === 'ready' ? 'Send instructions' : s.status === 'instructions' ? 'Request prepayment' : 'Mark ready') : null;
  const nextLabel = idx < STEPS.length - 1 ? STEPS[idx + 1].label : null;
  const didx = dStepIdx(s.status);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !menu) onBack(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onBack, menu]);
  const tabs = [
    { id: 'overview', label: 'Overview', Icon: LayoutGrid }, { id: 'booking', label: 'Booking & payment', Icon: Truck }, { id: 'chat', label: 'Conversation', Icon: MessageSquare, n: s.msgs.length },
    { id: 'docs', label: 'Documents', Icon: FileText, n: s.docs.length + (s.bookingDocs?.length ?? 0) }, { id: 'activity', label: 'Activity', Icon: Activity, n: s.activity.length },
  ] as const;

  return (
    <div className="is is-v12 is-detail" data-testid="intl-shipment-detail">
      <nav className="is-crumbs" aria-label="Breadcrumb">
        <button className="is-back" onClick={onBack} data-testid="is-back" title="Back (Esc)"><ArrowLeft size={16} /> Shipments</button>
      </nav>

      <section className="is-card is-dhero is-dhero--flat">
        <div className="is-dhero-top">
          <div className="is-dhero-id">
            <p className="is-kicker">International shipment · {s.id}</p>
            <div className="is-dtitle"><h1>{s.id}</h1><em className={`is-status ${s.status}`}><i />{STATUS_LABEL[s.status]}</em></div>
            <div className="is-dmeta"><span><Ship size={15} /> {s.factory}</span><i /><span>{s.customer}</span><i /><span>Created {fmtAt(s.created)}</span><i /><span>{s.booking.mode} · {s.incoterms}</span></div>
          </div>
          <div className="is-dactions">
            <button className="is-btn" onClick={() => setDtab('chat')} data-testid="is-hero-message"><MessageSquare size={15} /> Message customer</button>
            {cta ? <button className="is-btn dark" onClick={advance} data-testid="is-advance"><Check size={15} /> {cta}</button> : <button className="is-btn dark" onClick={() => toast('Downloading documents…')} data-testid="is-download-docs"><Download size={15} /> Download documents</button>}
            <div className="is-menu-wrap">
              <button className="is-btn is-icon" onClick={() => setMenu((v) => !v)} aria-label="More" data-testid="is-more"><MoreHorizontal size={16} /></button>
              {menu && (<><div className="is-backdrop clear" onClick={() => setMenu(false)} /><div className="is-menu" data-testid="is-more-menu">
                <button onClick={() => { setMenu(false); toast('Exporting shipment…'); }}><Download size={15} /> Export shipment</button>
                <button onClick={() => { setMenu(false); toast('Resent to customer'); }}><Send size={15} /> Resend latest to customer</button>
                <button onClick={() => { setMenu(false); toast('Resent to factory'); }}><Send size={15} /> Resend latest to factory</button>
                <button className="danger" onClick={() => { setMenu(false); toast('Shipment cancelled', 'error'); }}><X size={15} /> Cancel shipment</button>
              </div></>)}
            </div>
          </div>
        </div>
        <div className="is-dfacts is-dfacts--flat">
          <div><small>Est. ship date</small><strong>{s.ship}</strong><span className="is-fact-sub">{daysTo(s.ship) === null ? '—' : daysTo(s.ship)! < 0 ? `${Math.abs(daysTo(s.ship)!)} days ago` : `in ${daysTo(s.ship)} days`}</span></div>
          <div><small>Mode</small><strong>{s.booking.mode}</strong><span className="is-fact-sub">{s.booking.forwarder === '—' ? 'Forwarder TBD' : s.booking.forwarder}</span></div>
          <div><small>Incoterms</small><strong>{s.incoterms} · {s.currency}</strong><span className="is-fact-sub">Factory port</span></div>
          <div><small>Units</small><strong>{units(s).toLocaleString()}</strong><span className="is-fact-sub">{s.lines.length} line{s.lines.length === 1 ? '' : 's'}</span></div>
          <div><small>Declared value</small><strong>{money(total)}</strong><span className="is-fact-sub">Commercial invoice</span></div>
          <div><small>Prepayment</small><strong>{money(s.prepay)}</strong><span className={`is-fact-sub ${idx >= stepIdx('prepaid') ? 'g' : idx === stepIdx('prepayment') ? 'a' : ''}`}>{idx >= stepIdx('prepaid') ? 'Received · 50%' : idx === stepIdx('prepayment') ? 'Due · 50%' : 'Not yet due · 50%'}</span></div>
        </div>
        <ol className="is-steps is-steps--flat is-steps--6" data-testid="is-stepper">
          {DSTEPS.map((st, i) => {
            const cls = i < didx ? 'done' : i === didx ? 'now' : '';
            const sub = i < didx ? 'Done' : i > didx ? 'Upcoming' : st.id === 'booking' ? (s.status === 'instructions' ? '1 of 2 · Instructions' : '1 of 2 · Payment due') : 'In progress';
            return <li key={st.id} className={cls}><i>{i < didx ? <Check size={12} strokeWidth={3} /> : i + 1}</i><span>{st.label}</span><small>{sub}</small></li>;
          })}
        </ol>
        <div className="is-dfoot">
          <span>Stage {didx + 1} of {DSTEPS.length} · {Math.round(((didx + 1) / DSTEPS.length) * 100)}%</span>
          {nextLabel && <><i /><span><b className="is-next-tag">Next</b><strong>{didx < DSTEPS.length - 1 ? DSTEPS[didx + 1].label : nextLabel}</strong>{s.status === 'instructions' ? 'One item left: payment due.' : cta ? `${cta} when ready.` : ''}</span></>}
        </div>
      </section>

      <div className="is-dnav" role="tablist">
        {tabs.map((t) => <button key={t.id} role="tab" aria-selected={dtab === t.id} className={dtab === t.id ? 'active' : ''} onClick={() => setDtab(t.id)} data-testid={`is-dtab-${t.id}`}><t.Icon size={17} strokeWidth={1.9} />{t.label}{'n' in t && t.n > 0 && <b>{t.n}</b>}</button>)}
      </div>

      {dtab === 'overview' && (
        <div className="is-grid">
          <section className="is-card is-lines" data-testid="is-lines">
            <div className="is-card-head"><h2>Shipment lines</h2><div className="is-line-sum"><span><b>{s.lines.length}</b> lines</span><span><b>{units(s).toLocaleString()}</b> units</span><span><b>{money(total)}</b> value</span><small className="is-muted">· from packing list</small></div></div>
            <div className="is-ltable">
              <div className="is-ltr is-lth"><span>SKU</span><span>SO #</span><span>PO #</span><span>Description</span><span className="r">Qty</span><span className="r">Unit value</span></div>
              {s.lines.length === 0 && <div className="is-empty">No lines yet — upload a packing list.</div>}
              {s.lines.map((l) => <div className="is-ltr" key={l.sku + l.so}><code>{l.sku}</code><a href="#so" onClick={(e) => { e.preventDefault(); toast(`Open ${l.so}`); }}>{l.so}</a><a href="#po" onClick={(e) => { e.preventDefault(); toast(`Open ${l.po}`); }}>{l.po}</a><span>{l.desc}</span><span className="r">{l.qty}</span><span className="r">{money(l.unit)}</span></div>)}
              {s.lines.length > 0 && <div className="is-ltr is-ltotal"><span>Total</span><span /><span /><span /><span className="r">{units(s).toLocaleString()}</span><span className="r">{money(total)}</span></div>}
            </div>
          </section>
          <div className="is-col">
            <section className="is-card is-facts is-parties">
              <h2>Parties</h2>
              <div className="is-party"><i className="is-mono-av">{mono(s.customer)}</i><div><small>Customer</small><strong>{s.customer}</strong><button className="is-copy" onClick={() => { navigator.clipboard?.writeText(s.buyer); toast('Email copied'); }} data-testid="is-copy-buyer">{s.buyer}</button></div><button className="is-btn is-icon sm" onClick={() => { setDtab('chat'); }} aria-label="Message customer"><MessageSquare size={14} /></button></div>
              <div className="is-party"><i className="is-mono-av fac">{mono(s.factory)}</i><div><small>Factory</small><strong>{s.factory}</strong><button className="is-copy" onClick={() => { navigator.clipboard?.writeText(s.factoryEmail); toast('Email copied'); }}>{s.factoryEmail}</button></div><button className="is-btn is-icon sm" onClick={() => toast('Resent to factory')} aria-label="Email factory"><Send size={14} /></button></div>
              <p className="is-kicker is-kicker--pack">Packing list</p><button className="is-docbtn" onClick={() => toast('Downloading packing list')} data-testid="is-packing"><FileText size={15} /> {s.packing}<Download size={14} /></button>
            </section>
            <section className="is-card is-facts" data-testid="is-recent">
              <div className="is-card-head"><h2>Recent activity</h2><button className="is-link" onClick={() => setDtab('activity')}>View all</button></div>
              <ul className="is-recent">{s.activity.slice(0, 3).map((a, i) => <li key={i}><i /><div><strong>{a.title}</strong><small>{a.at} · {a.by}</small></div></li>)}</ul>
            </section>
          </div>
        </div>
      )}

      {dtab === 'booking' && (
        <div className="is-grid is-grid--even">
          <section className="is-card is-facts" data-testid="is-booking">
            <div className="is-card-head"><h2>Customer booking</h2><button className="is-link" onClick={() => toast('Edit booking')}><Pencil size={13} /> Edit</button></div>
            <div className="is-facts-row"><div><p className="is-kicker">Booking method</p><strong>{s.booking.method}</strong></div><div><p className="is-kicker">Transport mode</p><strong>{s.booking.mode}</strong></div></div>
            <p className="is-kicker">Freight forwarder</p><strong>{s.booking.forwarder}</strong><small>{s.booking.contact}</small>
            <p className="is-kicker">Submitted</p><strong>{s.booking.submitted}</strong>
            <div className="is-divider" />
            <div className="is-card-head"><p className="is-kicker">Booking / forwarder documents</p><label className="is-btn sm" data-testid="is-upload"><Upload size={14} /> Upload<input type="file" accept=".pdf,.png,.jpg,.jpeg" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 10 * 1024 * 1024) { toast('File exceeds 10MB', 'error'); return; } update((x) => ({ ...x, bookingDocs: [...(x.bookingDocs ?? []), f.name], activity: [{ title: 'Booking document uploaded', detail: f.name, at: stamp(), by: 'Ryan Mirabile' }, ...x.activity] })); toast(`${f.name} uploaded`); e.target.value = ''; }} /></label></div>
            <small>PDF, PNG, or JPEG · max 10MB per file. Documents remain private.</small>
            <div className="is-docs" data-testid="is-booking-docs">{(s.bookingDocs ?? []).map((d) => <button key={d} className="is-docbtn" onClick={() => toast(`Downloading ${d}`)}><FileText size={15} /> {d}<Download size={14} /></button>)}</div>
          </section>
          <section className="is-card is-facts">
            <div className="is-card-head"><h2>Prepayment</h2><em className={`is-status ${idx >= stepIdx('prepaid') ? 'prepaid' : idx === stepIdx('prepayment') ? 'prepayment' : 'draft'}`}><i />{idx >= stepIdx('prepaid') ? 'Received' : idx === stepIdx('prepayment') ? 'Awaiting' : 'Not requested'}</em></div>
            <div className="is-pay"><strong>{money(s.prepay)}</strong><span>50% of invoice value · terms 50% Prepay / 50% Net 60</span></div>
            <div className="is-paybar" aria-hidden="true"><i style={{ width: idx >= stepIdx('invoiced') ? '100%' : idx >= stepIdx('prepaid') ? '50%' : '0%' }} /></div>
            <div className="is-paylegend"><span><b>{money(idx >= stepIdx('prepaid') ? s.prepay : 0)}</b> paid</span><span><b>{money(total - (idx >= stepIdx('prepaid') ? s.prepay : 0))}</b> outstanding</span></div>
            <button className="is-btn sm" onClick={() => toast('Edit prepayment amount')}>Edit prepayment amount</button>
            <div className="is-note">
              Saving changes never sends an email. Resend only after the latest booking and payment details are correct.
              <div className="is-note-btns"><button className="is-btn sm" onClick={() => toast('Resent to customer')}><Send size={13} /> Resend latest to customer</button><button className="is-btn sm" onClick={() => toast('Resent to factory')}><Send size={13} /> Resend latest to factory</button></div>
              <small>Customer recipient: {s.buyer}. Factory recipients: {s.factoryEmail}.</small>
            </div>
          </section>
        </div>
      )}

      {dtab === 'chat' && (
        <section className="is-card is-chat is-chat2" data-testid="is-chat">
          <div className="is-chat-head">
            <span className="is-chip"><MessageSquare size={16} /></span>
            <div><strong>Conversation with {s.customer}</strong><small>{s.buyer} · visible in the customer portal</small></div>
            <div className="is-chat-meta">{s.msgs.length > 0 && !s.msgs[s.msgs.length - 1].me ? <em className="is-chat-badge">Awaiting your reply</em> : <em className="is-chat-badge ok"><Check size={12} /> Up to date</em>}<span className="is-muted">{s.msgs.length} message{s.msgs.length === 1 ? '' : 's'}</span></div>
          </div>
          <div className="is-msgs" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
            {s.msgs.length === 0 && <div className="is-chat-empty"><MessageSquare size={22} /><strong>No messages yet</strong><small>Start the conversation with {s.customer}. They'll see it in their portal.</small></div>}
            {s.msgs.map((m, i) => { const day = m.at.split(',')[0]; const prevDay = i > 0 ? s.msgs[i - 1].at.split(',')[0] : null; const sameAsPrev = i > 0 && s.msgs[i - 1].who === m.who && prevDay === day; return (
              <div key={m.id} className="is-msg-wrap">
                {day !== prevDay && <div className="is-day"><span>{fmtAt(day)}</span></div>}
                <div className={`is-msg ${m.me ? 'me' : ''} ${sameAsPrev ? 'cont' : ''}`} data-testid="is-msg">
                  <i className="is-mono-av xs">{m.me ? 'RM' : mono(m.who)}</i>
                  <div>
                    {!sameAsPrev && <small>{m.me ? 'You' : m.who}<time>{m.at.split(', ')[1] ?? ''}</time></small>}
                    <p>{m.text}</p>
                  </div>
                </div>
              </div>
            ); })}
          </div>
          <div className="is-compose-wrap">
            <div className="is-quick">
              {['Thanks — confirming receipt.', 'Prepayment received, releasing to factory.', 'Shipping instructions sent to the factory today.', 'Tracking will follow once the container departs.'].map((t) => <button key={t} className="is-quick-chip" onClick={() => setMsg(t)} data-testid="is-quick-reply">{t}</button>)}
            </div>
            <div className="is-compose">
              <i className="is-mono-av xs me">RM</i>
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`Message ${s.customer}…`} data-testid="is-msg-input" />
              <button className="is-btn dark" onClick={send} disabled={!msg.trim()} data-testid="is-msg-send"><Send size={15} /> Send</button>
            </div>
            <small className="is-muted">Enter to send · Shift + Enter for a new line · Customer typically replies within one business day</small>
          </div>
        </section>
      )}

      {dtab === 'docs' && (
        <div className="is-grid is-grid--even">
          <section className="is-card is-facts" data-testid="is-packing-card">
            <div className="is-card-head"><h2>Factory packing list</h2><span className="is-muted">source file</span></div>
            <div className="is-docrow">
              <button className="is-docbtn" onClick={() => toast('Downloading packing list')} data-testid="is-packing-download"><FileText size={15} /> {s.packing}<Download size={14} /></button>
              <label className="is-btn is-reupload" data-testid="is-packing-reupload"><Upload size={14} /> Re-upload<input type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; update((x) => ({ ...x, packing: f.name, activity: [{ title: 'Packing list re-uploaded', detail: `${f.name} replaces ${x.packing}`, at: stamp(), by: 'Ryan Mirabile' }, ...x.activity] })); toast(`Packing list replaced with ${f.name}`); e.target.value = ''; }} /></label>
            </div>
            <p className="is-dochint">Replacing the file re-parses lines, units and values. Previous versions stay in Activity.</p>
          </section>
          <section className="is-card is-facts" data-testid="is-docs">
            <h2>Generated documents</h2>
            <div className="is-docs">{s.docs.length === 0 && <small>No documents generated yet.</small>}{(s.bookingDocs ?? []).map((d) => <button key={d} className="is-docbtn" onClick={() => toast(`Downloading ${d}`)}><Upload size={15} /> {d}<Download size={14} /></button>)}{s.docs.map((d) => <button key={d} className="is-docbtn" onClick={() => toast(`Downloading ${d}`)}><FileText size={15} /> {d}<Download size={14} /></button>)}</div>
          </section>
        </div>
      )}

      {dtab === 'activity' && (
        <section className="is-card is-tl" data-testid="is-activity">
          <div className="is-card-head"><div><h2>Activity</h2><p className="is-muted">Everything that has happened on this shipment.</p></div><small className="is-muted">{s.activity.length} event{s.activity.length === 1 ? '' : 's'}</small></div>
          <ol className="is-tl-list">
            {s.activity.map((a, i) => { const t = a.title.toLowerCase(); const Icon = t.includes('prepay') || t.includes('payment') ? CreditCard : t.includes('instruction') || t.includes('booking') ? Truck : t.includes('message') ? MessageSquare : t.includes('upload') || t.includes('document') ? FileText : t.includes('status') ? Check : Ship; return (
              <li key={i} className={i === 0 ? 'latest' : ''}>
                <i><Icon size={18} strokeWidth={1.8} /></i>
                <div><strong>{a.title}</strong>{a.detail && <span>{a.detail}</span>}<small>{fmtAt(a.at)} · {a.by}</small></div>
              </li>
            ); })}
          </ol>
        </section>
      )}
    </div>
  );
}
