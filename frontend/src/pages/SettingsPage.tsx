import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes,
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
  RefreshCw,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

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
  { id: 'profile', label: 'Profile' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'channels', label: 'Channels' },
  { id: 'fiscal', label: 'Fiscal & Formatting' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'team', label: 'Team' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'api', label: 'API Keys' },
  { id: 'danger', label: 'Danger Zone' },
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

type Integration = { id: string; name: string; mono: string; blurb: string; connected: boolean };
const INTEGRATIONS: Integration[] = [
  { id: 'shopify',  name: 'Shopify',               mono: 'SH', blurb: 'Sync product catalog and orders',   connected: true  },
  { id: 'amazon',   name: 'Amazon Seller Central', mono: 'AM', blurb: 'Pull marketplace sales data',       connected: true  },
  { id: 'netsuite', name: 'NetSuite',              mono: 'NS', blurb: 'ERP financial sync',                connected: false },
  { id: 'quickbooks', name: 'QuickBooks',          mono: 'QB', blurb: 'Accounting + invoices',             connected: false },
  { id: 'ga',       name: 'Google Analytics',      mono: 'GA', blurb: 'Session + conversion data',         connected: true  },
  { id: 'slack',    name: 'Slack',                 mono: 'SL', blurb: 'Report delivery + alerts',          connected: false },
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
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} data-testid={testId} style={{ position: 'relative', width: 34, height: 20, borderRadius: 999, background: on ? CORAL : '#CBD5E1', cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0, border: 'none' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', transition: 'left 150ms ease' }} />
    </button>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', height: 36, padding: '0 10px', background: '#fff', border: `1px solid ${SLATE_200}`, borderRadius: 10, fontSize: 13, color: INK, outline: 'none', fontFamily: 'inherit' };
const inputFocusCSS = '';
const ghostBtn: React.CSSProperties = { height: 32, padding: '0 12px', background: '#fff', color: SLATE_700, border: `1px solid ${SLATE_200}`, borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };
const primaryBtn: React.CSSProperties = { height: 32, padding: '0 12px', background: INK, color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit' };
const coralBtn: React.CSSProperties = { height: 32, padding: '0 12px', background: CORAL_600, color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit' };

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
  const [active, setActive] = useState<string>('profile');

  // Scroll-spy for left nav
  const observers = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    observers.current = io;
    return () => io.disconnect();
  }, []);

  const goto = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

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

  const toggleIntegration = (id: string) => { setIntegrations(integrations.map((i) => i.id === id ? { ...i, connected: !i.connected } : i)); show('Updated'); };

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
      <div style={{ padding: '24px' }}>
        <PageHeader eyebrow="Goorin Reporting · Account" title="Settings" subtitle="Workspace, team, and personal preferences." testIdPrefix="settings" />

        {/* Mobile chip row */}
        <nav className="lg:hidden flex" style={{ gap: 6, overflowX: 'auto', marginBottom: 20, paddingBottom: 4, scrollbarWidth: 'none' }} aria-label="Settings sections" data-testid="settings-mobile-nav">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => goto(s.id)} style={{ flexShrink: 0, height: 32, padding: '0 12px', background: active === s.id ? INK : '#fff', color: active === s.id ? '#fff' : SLATE_700, border: `1px solid ${active === s.id ? INK : SLATE_200}`, borderRadius: 999, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }} data-testid={`settings-chip-${s.id}`}>{s.label}</button>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Left nav (sticky desktop) */}
          <aside className="hidden lg:block" style={{ position: 'sticky', top: 24, alignSelf: 'start' }} data-testid="settings-left-nav">
            <nav className="flex flex-col" style={{ gap: 2 }}>
              {SECTIONS.map((s) => {
                const isActive = active === s.id;
                return (
                  <button key={s.id} type="button" onClick={() => goto(s.id)}
                    style={{ textAlign: 'left', background: isActive ? '#F5F5F7' : 'transparent', color: isActive ? INK : SLATE_500, border: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 120ms ease' }}
                    data-testid={`settings-nav-${s.id}`}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = SLATE_50; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex flex-col" style={{ gap: 24, maxWidth: 760 }}>
            {/* Profile */}
            <SectionCard id="profile" title="Profile" help="Your personal account details and preferences.">
              <div className="flex items-center gap-4" style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: 999, background: CORAL_50, color: CORAL_DK, fontSize: 20, fontWeight: 600 }}>RM</div>
                <button type="button" onClick={() => show('Avatar picker (demo)')} style={ghostBtn} data-testid="settings-avatar-change">Change avatar</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <Field label="Full name"><input value={name} onChange={(e) => { setName(e.target.value); }} onBlur={() => show('Saved')} style={inputStyle} data-testid="settings-name" /></Field>
                <Field label="Email"><input value="ryan@mirabile.com" disabled style={{ ...inputStyle, background: SLATE_50, color: SLATE_500 }} /></Field>
                <Field label="Role">
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 12px', background: SLATE_50, color: SLATE_700, borderRadius: 10, fontSize: 13, fontWeight: 500, border: `1px solid ${SLATE_200}` }}>Owner</span>
                </Field>
                <Field label="Timezone">
                  <select value={timezone} onChange={(e) => { setTimezone(e.target.value); show('Saved'); }} style={inputStyle} data-testid="settings-tz">
                    {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
            </SectionCard>

            {/* Workspace */}
            <SectionCard id="workspace" title="Workspace" help="Company-wide defaults applied across reports.">
              <div className="flex items-center gap-4" style={{ marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, background: INK, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700 }}>G</div>
                <button type="button" onClick={() => show('Upload (demo)')} style={ghostBtn} className="inline-flex items-center gap-1.5"><Upload size={13} />Upload logo</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <Field label="Company name"><input value={company} onChange={(e) => setCompany(e.target.value)} onBlur={() => show('Saved')} style={inputStyle} data-testid="settings-company" /></Field>
                <Field label="Default currency"><select value={currency} onChange={(e) => { setCurrency(e.target.value); show('Saved'); }} style={inputStyle} data-testid="settings-currency">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Default date range"><select value={defaultRange} onChange={(e) => { setDefaultRange(e.target.value); show('Saved'); }} style={inputStyle} data-testid="settings-range">{DATE_RANGES.map((r) => <option key={r}>{r}</option>)}</select></Field>
              </div>
            </SectionCard>

            {/* Channels */}
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
              <button type="button" onClick={addChannel} className="inline-flex items-center gap-1.5" style={{ ...ghostBtn, marginTop: 12 }} data-testid="settings-add-channel"><Plus size={13} />Add channel</button>
            </SectionCard>

            {/* Fiscal & Formatting */}
            <SectionCard id="fiscal" title="Fiscal & Formatting" help="Fiscal year, week start, and number formatting conventions.">
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                <Field label="Fiscal year starts"><select value={fiscalMonth} onChange={(e) => { setFiscalMonth(e.target.value); show('Saved'); }} style={inputStyle} data-testid="settings-fy-month">{FISCAL_MONTHS.map((m) => <option key={m}>{m}</option>)}</select></Field>
                <Field label="Week starts on">
                  <div className="flex" style={{ gap: 6 }}>
                    {(['Sun', 'Mon'] as const).map((d) => (
                      <button key={d} type="button" onClick={() => { setWeekStart(d); show('Saved'); }} style={{ flex: 1, height: 36, background: weekStart === d ? INK : '#fff', color: weekStart === d ? '#fff' : SLATE_700, border: `1px solid ${weekStart === d ? INK : SLATE_200}`, borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }} data-testid={`settings-week-${d.toLowerCase()}`}>{d}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Number format"><select value={numFormat} onChange={(e) => { setNumFormat(e.target.value); show('Saved'); }} style={inputStyle} data-testid="settings-num-format">{NUM_FORMATS.map((n) => <option key={n}>{n}</option>)}</select></Field>
                <Field label="Negative numbers">
                  <div className="flex" style={{ gap: 6 }}>
                    {NEG_FORMATS.map((n) => (
                      <button key={n} type="button" onClick={() => { setNegFormat(n); show('Saved'); }} style={{ flex: 1, height: 36, background: negFormat === n ? INK : '#fff', color: negFormat === n ? '#fff' : SLATE_700, border: `1px solid ${negFormat === n ? INK : SLATE_200}`, borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }} data-testid={`settings-neg-${n}`}>{n === 'parentheses' ? '(1,234)' : '-1,234'}</button>
                    ))}
                  </div>
                </Field>
              </div>
            </SectionCard>

            {/* Notifications */}
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

            {/* Team */}
            <SectionCard id="team" title="Team" help="Members with access to this workspace.">
              <div className="flex items-center justify-end" style={{ marginBottom: 12 }}>
                <button type="button" onClick={() => setInviteOpen((v) => !v)} className="inline-flex items-center gap-1.5" style={coralBtn} data-testid="settings-invite-btn"><Plus size={13} />Invite member</button>
              </div>
              {inviteOpen && (
                <div className="flex flex-wrap gap-2" style={{ padding: 14, background: SLATE_50, border: `1px solid ${SLATE_200}`, borderRadius: 10, marginBottom: 16 }} data-testid="settings-invite-form">
                  <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" style={{ ...inputStyle, flex: 1, minWidth: 200, background: '#fff' }} />
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} style={{ ...inputStyle, flex: '0 0 120px' }}>{(['Admin','Analyst','Viewer'] as Role[]).map((r) => <option key={r}>{r}</option>)}</select>
                  <button type="button" onClick={addTeamMember} style={primaryBtn} data-testid="settings-invite-send">Send invite</button>
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

            {/* Integrations */}
            <SectionCard id="integrations" title="Integrations" help="Connect data sources and delivery channels.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="settings-integrations-grid">
                {integrations.map((it: Integration) => (
                  <div key={it.id} className="flex items-start gap-3" style={{ padding: 14, border: `1px solid ${SLATE_200}`, borderRadius: 12 }} data-testid={`settings-integration-${it.id}`}>
                    <div style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, background: SLATE_50, color: INK, borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>{it.mono}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK }}>{it.name}</p>
                        <span style={{ padding: '2px 8px', background: it.connected ? EMERALD_50 : SLATE_50, color: it.connected ? EMERALD : SLATE_700, borderRadius: 6, fontSize: 10.5, fontWeight: 500, whiteSpace: 'nowrap' }}>{it.connected ? 'Connected' : 'Not connected'}</span>
                      </div>
                      <p style={{ margin: '2px 0 10px', fontSize: 12, color: SLATE_500 }}>{it.blurb}</p>
                      <button type="button" onClick={() => toggleIntegration(it.id)} style={{ ...ghostBtn, height: 28, padding: '0 10px' }} data-testid={`settings-integration-action-${it.id}`}>{it.connected ? 'Manage' : 'Connect'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* API Keys */}
            <SectionCard id="api" title="API Keys" help="Programmatic access to your workspace data.">
              <div className="flex items-center justify-end" style={{ marginBottom: 12 }}>
                <button type="button" onClick={createKey} className="inline-flex items-center gap-1.5" style={primaryBtn} data-testid="settings-create-key"><Plus size={13} />Create key</button>
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

            {/* Danger Zone */}
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
          </main>
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {newKeyModal && (
        <ModalOverlay onClose={() => setNewKeyModal(null)} title={`API key "${newKeyModal.name}"`}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: SLATE_500 }}>Copy this key now — it will only be shown once.</p>
          <div className="flex gap-2">
            <input readOnly value={newKeyModal.value} style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', background: SLATE_50 }} data-testid="settings-newkey-value" />
            <button type="button" onClick={() => { navigator.clipboard?.writeText(newKeyModal.value); show('Key copied'); setNewKeyModal(null); }} className="inline-flex items-center gap-1.5" style={primaryBtn}><Copy size={13} />Copy</button>
          </div>
        </ModalOverlay>
      )}

      {resetModal && (
        <ModalOverlay onClose={() => setResetModal(false)} title="Reset local data?">
          <p style={{ margin: '0 0 20px', fontSize: 13, color: SLATE_500 }}>This clears all saved settings, team members, API keys, and integrations stored in this browser. The page will reload.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setResetModal(false)} style={ghostBtn}>Cancel</button>
            <button type="button" onClick={resetLocal} style={{ ...coralBtn, background: CORAL_600 }} data-testid="settings-reset-confirm">Reset data</button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

const headTh: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${SLATE_100}`, whiteSpace: 'nowrap' };

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
