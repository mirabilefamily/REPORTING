import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Download,
  FileBarChart,
  FileText,
  Key,
  LayoutGrid,
  type LucideIcon,
  Package,
  PanelLeftClose,
  PieChart,
  Puzzle,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wallet,
} from 'lucide-react';

type Group = 'Recent' | 'Settings' | 'Orders' | 'Customers' | 'Reports' | 'Actions';

type Action =
  | { kind: 'nav'; dest: string; hash?: string }
  | { kind: 'toast'; text: string }
  | { kind: 'open-ai' }
  | { kind: 'toggle-sidebar' };

type Result = {
  id: string;
  group: Group;
  title: string;
  description: string;
  icon: LucideIcon;
  action: Action;
};

type Props = {
  open: boolean;
  query: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onNavigate: (dest: string, hash?: string) => void;
  onToast?: (msg: string) => void;
  onOpenAi?: () => void;
  onToggleSidebar?: () => void;
  onClearQuery?: () => void;
};

// ─── Tokens ────────────────────────────────────────────────────────────
const INK = '#0A0A0B';
const SLATE_700 = '#334155';
const SLATE_500 = '#6E6E73';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E5E5E7';
const SLATE_100 = '#F1F1F3';
const SLATE_50 = '#FAFAFA';

const RECENTS_KEY = 'search.recents';
const MAX_RECENTS = 5;

// ─── Mock data ─────────────────────────────────────────────────────────
const SETTINGS: Result[] = [
  { id: 'set-team',  group: 'Settings', title: 'Sales team',    description: 'Link users to Fulfil reps & commissions', icon: Users,       action: { kind: 'nav', dest: 'Settings', hash: 'settings/team' } },
  { id: 'set-admin', group: 'Settings', title: 'Administration', description: 'Users, roles & fiscal locks',             icon: ShieldCheck, action: { kind: 'nav', dest: 'Settings', hash: 'settings/profile' } },
  { id: 'set-int',   group: 'Settings', title: 'Integrations',   description: 'Shopify, QuickBooks, Slack, and more',    icon: Puzzle,      action: { kind: 'nav', dest: 'Settings', hash: 'settings/integrations' } },
  { id: 'set-api',   group: 'Settings', title: 'API Keys',       description: 'Manage machine access',                   icon: Key,         action: { kind: 'nav', dest: 'Settings', hash: 'settings/api-keys' } },
  { id: 'set-ch',    group: 'Settings', title: 'Channels',       description: 'Add and reorder channels',                icon: Share2,      action: { kind: 'nav', dest: 'Settings', hash: 'settings/channels' } },
];

const ORDER_SEEDS: Array<{ no: string; cust: string }> = [
  { no: 'SO65117', cust: 'Mirabile Company' }, { no: 'SO65028', cust: 'Mirabile Company' },
  { no: 'SO64937', cust: 'Mirabile Company' }, { no: 'SO64881', cust: 'Mirabile Company' },
  { no: 'SO64912', cust: 'Mirabile Company' }, { no: 'SO64872', cust: 'Teres Western Wear' },
  { no: 'SO64801', cust: 'ALFA WESTERN WEAR' }, { no: 'SO64725', cust: 'Industrias Mercury' },
  { no: 'SO64660', cust: 'Lids' }, { no: 'SO64581', cust: 'Nordstrom AP' },
  { no: 'SO64502', cust: 'Urban Outfitters' }, { no: 'SO64477', cust: 'Zumiez' },
  { no: 'SO64400', cust: 'Buckle' }, { no: 'SO64321', cust: 'Scheels Sports' },
  { no: 'SO64250', cust: 'Journeys' },
];
const ORDERS: Result[] = ORDER_SEEDS.map((o) => ({ id: `ord-${o.no}`, group: 'Orders', title: o.no, description: o.cust, icon: Package, action: { kind: 'nav', dest: 'Open Sales Orders' } }));

const CUSTOMER_SEEDS: Array<{ name: string; meta: string }> = [
  { name: 'Teres Western Wear',  meta: 'CUST836123 · US Wholesale' },
  { name: 'ALFA WESTERN WEAR',   meta: '26770 · US Wholesale' },
  { name: 'Mirabile Company',    meta: 'CUST000142 · US Wholesale' },
  { name: 'Industrias Mercury',  meta: 'CUST204488 · Distributors' },
  { name: 'Lids',                meta: 'CUST309921 · US Wholesale' },
  { name: 'Nordstrom AP',        meta: 'CUST400008 · US Wholesale' },
  { name: 'Urban Outfitters',    meta: 'CUST400114 · US Wholesale' },
  { name: 'Zumiez',              meta: 'CUST500092 · US Wholesale' },
  { name: 'Buckle',              meta: 'CUST500210 · US Wholesale' },
  { name: 'Scheels Sports',      meta: 'CUST500441 · US Wholesale' },
  { name: 'Journeys',            meta: 'CUST500600 · US Wholesale' },
  { name: 'Hat Cult Boutique',   meta: 'CUST610122 · US Wholesale' },
  { name: 'Headwear Co',         meta: 'CUST610240 · US Wholesale' },
  { name: 'Playa Linda Shop',    meta: 'CUST700112 · Ecommerce' },
  { name: 'Sundowner Direct',    meta: 'CUST700228 · Ecommerce' },
  { name: 'Watchman Supply',     meta: 'CUST700335 · Ecommerce' },
  { name: 'Boonie Outfitters',   meta: 'CUST700466 · Ecommerce' },
  { name: 'Classic Beanie Co',   meta: 'CUST700501 · Ecommerce' },
  { name: 'Snapback Pro',        meta: 'CUST700624 · Ecommerce' },
  { name: 'Mesh Trucker Shop',   meta: 'CUST700709 · Ecommerce' },
];
const CUSTOMERS: Result[] = CUSTOMER_SEEDS.map((c, i) => ({ id: `cust-${i}`, group: 'Customers', title: c.name, description: c.meta, icon: Users, action: { kind: 'toast', text: 'Opening customer view — coming soon' } }));

const REPORTS: Result[] = [
  { id: 'rpt-dash',   group: 'Reports', title: 'Dashboard',        description: 'Operating snapshot',                 icon: LayoutGrid,    action: { kind: 'nav', dest: 'Dashboard' } },
  { id: 'rpt-pnl',    group: 'Reports', title: 'Profit & Loss',    description: 'Operating performance by period',    icon: FileText,      action: { kind: 'nav', dest: 'P&L' } },
  { id: 'rpt-prof',   group: 'Reports', title: 'Profitability',    description: 'Gross margin by channel',            icon: PieChart,      action: { kind: 'nav', dest: 'Profitability' } },
  { id: 'rpt-cash',   group: 'Reports', title: 'Cash Flow',        description: 'Sources and uses',                   icon: Wallet,        action: { kind: 'nav', dest: 'Cash Flow' } },
  { id: 'rpt-inv',    group: 'Reports', title: 'Inventory',        description: 'Stock levels and allocation',        icon: Boxes,         action: { kind: 'nav', dest: 'Inventory' } },
  { id: 'rpt-fg',     group: 'Reports', title: 'Forecast Goals',   description: 'Monthly revenue targets',            icon: Target,        action: { kind: 'nav', dest: 'Forecast Goals' } },
  { id: 'rpt-anal',   group: 'Reports', title: 'Analytics',        description: 'Operational and customer health',    icon: BarChart3,     action: { kind: 'nav', dest: 'Analytics' } },
  { id: 'rpt-custom', group: 'Reports', title: 'Custom Reporting', description: 'Build ad-hoc reports',               icon: FileBarChart,  action: { kind: 'nav', dest: 'Custom Reporting' } },
];

const ACTIONS: Result[] = [
  { id: 'act-export', group: 'Actions', title: 'Export this page', description: 'Download current view as CSV',       icon: Download,        action: { kind: 'toast', text: 'Export queued' } },
  { id: 'act-ai',     group: 'Actions', title: 'Open AI Assist',   description: 'Ask a question about your data',     icon: Sparkles,        action: { kind: 'open-ai' } },
  { id: 'act-side',   group: 'Actions', title: 'Toggle sidebar',   description: 'Collapse or expand the nav',         icon: PanelLeftClose,  action: { kind: 'toggle-sidebar' } },
];

const ALL: Result[] = [...SETTINGS, ...ORDERS, ...CUSTOMERS, ...REPORTS, ...ACTIONS];
const GROUP_ORDER: Group[] = ['Settings', 'Orders', 'Customers', 'Reports', 'Actions'];

const readRecents = (): string[] => { try { const r = localStorage.getItem(RECENTS_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
const writeRecents = (ids: string[]) => { try { localStorage.setItem(RECENTS_KEY, JSON.stringify(ids)); } catch { /* ignore */ } };

// ─── Component ─────────────────────────────────────────────────────────
export default function CommandSearch({ open, query, anchorRef, onClose, onNavigate, onToast, onOpenAi, onToggleSidebar, onClearQuery }: Props) {
  const [cursor, setCursor] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecents());
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 520 });
  const listRef = useRef<HTMLDivElement | null>(null);
  const idToIndex = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Position relative to anchor (topbar input)
  const compute = useCallback(() => {
    if (!anchorRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;
    const minW = isMobile ? vpW - 24 : Math.max(a.width, 520);
    const maxW = isMobile ? vpW - 24 : 720;
    const width = Math.min(Math.max(a.width, minW), maxW);
    let left = a.left;
    if (left + width > vpW - 12) left = Math.max(12, vpW - width - 12);
    if (isMobile) left = 12;
    setPos({ top: a.bottom + 6, left, width: isMobile ? vpW - 24 : width });
  }, [anchorRef, isMobile]);

  useLayoutEffect(() => {
    if (!open) return;
    compute();
    const id = window.requestAnimationFrame(compute);
    return () => window.cancelAnimationFrame(id);
  }, [open, compute, query]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => compute();
    const onScroll = (e: Event) => {
      if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) return;
      compute();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, compute]);

  useEffect(() => { if (open) { setCursor(0); setRecentIds(readRecents()); } }, [open]);
  useEffect(() => { setCursor(0); }, [query]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recents = recentIds.map((id) => ALL.find((r) => r.id === id)).filter(Boolean) as Result[];
      const out: Array<{ group: Group; items: Result[] }> = [];
      if (recents.length > 0) out.push({ group: 'Recent', items: recents });
      for (const g of GROUP_ORDER) {
        const items = ALL.filter((r) => r.group === g).slice(0, g === 'Reports' ? 8 : g === 'Settings' || g === 'Actions' ? 5 : 6);
        if (items.length) out.push({ group: g, items });
      }
      return out;
    }
    const filtered = ALL.filter((r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    const out: Array<{ group: Group; items: Result[] }> = [];
    for (const g of GROUP_ORDER) {
      const items = filtered.filter((r) => r.group === g);
      if (items.length) out.push({ group: g, items });
    }
    return out;
  }, [query, recentIds]);

  const flat = useMemo(() => {
    const arr: Result[] = [];
    const map = new Map<string, number>();
    sections.forEach((s) => s.items.forEach((it) => { map.set(it.id, arr.length); arr.push(it); }));
    idToIndex.current = map;
    return arr;
  }, [sections]);

  useEffect(() => { if (cursor >= flat.length) setCursor(0); }, [flat, cursor]);

  const run = useCallback((r: Result) => {
    setRecentIds((prev) => {
      const next = [r.id, ...prev.filter((id) => id !== r.id)].slice(0, MAX_RECENTS);
      writeRecents(next);
      return next;
    });
    const a = r.action;
    if (a.kind === 'nav') onNavigate(a.dest, a.hash);
    else if (a.kind === 'toast') onToast?.(a.text);
    else if (a.kind === 'open-ai') onOpenAi?.();
    else if (a.kind === 'toggle-sidebar') onToggleSidebar?.();
    onClearQuery?.();
    onClose();
  }, [onClose, onNavigate, onToast, onOpenAi, onToggleSidebar, onClearQuery]);

  const clearRecents = () => { writeRecents([]); setRecentIds([]); };

  // Keyboard (shared with topbar input)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); return; }
      if (e.key === 'Enter')     { e.preventDefault(); const r = flat[cursor]; if (r) run(r); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flat, cursor, run]);

  // Click outside closes (but not clicks on the anchor itself)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (listRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [open, onClose, anchorRef]);

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const noResults = flat.length === 0;

  return (
    <>
      {/* Subtle backdrop (click-outside is handled by mousedown effect) */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(14,14,16,0.06)', animation: 'cmd-fade-in 150ms ease-out', pointerEvents: 'none' }}
      />
      <div
        ref={listRef}
        role="dialog"
        aria-label="Search results"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          width: pos.width,
          zIndex: 72,
          background: '#FFFFFF',
          borderRadius: 16,
          border: `1px solid ${SLATE_200}`,
          boxShadow: '0 20px 48px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isMobile ? 'calc(80dvh - 100px)' : 520,
          animation: 'cmd-tray-anchored-in 180ms ease-out',
        }}
        data-testid="command-tray"
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }} data-testid="command-results">
          {noResults ? (
            <EmptyState q={query} />
          ) : (
            sections.map((sec, si) => (
              <div key={`${sec.group}-${si}`} style={{ padding: '4px 10px 8px' }}>
                <div className="flex items-center justify-between" style={{ padding: '12px 10px 6px' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500 }}>{sec.group}</p>
                  {sec.group === 'Recent' && (
                    <button type="button" onClick={clearRecents} style={{ background: 'transparent', border: 'none', padding: 0, color: SLATE_500, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }} data-testid="command-clear-recents">Clear</button>
                  )}
                </div>
                {sec.items.map((it, idx) => {
                  const flatIdx = idToIndex.current.get(it.id) ?? 0;
                  const active = flatIdx === cursor;
                  const Icon = it.icon;
                  const isLast = idx === sec.items.length - 1;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setCursor(flatIdx)}
                      onClick={() => run(it)}
                      data-active={active ? 'true' : undefined}
                      data-testid={`command-item-${it.id}`}
                      style={{
                        width: '100%', height: 56, padding: '0 10px',
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: active ? SLATE_100 : 'transparent',
                        border: 'none', borderRadius: 10, cursor: 'pointer',
                        textAlign: 'left', fontFamily: 'inherit', position: 'relative',
                      }}
                    >
                      <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, background: active ? '#FFFFFF' : SLATE_100, color: SLATE_700, borderRadius: 10, flexShrink: 0, transition: 'background 120ms ease' }}>
                        <Icon size={18} strokeWidth={1.8} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
                        <span style={{ fontSize: 12.5, color: SLATE_500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.description}</span>
                      </span>
                      <ArrowRight size={14} strokeWidth={2} style={{ color: SLATE_400, flexShrink: 0, opacity: active ? 1 : 0.6 }} />
                      {!isLast && <span aria-hidden="true" style={{ position: 'absolute', left: 70, right: 10, bottom: -1, height: 1, background: '#F3F3F5' }} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {!isMobile && (
          <div style={{ height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', borderTop: `1px solid ${SLATE_100}`, background: SLATE_50 }}>
            <HintGroup keys={['↑', '↓']} label="navigate" />
            <HintGroup keys={['enter']} label="select" />
            <HintGroup keys={['esc']} label="close" />
          </div>
        )}
      </div>
    </>
  );
}

function HintGroup({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <span className="flex items-center" style={{ gap: 2 }}>
        {keys.map((k) => <kbd key={k} style={kbdStyle}>{k}</kbd>)}
      </span>
      <span style={{ fontSize: 11, color: '#6E6E73' }}>{label}</span>
    </div>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div style={{ minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }} data-testid="command-empty">
      <Search size={32} strokeWidth={1.6} style={{ color: SLATE_300 }} />
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: SLATE_700 }}>No results for "{q}"</p>
      <p style={{ margin: 0, fontSize: 12.5, color: SLATE_500 }}>Try searching by name, order #, or SKU.</p>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 20, height: 20, padding: '0 6px',
  background: '#FAFAFA', border: `1px solid ${SLATE_200}`, borderRadius: 6,
  fontFamily: 'inherit', fontSize: 10, fontWeight: 600,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: SLATE_500, lineHeight: 1,
};
