import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, FilePlus2, Pencil, RotateCcw, Trash2 } from 'lucide-react';

type ChangeKind = 'created' | 'updated' | 'deleted';

type ChangeValue = { text?: string; empty?: boolean; dropdown?: boolean };

type ActivityEntry = {
  id: string;
  kind: ChangeKind;
  flow: string[];
  user: string;
  when: string;
  field: string;
  before: ChangeValue;
  after: ChangeValue;
};

const entries: ActivityEntry[] = [
  { id: 'a1', kind: 'updated', flow: ['Airtable to Fulfil.io: Item Update'], user: 'rmirabile@goorin.com', when: '9 days ago', field: 'Schedule (cron)', before: { text: '0 6 * * *' }, after: { text: '0 * * * *' } },
  { id: 'a2', kind: 'updated', flow: ['Airtable to Fulfil.io: Item Update'], user: 'rmirabile@goorin.com', when: '29 days ago', field: 'Source query', before: { text: '4 fields', dropdown: true }, after: { text: '4 fields', dropdown: true } },
  { id: 'a3', kind: 'updated', flow: ['Fulfil Returns', 'Shopify Refunds'], user: 'rmirabile@goorin.com', when: '29 days ago', field: 'Alert on already-satisfied skips', before: { text: 'Yes' }, after: { text: 'No' } },
  { id: 'a4', kind: 'updated', flow: ['Fulfil Returns', 'Shopify Refunds'], user: 'rmirabile@goorin.com', when: '29 days ago', field: 'Loop exchange filter', before: { empty: true }, after: { text: '2 fields', dropdown: true } },
  { id: 'a5', kind: 'updated', flow: ['Fulfil Returns', 'Shopify Refunds'], user: 'rmirabile@goorin.com', when: '29 days ago', field: 'Schedule (cron)', before: { empty: true }, after: { text: '*/5 * * * *' } },
  { id: 'a6', kind: 'updated', flow: ['Fulfil Returns', 'Shopify Refunds'], user: 'rmirabile@goorin.com', when: '30 days ago', field: 'Schedule (cron)', before: { text: '*/5 * * * *' }, after: { empty: true } },
  { id: 'a7', kind: 'created', flow: ['Netsuite', 'Fulfil Inventory'], user: 'jordan@goorin.com', when: '34 days ago', field: 'Initial schedule', before: { empty: true }, after: { text: '0 */2 * * *' } },
  { id: 'a8', kind: 'deleted', flow: ['Legacy CSV Import'], user: 'jordan@goorin.com', when: '40 days ago', field: 'Flow status', before: { text: 'Enabled' }, after: { empty: true } },
];

const kindFilters: { id: 'all' | ChangeKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'created', label: 'Created' },
  { id: 'updated', label: 'Updated' },
  { id: 'deleted', label: 'Deleted' },
];

function flowLabel(flow: string[]) {
  return flow.join(' \u2192 ');
}

function ChangeVal({ v, side }: { v: ChangeValue; side: 'before' | 'after' }) {
  if (v.empty) return <span className="act-val-empty">empty</span>;
  return (
    <span className={`act-val ${side}`}>
      {v.text}
      {v.dropdown && <ChevronDown size={13} />}
    </span>
  );
}

export default function ActivityPage() {
  const [kind, setKind] = useState<'all' | ChangeKind>('all');
  const [flow, setFlow] = useState('all');

  const flowOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const e of entries) seen.add(flowLabel(e.flow));
    return Array.from(seen);
  }, []);

  const visible = useMemo(
    () => entries.filter((e) => (kind === 'all' || e.kind === kind) && (flow === 'all' || flowLabel(e.flow) === flow)),
    [kind, flow],
  );

  const counts = useMemo(() => ({
    created: entries.filter((e) => e.kind === 'created').length,
    updated: entries.filter((e) => e.kind === 'updated').length,
    deleted: entries.filter((e) => e.kind === 'deleted').length,
  }), []);

  return (
    <div className="act-page">
      <div className="conn-heading">
        <div>
          <h1>Activity</h1>
          <p>{entries.length} configuration {entries.length === 1 ? 'change' : 'changes'} across your flows.</p>
        </div>
      </div>

      <div className="conn-stats">
        <div className="conn-stat"><div className="conn-stat-head"><FilePlus2 size={15} /><span>Created</span></div><strong>{counts.created}</strong><p>New configurations</p></div>
        <div className="conn-stat"><div className="conn-stat-head"><Pencil size={15} /><span>Updated</span></div><strong>{counts.updated}</strong><p>Edited settings</p></div>
        <div className="conn-stat"><div className="conn-stat-head"><Trash2 size={15} /><span>Deleted</span></div><strong>{counts.deleted}</strong><p>Removed items</p></div>
      </div>

      <section className="act-card">
        <div className="act-toolbar">
          <div className="act-filters">
            {kindFilters.map((f) => (
              <button key={f.id} className={`act-filter ${kind === f.id ? 'active' : ''}`} onClick={() => setKind(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="act-flow-select-wrap">
            <select className="act-flow-select" value={flow} onChange={(e) => setFlow(e.target.value)} aria-label="Filter by flow">
              <option value="all">All flows</option>
              {flowOptions.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
            <ChevronDown className="act-flow-caret" size={15} />
          </div>
        </div>

        <div className="act-feed">
          {visible.length === 0 ? (
            <div className="act-empty">No activity matches these filters.</div>
          ) : (
            visible.map((e) => (
              <article className="act-entry" key={e.id}>
                <div className="act-entry-main">
                  <span className="act-entry-edit"><Pencil size={15} /></span>
                  <span className={`act-badge ${e.kind}`}><i />{e.kind}</span>
                  <span className="act-flow">
                    {e.flow.map((seg, i) => (
                      <span className="act-flow-seg" key={seg}>
                        {i > 0 && <ArrowRight className="act-flow-arrow" size={14} />}
                        <button className="act-flow-link">{seg}</button>
                      </span>
                    ))}
                  </span>
                  <span className="act-by">by <b>{e.user}</b></span>
                  <span className="act-dot" />
                  <span className="act-when">{e.when}</span>
                  <button className="act-restore"><RotateCcw size={14} /> Restore</button>
                </div>
                <div className="act-change">
                  <span className="act-change-field">{e.field}</span>
                  <span className="act-change-vals">
                    <ChangeVal v={e.before} side="before" />
                    <ArrowRight className="act-change-arrow" size={15} />
                    <ChangeVal v={e.after} side="after" />
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
