import { useMemo, useState } from 'react';
import { Activity, ArrowRight, Download, Eye, Layers, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

type FieldOption = { key: string; name: string; samples: [string, string][] };
type ConnectionOption = { id: string; label: string; account: string; fields: FieldOption[] };

const connections: ConnectionOption[] = [
  {
    id: 'shopify', label: 'Shopify store', account: 'Goorin Shopify', fields: [
      { key: 'avalara.taxcode', name: 'Avalara Tax Code', samples: [['PC040100', 'PC040200'], ['PC040107', 'PC040108']] },
      { key: 'inventory.available', name: 'Inventory Available', samples: [['12', '9'], ['48', '52'], ['3', '0']] },
      { key: 'variant.price', name: 'Price', samples: [['$48.00', '$52.00'], ['$65.00', '$59.00']] },
      { key: 'product.tags', name: 'Tags', samples: [['spring, wool', 'spring, wool, sale'], ['classic', 'classic, limited']] },
      { key: 'product.status', name: 'Product Status', samples: [['draft', 'active'], ['active', 'archived']] },
    ],
  },
  {
    id: 'fulfil', label: 'Fulfil.io', account: 'Goorin Fulfil.io', fields: [
      { key: 'item.cost', name: 'Item Cost', samples: [['$18.40', '$19.10'], ['$22.00', '$21.25']] },
      { key: 'item.barcode', name: 'Barcode', samples: [['0400000123', '0400000456']] },
      { key: 'item.weight', name: 'Weight', samples: [['180g', '176g'], ['210g', '205g']] },
    ],
  },
  {
    id: 'extensiv', label: 'Extensiv', account: 'I3PL - DTC', fields: [
      { key: 'sku.location', name: 'Bin Location', samples: [['A-12-3', 'B-04-1'], ['C-01-2', 'C-01-5']] },
      { key: 'sku.qty', name: 'On-hand Qty', samples: [['120', '96'], ['40', '55']] },
    ],
  },
];

const productPool: { sku: string; product: string }[] = [
  { sku: 'GH-1001', product: 'Classic Wool Cap' },
  { sku: 'GH-2043', product: 'Waxed Trucker' },
  { sku: 'GH-3320', product: 'Linen Boater' },
  { sku: 'GH-4102', product: 'Corduroy Ivy' },
  { sku: 'GH-5518', product: 'Suede Fedora' },
  { sku: 'GH-6207', product: 'Cotton Bucket' },
];

type Watch = {
  id: string;
  fieldName: string;
  fieldKey: string;
  account: string;
  checkEvery: number;
  active: boolean;
  items: number;
  changes: number;
  lastChecked: string | null;
  baseline: boolean;
};

type ChangeRecord = {
  id: string;
  sku: string;
  product: string;
  fieldName: string;
  before: string;
  after: string;
  when: string;
};

let idSeed = 0;
const nextId = () => `fw${++idSeed}`;

export default function FieldWatchPage() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [history, setHistory] = useState<ChangeRecord[]>([]);
  const [adding, setAdding] = useState(false);
  const [formConn, setFormConn] = useState('');
  const [formField, setFormField] = useState('');
  const [formEvery, setFormEvery] = useState(15);
  const [historySearch, setHistorySearch] = useState('');

  const selectedConn = connections.find((c) => c.id === formConn) ?? null;
  const canAdd = Boolean(formConn && formField);

  const resetForm = () => { setFormConn(''); setFormField(''); setFormEvery(15); };

  const closeForm = () => { setAdding(false); resetForm(); };

  const addWatch = () => {
    if (!selectedConn) return;
    const field = selectedConn.fields.find((f) => f.key === formField);
    if (!field) return;
    setWatches((prev) => [
      { id: nextId(), fieldName: field.name, fieldKey: field.key, account: selectedConn.account, checkEvery: formEvery, active: true, items: 0, changes: 0, lastChecked: null, baseline: false },
      ...prev,
    ]);
    closeForm();
  };

  const toggleWatch = (id: string) => setWatches((prev) => prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)));

  const setEvery = (id: string, value: number) => setWatches((prev) => prev.map((w) => (w.id === id ? { ...w, checkEvery: Math.max(1, value) } : w)));

  const removeWatch = (id: string) => setWatches((prev) => prev.filter((w) => w.id !== id));

  const checkNow = (id: string) => {
    const watch = watches.find((w) => w.id === id);
    if (!watch) return;
    const conn = connections.find((c) => c.account === watch.account);
    const field = conn?.fields.find((f) => f.key === watch.fieldKey);

    if (!watch.baseline) {
      const items = 60 + Math.floor(Math.random() * 180);
      setWatches((prev) => prev.map((w) => (w.id === id ? { ...w, baseline: true, items, lastChecked: 'just now' } : w)));
      return;
    }

    const count = 1 + Math.floor(Math.random() * 2);
    const newRecords: ChangeRecord[] = [];
    for (let i = 0; i < count; i++) {
      const p = productPool[Math.floor(Math.random() * productPool.length)];
      const sample = field?.samples[Math.floor(Math.random() * (field.samples.length || 1))] ?? ['—', '—'];
      newRecords.push({ id: nextId(), sku: p.sku, product: p.product, fieldName: watch.fieldName, before: sample[0], after: sample[1], when: 'just now' });
    }
    setHistory((prev) => [...newRecords, ...prev]);
    setWatches((prev) => prev.map((w) => (w.id === id ? { ...w, changes: w.changes + count, lastChecked: 'just now' } : w)));
  };

  const totalChanges = watches.reduce((sum, w) => sum + w.changes, 0);
  const totalItems = watches.reduce((sum, w) => sum + w.items, 0);
  const activeCount = watches.filter((w) => w.active).length;

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return history;
    return history.filter((r) => r.sku.toLowerCase().includes(q) || r.product.toLowerCase().includes(q));
  }, [history, historySearch]);

  return (
    <div className="fw-page">
      <div className="conn-heading">
        <div>
          <h1>Field Watch</h1>
          <p>Monitor specific fields and capture every change automatically.</p>
        </div>
        <div className="heading-actions">
          {!adding && <button className="primary-button" onClick={() => setAdding(true)}><Plus size={15} /> Add watch</button>}
        </div>
      </div>

      <div className="conn-stats">
        <div className="conn-stat"><div className="conn-stat-head"><Eye size={15} /><span>Watched fields</span></div><strong>{watches.length}</strong><p>{activeCount} active</p></div>
        <div className="conn-stat"><div className="conn-stat-head"><Layers size={15} /><span>Items tracked</span></div><strong>{totalItems.toLocaleString()}</strong><p>Across all watches</p></div>
        <div className="conn-stat"><div className="conn-stat-head"><Activity size={15} /><span>Changes recorded</span></div><strong>{totalChanges}</strong><p>Since watching began</p></div>
      </div>

      <section className="fw-card">
        <div className="fw-card-head">
          <div>
            <h2>Watched fields</h2>
            {watches.length > 0 && <p className="fw-subhead">{watches.length} {watches.length === 1 ? 'field' : 'fields'} &middot; {totalChanges} {totalChanges === 1 ? 'change' : 'changes'} recorded</p>}
          </div>
        </div>

        {adding && (
          <div className="fw-form">
            <label className="fw-field">
              <span>Connection</span>
              <div className="fw-select-wrap">
                <select value={formConn} onChange={(e) => { setFormConn(e.target.value); setFormField(''); }}>
                  <option value="">Select a connection</option>
                  {connections.map((c) => <option key={c.id} value={c.id}>{c.label} &middot; {c.account}</option>)}
                </select>
              </div>
            </label>
            <label className="fw-field">
              <span>Field</span>
              <div className="fw-select-wrap">
                <select value={formField} onChange={(e) => setFormField(e.target.value)} disabled={!selectedConn}>
                  <option value="">{selectedConn ? 'Select a field' : 'Pick a connection first'}</option>
                  {selectedConn?.fields.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
                </select>
              </div>
            </label>
            <label className="fw-field fw-field-narrow">
              <span>Check every (min)</span>
              <input type="number" min={1} value={formEvery} onChange={(e) => setFormEvery(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <div className="fw-form-actions">
              <button className="fw-add-btn" onClick={addWatch} disabled={!canAdd}><Plus size={16} /> Watch field</button>
              <button className="fw-cancel" onClick={closeForm}>Cancel</button>
            </div>
          </div>
        )}

        {watches.length === 0 && !adding ? (
          <div className="fw-empty">
            <span className="fw-empty-icon"><Eye size={22} /></span>
            <strong>No watched fields yet</strong>
            <p>Track a specific field across a connected system and capture every change automatically.</p>
            <button className="primary-button" onClick={() => setAdding(true)}><Plus size={15} /> Add your first watch</button>
          </div>
        ) : watches.length > 0 ? (
          <div className="fw-table-wrap">
            <table className="fw-table">
              <thead><tr><th>Field</th><th className="fw-num">Items</th><th className="fw-num">Changes</th><th>Last checked</th><th className="fw-right">Settings</th></tr></thead>
              <tbody>
                {watches.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div className="fw-field-cell">
                        <strong>{w.fieldName}</strong>
                        <span><code>{w.fieldKey}</code> &middot; {w.account}</span>
                      </div>
                    </td>
                    <td className="fw-num">{w.items.toLocaleString()}</td>
                    <td className="fw-num">{w.changes}</td>
                    <td>
                      <div className="fw-last">
                        <span>{w.lastChecked ?? '\u2014'}</span>
                        {!w.baseline && <em>building baseline...</em>}
                      </div>
                    </td>
                    <td>
                      <div className="fw-settings">
                        <button className={`fw-toggle ${w.active ? 'on' : ''}`} onClick={() => toggleWatch(w.id)} aria-label="Toggle watch" aria-pressed={w.active} />
                        <div className="fw-every"><input type="number" min={1} value={w.checkEvery} onChange={(e) => setEvery(w.id, Number(e.target.value))} /><span>min</span></div>
                        <button className="fw-check" onClick={() => checkNow(w.id)}><RefreshCw size={14} /> Check now</button>
                        <button className="fw-del" onClick={() => removeWatch(w.id)} aria-label="Remove watch"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {watches.length > 0 && (
        <section className="fw-card">
          <div className="fw-card-head">
            <div>
              <h2>Change history</h2>
              <p className="fw-subhead">{history.length} {history.length === 1 ? 'change' : 'changes'}</p>
            </div>
            <div className="fw-history-actions">
              <label className="fw-search"><Search size={15} /><input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search by SKU or product..." /></label>
              <button className="fw-export"><Download size={15} /> Export</button>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="fw-empty">No changes recorded yet.</div>
          ) : filteredHistory.length === 0 ? (
            <div className="fw-empty">No changes match &ldquo;{historySearch}&rdquo;.</div>
          ) : (
            <div className="fw-table-wrap">
              <table className="fw-table">
                <thead><tr><th>Product</th><th>Field</th><th>Change</th><th className="fw-right">When</th></tr></thead>
                <tbody>
                  {filteredHistory.map((r) => (
                    <tr key={r.id}>
                      <td><div className="fw-field-cell"><strong>{r.product}</strong><span><code>{r.sku}</code></span></div></td>
                      <td>{r.fieldName}</td>
                      <td>
                        <div className="fw-change-vals">
                          <span className="fw-val before">{r.before}</span>
                          <ArrowRight className="fw-change-arrow" size={14} />
                          <span className="fw-val after">{r.after}</span>
                        </div>
                      </td>
                      <td className="fw-right fw-when">{r.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
