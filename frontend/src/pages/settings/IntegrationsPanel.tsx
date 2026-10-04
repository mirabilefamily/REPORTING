import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

// ─── Types (mirrored from SettingsPage) ─────────────────────────────────
export type IntegrationStatus = 'connected' | 'available' | 'needs-attention';
export type Integration = {
  id: string;
  name: string;
  category: string;
  desc: string;
  status: IntegrationStatus;
  color: string;
  lastSync?: string;
};

type Props = {
  integrations: Integration[];
  setIntegrations: (next: Integration[]) => void;
  show: (msg: string) => void;
};

// ─── Tokens (kept local for drop-in) ────────────────────────────────────
const INK = '#0A0A0B';
const SLATE_700 = '#334155';
const SLATE_600 = '#52525B';
const SLATE_500 = '#6E6E73';
const SLATE_400 = '#9A9A9E';
const SLATE_200 = '#E5E5E7';
const SLATE_100 = '#F1F1F3';
const SLATE_50 = '#FAFAFA';
const CORAL = '#FF6F61';
const CORAL_DK = '#C9422E';
const CORAL_50 = '#FFF1EF';
const CORAL_200 = '#FDD7D2';
const CORAL_700 = '#B04435';
const EMERALD = '#047857';
const EMERALD_50 = '#ECFDF5';

// ─── Category-driven schemas (field definitions for the mock wizard) ───
type FieldDef =
  | { key: string; label: string; type: 'text' | 'password'; placeholder?: string; help?: string; required?: boolean }
  | { key: string; label: string; type: 'select'; options: string[]; default?: string; help?: string }
  | { key: string; label: string; type: 'switch'; default?: boolean; help?: string };

type Schema = {
  overview: string[];
  perms: string[];
  creds: FieldDef[];
  mappingTitle: string;
  mapping: FieldDef[];
  oauth?: { provider: string };
};

const SCHEMAS: Record<string, Schema> = {
  Commerce: {
    overview: [
      'Pull orders, inventory, and customers in near real time.',
      'Backfill up to 24 months of historical sales to seed forecasts.',
      'Push status, tracking, and fulfillment events back to the storefront.',
    ],
    perms: ['Read orders', 'Read inventory', 'Read customers', 'Write fulfillments'],
    creds: [
      { key: 'storeUrl', label: 'Store URL', type: 'text', placeholder: 'yourstore.myshopify.com', required: true, help: 'The admin URL for the storefront you want to connect.' },
      { key: 'apiKey', label: 'API key', type: 'text', placeholder: 'sk_live_...', required: true },
      { key: 'apiSecret', label: 'API secret', type: 'password', placeholder: '••••••••', required: true, help: 'Stored encrypted. Only the last 4 chars are retained after save.' },
    ],
    mappingTitle: 'Sync scope',
    mapping: [
      { key: 'syncOrders', label: 'Sync orders', type: 'switch', default: true, help: 'Mirror new and updated orders into Goorin.' },
      { key: 'syncInventory', label: 'Sync inventory on-hand', type: 'switch', default: true },
      { key: 'syncCustomers', label: 'Sync customer records', type: 'switch', default: true },
      { key: 'backfillMonths', label: 'Backfill history', type: 'select', options: ['3 months', '6 months', '12 months', '24 months'], default: '12 months' },
      { key: 'currency', label: 'Report currency', type: 'select', options: ['USD', 'EUR', 'GBP', 'Multi-currency (as-is)'], default: 'USD' },
    ],
  },
  Accounting: {
    overview: [
      'Reconcile revenue, discounts, and fees against your general ledger.',
      'Push journal entries for daily sales, refunds, and payouts.',
      'Keep your chart of accounts aligned to Goorin segments and SKUs.',
    ],
    perms: ['Read chart of accounts', 'Read invoices', 'Write journal entries'],
    creds: [
      { key: 'accountId', label: 'Realm / Account ID', type: 'text', placeholder: '123456789', required: true },
      { key: 'apiToken', label: 'OAuth token', type: 'password', placeholder: '••••••••', required: true, help: 'Generated when you authorized the connection on the provider.' },
    ],
    mappingTitle: 'GL mapping',
    mapping: [
      { key: 'revAccount', label: 'Revenue account', type: 'select', options: ['4000 — Product revenue', '4010 — Wholesale revenue', '4020 — Direct revenue', '4100 — Other revenue'], default: '4000 — Product revenue' },
      { key: 'cogsAccount', label: 'COGS account', type: 'select', options: ['5000 — Cost of goods sold', '5100 — Freight-in', '5200 — Inventory adjustments'], default: '5000 — Cost of goods sold' },
      { key: 'discountAccount', label: 'Discount contra account', type: 'select', options: ['4900 — Sales discounts', '4910 — Promotional allowances'], default: '4900 — Sales discounts' },
      { key: 'postingFreq', label: 'Posting frequency', type: 'select', options: ['Realtime', 'Hourly', 'Daily rollup'], default: 'Daily rollup' },
    ],
  },
  Analytics: {
    overview: [
      'Attribute revenue to acquisition sources, campaigns, and content.',
      'Enrich customer records with session, device, and funnel data.',
      'Stream Goorin events outbound to BI, ad platforms, and warehouses.',
    ],
    perms: ['Read property configuration', 'Read reports', 'Read audiences'],
    creds: [
      { key: 'propertyId', label: 'Property ID', type: 'text', placeholder: '123456789', required: true },
      { key: 'apiKey', label: 'Service account key', type: 'password', placeholder: '••••••••', required: true },
    ],
    mappingTitle: 'Dimensions & events',
    mapping: [
      { key: 'attribModel', label: 'Attribution model', type: 'select', options: ['Last click', 'Data-driven', 'Position-based', 'Linear'], default: 'Data-driven' },
      { key: 'lookback', label: 'Lookback window', type: 'select', options: ['7 days', '14 days', '30 days', '90 days'], default: '30 days' },
      { key: 'includePaid', label: 'Include paid traffic', type: 'switch', default: true },
      { key: 'includeOrganic', label: 'Include organic traffic', type: 'switch', default: true },
    ],
  },
  Communication: {
    overview: [
      'Deliver KPI digests, anomaly alerts, and inventory warnings to the team.',
      'Route alerts to the right channel based on severity and segment.',
      'Reply to alerts to acknowledge, snooze, or escalate — right from chat.',
    ],
    perms: ['Post messages', 'Create channels', 'Read workspace metadata'],
    creds: [
      { key: 'workspace', label: 'Workspace', type: 'text', placeholder: 'goorin.slack.com', required: true },
      { key: 'webhook', label: 'Webhook URL', type: 'password', placeholder: 'https://hooks.slack.com/...', required: true, help: 'We only store a hashed reference. Rotate anytime.' },
    ],
    mappingTitle: 'Alert routing',
    mapping: [
      { key: 'defaultChannel', label: 'Default channel', type: 'select', options: ['#ops-alerts', '#sales-daily', '#inventory', '#leadership'], default: '#ops-alerts' },
      { key: 'inventoryChannel', label: 'Inventory alerts', type: 'select', options: ['#ops-alerts', '#inventory', '#fulfillment', '(mute)'], default: '#inventory' },
      { key: 'anomalyChannel', label: 'Anomaly alerts', type: 'select', options: ['#ops-alerts', '#leadership', '#sales-daily', '(mute)'], default: '#leadership' },
      { key: 'threadDigests', label: 'Thread daily digests', type: 'switch', default: true },
    ],
  },
  Marketing: {
    overview: [
      'Sync customer segments outbound to drive paid acquisition and retention.',
      'Pull spend, impressions, clicks, and conversions back for attribution.',
      'Measure incremental lift against holdout cohorts.',
    ],
    perms: ['Read ad accounts', 'Read campaigns & spend', 'Sync audiences'],
    creds: [
      { key: 'adAccountId', label: 'Ad account ID', type: 'text', placeholder: 'act_1234567890', required: true },
      { key: 'accessToken', label: 'Access token', type: 'password', placeholder: '••••••••', required: true },
    ],
    mappingTitle: 'Audiences & attribution',
    mapping: [
      { key: 'attribWindow', label: 'Attribution window', type: 'select', options: ['1-day click', '7-day click', '28-day click', '7-day click + 1-day view'], default: '7-day click' },
      { key: 'audienceSize', label: 'Minimum audience size', type: 'select', options: ['1,000', '5,000', '10,000', '50,000'], default: '5,000' },
      { key: 'pushPurchases', label: 'Push purchase events', type: 'switch', default: true },
      { key: 'pushAddToCart', label: 'Push add-to-cart events', type: 'switch', default: false },
    ],
  },
  Fulfillment: {
    overview: [
      'Route orders to the right 3PL or in-house warehouse automatically.',
      'Pull inventory snapshots and track shipments across carriers.',
      'Monitor SLA, exceptions, and returns in one feed.',
    ],
    perms: ['Read warehouses', 'Read shipments', 'Write orders'],
    creds: [
      { key: 'apiKey', label: 'API key', type: 'text', placeholder: 'live_...', required: true },
      { key: 'apiSecret', label: 'API secret', type: 'password', placeholder: '••••••••', required: true },
    ],
    mappingTitle: 'Warehouse routing',
    mapping: [
      { key: 'defaultWarehouse', label: 'Default warehouse', type: 'select', options: ['LAX-01 — Los Angeles', 'JFK-02 — New Jersey', 'ORD-01 — Chicago', 'LHR-01 — London'], default: 'LAX-01 — Los Angeles' },
      { key: 'splitShipping', label: 'Allow split shipments', type: 'switch', default: true },
      { key: 'includeReturns', label: 'Sync return orders', type: 'switch', default: true },
      { key: 'slaThreshold', label: 'SLA threshold', type: 'select', options: ['24 hours', '48 hours', '72 hours', '5 days'], default: '48 hours' },
    ],
  },
};

const FALLBACK_SCHEMA: Schema = SCHEMAS.Commerce;
const schemaFor = (cat: string): Schema => SCHEMAS[cat] ?? FALLBACK_SCHEMA;

// ─── Local draft persistence ───────────────────────────────────────────
const DRAFT_KEY = 'settings.integrationDrafts';
type Draft = Record<string, { step: number; data: Record<string, any> }>;
const readDrafts = (): Draft => { try { const r = localStorage.getItem(DRAFT_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } };
const writeDrafts = (d: Draft) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {} };

const CONFIG_KEY = 'settings.integrationConfigs';
type SavedConfig = Record<string, { connectedAt: string; creds: Record<string, string>; mapping: Record<string, any> }>;
const readConfigs = (): SavedConfig => { try { const r = localStorage.getItem(CONFIG_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } };
const writeConfigs = (c: SavedConfig) => { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch {} };

// ─── Modal shell ───────────────────────────────────────────────────────
function Modal({ onClose, children, maxWidth = 640, testId }: { onClose: () => void; children: React.ReactNode; maxWidth?: number; testId?: string }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(10,10,11,0.42)', backdropFilter: 'blur(2px)' }} onClick={onClose} data-testid={testId}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: `min(${maxWidth}px, 100%)`, maxHeight: 'calc(100vh - 40px)', background: '#fff', borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Little helpers ────────────────────────────────────────────────────
const Monogram = ({ color, letter, size = 40 }: { color: string; letter: string; size?: number }) => (
  <div style={{ display: 'grid', placeItems: 'center', width: size, height: size, background: `${color}1A`, color, borderRadius: 10, fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>{letter}</div>
);

const StatusChip = ({ status }: { status: IntegrationStatus }) => {
  const cls = status === 'connected' ? 'chip-emerald' : status === 'needs-attention' ? 'chip-coral' : 'chip-neutral';
  const lbl = status === 'connected' ? 'Connected' : status === 'needs-attention' ? 'Needs attention' : 'Available';
  return <span className={cls} style={{ whiteSpace: 'nowrap' }}>{lbl}</span>;
};

// ─── Grid card (parent card, same visual as before) ────────────────────
function IntegrationCard({ it, onAction }: { it: Integration; onAction: (it: Integration) => void }) {
  const connected = it.status === 'connected';
  const needsAttn = it.status === 'needs-attention';
  const actionLbl = connected ? 'Manage' : needsAttn ? 'Fix' : 'Connect';
  const actionCls = connected ? 'btn-secondary btn-sm' : needsAttn ? 'btn-coral btn-sm' : 'btn-primary btn-sm';
  return (
    <div
      style={{ padding: 16, border: `1px solid ${needsAttn ? CORAL_200 : SLATE_200}`, borderRadius: 12, background: '#fff', minHeight: 170, display: 'flex', flexDirection: 'column' }}
      data-testid={`settings-integration-${it.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Monogram color={it.color} letter={it.name.charAt(0)} />
        <StatusChip status={it.status} />
      </div>
      <p style={{ margin: '14px 0 2px', fontSize: 15, fontWeight: 600, color: INK, lineHeight: 1.2 }}>{it.name}</p>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{it.category}</p>
      <p style={{ margin: '8px 0 14px', fontSize: 12.5, color: SLATE_500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.desc}</p>
      <div className="flex items-center justify-between" style={{ borderTop: `1px solid ${SLATE_100}`, paddingTop: 12, marginTop: 'auto' }}>
        <span style={{ fontSize: 11.5, color: SLATE_500 }}>{connected && it.lastSync ? `Synced ${it.lastSync}` : needsAttn ? it.lastSync || 'Error' : 'Not connected'}</span>
        <button type="button" onClick={() => onAction(it)} className={actionCls} data-testid={`settings-integration-action-${it.id}`}>{actionLbl}</button>
      </div>
    </div>
  );
}

// ─── Field renderer (DS tokens) ────────────────────────────────────────
function RenderField({ f, value, onChange, testIdPrefix }: { f: FieldDef; value: any; onChange: (v: any) => void; testIdPrefix: string }) {
  const tid = `${testIdPrefix}-${f.key}`;
  if (f.type === 'switch') {
    const on = !!value;
    return (
      <div className="flex items-start justify-between gap-4" style={{ padding: '12px 0' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: INK }}>{f.label}</p>
          {f.help && <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>{f.help}</p>}
        </div>
        <button type="button" role="switch" aria-checked={on} className="ds-switch" data-on={on} onClick={() => onChange(!on)} data-testid={tid} />
      </div>
    );
  }
  if (f.type === 'select') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: SLATE_700 }}>{f.label}</label>
        <select className="ds-select" value={value ?? f.default ?? f.options[0]} onChange={(e) => onChange(e.target.value)} data-testid={tid}>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {f.help && <p style={{ margin: 0, fontSize: 11.5, color: SLATE_500 }}>{f.help}</p>}
      </div>
    );
  }
  // text / password
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: SLATE_700 }}>
        {f.label}{(f as any).required && <span style={{ color: CORAL_DK, marginLeft: 3 }}>*</span>}
      </label>
      <input
        className="ds-input"
        type={f.type === 'password' ? 'password' : 'text'}
        placeholder={(f as any).placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        data-testid={tid}
        style={{ fontFamily: f.type === 'password' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit' }}
      />
      {f.help && <p style={{ margin: 0, fontSize: 11.5, color: SLATE_500 }}>{f.help}</p>}
    </div>
  );
}

// ─── Step indicator ────────────────────────────────────────────────────
function Stepper({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-center" style={{ gap: 6 }} data-testid="wizard-stepper">
      {labels.map((lbl, i) => {
        const active = step === i;
        const done = step > i;
        return (
          <div key={lbl} className="flex items-center" style={{ gap: 6, flex: i === labels.length - 1 ? '0 0 auto' : 1 }}>
            <span
              style={{
                display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: 999,
                background: active ? INK : done ? EMERALD : '#fff',
                color: active ? '#fff' : done ? '#fff' : SLATE_500,
                border: `1px solid ${active ? INK : done ? EMERALD : SLATE_200}`,
                fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}
            >
              {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
            </span>
            <span style={{ fontSize: 12, fontWeight: active ? 600 : 500, color: active ? INK : done ? SLATE_700 : SLATE_500, whiteSpace: 'nowrap' }}>{lbl}</span>
            {i < labels.length - 1 && <span style={{ flex: 1, height: 1, background: done ? EMERALD : SLATE_200, margin: '0 4px' }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Connect Wizard ────────────────────────────────────────────────────
const STEP_LABELS = ['Overview', 'Credentials', 'Mapping', 'Review'];

function ConnectWizard({
  integration,
  initialStep,
  initialData,
  onClose,
  onComplete,
  onSaveDraft,
}: {
  integration: Integration;
  initialStep: number;
  initialData: Record<string, any>;
  onClose: () => void;
  onComplete: (data: Record<string, any>) => void;
  onSaveDraft: (step: number, data: Record<string, any>) => void;
}) {
  const schema = schemaFor(integration.category);
  const [step, setStep] = useState(initialStep);
  const [data, setData] = useState<Record<string, any>>(() => {
    // Seed mapping defaults
    const seeded = { ...initialData };
    schema.mapping.forEach((f) => { if (seeded[f.key] === undefined && f.type !== 'text' && f.type !== 'password') seeded[f.key] = (f as any).default; });
    return seeded;
  });
  const [testing, setTesting] = useState<'idle' | 'testing' | 'ok' | 'err'>('idle');
  const [submitting, setSubmitting] = useState(false);

  // Auto-save draft on step/data change
  useEffect(() => { onSaveDraft(step, data); }, [step, data, onSaveDraft]);

  const update = (k: string, v: any) => setData((d) => ({ ...d, [k]: v }));

  const credsValid = useMemo(
    () => schema.creds.filter((f) => (f as any).required).every((f) => (data[f.key] ?? '').toString().trim().length >= 3),
    [data, schema],
  );

  const next = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const testConnection = () => {
    if (!credsValid) return;
    setTesting('testing');
    setTimeout(() => setTesting('ok'), 900);
  };

  const finish = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); onComplete(data); }, 650);
  };

  return (
    <Modal onClose={onClose} testId="integration-wizard-modal">
      {/* Header */}
      <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${SLATE_100}` }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
            <Monogram color={integration.color} letter={integration.name.charAt(0)} size={36} />
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Connect {integration.name}</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{integration.category}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, color: SLATE_500, background: 'transparent', borderRadius: 8, cursor: 'pointer', border: 'none' }} data-testid="wizard-close">
            <X size={16} />
          </button>
        </div>
        <Stepper step={step} labels={STEP_LABELS} />
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }} data-testid={`wizard-step-${step}`}>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: SLATE_600, lineHeight: 1.55 }}>{integration.desc}</p>
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>What you'll be able to do</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {schema.overview.map((o, i) => (
                  <li key={i} className="flex items-start" style={{ gap: 10 }}>
                    <CheckCircle2 size={16} strokeWidth={2} style={{ color: EMERALD, marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ padding: 14, background: SLATE_50, borderRadius: 10, border: `1px solid ${SLATE_200}` }}>
              <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
                <Shield size={14} strokeWidth={2} style={{ color: SLATE_600 }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: INK }}>Permissions Goorin will request</p>
              </div>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {schema.perms.map((p) => (
                  <span key={p} className="chip-neutral" style={{ fontSize: 11 }}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: SLATE_600, lineHeight: 1.55 }}>
              Paste the credentials from your {integration.name} account. We use them only to establish the sync and store them encrypted at rest.
            </p>
            {schema.creds.map((f) => (
              <RenderField key={f.key} f={f} value={data[f.key]} onChange={(v) => update(f.key, v)} testIdPrefix="wizard-cred" />
            ))}
            <div className="flex items-center justify-between" style={{ marginTop: 4, padding: '10px 12px', background: SLATE_50, border: `1px solid ${SLATE_200}`, borderRadius: 10 }}>
              <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
                {testing === 'testing' && <Loader2 size={14} className="animate-spin" style={{ color: SLATE_500 }} />}
                {testing === 'ok' && <CheckCircle2 size={14} style={{ color: EMERALD }} />}
                {testing === 'err' && <AlertTriangle size={14} style={{ color: CORAL_DK }} />}
                {testing === 'idle' && <Zap size={14} style={{ color: SLATE_500 }} />}
                <span style={{ fontSize: 12.5, color: testing === 'ok' ? EMERALD : testing === 'err' ? CORAL_DK : SLATE_600 }}>
                  {testing === 'idle' && 'Run a test call before continuing.'}
                  {testing === 'testing' && 'Testing connection…'}
                  {testing === 'ok' && 'Connection OK. You can continue.'}
                  {testing === 'err' && 'Could not reach provider. Check keys.'}
                </span>
              </div>
              <button type="button" className="btn-ghost btn-sm" onClick={testConnection} disabled={!credsValid || testing === 'testing'} data-testid="wizard-test-connection">
                {testing === 'ok' ? 'Re-test' : 'Test connection'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{schema.mappingTitle}</p>
            {schema.mapping.map((f, i) => {
              const switchy = f.type === 'switch';
              return (
                <div key={f.key} style={{ borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}`, paddingTop: switchy ? 0 : 14, paddingBottom: switchy ? 0 : 14 }}>
                  {switchy ? <RenderField f={f} value={data[f.key]} onChange={(v) => update(f.key, v)} testIdPrefix="wizard-map" /> : <RenderField f={f} value={data[f.key]} onChange={(v) => update(f.key, v)} testIdPrefix="wizard-map" />}
                </div>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <ReviewPane integration={integration} schema={schema} data={data} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between" style={{ padding: '14px 24px', borderTop: `1px solid ${SLATE_100}`, background: SLATE_50 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button type="button" className="btn-ghost btn-sm" onClick={back} disabled={step === 0} data-testid="wizard-back">
            <ArrowLeft size={13} />Back
          </button>
          <span style={{ fontSize: 11.5, color: SLATE_500 }}>Progress is auto-saved.</span>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} data-testid="wizard-cancel">Cancel</button>
          {step < 3 && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={next}
              disabled={(step === 1 && !credsValid) || (step === 1 && testing !== 'ok')}
              data-testid="wizard-next"
            >
              Next<ArrowRight size={13} />
            </button>
          )}
          {step === 3 && (
            <button type="button" className="btn-primary btn-sm" onClick={finish} disabled={submitting} data-testid="wizard-finish">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {submitting ? 'Connecting…' : 'Connect integration'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ReviewPane({ integration, schema, data }: { integration: Integration; schema: Schema; data: Record<string, any> }) {
  const mask = (v: string) => (v && v.length > 4 ? `${'•'.repeat(Math.min(v.length - 4, 8))}${v.slice(-4)}` : v || '—');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-testid="wizard-review">
      <p style={{ margin: 0, fontSize: 13, color: SLATE_600 }}>Confirm the configuration below. You can edit any section later from Manage.</p>
      <div style={{ border: `1px solid ${SLATE_200}`, borderRadius: 12 }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${SLATE_100}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>Credentials</span>
          <span className="chip-neutral" style={{ fontSize: 11 }}>Verified</span>
        </div>
        <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, columnGap: 12 }}>
          {schema.creds.map((f) => (
            <>
              <span key={`${f.key}-l`} style={{ fontSize: 12, color: SLATE_500 }}>{f.label}</span>
              <span key={`${f.key}-v`} style={{ fontSize: 12.5, color: INK, fontFamily: (f.type === 'password' || /secret|token|key|webhook/i.test(f.key)) ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit', wordBreak: 'break-all' }}>
                {(f.type === 'password' || /secret|token|webhook/i.test(f.key)) ? mask(String(data[f.key] || '')) : (data[f.key] || '—')}
              </span>
            </>
          ))}
        </div>
      </div>
      <div style={{ border: `1px solid ${SLATE_200}`, borderRadius: 12 }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${SLATE_100}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{schema.mappingTitle}</span>
          <Database size={13} style={{ color: SLATE_500 }} />
        </div>
        <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 8, columnGap: 12 }}>
          {schema.mapping.map((f) => (
            <>
              <span key={`${f.key}-l`} style={{ fontSize: 12, color: SLATE_500 }}>{f.label}</span>
              <span key={`${f.key}-v`} style={{ fontSize: 12.5, color: INK }}>
                {f.type === 'switch' ? (data[f.key] ? 'Enabled' : 'Disabled') : (data[f.key] ?? (f as any).default ?? '—')}
              </span>
            </>
          ))}
        </div>
      </div>
      <div className="flex items-start" style={{ gap: 10, padding: 12, background: CORAL_50, border: `1px solid ${CORAL_200}`, borderRadius: 10 }}>
        <AlertTriangle size={14} style={{ color: CORAL_DK, marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: CORAL_700, lineHeight: 1.5 }}>
          This is a mocked demo environment. No real credentials are transmitted. Connecting will mark {integration.name} as active for the UI only.
        </span>
      </div>
    </div>
  );
}

// ─── Manage view (single pane) ─────────────────────────────────────────
function ManagePanel({
  integration,
  config,
  onClose,
  onDisconnect,
  onSync,
  onReconfigure,
}: {
  integration: Integration;
  config?: SavedConfig[string];
  onClose: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  onReconfigure: () => void;
}) {
  const schema = schemaFor(integration.category);
  const [syncing, setSyncing] = useState(false);
  const data = config || { connectedAt: 'earlier today', creds: {}, mapping: {} };
  const triggerSync = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); onSync(); }, 900);
  };
  const mask = (v: string) => (v && v.length > 4 ? `${'•'.repeat(Math.min(v.length - 4, 8))}${v.slice(-4)}` : '••••');
  return (
    <Modal onClose={onClose} testId="integration-manage-modal">
      <div style={{ padding: '18px 24px 16px', borderBottom: `1px solid ${SLATE_100}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
            <Monogram color={integration.color} letter={integration.name.charAt(0)} size={36} />
            <div style={{ minWidth: 0 }}>
              <div className="flex items-center" style={{ gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: INK }}>{integration.name}</h3>
                <StatusChip status="connected" />
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>
                {integration.category} · Connected {data.connectedAt}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, color: SLATE_500, background: 'transparent', borderRadius: 8, cursor: 'pointer', border: 'none' }} data-testid="manage-close">
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Sync status strip */}
        <div className="flex items-center justify-between" style={{ padding: 14, background: EMERALD_50, borderRadius: 10, border: `1px solid #BBF7D0` }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <CheckCircle2 size={16} style={{ color: EMERALD }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK }}>Last sync {integration.lastSync || 'just now'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>Automatic sync is active every 15 minutes.</p>
            </div>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={triggerSync} disabled={syncing} data-testid="manage-sync-now">
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>

        {/* Credentials */}
        <div style={{ border: `1px solid ${SLATE_200}`, borderRadius: 12 }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${SLATE_100}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>Credentials</span>
            <button type="button" className="btn-ghost btn-sm" onClick={onReconfigure} data-testid="manage-rotate-keys">Rotate</button>
          </div>
          <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, columnGap: 12 }}>
            {schema.creds.map((f) => (
              <>
                <span key={`${f.key}-l`} style={{ fontSize: 12, color: SLATE_500 }}>{f.label}</span>
                <span key={`${f.key}-v`} style={{ fontSize: 12.5, color: INK, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {(f.type === 'password' || /secret|token|webhook/i.test(f.key)) ? mask(String(data.creds[f.key] || '••••abcd')) : (data.creds[f.key] || '—')}
                </span>
              </>
            ))}
          </div>
        </div>

        {/* Mapping */}
        <div style={{ border: `1px solid ${SLATE_200}`, borderRadius: 12 }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${SLATE_100}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{schema.mappingTitle}</span>
            <button type="button" className="btn-ghost btn-sm" onClick={onReconfigure} data-testid="manage-edit-mapping">Edit</button>
          </div>
          <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 8, columnGap: 12 }}>
            {schema.mapping.map((f) => (
              <>
                <span key={`${f.key}-l`} style={{ fontSize: 12, color: SLATE_500 }}>{f.label}</span>
                <span key={`${f.key}-v`} style={{ fontSize: 12.5, color: INK }}>
                  {f.type === 'switch' ? ((data.mapping[f.key] ?? (f as any).default) ? 'Enabled' : 'Disabled') : (data.mapping[f.key] ?? (f as any).default ?? '—')}
                </span>
              </>
            ))}
          </div>
        </div>

        {/* Danger */}
        <div className="flex items-center justify-between" style={{ padding: 14, background: CORAL_50, border: `1px solid ${CORAL_200}`, borderRadius: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK }}>Disconnect {integration.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>Stops sync immediately. Historical data remains available for 30 days.</p>
          </div>
          <button type="button" onClick={onDisconnect} style={{ height: 32, padding: '0 12px', background: '#fff', color: CORAL_700, border: `1px solid ${CORAL_200}`, borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }} data-testid="manage-disconnect">
            <Trash2 size={13} />Disconnect
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Fix view ──────────────────────────────────────────────────────────
function FixPanel({
  integration,
  onClose,
  onResolve,
  onReconnect,
  onDisconnect,
}: {
  integration: Integration;
  onClose: () => void;
  onResolve: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
}) {
  const [testing, setTesting] = useState<'idle' | 'testing' | 'ok' | 'err'>('idle');
  const retest = () => {
    setTesting('testing');
    setTimeout(() => setTesting('err'), 900);
  };
  return (
    <Modal onClose={onClose} testId="integration-fix-modal" maxWidth={560}>
      <div style={{ padding: '18px 24px 16px', borderBottom: `1px solid ${SLATE_100}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
            <Monogram color={integration.color} letter={integration.name.charAt(0)} size={36} />
            <div style={{ minWidth: 0 }}>
              <div className="flex items-center" style={{ gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: INK }}>{integration.name}</h3>
                <StatusChip status="needs-attention" />
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>{integration.category}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, color: SLATE_500, background: 'transparent', borderRadius: 8, cursor: 'pointer', border: 'none' }} data-testid="fix-close">
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: 14, background: CORAL_50, border: `1px solid ${CORAL_200}`, borderRadius: 10 }}>
          <div className="flex items-start" style={{ gap: 10 }}>
            <AlertTriangle size={16} style={{ color: CORAL_DK, marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: CORAL_700 }}>Authentication failed</p>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: SLATE_600, lineHeight: 1.5 }}>
                The provider rejected the stored credentials {integration.lastSync?.toLowerCase().startsWith('error') ? integration.lastSync : '14 hours ago'}. Typical causes are expired tokens, rotated keys, or revoked workspace access.
              </p>
            </div>
          </div>
        </div>

        <div style={{ border: `1px solid ${SLATE_200}`, borderRadius: 12 }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${SLATE_100}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>Suggested fixes</span>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Regenerate the API token in your provider admin console.',
              'Confirm the workspace account that authorized Goorin is still active.',
              'Re-run the OAuth flow to refresh scopes and permissions.',
            ].map((s, i) => (
              <div key={i} className="flex items-start" style={{ gap: 8 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: 999, background: SLATE_100, color: SLATE_600, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 12.5, color: INK, lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ padding: '10px 12px', background: SLATE_50, border: `1px solid ${SLATE_200}`, borderRadius: 10 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            {testing === 'testing' && <Loader2 size={14} className="animate-spin" style={{ color: SLATE_500 }} />}
            {testing === 'err' && <AlertTriangle size={14} style={{ color: CORAL_DK }} />}
            {testing === 'ok' && <CheckCircle2 size={14} style={{ color: EMERALD }} />}
            {testing === 'idle' && <Zap size={14} style={{ color: SLATE_500 }} />}
            <span style={{ fontSize: 12.5, color: testing === 'ok' ? EMERALD : testing === 'err' ? CORAL_DK : SLATE_600 }}>
              {testing === 'idle' && 'Re-test with current credentials.'}
              {testing === 'testing' && 'Reaching provider…'}
              {testing === 'err' && 'Still failing. Reconnect to update credentials.'}
              {testing === 'ok' && 'Connection restored.'}
            </span>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={retest} disabled={testing === 'testing'} data-testid="fix-retest">Re-test</button>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ padding: '14px 24px', borderTop: `1px solid ${SLATE_100}`, background: SLATE_50 }}>
        <button type="button" className="btn-ghost btn-sm" onClick={onDisconnect} data-testid="fix-disconnect">
          <Trash2 size={13} />Disconnect
        </button>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button type="button" className="btn-secondary btn-sm" onClick={onResolve} data-testid="fix-mark-resolved">Mark resolved</button>
          <button type="button" className="btn-coral btn-sm" onClick={onReconnect} data-testid="fix-reconnect">
            <RefreshCw size={13} />Reconnect
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────
export default function IntegrationsPanel({ integrations, setIntegrations, show }: Props) {
  const [wizardFor, setWizardFor] = useState<Integration | null>(null);
  const [manageFor, setManageFor] = useState<Integration | null>(null);
  const [fixFor, setFixFor] = useState<Integration | null>(null);
  const [drafts, setDrafts] = useState<Draft>(() => readDrafts());
  const [configs, setConfigs] = useState<SavedConfig>(() => readConfigs());

  useEffect(() => writeDrafts(drafts), [drafts]);
  useEffect(() => writeConfigs(configs), [configs]);

  // Group integrations by category for better scanability
  const grouped = useMemo(() => {
    const g: Record<string, Integration[]> = {};
    integrations.forEach((it) => { (g[it.category] = g[it.category] || []).push(it); });
    return Object.entries(g);
  }, [integrations]);

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;
  const needsCount = integrations.filter((i) => i.status === 'needs-attention').length;

  const openAction = (it: Integration) => {
    if (it.status === 'connected') setManageFor(it);
    else if (it.status === 'needs-attention') setFixFor(it);
    else setWizardFor(it);
  };

  const handleWizardSaveDraft = (step: number, data: Record<string, any>) => {
    if (!wizardFor) return;
    setDrafts((d) => ({ ...d, [wizardFor.id]: { step, data } }));
  };

  const handleWizardComplete = (data: Record<string, any>) => {
    if (!wizardFor) return;
    const schema = schemaFor(wizardFor.category);
    const creds: Record<string, string> = {};
    const mapping: Record<string, any> = {};
    schema.creds.forEach((f) => { creds[f.key] = (data[f.key] ?? '').toString(); });
    schema.mapping.forEach((f) => { mapping[f.key] = data[f.key] ?? (f as any).default; });
    setConfigs((c) => ({ ...c, [wizardFor.id]: { connectedAt: 'just now', creds, mapping } }));
    setDrafts((d) => { const n = { ...d }; delete n[wizardFor.id]; return n; });
    setIntegrations(integrations.map((i) => i.id === wizardFor.id ? { ...i, status: 'connected', lastSync: 'Just now' } : i));
    show(`${wizardFor.name} connected`);
    setWizardFor(null);
  };

  const handleDisconnect = (it: Integration) => {
    if (!window.confirm(`Disconnect ${it.name}?`)) return;
    setConfigs((c) => { const n = { ...c }; delete n[it.id]; return n; });
    setIntegrations(integrations.map((i) => i.id === it.id ? { ...i, status: 'available', lastSync: undefined } : i));
    show(`${it.name} disconnected`);
    setManageFor(null); setFixFor(null);
  };

  const handleManualSync = (it: Integration) => {
    setIntegrations(integrations.map((i) => i.id === it.id ? { ...i, lastSync: 'Just now' } : i));
    show(`${it.name} sync queued`);
  };

  const handleFixResolve = (it: Integration) => {
    setIntegrations(integrations.map((i) => i.id === it.id ? { ...i, status: 'connected', lastSync: 'Just now' } : i));
    show(`${it.name} restored`);
    setFixFor(null);
  };

  const handleFixReconnect = (it: Integration) => {
    setFixFor(null);
    setWizardFor(it);
  };

  const wizardInitialStep = wizardFor && drafts[wizardFor.id] ? drafts[wizardFor.id].step : 0;
  const wizardInitialData = wizardFor && drafts[wizardFor.id] ? drafts[wizardFor.id].data : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} data-testid="settings-integrations-panel">
      {/* Summary strip */}
      <div className="flex flex-wrap items-center justify-between gap-3" style={{ padding: 14, background: SLATE_50, border: `1px solid ${SLATE_200}`, borderRadius: 10 }}>
        <div className="flex items-center" style={{ gap: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Connected</p>
            <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 600, color: INK, fontVariantNumeric: 'tabular-nums' }}>{connectedCount}</p>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: SLATE_200 }} />
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Needs attention</p>
            <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 600, color: needsCount ? CORAL_DK : INK, fontVariantNumeric: 'tabular-nums' }}>{needsCount}</p>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: SLATE_200 }} />
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Available</p>
            <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 600, color: INK, fontVariantNumeric: 'tabular-nums' }}>{integrations.length - connectedCount - needsCount}</p>
          </div>
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => show('Browse the full marketplace (demo)')} data-testid="integrations-browse-all">
          <ExternalLink size={13} />Browse marketplace
        </button>
      </div>

      {/* Category sections */}
      {grouped.map(([category, items]) => (
        <div key={category}>
          <div className="flex items-end justify-between" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>{category}</h3>
            <span style={{ fontSize: 11.5, color: SLATE_500 }}>{items.filter((i) => i.status === 'connected').length} / {items.length} connected</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid={`settings-integrations-cat-${category.toLowerCase()}`}>
            {items.map((it) => (
              <IntegrationCard key={it.id} it={it} onAction={openAction} />
            ))}
          </div>
        </div>
      ))}

      {/* Modals */}
      {wizardFor && (
        <ConnectWizard
          integration={wizardFor}
          initialStep={wizardInitialStep}
          initialData={wizardInitialData}
          onClose={() => setWizardFor(null)}
          onComplete={handleWizardComplete}
          onSaveDraft={handleWizardSaveDraft}
        />
      )}
      {manageFor && (
        <ManagePanel
          integration={manageFor}
          config={configs[manageFor.id]}
          onClose={() => setManageFor(null)}
          onDisconnect={() => handleDisconnect(manageFor)}
          onSync={() => handleManualSync(manageFor)}
          onReconfigure={() => { const it = manageFor; setManageFor(null); setWizardFor(it); }}
        />
      )}
      {fixFor && (
        <FixPanel
          integration={fixFor}
          onClose={() => setFixFor(null)}
          onResolve={() => handleFixResolve(fixFor)}
          onReconnect={() => handleFixReconnect(fixFor)}
          onDisconnect={() => handleDisconnect(fixFor)}
        />
      )}
    </div>
  );
}
