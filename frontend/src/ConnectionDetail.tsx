import { useState } from 'react';
import { ArrowLeft, KeyRound, RefreshCw, Save, Shield, Table2, Trash2 } from 'lucide-react';

type ConnectionDetailProps = {
  provider: string;
  short: string;
  color: string;
  tint: string;
  name: string;
  onBack: () => void;
  onSaved: () => void;
};

type CredentialField = { label: string; placeholder: string; help: string };

const credentialFields: Record<string, CredentialField[]> = {
  Airtable: [
    { label: 'Personal Access Token', placeholder: 'pat••••••••••••••••', help: 'Create one at airtable.com/create/tokens with data.records:read and data.records:write scopes.' },
    { label: 'Base ID', placeholder: 'app••••••••••••••', help: 'Or paste a base ID manually if you already know it.' },
  ],
  Extensiv: [
    { label: 'Client ID', placeholder: '••••••••••••••••', help: 'Found under your Extensiv 3PL Warehouse Manager API settings.' },
    { label: 'Client Secret', placeholder: '••••••••••••••••', help: 'Generated alongside your client ID. Keep this value private.' },
  ],
  'Fulfil.io': [
    { label: 'API Key', placeholder: '••••••••••••••••', help: 'From Settings → API in your Fulfil.io workspace.' },
    { label: 'Subdomain', placeholder: 'your-store', help: 'The subdomain portion of your Fulfil.io URL.' },
  ],
  'Loop Returns': [
    { label: 'API Token', placeholder: '••••••••••••••••', help: 'From the Developers section of your Loop dashboard.' },
  ],
  Shopify: [
    { label: 'Admin API Access Token', placeholder: 'shpat_••••••••••••', help: 'From your Shopify custom app under API credentials.' },
    { label: 'Store Domain', placeholder: 'your-store.myshopify.com', help: 'Your permanent myshopify.com domain.' },
  ],
};

const defaultFields: CredentialField[] = [
  { label: 'API Key', placeholder: '••••••••••••••••', help: 'Enter a new key only if you want to replace the existing one.' },
  { label: 'API Secret', placeholder: '••••••••••••••••', help: 'Kept encrypted and never shown after saving.' },
];

type SchemaField = { name: string; type: string; attrs: string[] };
type SchemaResource = { name: string; id: string; ops: string[]; fields: SchemaField[] };

const schema: SchemaResource[] = [
  {
    name: 'Line List',
    id: 'tbl_line_list',
    ops: ['READ', 'CREATE', 'UPDATE'],
    fields: [
      { name: 'id', type: 'string', attrs: ['Read-only', 'Primary'] },
      { name: 'name', type: 'string', attrs: ['Required'] },
      { name: 'status', type: 'single select', attrs: [] },
      { name: 'quantity', type: 'number', attrs: [] },
      { name: 'created_time', type: 'datetime', attrs: ['Read-only'] },
    ],
  },
  {
    name: 'Line Milestones',
    id: 'tbl_line_milestones',
    ops: ['READ', 'UPDATE'],
    fields: [
      { name: 'id', type: 'string', attrs: ['Read-only', 'Primary'] },
      { name: 'milestone', type: 'string', attrs: ['Required'] },
      { name: 'completed', type: 'checkbox', attrs: [] },
      { name: 'due_date', type: 'date', attrs: [] },
      { name: 'linked_line', type: 'link', attrs: [] },
    ],
  },
];

export default function ConnectionDetail({ provider, short, color, tint, name, onBack, onSaved }: ConnectionDetailProps) {
  const [tab, setTab] = useState<'settings' | 'schema'>('settings');
  const [connName, setConnName] = useState(name);
  const fields = credentialFields[provider] ?? defaultFields;
  const hasBaseId = fields.some((f) => f.label === 'Base ID');

  return (
    <div className="cd-page">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to connections</button>

      <div className="cd-header">
        <span className="conn-provider-icon cd-icon" style={{ color, background: tint }}>{short}</span>
        <div className="cd-title">
          <div className="cd-title-row">
            <h1>{connName || name}</h1>
            <span className="cd-status"><i />Connected</span>
          </div>
          <div className="cd-meta">
            <span>{provider}</span>
            <i className="cd-dot" />
            <span>Synced 2h ago</span>
          </div>
        </div>
        <div className="cd-actions">
          <button className="secondary-button"><Shield size={15} /> Test Connection</button>
          <button className="cd-delete" aria-label="Delete connection"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="cd-tabs" role="tablist">
        <button className={`cd-tab ${tab === 'settings' ? 'active' : ''}`} role="tab" aria-selected={tab === 'settings'} onClick={() => setTab('settings')}><KeyRound size={15} /> Settings &amp; Credentials</button>
        <button className={`cd-tab ${tab === 'schema' ? 'active' : ''}`} role="tab" aria-selected={tab === 'schema'} onClick={() => setTab('schema')}><Table2 size={15} /> Schema Explorer</button>
      </div>

      {tab === 'settings' ? (
        <div className="cd-stack">
          <section className="card cd-card">
            <div className="cd-card-head"><h2>Configuration</h2></div>
            <div className="cd-card-body">
              <label className="settings-field"><span>Connection Name</span><input type="text" value={connName} onChange={(e) => setConnName(e.target.value)} /></label>
            </div>
          </section>

          <section className="card cd-card">
            <div className="cd-card-head"><h2>Credentials</h2><p>Leave blank to keep existing values. Enter new values only to update them.</p></div>
            <div className="cd-card-body">
              {fields.map((f, i) => (
                <label className="settings-field" key={f.label}>
                  <span>{f.label}</span>
                  <input type="password" placeholder={f.placeholder} autoComplete="off" />
                  <small className="cd-help">{f.help}</small>
                  {hasBaseId && i === fields.length - 1 && (
                    <button type="button" className="secondary-button cd-inline-btn"><RefreshCw size={14} /> Load bases from new token</button>
                  )}
                </label>
              ))}
              <div className="cd-card-foot">
                <button className="primary-button" onClick={onSaved}><Save size={15} /> Save Changes</button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="cd-stack">
          <section className="card cd-card">
            <div className="cd-card-head cd-card-head-row">
              <div>
                <h2>Data Schema</h2>
                <p>Resources and fields available from this connection. Last fetched about 2 hours ago.</p>
              </div>
              <button className="secondary-button"><RefreshCw size={15} /> Refresh Schema</button>
            </div>
          </section>

          {schema.map((res) => (
            <section className="card cd-card" key={res.name}>
              <div className="cd-res-head">
                <div className="cd-res-title">
                  <Table2 size={17} />
                  <div>
                    <strong>{res.name}</strong>
                    <span className="cd-res-sub">{res.id}</span>
                  </div>
                </div>
                <div className="cd-res-ops">
                  {res.ops.map((op) => <span key={op} className={`cd-op cd-op-${op.toLowerCase()}`}>{op}</span>)}
                </div>
              </div>
              <div className="cd-table-wrap">
                <div className="cd-thead"><span>Field</span><span>Type</span><span>Attributes</span></div>
                {res.fields.map((fl) => (
                  <div className="cd-trow" key={fl.name}>
                    <span className="cd-field">{fl.name}</span>
                    <span className="cd-type">{fl.type}</span>
                    <span className="cd-attrs">
                      {fl.attrs.length === 0 ? <span className="cd-attr-none">—</span> : fl.attrs.map((a) => <span key={a} className="cd-attr">{a}</span>)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
