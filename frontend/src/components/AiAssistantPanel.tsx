import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Mail, MoreHorizontal, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import PopoverPortal from './PopoverPortal';

// ─── Types ─────────────────────────────────────────────────────────────
type Role = 'user' | 'assistant';
type ActionChip = { label: string; icon?: typeof Mail; kind: 'toast' | 'route'; payload?: string };
type Message = { id: string; role: Role; content: string; createdAt: string; actions?: ActionChip[] };
type Chat = { id: string; title: string; createdAt: string; updatedAt: string; messages: Message[]; draft?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onToast?: (msg: string) => void;
  onNavigate?: (dest: string) => void;
};

// ─── Tokens ────────────────────────────────────────────────────────────
const INK = '#0A0A0B';
const SLATE_700 = '#334155';
const SLATE_500 = '#6E6E73';
const SLATE_400 = '#94A3B8';
const SLATE_200 = '#E5E5E7';
const SLATE_100 = '#F1F1F3';
const SLATE_50 = '#FAFAFA';
const CORAL = '#FF6F61';
const CORAL_DK = '#C9422E';
const CORAL_50 = '#FFF1EF';
const CORAL_200 = '#FDD7D2';
const CORAL_700 = '#B04435';

const KEY_CHATS = 'ai.chats';
const KEY_ACTIVE = 'ai.activeChatId';
const KEY_SEEDED = 'ai.seeded';
const MAX_CHATS = 50;
const MAX_MESSAGES_PER_CHAT = 100;

const SUGGESTIONS = [
  'Which channel is growing fastest QTD?',
  'Show me at-risk accounts',
  'Draft a weekly recap email',
  'Explain my gross margin drop',
];

// ─── Storage helpers ───────────────────────────────────────────────────
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const nowIso = () => new Date().toISOString();
const readChats = (): Chat[] => { try { const r = localStorage.getItem(KEY_CHATS); return r ? JSON.parse(r) : []; } catch { return []; } };
const writeChats = (c: Chat[]) => { try { localStorage.setItem(KEY_CHATS, JSON.stringify(c)); } catch { /* ignore */ } };
const readActiveId = (): string | null => { try { return localStorage.getItem(KEY_ACTIVE); } catch { return null; } };
const writeActiveId = (id: string | null) => { try { if (id) localStorage.setItem(KEY_ACTIVE, id); else localStorage.removeItem(KEY_ACTIVE); } catch { /* ignore */ } };

// ─── Mock reply engine ────────────────────────────────────────────────
function mockReply(input: string): { text: string; actions?: ActionChip[] } {
  const q = input.toLowerCase();
  if (q.includes('top sku') || q.includes('best product') || (q.includes('top') && q.includes('margin'))) {
    return { text: 'Your top SKU by margin this quarter is **The Sundowner** at 54.2% margin ($142K GP). Second: **Dean Cap** at 51.1% ($128K).' };
  }
  if (q.includes('channel') && (q.includes('growing') || q.includes('fastest') || q.includes('growth'))) {
    return { text: '**Ecommerce** is growing fastest QTD at +18.6% YoY vs **US Wholesale** +4.1%. **Distributors** are flat (-0.3%).' };
  }
  if (q.includes('at-risk') || q.includes('at risk')) {
    return {
      text: '3 wholesale accounts are at risk:\n\n**Industrias Mercury** — last order 68 days ago, 2× normal cadence.\n**Buckle** — -42% YoY revenue.\n**Zumiez** — 3 overdue invoices.',
      actions: [{ label: 'Open accounts', kind: 'route', payload: 'Open Sales Orders' }],
    };
  }
  if (q.includes('weekly recap') || q.includes('draft email') || (q.includes('draft') && q.includes('recap'))) {
    return {
      text: "Here's a draft:\n\n**Week ending Oct 3** — Revenue hit $482K (+12% WoW). Open orders are 20 units behind pace, led by The Sundowner backorder. Three wholesale accounts need follow-up: Industrias, Buckle, Zumiez.\n\n*Want me to send this to your inbox?*",
      actions: [
        { label: 'Send to inbox', icon: Mail, kind: 'toast', payload: 'Sent to ryan@mirabile.com' },
        { label: 'Copy', icon: Copy, kind: 'toast', payload: 'Copied to clipboard' },
      ],
    };
  }
  if (q.includes('compare') && q.includes('p&l')) {
    return {
      text: '**Mar vs Feb P&L** — Revenue +$184K (+8.2%). Gross profit +$96K (+9.4%). Operating income +$42K (+11.1%). The lift came from Ecommerce +$124K and lower returns -3.2pp.',
      actions: [{ label: 'Open P&L', kind: 'route', payload: 'P&L' }],
    };
  }
  if (q.includes('margin') && (q.includes('drop') || q.includes('down') || q.includes('fell'))) {
    return { text: 'Gross margin fell 1.8pp this month. Driver: **COGS inflation on cotton** (+$42K) and higher freight on Distributor backfill orders (+$18K). Returns were steady.' };
  }
  if (q.includes('revenue') && q.includes('ytd')) {
    return { text: 'YTD revenue is **$18.14M**, up 26.3% YoY. Ecommerce leads growth at +18.6%, Wholesale +12.1%, Retail -4.2%.' };
  }
  return { text: "Here's what I'd check first — your QTD numbers trend positive across channels, but **The Sundowner** is backordered for 11 days. Want a deeper dive on any area?" };
}

// ─── Markdown-ish renderer ─────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) parts.push(<strong key={`b${key++}`} style={{ fontWeight: 600, color: INK }}>{token.slice(2, -2)}</strong>);
    else parts.push(<em key={`i${key++}`} style={{ fontStyle: 'italic' }}>{token.slice(1, -1)}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
function renderMessage(text: string) {
  return text.split('\n').map((line, i) => (
    <span key={i} style={{ display: 'block', minHeight: line.length === 0 ? '0.5em' : undefined }}>
      {line.length === 0 ? '\u00A0' : renderInline(line)}
    </span>
  ));
}

// ─── Date bucketing ────────────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;
function bucketOf(ts: string): string {
  const now = Date.now();
  const t = new Date(ts).getTime();
  const diff = now - t;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (t >= startOfToday.getTime()) return 'Today';
  if (t >= startOfToday.getTime() - DAY) return 'Yesterday';
  if (diff <= 7 * DAY) return 'Last 7 days';
  if (diff <= 30 * DAY) return 'Last 30 days';
  return 'Older';
}
const BUCKET_ORDER = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older'] as const;

function relTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ─── Seed mock chats on first open ─────────────────────────────────────
function seedChats(): Chat[] {
  const now = Date.now();
  const h = (hours: number) => new Date(now - hours * 3600_000).toISOString();
  return [
    {
      id: uid(),
      title: 'Weekly recap draft',
      createdAt: h(0.6), updatedAt: h(0.5),
      messages: [
        { id: uid(), role: 'user', content: 'Draft a weekly recap email', createdAt: h(0.6) },
        { id: uid(), role: 'assistant', createdAt: h(0.59), content: "Here's a draft:\n\n**Week ending Oct 3** — Revenue hit $482K (+12% WoW). Open orders are 20 units behind pace, led by The Sundowner backorder. Three wholesale accounts need follow-up: Industrias, Buckle, Zumiez.\n\n*Want me to send this to your inbox?*", actions: [{ label: 'Send to inbox', icon: Mail, kind: 'toast', payload: 'Sent to ryan@mirabile.com' }, { label: 'Copy', icon: Copy, kind: 'toast', payload: 'Copied to clipboard' }] },
      ],
    },
    {
      id: uid(),
      title: 'Top SKU by margin',
      createdAt: h(26), updatedAt: h(26),
      messages: [
        { id: uid(), role: 'user', content: "What's my top SKU by margin?", createdAt: h(26) },
        { id: uid(), role: 'assistant', createdAt: h(25.99), content: 'Your top SKU by margin this quarter is **The Sundowner** at 54.2% margin ($142K GP). Second: **Dean Cap** at 51.1% ($128K).' },
      ],
    },
    {
      id: uid(),
      title: 'Channel growth QTD',
      createdAt: h(5 * 24), updatedAt: h(5 * 24),
      messages: [
        { id: uid(), role: 'user', content: 'Which channel is growing fastest QTD?', createdAt: h(5 * 24) },
        { id: uid(), role: 'assistant', createdAt: h(5 * 24 - 0.01), content: '**Ecommerce** is growing fastest QTD at +18.6% YoY vs **US Wholesale** +4.1%. **Distributors** are flat (-0.3%).' },
      ],
    },
    {
      id: uid(),
      title: 'Explain gross margin drop',
      createdAt: h(21 * 24), updatedAt: h(21 * 24),
      messages: [
        { id: uid(), role: 'user', content: 'Explain my gross margin drop', createdAt: h(21 * 24) },
        { id: uid(), role: 'assistant', createdAt: h(21 * 24 - 0.01), content: 'Gross margin fell 1.8pp this month. Driver: **COGS inflation on cotton** (+$42K) and higher freight on Distributor backfill orders (+$18K). Returns were steady.' },
      ],
    },
  ];
}

// ─── Small helpers ─────────────────────────────────────────────────────
function autoTitle(first: string): string {
  const s = first.replace(/\s+/g, ' ').trim();
  if (s.length <= 40) return s;
  return `${s.slice(0, 40).trim()}…`;
}
function SparkleAvatar({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size * 0.3,
        background: 'linear-gradient(135deg, #FF9080 0%, #FF6F61 55%, #DB4D3F 100%)',
        display: 'grid', placeItems: 'center', color: '#FFFFFF',
        boxShadow: '0 1px 2px rgba(201,66,46,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <Sparkles size={size * 0.5} strokeWidth={2} />
    </div>
  );
}
function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 2px' }} aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: SLATE_400, animation: `ai-dot 1.1s ${i * 0.14}s infinite ease-in-out` }} />
      ))}
    </span>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────
export default function AiAssistantPanel({ open, onClose, onToast, onNavigate }: Props) {
  const [chats, setChats] = useState<Chat[]>(() => readChats());
  const [activeId, setActiveId] = useState<string | null>(() => readActiveId());
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [clearModal, setClearModal] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [pendingDelete, setPendingDelete] = useState<{ chat: Chat; timer: number } | null>(null);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerMenuBtnRef = useRef<HTMLButtonElement | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Persist on change
  useEffect(() => { writeChats(chats); }, [chats]);
  useEffect(() => { writeActiveId(activeId); }, [activeId]);

  // Mobile breakpoint listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Seed + ensure an active chat exists when opening
  useEffect(() => {
    if (!open) return;
    const seeded = (() => { try { return localStorage.getItem(KEY_SEEDED) === '1'; } catch { return false; } })();
    if (!seeded && chats.length === 0) {
      const s = seedChats();
      setChats(s);
      setActiveId(s[0].id);
      try { localStorage.setItem(KEY_SEEDED, '1'); } catch { /* ignore */ }
      return;
    }
    if (chats.length === 0) {
      // No chats + already seeded → create a fresh empty one
      const c: Chat = { id: uid(), title: 'New chat', createdAt: nowIso(), updatedAt: nowIso(), messages: [] };
      setChats([c]);
      setActiveId(c.id);
      return;
    }
    if (!activeId || !chats.find((c) => c.id === activeId)) setActiveId(chats[0].id);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (renamingId) { setRenamingId(null); return; } if (clearModal) { setClearModal(false); return; } onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, renamingId, clearModal]);

  // Autofocus textarea when panel/chat changes
  useEffect(() => {
    if (open && (!isMobile || mobileView === 'chat')) {
      const t = setTimeout(() => taRef.current?.focus(), 260);
      return () => clearTimeout(t);
    }
  }, [open, activeId, mobileView, isMobile]);

  // Restore draft when switching chats
  useEffect(() => {
    const c = chats.find((x) => x.id === activeId);
    setInput(c?.draft ?? '');
    setTyping(false);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist draft while typing (debounced via effect on input)
  useEffect(() => {
    if (!activeId) return;
    setChats((prev) => prev.map((c) => c.id === activeId ? { ...c, draft: input } : c));
  }, [input, activeId]);

  // Autoscroll on new messages + track scroll-up state for "New message ↓" pill
  const [atBottom, setAtBottom] = useState(true);
  const [showNewPill, setShowNewPill] = useState(false);
  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    if (atBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowNewPill(false);
    } else {
      setShowNewPill(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, chats, typing, open, mobileView]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBot = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      setAtBottom(atBot);
      if (atBot) setShowNewPill(false);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [open]);

  // Autoresize textarea
  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 128)}px`;
  }, [input]);

  const active = useMemo(() => chats.find((c) => c.id === activeId) || null, [chats, activeId]);
  const canSend = input.trim().length > 0 && !typing;

  // Group chats by bucket (within each bucket, newest first)
  const grouped = useMemo(() => {
    const g: Record<string, Chat[]> = {};
    [...chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).forEach((c) => {
      const b = bucketOf(c.updatedAt);
      (g[b] = g[b] || []).push(c);
    });
    return BUCKET_ORDER.map((b) => [b, g[b] || []] as const).filter(([, arr]) => arr.length > 0);
  }, [chats]);

  const createChat = useCallback((): Chat => {
    const c: Chat = { id: uid(), title: 'New chat', createdAt: nowIso(), updatedAt: nowIso(), messages: [] };
    setChats((prev) => {
      const next = [c, ...prev];
      if (next.length > MAX_CHATS) next.length = MAX_CHATS;
      return next;
    });
    setActiveId(c.id);
    setInput('');
    if (isMobile) setMobileView('chat');
    return c;
  }, [isMobile]);

  const selectChat = (id: string) => {
    setActiveId(id);
    if (isMobile) setMobileView('chat');
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    const targetId = active?.id ?? createChat().id;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, createdAt: nowIso() };
    setChats((prev) => prev.map((c) => {
      if (c.id !== targetId) return c;
      const isFirst = c.messages.length === 0 && (c.title === 'New chat' || c.title.trim() === '');
      const title = isFirst ? autoTitle(text) : c.title;
      const trimmed = [...c.messages, userMsg].slice(-MAX_MESSAGES_PER_CHAT);
      return { ...c, messages: trimmed, title, updatedAt: nowIso(), draft: '' };
    }));
    setInput('');
    setTyping(true);
    const delay = 900 + Math.random() * 900;
    window.setTimeout(() => {
      const r = mockReply(text);
      const aMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: r.text, createdAt: nowIso(), actions: r.actions };
      setChats((prev) => prev.map((c) => c.id !== targetId ? c : { ...c, messages: [...c.messages, aMsg].slice(-MAX_MESSAGES_PER_CHAT), updatedAt: nowIso() }));
      setTyping(false);
    }, delay);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleAction = (a: ActionChip) => {
    if (a.kind === 'toast') onToast?.(a.payload || 'Done');
    else if (a.kind === 'route' && a.payload) onNavigate?.(a.payload);
  };

  // Rename
  const startRename = (c: Chat) => { setRenamingId(c.id); setRenameValue(c.title); };
  const commitRename = () => {
    if (!renamingId) return;
    const t = renameValue.trim() || 'Untitled chat';
    setChats((prev) => prev.map((c) => c.id === renamingId ? { ...c, title: t } : c));
    setRenamingId(null);
  };

  // Delete with undo
  const requestDelete = (c: Chat) => {
    // Clear any existing pending delete
    if (pendingDelete) window.clearTimeout(pendingDelete.timer);
    const timer = window.setTimeout(() => {
      setChats((prev) => {
        const next = prev.filter((x) => x.id !== c.id);
        if (c.id === activeId) {
          if (next.length === 0) {
            const fresh: Chat = { id: uid(), title: 'New chat', createdAt: nowIso(), updatedAt: nowIso(), messages: [] };
            setActiveId(fresh.id);
            return [fresh];
          }
          setActiveId(next[0].id);
        }
        return next;
      });
      setPendingDelete(null);
    }, 4000);
    setPendingDelete({ chat: c, timer });
    onToast?.(`Deleted "${c.title}" · Undo`);
  };
  const undoDelete = () => {
    if (!pendingDelete) return;
    window.clearTimeout(pendingDelete.timer);
    setPendingDelete(null);
    onToast?.('Delete undone');
  };

  // Clear all
  const clearAll = () => {
    try { localStorage.removeItem(KEY_CHATS); localStorage.removeItem(KEY_ACTIVE); } catch { /* ignore */ }
    const fresh: Chat = { id: uid(), title: 'New chat', createdAt: nowIso(), updatedAt: nowIso(), messages: [] };
    setChats([fresh]);
    setActiveId(fresh.id);
    setClearModal(false);
    setHeaderMenuOpen(false);
    onToast?.('Chat history cleared');
  };

  const empty = !active || active.messages.length === 0;

  return (
    <>
      {/* Backdrop (mobile only via CSS) */}
      <div
        onClick={onClose}
        className="ai-backdrop"
        style={{
          position: 'fixed', inset: 0, zIndex: 55,
          background: 'rgba(14,14,16,0.3)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 240ms ease',
        }}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        aria-hidden={!open}
        aria-label="AI Assistant"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 520, maxWidth: '100%',
          background: '#FFFFFF',
          borderLeft: '1px solid #EDEDEF',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
          zIndex: 60,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 240ms cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        data-testid="ai-assist-panel"
      >
        {/* Header */}
        <header style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid #EDEDEF' }}>
          <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
            {isMobile && mobileView === 'chat' && chats.length > 0 && (
              <button type="button" onClick={() => setMobileView('list')} className="btn-ghost" style={{ width: 32, height: 32, padding: 0, display: 'inline-grid', placeItems: 'center' }} aria-label="Chat history" data-testid="ai-mobile-back">
                <ArrowLeft size={15} strokeWidth={2} />
              </button>
            )}
            <SparkleAvatar size={32} />
            <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>AI Assist</span>
            <span className="chip-coral" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Beta</span>
          </div>
          <div className="flex items-center" style={{ gap: 2 }}>
            <button ref={headerMenuBtnRef} type="button" onClick={() => setHeaderMenuOpen((o) => !o)} className="btn-ghost" style={{ width: 32, height: 32, padding: 0, display: 'inline-grid', placeItems: 'center' }} aria-label="More options" aria-haspopup="menu" aria-expanded={headerMenuOpen} data-testid="ai-header-menu">
              <MoreHorizontal size={15} strokeWidth={2} />
            </button>
            <PopoverPortal open={headerMenuOpen} onClose={() => setHeaderMenuOpen(false)} anchorRef={headerMenuBtnRef} placement="bottom-end" minWidth={200} padding={4} testId="ai-header-menu-popover">
              <button type="button" onClick={() => { setHeaderMenuOpen(false); setClearModal(true); }} className="w-full flex items-center" style={{ gap: 8, padding: '8px 10px', background: 'transparent', color: CORAL_700, fontSize: 13, fontWeight: 500, borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onMouseEnter={(e) => { e.currentTarget.style.background = CORAL_50; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} data-testid="ai-clear-history">
                <Trash2 size={13} strokeWidth={2} />Clear all chats
              </button>
              <button type="button" disabled className="w-full flex items-center" style={{ gap: 8, padding: '8px 10px', background: 'transparent', color: SLATE_400, fontSize: 13, fontWeight: 500, borderRadius: 6, border: 'none', cursor: 'not-allowed', textAlign: 'left', fontFamily: 'inherit' }}>
                Export chats · soon
              </button>
            </PopoverPortal>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ width: 32, height: 32, padding: 0, display: 'inline-grid', placeItems: 'center' }} aria-label="Close" title="Close" data-testid="ai-close">
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Body: list + conversation */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* LEFT: chat list */}
          {(!isMobile || mobileView === 'list') && (
            <aside
              style={{
                width: isMobile ? '100%' : 200,
                flexShrink: 0,
                borderRight: isMobile ? 'none' : '1px solid #EDEDEF',
                display: 'flex', flexDirection: 'column',
                background: '#FFFFFF',
              }}
              data-testid="ai-chat-list"
            >
              <div style={{ padding: 12 }}>
                <button type="button" onClick={createChat} className="btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} data-testid="ai-new-chat-btn">
                  <Plus size={13} strokeWidth={2} />New chat
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
                {grouped.map(([bucket, items]) => (
                  <div key={bucket} style={{ marginTop: 8 }}>
                    <p style={{ margin: '0 8px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500 }}>{bucket}</p>
                    {items.map((c) => (
                      <ChatListItem
                        key={c.id}
                        chat={c}
                        active={c.id === activeId}
                        renaming={renamingId === c.id}
                        renameValue={renameValue}
                        setRenameValue={setRenameValue}
                        onCommitRename={commitRename}
                        onCancelRename={() => setRenamingId(null)}
                        onSelect={() => selectChat(c.id)}
                        onRename={() => startRename(c)}
                        onDelete={() => requestDelete(c)}
                        onUndoDelete={pendingDelete?.chat.id === c.id ? undoDelete : undefined}
                      />
                    ))}
                  </div>
                ))}
                {grouped.length === 0 && (
                  <p style={{ margin: '16px 12px', fontSize: 12, color: SLATE_500 }}>No chats yet. Start one above.</p>
                )}
              </div>
            </aside>
          )}

          {/* RIGHT: conversation */}
          {(!isMobile || mobileView === 'chat') && (
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }} data-testid="ai-messages">
                {empty ? (
                  <EmptyState onPick={(p) => send(p)} />
                ) : (
                  <>
                    {active!.messages.map((m) => (
                      <MessageBubble key={m.id} msg={m} onAction={handleAction} />
                    ))}
                    {typing && (
                      <div className="flex items-start" style={{ gap: 10, alignSelf: 'flex-start', maxWidth: '85%' }} data-testid="ai-typing">
                        <SparkleAvatar size={32} />
                        <div style={{ background: SLATE_100, color: INK, padding: '12px 14px', borderRadius: '14px 14px 14px 4px' }}>
                          <TypingDots />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Floating "New message ↓" scroll pill */}
              {showNewPill && (
                <button
                  type="button"
                  onClick={() => {
                    if (!scrollRef.current) return;
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    setShowNewPill(false);
                  }}
                  className="inline-flex items-center"
                  style={{ position: 'absolute', bottom: 92, left: '50%', transform: 'translateX(-50%)', zIndex: 10, gap: 6, height: 30, padding: '0 12px', borderRadius: 999, background: INK, color: '#FFFFFF', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(10,10,11,0.26)', fontFamily: 'inherit' }}
                  data-testid="ai-new-message-pill"
                >
                  New messages
                  <ArrowDown size={13} strokeWidth={2.2} />
                </button>
              )}

              {/* Input */}
              <div style={{ padding: 16, borderTop: '1px solid #EDEDEF', flexShrink: 0 }}>
                <div className="flex items-end" style={{ gap: 8 }}>
                  <textarea
                    ref={taRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about your data…"
                    rows={1}
                    className="ds-input"
                    style={{ resize: 'none', minHeight: 40, maxHeight: 128, padding: '10px 12px', lineHeight: 1.4 }}
                    data-testid="ai-input"
                  />
                  <button
                    type="button"
                    onClick={() => send()}
                    disabled={!canSend}
                    aria-label="Send"
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: canSend ? CORAL : SLATE_200,
                      color: canSend ? '#FFFFFF' : SLATE_400,
                      border: 'none',
                      display: 'inline-grid', placeItems: 'center',
                      cursor: canSend ? 'pointer' : 'not-allowed',
                      transition: 'background 140ms ease, color 140ms ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { if (canSend) e.currentTarget.style.background = CORAL_DK; }}
                    onMouseLeave={(e) => { if (canSend) e.currentTarget.style.background = CORAL; }}
                    data-testid="ai-send"
                  >
                    <ArrowUp size={16} strokeWidth={2.2} />
                  </button>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: SLATE_400 }}>
                  Press <kbd style={{ fontFamily: 'inherit', fontSize: 11 }}>Enter</kbd> to send · <kbd style={{ fontFamily: 'inherit', fontSize: 11 }}>Shift + Enter</kbd> for new line
                </p>
              </div>
            </section>
          )}
        </div>
      </aside>

      {/* Clear history modal */}
      {clearModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'grid', placeItems: 'center', background: 'rgba(10,10,11,0.42)', padding: 20 }} onClick={() => setClearModal(false)} data-testid="ai-clear-modal">
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)', background: '#FFFFFF', borderRadius: 16, padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Clear chat history?</h3>
            <p style={{ margin: '8px 0 20px', fontSize: 13.5, color: SLATE_500, lineHeight: 1.55 }}>
              This permanently deletes all <strong style={{ fontWeight: 600, color: INK }}>{chats.length}</strong> chat{chats.length === 1 ? '' : 's'} and their messages. This cannot be undone.
            </p>
            <div className="flex items-center justify-end" style={{ gap: 8 }}>
              <button type="button" onClick={() => setClearModal(false)} className="btn-ghost btn-sm" data-testid="ai-clear-cancel">Cancel</button>
              <button type="button" onClick={clearAll} className="btn-coral btn-sm" data-testid="ai-clear-confirm">
                <Trash2 size={13} strokeWidth={2} />Clear everything
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Chat list item ────────────────────────────────────────────────────
function ChatListItem({
  chat, active, renaming, renameValue, setRenameValue, onCommitRename, onCancelRename, onSelect, onRename, onDelete, onUndoDelete,
}: {
  chat: Chat;
  active: boolean;
  renaming: boolean;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onUndoDelete?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (renaming) { setTimeout(() => inputRef.current?.select(), 10); } }, [renaming]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={renaming ? undefined : onSelect}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px',
        borderRadius: 10, margin: '2px 0',
        background: active || hover ? '#F4F4F6' : 'transparent',
        cursor: renaming ? 'default' : 'pointer',
        minHeight: 48,
      }}
      data-testid={`ai-chat-${chat.id}`}
      data-active={active ? 'true' : undefined}
    >
      {active && <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 24, borderRadius: 999, background: CORAL }} />}
      <div style={{ minWidth: 0, flex: 1 }}>
        {renaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onCommitRename(); } else if (e.key === 'Escape') { e.preventDefault(); onCancelRename(); } }}
            onBlur={onCommitRename}
            onClick={(e) => e.stopPropagation()}
            className="ds-input"
            style={{ height: 28, padding: '0 8px', fontSize: 12.5 }}
            data-testid={`ai-rename-input-${chat.id}`}
          />
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.title}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: SLATE_500 }}>
              {onUndoDelete ? (
                <button onClick={(e) => { e.stopPropagation(); onUndoDelete(); }} style={{ background: 'transparent', border: 'none', color: CORAL_DK, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Undo delete</button>
              ) : (
                relTime(chat.updatedAt)
              )}
            </p>
          </>
        )}
      </div>
      {!renaming && hover && (
        <>
          <button
            ref={menuBtnRef}
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="btn-ghost"
            style={{ width: 24, height: 24, padding: 0, display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}
            aria-label="Chat options"
            aria-haspopup="menu"
            data-testid={`ai-chat-menu-${chat.id}`}
          >
            <MoreHorizontal size={13} strokeWidth={2} />
          </button>
          <PopoverPortal open={menuOpen} onClose={() => setMenuOpen(false)} anchorRef={menuBtnRef} placement="bottom-end" minWidth={160} padding={4} testId={`ai-chat-menu-popover-${chat.id}`}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(); }} className="w-full flex items-center" style={{ gap: 8, padding: '8px 10px', background: 'transparent', color: SLATE_700, fontSize: 13, fontWeight: 500, borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} data-testid={`ai-chat-rename-${chat.id}`}>
              <Pencil size={13} strokeWidth={2} />Rename
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }} className="w-full flex items-center" style={{ gap: 8, padding: '8px 10px', background: 'transparent', color: CORAL_700, fontSize: 13, fontWeight: 500, borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onMouseEnter={(e) => { e.currentTarget.style.background = CORAL_50; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} data-testid={`ai-chat-delete-${chat.id}`}>
              <Trash2 size={13} strokeWidth={2} />Delete
            </button>
          </PopoverPortal>
        </>
      )}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────
function EmptyState({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center" style={{ gap: 10, padding: '12px 4px 0' }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: CORAL_50, display: 'grid', placeItems: 'center', color: CORAL_DK }}>
        <Sparkles size={26} strokeWidth={1.9} />
      </div>
      <h3 style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>Ask me anything about your business</h3>
      <p style={{ margin: '2px 0 14px', fontSize: 13, color: SLATE_500, lineHeight: 1.5, maxWidth: 320 }}>
        I can analyze sales, surface risks, and draft insights across your data.
      </p>
      <div className="flex flex-col w-full" style={{ gap: 8 }} data-testid="ai-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="inline-flex items-center w-full"
            style={{
              gap: 10,
              padding: '10px 14px',
              borderRadius: 999,
              textAlign: 'left',
              background: '#FFFFFF',
              color: INK,
              border: `1px solid ${SLATE_200}`,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.3,
              fontFamily: 'inherit',
              transition: 'background 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = CORAL_50; e.currentTarget.style.borderColor = CORAL; e.currentTarget.style.color = CORAL_DK; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = SLATE_200; e.currentTarget.style.color = INK; }}
            data-testid={`ai-suggestion-${s.toLowerCase().slice(0, 24).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
          >
            <Sparkles size={12} strokeWidth={2.2} style={{ color: CORAL, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onAction }: { msg: Message; onAction: (a: ActionChip) => void }) {
  const isUser = msg.role === 'user';
  const bubble: React.CSSProperties = isUser
    ? { background: INK, color: '#FFFFFF', borderRadius: '14px 14px 4px 14px', padding: '12px 14px', width: 'fit-content', maxWidth: '100%' }
    : { background: SLATE_100, color: INK, borderRadius: '14px 14px 14px 4px', padding: '12px 14px', width: 'fit-content', maxWidth: '100%' };

  return (
    <div
      className="flex"
      style={{
        gap: 10, flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        animation: 'ai-msg-in 220ms ease-out',
      }}
      data-testid={`ai-msg-${msg.role}`}
    >
      {!isUser && <SparkleAvatar size={32} />}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', minWidth: 0, maxWidth: '100%' }}>
        <div style={{ ...bubble, fontSize: 13.5, lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          <div>{renderMessage(msg.content)}</div>
          {msg.actions && msg.actions.length > 0 && (
            <div className="flex flex-wrap" style={{ gap: 6, marginTop: 10 }}>
              {msg.actions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => onAction(a)}
                    className="chip-neutral"
                    style={{ cursor: 'pointer', border: `1px solid ${SLATE_200}`, fontFamily: 'inherit', background: '#FFFFFF', color: INK }}
                    data-testid={`ai-action-${a.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  >
                    {Icon && <Icon size={12} strokeWidth={2} />}
                    {a.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <span style={{ marginTop: 4, fontSize: 11, color: SLATE_400 }}>{fmtTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}
