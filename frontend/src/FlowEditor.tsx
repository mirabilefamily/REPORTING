import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronsUpDown,
  Filter,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';

type EditingFlow = {
  id: string;
  name: string;
  source: string;
  dest: string;
  schedule: string;
  cron: string;
};

type FlowEditorProps = {
  flow: EditingFlow;
  onBack: () => void;
  onSaved: () => void;
};

type ScheduleMode = 'manual' | 'preset' | 'cron';
type SkipCondition = { id: string; field: string; condition: string; value: string };
type Mapping = { id: string; mode: string; from: string; to: string };
type LookupStrategy = { id: string; title: string; desc: string; field: string; enabled: boolean };
type ValidationRule = { id: string; field: string; condition: string; value: string };

const timezoneOptions = ['Eastern Time (US)', 'Central Time (US)', 'Mountain Time (US)', 'Pacific Time (US)', 'UTC'];
const presetOptions = ['Every minute', 'Every 5 minutes', 'Every 30 minutes', 'Every hour on the hour', 'Daily at 6:00 AM', 'Weekly on Sunday at 12:00 AM'];
const incrementalOptions = ['Last Modified', 'Created At', 'None'];
const conditionOptions = ['Equals', 'Not Equals', 'Contains', 'Does Not Contain', 'Is Empty', 'Is Not Empty', 'Greater Than', 'Less Than'];
const operationOptions = ['Create Only', 'Update Only', 'Create or Update (Upsert)'];
const mappingModeOptions = ['Source field', 'Constant', 'Template'];

const sourceFieldOptions = [
  'Sale Reference (Shopify order #)',
  'Return Number',
  'Returned Lines (array of {sku, quantity})',
  'Sale Channel (e.g. Shopify, Amazon)',
  'SKU',
  'Style Number',
  'Last Modified',
  'Created At',
];
const destFieldOptions = [
  'Order # / name (e.g. #1001)',
  'Return reference (unique per return, e.g. Fulfil return number — required, guarantees a return is only refunded once)',
  'Returned items (array of {sku, quantity})',
  'Refund amount',
  'Restock (true/false)',
  'Note',
];
const lookupFieldOptions = ['sku (not mapped)', 'style_number (not mapped)', 'handle (not mapped)', 'barcode (not mapped)'];

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="fe-field">
      <span className="fe-field-label">{label}{required && <i>*</i>}</span>
      {children}
      {hint && <span className="fe-hint">{hint}</span>}
    </label>
  );
}

function SelectBox({ value, onChange, options }: { value: string; onChange?: (v: string) => void; options: string[] }) {
  const opts = options.includes(value) ? options : [value, ...options];
  return (
    <div className="fe-select">
      <select value={value} onChange={(e) => onChange?.(e.target.value)}>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronsUpDown className="fe-select-caret" size={15} />
    </div>
  );
}

export default function FlowEditor({ flow, onBack, onSaved }: FlowEditorProps) {
  const [name, setName] = useState(flow.name);
  const [description, setDescription] = useState(
    'Watches Fulfil for received customer returns and issues matching partial refunds in Shopify. Refunds cover the returned items only (never shipping), do not restock inventory in Shopify, and the order is archived after a successful refund. The return number is stored on the refund so the same return can never be refunded twice.',
  );
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('cron');
  const [preset, setPreset] = useState(flow.schedule);
  const [cron, setCron] = useState(flow.cron || '*/5 * * * *');
  const [timezone, setTimezone] = useState('Eastern Time (US)');

  const [sourceResource, setSourceResource] = useState('Customer Returns (Received)');
  const [batchLimit, setBatchLimit] = useState('100');
  const [incremental, setIncremental] = useState('Last Modified');
  const [skipConditions, setSkipConditions] = useState<SkipCondition[]>([
    { id: 'sc1', field: 'Sale Channel (e.g. Shopify, Amazon)', condition: 'Not Equals', value: 'Shopify' },
  ]);
  const [overrideField, setOverrideField] = useState('None');
  const [overrideCondition, setOverrideCondition] = useState('Equals');
  const [overrideValue, setOverrideValue] = useState('');
  const [resetTo, setResetTo] = useState('');

  const [destResource, setDestResource] = useState('Refunds (Partial, items only)');
  const [operation, setOperation] = useState('Create Only');

  const [mappings, setMappings] = useState<Mapping[]>([
    { id: 'm1', mode: 'Source field', from: 'Sale Reference (Shopify order #)', to: 'Order # / name (e.g. #1001)' },
    { id: 'm2', mode: 'Source field', from: 'Return Number', to: destFieldOptions[1] },
    { id: 'm3', mode: 'Source field', from: 'Returned Lines (array of {sku, quantity})', to: 'Returned items (array of {sku, quantity})' },
  ]);

  const [strategies, setStrategies] = useState<LookupStrategy[]>([
    { id: 's1', title: 'Exact SKU match', desc: 'Find an existing variant whose SKU equals the source field value.', field: 'sku (not mapped)', enabled: true },
    { id: 's2', title: 'Product handle (slugified)', desc: 'Slugify the source field value and look up the parent product by URL handle.', field: 'style_number (not mapped)', enabled: true },
    { id: 's3', title: 'SKU prefix match', desc: 'Find any variant whose SKU starts with the source field value, then use its parent product. Skipped if multiple distinct parents match.', field: 'style_number (not mapped)', enabled: true },
  ]);

  const [rules, setRules] = useState<ValidationRule[]>([]);

  const cronHint: Record<string, string> = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Every hour on the hour',
    '0 6 * * *': 'Daily at 6:00 AM',
    '0 0 * * 0': 'Weekly on Sunday at 12:00 AM',
  };

  const addSkipCondition = () => setSkipConditions((c) => [...c, { id: `sc-${Date.now()}`, field: sourceFieldOptions[0], condition: 'Equals', value: '' }]);
  const updateSkipCondition = (id: string, patch: Partial<SkipCondition>) => setSkipConditions((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeSkipCondition = (id: string) => setSkipConditions((c) => c.filter((x) => x.id !== id));

  const updateMapping = (id: string, patch: Partial<Mapping>) => setMappings((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const removeMapping = (id: string) => setMappings((ms) => ms.filter((m) => m.id !== id));
  const addMapping = () => setMappings((ms) => [...ms, { id: `m-${Date.now()}`, mode: 'Source field', from: sourceFieldOptions[0], to: destFieldOptions[0] }]);

  const toggleStrategy = (id: string) => setStrategies((s) => s.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
  const updateStrategy = (id: string, field: string) => setStrategies((s) => s.map((x) => (x.id === id ? { ...x, field } : x)));
  const resetStrategies = () => setStrategies((s) => s.map((x) => ({ ...x, enabled: true })));

  const addRule = () => setRules((r) => [...r, { id: `r-${Date.now()}`, field: sourceFieldOptions[0], condition: 'Is Not Empty', value: '' }]);
  const updateRule = (id: string, patch: Partial<ValidationRule>) => setRules((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeRule = (id: string) => setRules((r) => r.filter((x) => x.id !== id));

  return (
    <div className="fe-page">
      <div className="fe-editbar card">
        <button className="back-btn" onClick={onBack} aria-label="Back to flows"><ArrowLeft size={18} /></button>
        <h1 className="fe-editbar-title">Edit: {name}</h1>
        <div className="fe-editbar-actions">
          <button className="secondary-button"><ShieldCheck size={15} /> Test mapping</button>
          <button className="secondary-button" onClick={onBack}>Cancel</button>
          <button className="primary-button" onClick={onSaved}><Save size={15} /> Save</button>
        </div>
      </div>

      <div className="fe-stack">
        <section className="card fe-section">
          <div className="fe-section-head">
            <div>
              <h2>General</h2>
              <p>Name and describe this flow to help your team understand its purpose.</p>
            </div>
          </div>
          <div className="fe-grid">
            <div className="fe-col">
              <Field label="Flow name" required>
                <input className="fe-input" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <div className="fe-field">
                <span className="fe-field-label">Schedule</span>
                <div className="fe-radio-row">
                  {([['manual', 'Manual only'], ['preset', 'Use preset'], ['cron', 'Use cron expression']] as const).map(([mode, label]) => (
                    <button key={mode} type="button" className={`fe-radio ${scheduleMode === mode ? 'on' : ''}`} onClick={() => setScheduleMode(mode)}>
                      <span className="fe-radio-dot" />{label}
                    </button>
                  ))}
                </div>
                {scheduleMode === 'cron' && (
                  <>
                    <input className="fe-input fe-input-mono" type="text" value={cron} onChange={(e) => setCron(e.target.value)} />
                    <span className="fe-hint">{cronHint[cron.trim()] ?? 'Custom schedule'}</span>
                  </>
                )}
                {scheduleMode === 'preset' && <SelectBox value={preset} onChange={setPreset} options={presetOptions} />}
                {scheduleMode === 'manual' && <span className="fe-hint">This flow only runs when triggered manually.</span>}
              </div>
            </div>
            <div className="fe-col">
              <div className="fe-field">
                <span className="fe-field-label fe-field-label-row">Description<button type="button" className="fe-ai-link"><Sparkles size={13} /> AI Generate</button></span>
                <textarea className="fe-input fe-textarea" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <Field label="Timezone" required>
                <SelectBox value={timezone} onChange={setTimezone} options={timezoneOptions} />
              </Field>
            </div>
          </div>
        </section>

        <section className="card fe-section">
          <div className="fe-section-head">
            <span className="fe-badge fe-badge-blue">1</span>
            <div><h2>Source Setup</h2><p>Where data is read from.</p></div>
          </div>
          <div className="fe-stack-fields">
            <Field label="Connection" required>
              <SelectBox value={`Goorin ${flow.source}`} options={[`Goorin ${flow.source}`]} />
            </Field>
            <Field label="Resource" required>
              <SelectBox value={sourceResource} onChange={setSourceResource} options={['Customer Returns (Received)', 'Orders', 'Line List', 'Items']} />
            </Field>
          </div>

          <div className="fe-subgroup">
            <p className="fe-subgroup-title">Query Options</p>
            <div className="fe-grid">
              <Field label="Batch limit (optional)" hint="Max records per run. Leave empty for default (100).">
                <input className="fe-input" type="text" value={batchLimit} onChange={(e) => setBatchLimit(e.target.value)} />
              </Field>
              <Field label="Incremental sync field (optional)" hint="Only fetch records updated since last run.">
                <SelectBox value={incremental} onChange={setIncremental} options={incrementalOptions} />
              </Field>
            </div>
          </div>

          <div className="fe-subgroup">
            <p className="fe-subgroup-title"><Filter size={14} /> Skip Condition</p>
            <p className="fe-subgroup-desc">Skip records where a source field matches a condition. For example, skip rows that already have a Shopify Product ID.</p>
            <div className="fe-cond-list">
              {skipConditions.map((c) => (
                <div className="fe-cond-row" key={c.id}>
                  <Field label="Field"><SelectBox value={c.field} onChange={(v) => updateSkipCondition(c.id, { field: v })} options={sourceFieldOptions} /></Field>
                  <Field label="Condition"><SelectBox value={c.condition} onChange={(v) => updateSkipCondition(c.id, { condition: v })} options={conditionOptions} /></Field>
                  <Field label="Value" hint="{{today}}, {{yesterday}}, {{tomorrow}}, {{days_ago:N}} · optional format e.g. {{today:MM/DD/YYYY}}">
                    <input className="fe-input" type="text" value={c.value} onChange={(e) => updateSkipCondition(c.id, { value: e.target.value })} />
                  </Field>
                  <button className="fe-icon-btn fe-cond-remove" onClick={() => removeSkipCondition(c.id)} aria-label="Remove condition"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <button className="fe-add-btn" onClick={addSkipCondition}><Plus size={15} /> Add condition</button>
          </div>

          <div className="fe-subgroup">
            <p className="fe-subgroup-title">Force Override (optional)</p>
            <div className="fe-cond-row fe-cond-row-noremove">
              <Field label="Field"><SelectBox value={overrideField} onChange={setOverrideField} options={['None', ...sourceFieldOptions]} /></Field>
              <Field label="Condition"><SelectBox value={overrideCondition} onChange={setOverrideCondition} options={conditionOptions} /></Field>
              <Field label="Value"><input className="fe-input" type="text" placeholder="e.g. true" value={overrideValue} onChange={(e) => setOverrideValue(e.target.value)} /></Field>
            </div>
            <div className="fe-reset-to">
              <Field label="Reset to (after processing)"><input className="fe-input" type="text" placeholder="false" value={resetTo} onChange={(e) => setResetTo(e.target.value)} /></Field>
              <p className="fe-hint fe-hint-inline">After a force-processed record succeeds, the field resets to this value. Defaults to <code>false</code> if left empty.</p>
            </div>
          </div>
        </section>

        <section className="card fe-section">
          <div className="fe-section-head">
            <span className="fe-badge fe-badge-orange">2</span>
            <div><h2>Destination Setup</h2><p>Where data is written to.</p></div>
          </div>
          <div className="fe-stack-fields">
            <Field label="Connection" required>
              <SelectBox value={`Goorin ${flow.dest}`} options={[`Goorin ${flow.dest}`]} />
            </Field>
            <Field label="Resource" required>
              <SelectBox value={destResource} onChange={setDestResource} options={['Refunds (Partial, items only)', 'Refunds (Full)', 'Orders', 'Products', 'Variants']} />
            </Field>
          </div>
          <div className="fe-subgroup">
            <p className="fe-subgroup-title">Write Options</p>
            <Field label="Operation" required>
              <SelectBox value={operation} onChange={setOperation} options={operationOptions} />
            </Field>
          </div>
        </section>

        <section className="card fe-section">
          <div className="fe-section-head">
            <span className="fe-badge fe-badge-green">3</span>
            <div><h2>Field Mapping</h2><p>Map source fields to destination fields.</p></div>
          </div>
          <div className="fe-map-list">
            {mappings.map((m) => (
              <div className="fe-map-row" key={m.id}>
                <span className="fe-map-grip"><GripVertical size={16} /></span>
                <div className="fe-map-mode"><SelectBox value={m.mode} onChange={(v) => updateMapping(m.id, { mode: v })} options={mappingModeOptions} /></div>
                <div className="fe-map-src"><SelectBox value={m.from} onChange={(v) => updateMapping(m.id, { from: v })} options={sourceFieldOptions} /></div>
                <span className="fe-map-arrow"><ArrowRight size={16} /></span>
                <div className="fe-map-dst"><SelectBox value={m.to} onChange={(v) => updateMapping(m.id, { to: v })} options={destFieldOptions} /></div>
                <button className="fe-icon-btn" onClick={() => removeMapping(m.id)} aria-label="Remove field"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <button className="fe-add-btn" onClick={addMapping}><Plus size={15} /> Add Field</button>
        </section>

        <section className="card fe-section">
          <div className="fe-section-head fe-section-head-split">
            <div className="fe-head-with-icon">
              <Filter size={17} />
              <div><h2>Parent Product Lookup</h2><p>When writing a variant, Shopify needs to find (or create) the parent product. By default the engine tries exact SKU, then product handle from <code>style_number</code>, then SKU prefix. Reorder, disable, or repoint each strategy below.</p></div>
            </div>
            <button className="fe-reset-link" onClick={resetStrategies}><RotateCcw size={14} /> Reset to defaults</button>
          </div>
          <div className="fe-strat-list">
            {strategies.map((s) => (
              <div className={`fe-strat-row ${s.enabled ? '' : 'off'}`} key={s.id}>
                <span className="fe-strat-grip"><GripVertical size={16} /></span>
                <button className={`fe-strat-check ${s.enabled ? 'on' : ''}`} onClick={() => toggleStrategy(s.id)} aria-label={s.enabled ? `Disable ${s.title}` : `Enable ${s.title}`} aria-pressed={s.enabled}><CheckCircle2 size={18} /></button>
                <div className="fe-strat-copy"><strong>{s.title}</strong><p>{s.desc}</p></div>
                <div className="fe-strat-select"><SelectBox value={s.field} onChange={(v) => updateStrategy(s.id, v)} options={lookupFieldOptions} /></div>
                <button className="fe-icon-btn" onClick={() => toggleStrategy(s.id)} aria-label={`Remove ${s.title}`}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="card fe-section">
          <div className="fe-section-head">
            <div className="fe-head-with-icon">
              <Shield size={17} />
              <div><h2>Validation Rules</h2><p>Records that fail validation are skipped and logged. Leave empty to skip validation.</p></div>
            </div>
          </div>
          {rules.length > 0 && (
            <div className="fe-cond-list">
              {rules.map((r) => (
                <div className="fe-cond-row" key={r.id}>
                  <Field label="Field"><SelectBox value={r.field} onChange={(v) => updateRule(r.id, { field: v })} options={sourceFieldOptions} /></Field>
                  <Field label="Condition"><SelectBox value={r.condition} onChange={(v) => updateRule(r.id, { condition: v })} options={conditionOptions} /></Field>
                  <Field label="Value"><input className="fe-input" type="text" value={r.value} onChange={(e) => updateRule(r.id, { value: e.target.value })} /></Field>
                  <button className="fe-icon-btn fe-cond-remove" onClick={() => removeRule(r.id)} aria-label="Remove rule"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
          <button className="fe-add-btn" onClick={addRule}><Plus size={15} /> Add Rule</button>
        </section>
      </div>
    </div>
  );
}
