import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Copy,
  Github,
  Globe,
  GripVertical,
  Key,
  Layers,
  Mail,
  MessageSquare,
  Plus,
  Puzzle,
  RefreshCw,
  Share2,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DsSelect from '../components/DsSelect';
import IntegrationsPanel from './settings/IntegrationsPanel';

// ─── Tokens ────────────────────────────────────────────────────────────
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
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
const CORAL_600 = '#DB4D3F';
const CORAL_200 = '#FDD7D2';
const CORAL_700 = '#B04435';
const EMERALD = '#047857';
const EMERALD_50 = '#ECFDF5';

// ─── Section definitions ───────────────────────────────────────────────
const SECTIONS = [
  { id: 'profile',       label: 'Profile',               icon: User },
  { id: 'workspace',     label: 'Workspace',             icon: Building2 },
  { id: 'channels',      label: 'Channels',              icon: Share2 },
  { id: 'fiscal',        label: 'Fiscal & Formatting',   icon: Calendar },
  { id: 'notifications', label: 'Notifications',         icon: Bell },
  { id: 'team',          label: 'Team',                  icon: Users },
  { id: 'integrations',  label: 'Integrations',          icon: Puzzle },
  { id: 'api',           label: 'API Keys',              icon: Key },
  { id: 'danger',        label: 'Danger Zone',           icon: AlertTriangle },
] as const;

const TIMEZONES = ['America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
const CURRENCIES = ['USD', 'EUR', 'GBP'];
const DATE_RANGES = ['MTD', 'QTD', 'YTD'];
const FISCAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NUM_FORMATS = ['1,234.56', '1.234,56'];
const NEG_FORMATS = ['parentheses', 'minus'];

type ChannelRow = { id: string; name: string; color: string; visible: boolean };
const DEFAULT_CHANNELS: ChannelRow[] = [
  { id: 'all',    name: 'All',          color: '#0A0A0B', visible: true },
  { id: 'usw',    name: 'US Wholesale', color: '#FF6F61', visible: true },
  { id: 'dist',   name: 'Distributors', color: '#DB4D3F', visible: true },
  { id: 'retail', name: 'Retail',       color: '#F99487', visible: true },
  { id: 'ecom',   name: 'Ecommerce',    color: '#334155', visible: true },
  { id: 'amazon', name: 'Amazon',       color: '#9A9A9E', visible: true },
];

type Role = 'Owner' | 'Admin' | 'Analyst' | 'Viewer';
const TEAM_SEED = [
  { name: 'Ryan Mirabile',   initials: 'RM', email: 'ryan@mirabile.com',   role: 'Owner'   as Role, lastActive: '2 min ago' },
  { name: 'Priya Narayan',   initials: 'PN', email: 'priya@goorin.co',     role: 'Admin'   as Role, lastActive: '1 h ago'   },
  { name: 'James Lee',       initials: 'JL', email: 'james@goorin.co',     role: 'Analyst' as Role, lastActive: 'yesterday' },
  { name: 'Erwin Samson',    initials: 'ES', email: 'erwin@goorin.co',     role: 'Analyst' as Role, lastActive: '3 d ago'   },
  { name: 'Devon Rhodes',    initials: 'DR', email: 'devon@goorin.co',     role: 'Viewer'  as Role, lastActive: '1 w ago'   },
];

type IntegrationStatus = 'connected' | 'available' | 'needs-attention';
type Integration = { id: string; name: string; category: string; desc: string; status: IntegrationStatus; color: string; lastSync?: string };
const INTEGRATIONS: Integration[] = [
  { id: 'shopify',     name: 'Shopify',               category: 'Commerce',      desc: 'Sync orders, inventory, and customers from your Shopify store.',   status: 'connected',       color: '#95BF47', lastSync: '3 min ago' },
  { id: 'amazon',      name: 'Amazon Seller Central', category: 'Commerce',      desc: 'Pull FBA + MFN orders, settlement reports, and ad spend.',          status: 'connected',       color: '#FF9900', lastSync: '12 min ago' },
  { id: 'woo',         name: 'WooCommerce',           category: 'Commerce',      desc: 'Import orders and SKUs from WooCommerce storefronts.',             status: 'available',       color: '#7F54B3' },
  { id: 'bigcommerce', name: 'BigCommerce',           category: 'Commerce',      desc: 'Multi-storefront catalog, orders, and customer sync.',             status: 'available',       color: '#121118' },
  { id: 'netsuite',    name: 'NetSuite',              category: 'Accounting',    desc: 'Push journal entries and reconcile revenue with your GL.',         status: 'connected',       color: '#1A6DB2', lastSync: '1 hour ago' },
  { id: 'quickbooks',  name: 'QuickBooks',            category: 'Accounting',    desc: 'Sync invoices, payments, and chart of accounts.',                  status: 'needs-attention', color: '#2CA01C', lastSync: '2 days ago' },
  { id: 'xero',        name: 'Xero',                  category: 'Accounting',    desc: 'Automate bookkeeping and tax categorization.',                     status: 'available',       color: '#13B5EA' },
  { id: 'ga4',         name: 'Google Analytics',      category: 'Analytics',     desc: 'Enrich reports with GA4 traffic, conversion, and attribution.',    status: 'connected',       color: '#F9AB00', lastSync: '27 min ago' },
  { id: 'mixpanel',    name: 'Mixpanel',              category: 'Analytics',     desc: 'Attach product event streams to customer records.',                status: 'available',       color: '#7856FF' },
  { id: 'segment',     name: 'Segment',               category: 'Analytics',     desc: 'Route customer events to downstream destinations.',                status: 'available',       color: '#4FB07E' },
  { id: 'slack',       name: 'Slack',                 category: 'Communication', desc: 'Alerts for low stock, overdue orders, and SLA breaches.',          status: 'connected',       color: '#4A154B', lastSync: 'Realtime' },
  { id: 'teams',       name: 'Microsoft Teams',       category: 'Communication', desc: 'Push report digests and alerts into Teams channels.',              status: 'available',       color: '#5059C9' },
  { id: 'email',       name: 'Email digests',         category: 'Communication', desc: 'Scheduled report deliveries to any mailbox.',                      status: 'connected',       color: '#64748B', lastSync: 'Daily 7:00 AM' },
  { id: 'klaviyo',     name: 'Klaviyo',               category: 'Marketing',     desc: 'Sync customer segments to drive lifecycle campaigns.',             status: 'available',       color: '#000000' },
  { id: 'meta',        name: 'Meta Ads',              category: 'Marketing',     desc: 'Attribute revenue to Facebook + Instagram campaigns.',             status: 'available',       color: '#1877F2' },
  { id: 'googleads',   name: 'Google Ads',            category: 'Marketing',     desc: 'Pull spend, clicks, and conversions by campaign.',                 status: 'available',       color: '#4285F4' },
  { id: 'shipstation', name: 'ShipStation',           category: 'Fulfillment',   desc: 'Create labels and track shipments across carriers.',               status: 'needs-attention', color: '#1C5091', lastSync: 'Error 14h ago' },
  { id: 'shipbob',     name: 'ShipBob',               category: 'Fulfillment',   desc: '3PL inventory sync, order routing, returns.',                      status: 'available',       color: '#F56C13' },
];

type ApiKey = { id: string; name: string; prefix: string; created: string; lastUsed: string };
const API_SEED: ApiKey[] = [
  { id: 'k1', name: 'Production dashboard', prefix: 'sk_live_••••••abc1', created: 'Jun 12, 2025', lastUsed: '2 h ago' },
  { id: 'k2', name: 'Zapier automation',    prefix: 'sk_live_••••••f3k9', created: 'Mar 02, 2025', lastUsed: '3 d ago' },
];

// ─── Local storage helpers ─────────────────────────────────────────────
const K = (k: string) => `settings.${k}`;
const read = <T,>(k: string, fallback: T): T => { try { const r = localStorage.getItem(K(k)); return r ? JSON.parse(r) as T : fallback; } catch { return fallback; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(K(k), JSON.stringify(v)); } catch {} };

// ─── UI primitives ─────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: 'fixed', right: 24, top: 24, zIndex: 100, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: INK, color: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: 12.5, fontWeight: 500 }} data-testid="settings-toast">
      <CheckCircle2 size={13} strokeWidth={2.2} />{message}
    </div>
  );
}

function Toggle({ on, onChange, testId }: { on: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="ds-switch" data-on={on} data-testid={testId} />
  );
}

const inputStyle: React.CSSProperties = { maxWidth: 420 };
const inputCls = 'ds-input';
const selectCls = 'ds-select';

function SectionCard({ id, title, help, children, danger }: { id: string; title: string; help?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section id={id} className="rounded-2xl" style={{ background: danger ? CORAL_50 : '#fff', boxShadow: danger ? `0 0 0 1px ${CORAL_200}` : CARD_SHADOW, padding: 24, scrollMarginTop: 24 }} data-testid={`settings-card-${id}`}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: danger ? CORAL_700 : INK, letterSpacing: '-0.01em' }}>{title}</h2>
      {help && <p style={{ margin: '4px 0 20px', fontSize: 13, color: danger ? CORAL_DK : SLATE_500 }}>{help}</p>}
      {!help && <div style={{ height: 20 }} />}
      {children}
    </section>
  );
}

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: SLATE_700 }}>{label}</label>
      {children}
      {help && <p style={{ margin: 0, fontSize: 11.5, color: SLATE_500 }}>{help}</p>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────
export default function SettingsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const show = (m: string) => setToast(m);

  // Hash-based sub-routing: #settings/profile, #settings/workspace, etc.
  const parseSubRoute = (): string => {
    const h = window.location.hash || '';
    const m = h.match(/#settings\/([a-z0-9-]+)/i);
    return m ? m[1] : 'profile';
  };
  const [active, setActive] = useState<string>(() => parseSubRoute());
  useEffect(() => {
    const onHash = () => setActive(parseSubRoute());
    window.addEventListener('hashchange', onHash);
    // Default redirect: #settings → #settings/profile
    if (window.location.hash === '#settings' || !/#settings\/[a-z0-9-]+/i.test(window.location.hash)) {
      if (window.location.hash.startsWith('#settings')) {
        window.location.hash = '#settings/profile';
      }
    }
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const goto = (id: string) => { window.location.hash = `#settings/${id}`; setActive(id); };

  // Section state (loaded from localStorage)
  const [name, setName] = useState<string>(() => read('profile.name', 'Ryan Mirabile'));
  const [timezone, setTimezone] = useState<string>(() => read('profile.tz', 'America/Los_Angeles'));
  useEffect(() => write('profile.name', name), [name]);
  useEffect(() => write('profile.tz', timezone), [timezone]);

  const [company, setCompany] = useState<string>(() => read('workspace.company', 'Goorin Bros.'));
  const [currency, setCurrency] = useState<string>(() => read('workspace.currency', 'USD'));
  const [defaultRange, setDefaultRange] = useState<string>(() => read('workspace.range', 'QTD'));
  useEffect(() => write('workspace.company', company), [company]);
  useEffect(() => write('workspace.currency', currency), [currency]);
  useEffect(() => write('workspace.range', defaultRange), [defaultRange]);

  const [channels, setChannels] = useState<ChannelRow[]>(() => read('channels', DEFAULT_CHANNELS));
  useEffect(() => write('channels', channels), [channels]);

  const [fiscalMonth, setFiscalMonth] = useState<string>(() => read('fiscal.month', 'January'));
  const [weekStart, setWeekStart] = useState<'Sun' | 'Mon'>(() => read('fiscal.weekStart', 'Mon'));
  const [numFormat, setNumFormat] = useState<string>(() => read('fiscal.numFormat', '1,234.56'));
  const [negFormat, setNegFormat] = useState<string>(() => read('fiscal.negFormat', 'parentheses'));
  useEffect(() => write('fiscal.month', fiscalMonth), [fiscalMonth]);
  useEffect(() => write('fiscal.weekStart', weekStart), [weekStart]);
  useEffect(() => write('fiscal.numFormat', numFormat), [numFormat]);
  useEffect(() => write('fiscal.negFormat', negFormat), [negFormat]);

  const [notif, setNotif] = useState<Record<string, boolean>>(() => read('notif', { digest: true, weeklyPnl: true, lowStock: true, forecast: false, aging: true }));
  useEffect(() => write('notif', notif), [notif]);

  const [team, setTeam] = useState(() => read('team', TEAM_SEED));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Analyst');
  useEffect(() => write('team', team), [team]);

  const [integrations, setIntegrations] = useState(() => read('integrations', INTEGRATIONS));
  useEffect(() => write('integrations', integrations), [integrations]);

  const [apiKeys, setApiKeys] = useState(() => read('apiKeys', API_SEED));
  const [newKeyModal, setNewKeyModal] = useState<{ name: string; value: string } | null>(null);
  useEffect(() => write('apiKeys', apiKeys), [apiKeys]);

  const [resetModal, setResetModal] = useState(false);

  // ─── Handlers ────────────────────────────────────────────────────────
  const toggleChannelVisible = (id: string) => { setChannels(channels.map((c) => c.id === id ? { ...c, visible: !c.visible } : c)); show('Saved'); };
  const addChannel = () => { const id = `custom_${Date.now()}`; setChannels([...channels, { id, name: 'New channel', color: CORAL, visible: true }]); };
  const removeChannel = (id: string) => { setChannels(channels.filter((c) => c.id !== id)); show('Channel removed'); };

  const addTeamMember = () => {
    if (!inviteEmail.includes('@')) return;
    const initials = inviteEmail.split('@')[0].slice(0, 2).toUpperCase();
    setTeam([...team, { name: inviteEmail.split('@')[0], initials, email: inviteEmail, role: inviteRole, lastActive: 'just invited' }]);
    setInviteEmail(''); setInviteOpen(false); show('Invitation sent');
  };

  const createKey = () => {
    const name = window.prompt('Key name');
    if (!name) return;
    const value = `sk_live_${Math.random().toString(36).slice(2, 18)}abc1`;
    const prefix = `sk_live_••••••${value.slice(-4)}`;
    setApiKeys([...apiKeys, { id: `k_${Date.now()}`, name, prefix, created: 'just now', lastUsed: '—' }]);
    setNewKeyModal({ name, value });
  };
  const revokeKey = (id: string) => { if (window.confirm('Revoke this key?')) { setApiKeys(apiKeys.filter((k) => k.id !== id)); show('Key revoked'); } };

  const resetLocal = () => {
    Object.keys(localStorage).filter((k) => k.startsWith('settings.')).forEach((k) => localStorage.removeItem(k));
    setResetModal(false); window.location.reload();
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-full" data-testid="settings-page" style={{ ...INTER, background: '#FAFAFA' }}>
      <div className="page-canvas">
        <PageHeader title="Settings" testIdPrefix="settings" />

        {/* Mobile chip row */}
        <nav className="lg:hidden flex" style={{ gap: 6, overflowX: 'auto', marginBottom: 20, paddingBottom: 4, scrollbarWidth: 'none' }} aria-label="Settings sections" data-testid="settings-mobile-nav">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button key={s.id} type="button" onClick={() => goto(s.id)} style={{ flexShrink: 0, height: 36, padding: '0 12px', background: isActive ? INK : '#fff', color: isActive ? '#fff' : SLATE_700, border: `1px solid ${isActive ? INK : SLATE_200}`, borderRadius: 999, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }} data-testid={`settings-chip-${s.id}`}>
                <Icon size={13} strokeWidth={1.9} />{s.label}
              </button>
            );
          })}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Left nav (sticky desktop) */}
          <aside className="hidden lg:block" style={{ position: 'sticky', top: 24, alignSelf: 'start' }} data-testid="settings-left-nav">
            <nav className="flex flex-col" style={{ gap: 2 }}>
              {SECTIONS.map((s, i) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                const isDanger = s.id === 'danger';
                return (
                  <div key={s.id}>
                    {isDanger && <div aria-hidden="true" style={{ height: 1, background: '#EDEDEF', margin: '12px 12px' }} />}
                    <button
                      type="button"
                      onClick={() => goto(s.id)}
                      className={`settings-nav-item ${isActive ? 'active' : ''}`}
                      data-danger={isDanger ? 'true' : undefined}
                      data-testid={`settings-nav-${s.id}`}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                      <span>{s.label}</span>
                    </button>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 flex flex-col" style={{ gap: 24 }}>
            {/* Profile */}
            {active === 'profile' && (
            <SectionCard id="profile" title="Profile" help="Your personal account details and preferences.">
              <div className="flex items-center gap-4" style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: 999, background: CORAL_50, color: CORAL_DK, fontSize: 20, fontWeight: 600 }}>RM</div>
                <button type="button" onClick={() => show('Avatar picker (demo)')} className="btn-ghost btn-sm" data-testid="settings-avatar-change">Change avatar</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <Field label="Full name"><input value={name} onChange={(e) => { setName(e.target.value); }} onBlur={() => show('Saved')} className={inputCls} style={inputStyle} data-testid="settings-name" /></Field>
                <Field label="Email"><input value="ryan@mirabile.com" disabled className={inputCls} style={{ ...inputStyle, background: SLATE_50, color: SLATE_500 }} /></Field>
                <Field label="Role">
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 12px', background: SLATE_50, color: SLATE_700, borderRadius: 10, fontSize: 13, fontWeight: 500, border: `1px solid ${SLATE_200}` }}>Owner</span>
                </Field>
                <Field label="Timezone">
                  <DsSelect value={timezone} options={TIMEZONES} onChange={(v) => { setTimezone(v); show('Saved'); }} minWidth={220} testId="settings-tz" />
                </Field>
              </div>
            </SectionCard>
            )}

            {/* Workspace */}
            {active === 'workspace' && (
            <SectionCard id="workspace" title="Workspace" help="Company-wide defaults applied across reports.">
              <div className="flex items-center gap-4" style={{ marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, background: INK, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700 }}>G</div>
                <button type="button" onClick={() => show('Upload (demo)')} className="btn-ghost btn-sm"><Upload size={13} />Upload logo</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <Field label="Company name"><input value={company} onChange={(e) => setCompany(e.target.value)} onBlur={() => show('Saved')} className={inputCls} style={inputStyle} data-testid="settings-company" /></Field>
                <Field label="Default currency"><DsSelect value={currency} options={CURRENCIES} onChange={(v) => { setCurrency(v); show('Saved'); }} minWidth={160} testId="settings-currency" /></Field>
                <Field label="Default date range"><DsSelect value={defaultRange} options={DATE_RANGES} onChange={(v) => { setDefaultRange(v); show('Saved'); }} minWidth={160} testId="settings-range" /></Field>
              </div>
            </SectionCard>
            )}

            {/* Channels */}
            {active === 'channels' && (
            <SectionCard id="channels" title="Channels" help="Reorder and toggle visibility of channels across every page.">
              <div className="flex flex-col" style={{ gap: 4 }}>
                {channels.map((c) => (
                  <div key={c.id} className="flex items-center gap-3" style={{ padding: '10px 12px', background: '#fff', border: `1px solid ${SLATE_200}`, borderRadius: 10 }} data-testid={`settings-channel-${c.id}`}>
                    <GripVertical size={14} style={{ color: SLATE_400, cursor: 'grab' }} />
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: INK, fontWeight: 500 }}>{c.name}</span>
                    <Toggle on={c.visible} onChange={() => toggleChannelVisible(c.id)} testId={`settings-channel-toggle-${c.id}`} />
                    {c.id.startsWith('custom_') && (
                      <button type="button" onClick={() => removeChannel(c.id)} style={{ background: 'transparent', border: 'none', color: SLATE_400, cursor: 'pointer', padding: 4 }} aria-label="Remove"><X size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addChannel} className="btn-ghost btn-sm" style={{ marginTop: 12 }} data-testid="settings-add-channel"><Plus size={13} />Add channel</button>
            </SectionCard>
            )}

            {/* Fiscal & Formatting */}
            {active === 'fiscal' && (
            <SectionCard id="fiscal" title="Fiscal & Formatting" help="Fiscal year, week start, and number formatting conventions.">
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <Field label="Fiscal year starts"><DsSelect value={fiscalMonth} options={FISCAL_MONTHS} onChange={(v) => { setFiscalMonth(v); show('Saved'); }} minWidth={180} testId="settings-fy-month" /></Field>
                <Field label="Week starts on">
                  <div role="radiogroup" aria-label="Week starts on" className="flex items-center" style={{ gap: 14, height: 36, maxWidth: 420 }}>
                    {(['Sun', 'Mon'] as const).map((d) => (
                      <label key={d} className="flex items-center" style={{ gap: 8, cursor: 'pointer' }} data-testid={`settings-week-${d.toLowerCase()}`}>
                        <input type="radio" name="week-start" className="ds-radio" checked={weekStart === d} onChange={() => { setWeekStart(d); show('Saved'); }} />
                        <span style={{ fontSize: 13, color: INK, fontWeight: 500 }}>{d === 'Sun' ? 'Sunday' : 'Monday'}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Number format"><DsSelect value={numFormat} options={NUM_FORMATS} onChange={(v) => { setNumFormat(v); show('Saved'); }} minWidth={180} testId="settings-num-format" /></Field>
                <Field label="Negative numbers">
                  <div role="radiogroup" aria-label="Negative numbers" className="flex items-center" style={{ gap: 14, height: 36, maxWidth: 420 }}>
                    {NEG_FORMATS.map((n) => (
                      <label key={n} className="flex items-center" style={{ gap: 8, cursor: 'pointer' }} data-testid={`settings-neg-${n}`}>
                        <input type="radio" name="neg-format" className="ds-radio" checked={negFormat === n} onChange={() => { setNegFormat(n); show('Saved'); }} />
                        <span style={{ fontSize: 13, color: INK, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{n === 'parentheses' ? '(1,234)' : '-1,234'}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            </SectionCard>
            )}

            {/* Notifications */}
            {active === 'notifications' && (
            <SectionCard id="notifications" title="Notifications" help="Email delivery for digests and alerts.">
              <div className="flex flex-col">
                {[
                  { key: 'digest',    label: 'Daily digest email',          help: 'Yesterday\'s KPIs delivered at 8am local time.' },
                  { key: 'weeklyPnl', label: 'Weekly P&L summary',          help: 'Every Monday morning, previous-week performance.' },
                  { key: 'lowStock',  label: 'Inventory low-stock alerts',  help: 'When any SKU dips below 30 days of supply.' },
                  { key: 'forecast',  label: 'Forecast variance alerts',    help: 'When attainment falls more than 10pts behind pace.' },
                  { key: 'aging',     label: 'Open order aging alerts',     help: 'Orders older than 30 days without a status change.' },
                ].map((n, i) => (
                  <div key={n.key} className="flex items-start justify-between gap-4" style={{ padding: '14px 0', borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: INK }}>{n.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>{n.help}</p>
                    </div>
                    <Toggle on={notif[n.key] ?? false} onChange={(v) => { setNotif({ ...notif, [n.key]: v }); show('Saved'); }} testId={`settings-notif-${n.key}`} />
                  </div>
                ))}
              </div>
            </SectionCard>
            )}

            {/* Team */}
            {active === 'team' && (
            <SectionCard id="team" title="Team" help="Members with access to this workspace.">
              <div className="flex items-center justify-end" style={{ marginBottom: 12 }}>
                <button type="button" onClick={() => setInviteOpen((v) => !v)} className="btn-coral btn-sm" data-testid="settings-invite-btn"><Plus size={13} />Invite member</button>
              </div>
              {inviteOpen && (
                <div className="flex flex-wrap gap-2" style={{ padding: 14, background: SLATE_50, border: `1px solid ${SLATE_200}`, borderRadius: 10, marginBottom: 16 }} data-testid="settings-invite-form">
                  <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" className={inputCls} style={{ flex: 1, minWidth: 200 }} />
                  <DsSelect value={inviteRole} options={['Admin', 'Analyst', 'Viewer']} onChange={(v) => setInviteRole(v as Role)} minWidth={140} testId="settings-invite-role" />
                  <button type="button" onClick={addTeamMember} className="btn-primary btn-sm" data-testid="settings-invite-send">Send invite</button>
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...TABULAR, width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th style={headTh}>Member</th>
                      <th style={headTh}>Email</th>
                      <th style={headTh}>Role</th>
                      <th style={{ ...headTh, textAlign: 'right' }}>Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((m: any, i: number) => (
                      <tr key={m.email} style={{ borderTop: `1px solid ${SLATE_100}` }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div className="flex items-center gap-2">
                            <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, background: SLATE_50, color: SLATE_700, borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{m.initials}</span>
                            <span style={{ fontSize: 13, color: INK, fontWeight: 500 }}>{m.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12.5, color: SLATE_500 }}>{m.email}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ padding: '3px 8px', background: m.role === 'Owner' ? CORAL_50 : SLATE_50, color: m.role === 'Owner' ? CORAL_DK : SLATE_700, borderRadius: 6, fontSize: 10.5, fontWeight: 500 }}>{m.role}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: SLATE_500, textAlign: 'right' }}>{m.lastActive}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
            )}

            {/* Integrations */}
            {active === 'integrations' && (
            <SectionCard id="integrations" title="Integrations" help="Connect data sources and delivery channels. Each integration walks you through a short setup; your progress is auto-saved.">
              <IntegrationsPanel integrations={integrations as Integration[]} setIntegrations={setIntegrations} show={show} />
            </SectionCard>
            )}

            {/* API Keys */}
            {active === 'api' && (
            <SectionCard id="api" title="API Keys" help="Programmatic access to your workspace data.">
              <div className="flex items-center justify-end" style={{ marginBottom: 12 }}>
                <button type="button" onClick={createKey} className="btn-primary btn-sm" data-testid="settings-create-key"><Plus size={13} />Create key</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...TABULAR, width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th style={headTh}>Name</th>
                      <th style={headTh}>Prefix</th>
                      <th style={headTh}>Created</th>
                      <th style={headTh}>Last used</th>
                      <th style={{ ...headTh, textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((k: ApiKey) => (
                      <tr key={k.id} style={{ borderTop: `1px solid ${SLATE_100}` }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: INK, fontWeight: 500 }}>{k.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: SLATE_600, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{k.prefix}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: SLATE_500 }}>{k.created}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: SLATE_500 }}>{k.lastUsed}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button type="button" onClick={() => revokeKey(k.id)} style={{ background: 'transparent', border: 'none', color: CORAL_DK, cursor: 'pointer', fontSize: 12, fontWeight: 500 }} data-testid={`settings-revoke-${k.id}`}>Revoke</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
            )}

            {/* Danger Zone */}
            {active === 'danger' && (
            <SectionCard id="danger" title="Danger Zone" help="These actions are irreversible — proceed carefully." danger>
              <div className="flex flex-col" style={{ gap: 12 }}>
                <div className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '14px 16px', background: '#fff', borderRadius: 10, border: `1px solid ${CORAL_200}` }}>
                  <div><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK }}>Reset local data</p><p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>Clears all saved preferences and settings in this browser.</p></div>
                  <button type="button" onClick={() => setResetModal(true)} style={{ height: 32, padding: '0 12px', background: '#fff', color: CORAL_700, border: `1px solid ${CORAL_200}`, borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} data-testid="settings-reset-btn">Reset local data</button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '14px 16px', background: '#fff', borderRadius: 10, border: `1px solid ${CORAL_200}` }}>
                  <div><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK }}>Sign out of all sessions</p><p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE_500 }}>Forces re-authentication on every device.</p></div>
                  <button type="button" onClick={() => show('Signed out of all sessions')} style={{ height: 32, padding: '0 12px', background: '#fff', color: CORAL_700, border: `1px solid ${CORAL_200}`, borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} data-testid="settings-signout-all">Sign out</button>
                </div>
              </div>
            </SectionCard>
            )}
          </main>
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {newKeyModal && (
        <ModalOverlay onClose={() => setNewKeyModal(null)} title={`API key "${newKeyModal.name}"`}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: SLATE_500 }}>Copy this key now — it will only be shown once.</p>
          <div className="flex gap-2">
            <input readOnly value={newKeyModal.value} className={inputCls} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', background: SLATE_50 }} data-testid="settings-newkey-value" />
            <button type="button" onClick={() => { navigator.clipboard?.writeText(newKeyModal.value); show('Key copied'); setNewKeyModal(null); }} className="btn-primary btn-sm"><Copy size={13} />Copy</button>
          </div>
        </ModalOverlay>
      )}

      {resetModal && (
        <ModalOverlay onClose={() => setResetModal(false)} title="Reset local data?">
          <p style={{ margin: '0 0 20px', fontSize: 13, color: SLATE_500 }}>This clears all saved settings, team members, API keys, and integrations stored in this browser. The page will reload.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setResetModal(false)} className="btn-ghost btn-sm">Cancel</button>
            <button type="button" onClick={resetLocal} className="btn-coral btn-sm" data-testid="settings-reset-confirm">Reset data</button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

const headTh: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.14em', borderBottom: `1px solid ${SLATE_100}`, whiteSpace: 'nowrap' };

function ModalOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(10,10,11,0.4)' }} onClick={onClose} data-testid="settings-modal">
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 100%)', background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: INK }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, color: SLATE_500, background: 'transparent', borderRadius: 8, cursor: 'pointer', border: 'none' }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
