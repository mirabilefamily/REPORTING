import { useMemo, useState } from 'react';
import { MultiSelect } from './MultiSelect';
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, ChevronDown, ChevronRight, Layers, Plus, Search, Sparkles, X } from 'lucide-react';

export type POLine = { sku: string; product: string; ordered: number; allocated: number; shipped: number };
export type PO = { po: string; so: string; soName: string; soRef: string; customer: string; factory: string; shipDate: string; unit: number; lines: POLine[] };

const L = (sku: string, product: string, ordered: number, allocated = 0, shipped = 0): POLine => ({ sku, product, ordered, allocated, shipped });
export const OPEN_POS: PO[] = [
  { po: 'P0159', so: 'S015625', soName: 'GRUPO FW26 01', soRef: 'SO0727141', customer: 'Grupo Gardea SA DE CV', factory: 'ASI Global Limited (China)', shipDate: '06-10-2026', unit: 8.9,
    lines: [L('101-3181-AMB01-O/S', 'Corduroy Boss', 144), L('101-3182-PAL01-O/S', 'Corduroy Tuff', 240), L('101-3183-RUS01-O/S', 'Corduroy Punk', 144), L('101-3184-SCO01-O/S', 'Corduroy Top Dog', 144), L('101-3185-GRO01-O/S', 'Corduroy Grit', 240), L('101-3187-VOI01-O/S', 'Corduroy Dope', 264), L('101-3197-CAM01-O/S', 'Camo Engraved Dog', 244), L('101-3198-CAM01-O/S', 'Camo Engraved Bear', 244), L('101-3667-CAM01-O/S', 'Camo Engraved Duck', 244), L('101-3670-CAM01-O/S', 'Camo Rocker Duck', 144), L('101-3152-DEN02-O/S', 'Denim Cuddly', 216), L('101-3703-DIG04-O/S', 'Digital Stallion', 312)] },
  { po: 'P0162', so: 'S015628', soName: 'MANHATTAN FW26 01', soRef: 'SO0727168', customer: 'Manhattan International Concepts Inc.', factory: 'ASI Global Limited (China)', shipDate: '06-10-2026', unit: 9.1,
    lines: [L('101-0385-DEN01-O/S', 'The GOAT', 480), L('101-0386-BLK01-O/S', 'The Gorilla', 360), L('101-6612-BLK01-O/S', 'Wilderness Patch', 264), L('101-9021-RED01-O/S', 'Trailblazer', 432), L('101-7788-TAN01-O/S', 'Coastal Snapback', 288)] },
  { po: 'P0164', so: 'S015630', soName: 'OWEAR FW26 01', soRef: 'SO0727176', customer: 'Owear', factory: 'ASI Global Limited (China)', shipDate: '06-10-2026', unit: 8.75,
    lines: [L('101-3181-AMB01-O/S', 'Corduroy Boss', 96), L('101-3197-CAM01-O/S', 'Camo Engraved Dog', 120), L('101-0385-DEN01-O/S', 'The GOAT', 144)] },
  { po: 'P0166', so: 'S015631', soName: 'OWEAR FW26 02', soRef: 'SO0727180', customer: 'Owear', factory: 'ASI Global Limited (China)', shipDate: '06-14-2026', unit: 8.75,
    lines: [L('101-3703-DIG04-O/S', 'Digital Stallion', 168), L('101-3152-DEN02-O/S', 'Denim Cuddly', 96)] },
  { po: 'P0171', so: 'S015640', soName: 'SASATREND FW26 01', soRef: 'SO0727201', customer: 'SASAtrend', factory: 'Hangzhou Headwear Co. (China)', shipDate: '06-18-2026', unit: 9.25,
    lines: [L('101-9021-RED01-O/S', 'Trailblazer', 400, 120), L('101-7788-TAN01-O/S', 'Coastal Snapback', 300, 60)] },
  { po: 'P0173', so: 'S015642', soName: 'SASATREND FW26 02', soRef: 'SO0727205', customer: 'SASAtrend', factory: 'Hangzhou Headwear Co. (China)', shipDate: '06-21-2026', unit: 9.25,
    lines: [L('101-6612-BLK01-O/S', 'Wilderness Patch', 240), L('101-3187-VOI01-O/S', 'Corduroy Dope', 120)] },
  { po: 'P0178', so: 'S015650', soName: 'LIDS FW26 01', soRef: 'SO0727230', customer: 'Lids', factory: 'Tan Son Apparel (Vietnam)', shipDate: '07-08-2026', unit: 8.4,
    lines: [L('101-0385-DEN01-O/S', 'The GOAT', 1200), L('101-0386-BLK01-O/S', 'The Gorilla', 960), L('101-3670-CAM01-O/S', 'Camo Rocker Duck', 720)] },
  { po: 'P0181', so: 'S015655', soName: 'BUCKLE FW26 01', soRef: 'SO0727244', customer: 'Buckle Inc., The', factory: 'Hangzhou Headwear Co. (China)', shipDate: '07-22-2026', unit: 9.0,
    lines: [L('101-9021-RED01-O/S', 'Trailblazer', 320), L('101-3198-CAM01-O/S', 'Camo Engraved Bear', 320)] },
];

export const poUnits = (p: PO) => p.lines.reduce((a, l) => a + l.ordered - l.shipped, 0);
export const poValue = (p: PO) => Math.round(poUnits(p) * p.unit);
const parse = (d: string) => { const [m, dd, y] = d.split('-').map(Number); return new Date(y, m - 1, dd).getTime(); };
const TODAY = parse('06-08-2026');
export const daysOut = (d: string) => Math.round((parse(d) - TODAY) / 86_400_000);

type SortKey = 'po' | 'customer' | 'factory' | 'shipDate' | 'units';
type Group = { key: string; customer: string; factory: string; pos: PO[] };

export function IntlOpenOrders({ onCreate, onCreateGroup }: { onCreate: (p: PO) => void; onCreateGroup: (g: Group) => void }) {
  const [q, setQ] = useState('');
  const [cust, setCust] = useState<Set<string>>(new Set());
  const [fac, setFac] = useState<Set<string>>(new Set());
  const [days, setDays] = useState(14);
  const [recOnly, setRecOnly] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: 'shipDate', d: 1 });
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [groupsOpen, setGroupsOpen] = useState(false);

  const customers = Array.from(new Set(OPEN_POS.map((p) => p.customer)));
  const factories = Array.from(new Set(OPEN_POS.map((p) => p.factory)));

  const groups = useMemo<Group[]>(() => {
    const m = new Map<string, Group>();
    OPEN_POS.filter((p) => daysOut(p.shipDate) <= days).forEach((p) => {
      const key = `${p.customer}|${p.factory}`;
      if (!m.has(key)) m.set(key, { key, customer: p.customer, factory: p.factory, pos: [] });
      m.get(key)!.pos.push(p);
    });
    return Array.from(m.values()).filter((g) => g.pos.length > 1);
  }, [days]);
  const groupOf = (p: PO) => groups.find((g) => g.pos.includes(p));

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = OPEN_POS.filter((p) => {
      if (t && ![p.po, p.so, p.soName, p.soRef, p.customer, p.factory].join(' ').toLowerCase().includes(t)) return false;
      if (cust.size && !cust.has(p.customer)) return false;
      if (fac.size && !fac.has(p.factory)) return false;
      if (recOnly && !groupOf(p)) return false;
      return true;
    });
    const v = (p: PO) => sort.k === 'units' ? poUnits(p) : sort.k === 'shipDate' ? parse(p.shipDate) : p[sort.k];
    return r.sort((a, b) => (v(a) > v(b) ? 1 : v(a) < v(b) ? -1 : 0) * sort.d);
  }, [q, cust, fac, recOnly, sort, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (po: string) => setOpen((s) => { const n = new Set(s); n.has(po) ? n.delete(po) : n.add(po); return n; });
  const allOpen = rows.length > 0 && rows.every((p) => open.has(p.po));
  const sortBtn = (k: SortKey, label: string) => (
    <button className={`is-sort ${sort.k === k ? 'on' : ''}`} onClick={() => setSort((s) => ({ k, d: s.k === k ? (s.d === 1 ? -1 : 1) : 1 }))} data-testid={`is-oo-sort-${k}`}>
      {label}{sort.k === k ? (sort.d === 1 ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} />}
    </button>
  );
  const totalUnits = rows.reduce((a, p) => a + poUnits(p), 0);

  return (
    <div className="is-oo" data-testid="is-open-orders">
      <section className="is-card is-oo-card">
      <div className="is-oo-bar">
        <label className="is-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search PO, SO, customer, factory…" data-testid="is-oo-search" />{q && <button className="is-search-x" onClick={() => setQ('')} aria-label="Clear"><X size={13} /></button>}</label>
        <MultiSelect label="Customers" testId="is-oo-customer" value={cust} onChange={setCust} options={customers.map((c) => ({ value: c, label: c, count: OPEN_POS.filter((p) => p.customer === c).length }))} />
        <MultiSelect label="Factories" testId="is-oo-factory" value={fac} onChange={setFac} options={factories.map((f) => ({ value: f, label: f, count: OPEN_POS.filter((p) => p.factory === f).length }))} />
        <div className="is-oo-spacer" />
        <label className="is-window" data-testid="is-oo-window"><CalendarDays size={15} /> Within <input type="number" min={1} max={120} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} /> days</label>
        <button className={`is-btn ${recOnly ? 'dark' : ''}`} onClick={() => setRecOnly((v) => !v)} data-testid="is-oo-rec-toggle"><Sparkles size={14} /> Recommended <b className="is-count">{groups.reduce((a, g) => a + g.pos.length, 0)}</b></button>
        <button className="is-link" onClick={() => setOpen(allOpen ? new Set() : new Set(rows.map((p) => p.po)))} data-testid="is-oo-expand-all">{allOpen ? 'Collapse all' : 'Expand all lines'}</button>
      </div>

      <div className={`is-groups ${groupsOpen ? 'open' : ''}`} data-testid="is-oo-groups">
        <button className="is-groups-head" onClick={() => setGroupsOpen((v) => !v)} data-testid="is-oo-groups-toggle">
          <span className="is-groups-ic"><Layers size={16} /></span>
          <div>
            <h2>Recommended order groups <b className="is-count g">{groups.length}</b></h2>
            <small className="is-muted">Same customer and factory with PO ship dates inside the next {days} days — consolidate into one shipment.</small>
          </div>
          <span className="is-groups-cta">{groupsOpen ? 'Collapse' : 'Expand'} <ChevronDown size={16} className="is-chev" /></span>
        </button>
        {groupsOpen && (
          <div className="is-groups-list">
            {groups.length === 0 && <p className="is-muted is-groups-empty">No groups inside this window. Widen the day range to find consolidation opportunities.</p>}
            {groups.map((g, i) => (
              <div key={g.key} className="is-group" data-testid={`is-oo-group-${i}`}>
                <span className="is-group-n">{i + 1}</span>
                <div className="is-group-main">
                  <strong>{g.customer}</strong>
                  <small className="is-muted">{g.factory} · {g.pos.map((p) => p.po).join(' + ')}</small>
                </div>
                <div className="is-group-stat"><strong>{g.pos.reduce((a, p) => a + poUnits(p), 0).toLocaleString()}</strong><small>units</small></div>
                <div className="is-group-stat"><strong>{g.pos.reduce((a, p) => a + p.lines.length, 0)}</strong><small>lines</small></div>
                <div className="is-group-stat"><strong>{g.pos.map((p) => p.shipDate).sort()[0]}</strong><small>earliest ship</small></div>
                <button className="is-btn sm dark" onClick={() => onCreateGroup(g)} data-testid={`is-oo-group-create-${i}`}><Plus size={14} /> Create grouped shipment</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="is-pipe-head"><h2>Open purchase orders <span className="is-muted">{rows.length} POs · {totalUnits.toLocaleString()} units remaining</span></h2></div>
        <div className="is-table is-oo-table">
          <div className="is-tr is-potr is-th"><span>{sortBtn('po', 'Purchase order')}</span><span>{sortBtn('customer', 'Customer')}</span><span>{sortBtn('factory', 'Factory')}</span><span>{sortBtn('shipDate', 'Ship date')}</span><span>Group with</span><span className="r">{sortBtn('units', 'Units')}</span><span /></div>
          {rows.length === 0 && <div className="is-empty">No open orders match these filters.</div>}
          {rows.map((p) => {
            const g = groupOf(p); const d = daysOut(p.shipDate); const isOpen = open.has(p.po);
            return (
              <div key={p.po} className={`is-po ${isOpen ? 'open' : ''}`} data-testid={`is-oo-row-${p.po}`}>
                <div className="is-tr is-potr is-row is-porow" onClick={() => toggle(p.po)}>
                  <span className="is-c1 is-po-id">
                    <i className="is-chev-btn">{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</i>
                    <span><b className="is-id">{p.po}</b><small title={`${p.so} · ${p.soName} (${p.soRef})`}><u>{p.so}</u> · {p.soName}</small></span>
                  </span>
                  <span className="is-c2"><strong>{p.customer}</strong></span>
                  <span className="is-c2"><span className="is-fac">{p.factory}</span></span>
                  <span className="is-c4 is-po-date"><em className={`is-ship ${d < 0 ? 'late' : d <= 14 ? 'soon' : ''}`}>{p.shipDate}</em><small>{d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Today' : `in ${d}d`}</small></span>
                  <span>{g ? <em className="is-rec"><Sparkles size={12} /> {g.pos.filter((x) => x !== p).map((x) => x.po).join(', ')}</em> : <span className="is-muted is-nomatch">—</span>}</span>
                  <span className="is-c4 r"><strong>{poUnits(p).toLocaleString()}</strong><small>{p.lines.length} lines</small></span>
                  <span className="r"><button className="is-btn sm is-po-cta" onClick={(e) => { e.stopPropagation(); onCreate(p); }} data-testid={`is-order-create-${p.po}`}><Plus size={14} /> Shipment</button></span>
                </div>
                {isOpen && (
                  <div className="is-lines" data-testid={`is-oo-lines-${p.po}`}>
                    <div className="is-ltr is-lth"><span>SKU</span><span>Product</span><span className="r">Ordered</span><span className="r">Allocated</span><span className="r">Shipped</span><span className="r">Remaining</span></div>
                    {p.lines.map((l) => (
                      <div key={l.sku} className="is-ltr"><span className="is-mono">{l.sku}</span><span>{l.product}</span><span className="r">{l.ordered}</span><span className={`r ${l.allocated ? 'has' : 'zero'}`}>{l.allocated}</span><span className={`r ${l.shipped ? 'has' : 'zero'}`}>{l.shipped}</span><span className="r"><b>{l.ordered - l.shipped}</b></span></div>
                    ))}
                    <div className="is-ltr is-ltot"><span /><span>{p.lines.length} lines</span><span className="r">{p.lines.reduce((a, l) => a + l.ordered, 0)}</span><span className="r">{p.lines.reduce((a, l) => a + l.allocated, 0)}</span><span className="r">{p.lines.reduce((a, l) => a + l.shipped, 0)}</span><span className="r"><b>{poUnits(p).toLocaleString()}</b></span></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
