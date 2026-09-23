import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Ban,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  Download,
  FolderClosed,
  Layers,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Snowflake,
  Trash2,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import { money } from '@/lib/money';
import './ops.css';
import './prebookreview.css';

type Props = { onNavigate: (label: string) => void };

/* ---------- seasons / drops ---------- */
type DropT = { id: string; label: string; status: 'open' | 'closed'; count?: number };
type SeasonT = { id: string; status: 'open' | 'closing' | 'closed'; archived?: boolean; deadline: string; drops: DropT[] };
const SEASONS: SeasonT[] = [
  { id: 'SS27', status: 'closing', deadline: '9/21/2026', drops: [
    { id: 'drop1', label: 'Drop 1', status: 'closed' },
    { id: 'drop2', label: 'Drop 2', status: 'closed' },
    { id: 'drop3', label: 'Drop 3', status: 'open', count: 21 },
  ] },
  { id: 'FW27', status: 'open', deadline: '12/15/2026', drops: [
    { id: 'drop1', label: 'Drop 1', status: 'open', count: 8 },
    { id: 'drop2', label: 'Drop 2', status: 'open', count: 3 },
  ] },
  { id: 'FW26', status: 'closed', archived: true, deadline: '12/10/2025', drops: [
    { id: 'drop1', label: 'Drop 1', status: 'closed' },
    { id: 'drop2', label: 'Drop 2', status: 'closed' },
    { id: 'drop3', label: 'Drop 3', status: 'closed' },
  ] },
  { id: 'SS26', status: 'closed', archived: true, deadline: '9/18/2025', drops: [
    { id: 'drop1', label: 'Drop 1', status: 'closed' },
    { id: 'drop2', label: 'Drop 2', status: 'closed' },
  ] },
];

const combined = { accounts: 4, units: 13328, wholesale: '$130K', moqTone: 'amber' };
const chan = { usw: { units: 932, wholesale: '$19K', moq: '10%' }, dist: { units: 12396, wholesale: '$112K', moq: '38%' } };

type Sku = { sku: string; name: string; usw: number; dist: number; ext: number | null; total: number; moq: number };
const skus: Sku[] = [
  { sku: '101-0385-BIS01-O/S', name: 'The GOAT', usw: 0, dist: 192, ext: null, total: 192, moq: 432 },
  { sku: '101-0443-GRY02-O/S', name: 'The Koala', usw: 0, dist: 192, ext: null, total: 192, moq: 432 },
  { sku: '101-2539-OIL01-O/S', name: 'Boss Trucker', usw: 0, dist: 192, ext: null, total: 192, moq: 432 },
  { sku: '101-2541-NVY01/MAR02-O/S', name: 'Freedom Eagle Trucker', usw: 0, dist: 192, ext: null, total: 192, moq: 432 },
  { sku: '101-0388-KHK01-O/S', name: 'The Farm', usw: 24, dist: 168, ext: null, total: 192, moq: 432 },
  { sku: '101-6612-BLK01-O/S', name: 'Wilderness Patch', usw: 12, dist: 120, ext: null, total: 132, moq: 288 },
  { sku: '101-7788-TAN01-O/S', name: 'Coastal Snapback', usw: 60, dist: 240, ext: null, total: 300, moq: 300 },
  { sku: '101-3390-GRN02-O/S', name: 'Heritage Wool', usw: 0, dist: 96, ext: null, total: 96, moq: 216 },
  { sku: '101-9021-RED01-O/S', name: 'Trailblazer', usw: 100, dist: 300, ext: null, total: 400, moq: 360 },
  { sku: '101-4417-PNK01-O/S', name: 'Desert Rose', usw: 0, dist: 144, ext: null, total: 144, moq: 432 },
  { sku: '101-5150-CHR01-O/S', name: 'Night Owl', usw: 36, dist: 156, ext: null, total: 192, moq: 432 },
  { sku: '101-8834-OLV01-O/S', name: 'Summit Camp', usw: 0, dist: 108, ext: null, total: 108, moq: 288 },
];

type OLine = { name: string; qty: number };
type Order = { id: string; customer: string; email: string; channel: 'USW' | 'DIST'; units: number; wholesale: number; status: 'Confirmed' | 'Draft' | 'Submitted' | 'Released'; lines: OLine[] };
const orders: Order[] = [
  { id: '#444', customer: 'Buckle Inc., The', email: 'ladawna.richards@buckle.com', channel: 'USW', units: 432, wholesale: 8618.4, status: 'Confirmed', lines: [{ name: 'The GOAT', qty: 216 }, { name: 'The Koala', qty: 216 }] },
  { id: '#443', customer: 'Industrias Mercury, S.A.', email: 'diego@mercury.com.es', channel: 'DIST', units: 1968, wholesale: 17736, status: 'Confirmed', lines: [{ name: 'Boss Trucker', qty: 984 }, { name: 'Freedom Eagle Trucker', qty: 984 }] },
  { id: '#442', customer: 'Buckle Inc., The', email: 'ladawna.richards@buckle.com', channel: 'USW', units: 500, wholesale: 9975, status: 'Confirmed', lines: [{ name: 'Coastal Snapback', qty: 300 }, { name: 'Trailblazer', qty: 200 }] },
  { id: '#441', customer: 'SASAtrend', email: 'judith@sasatrend.com, tilo@sasatrend.com, san...', channel: 'DIST', units: 10428, wholesale: 94080, status: 'Confirmed', lines: [{ name: 'The Farm', qty: 3600 }, { name: 'Night Owl', qty: 3600 }, { name: 'Desert Rose', qty: 3228 }] },
];

const initialSetupDrops = [
  { id: 'd1', label: 'Drop 1', status: 'CLOSED', date: '07-20-2026', moq: 'default', usw: '01-15-2027 → 01-30-2027', dist: '11-04-2026 → 11-11-2026', active: false },
  { id: 'd2', label: 'Drop 2', status: 'CLOSED', date: '08-22-2026', moq: 'default', usw: '02-12-2027 → 02-27-2027', dist: '12-02-2026 → 12-09-2026', active: false },
  { id: 'd3', label: 'Drop 3', status: '8D LEFT', date: '09-21-2026', moq: 'default', usw: '03-19-2027 → 04-03-2027', dist: '01-06-2027 → 01-13-2027', active: true },
];
const initialGroups = [
  { id: 'g1', name: 'SS27 - US & INTL B2B', count: 203, chips: ['Majors', 'Boutiques', 'Distributors'] },
  { id: 'g2', name: 'SS27 - Lids SMU', count: 13, chips: ['Lids'] },
];

function Fill({ total, moq }: { total: number; moq: number }) {
  const pct = Math.min(100, Math.round((total / moq) * 100));
  const hit = total >= moq;
  const cls = hit ? 'hit' : pct >= 75 ? 'close' : 'under';
  return (
    <span className="pb-fill">
      <span className="pb-fill-track"><i className={cls} style={{ width: `${Math.max(6, pct)}%` }} /></span>
      <em>{pct}%</em>
    </span>
  );
}

/* editable product-group card (Setup) */
function GroupCard({ g, onRemove, onAddChip, onRemoveChip }: any) {
  const [draft, setDraft] = useState('');
  return (
    <div className="pb-group" data-testid={`pb-group-${g.id}`}>
      <div className="pb-group-top">
        <strong>{g.name}</strong>
        <em className="pb-count-pill">{g.count} products</em>
        <button className="pb-group-remove" onClick={() => onRemove(g.id)} aria-label="Remove group" data-testid={`pb-group-remove-${g.id}`}><Trash2 size={14} /></button>
      </div>
      <div className="pb-group-chips">
        {g.chips.map((c: string) => (
          <span key={c} className="pb-chip">{c}<button onClick={() => onRemoveChip(g.id, c)} aria-label={`Remove ${c}`}><X size={11} /></button></span>
        ))}
        <input
          className="pb-chip-input"
          value={draft}
          placeholder="+ customer group"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { onAddChip(g.id, draft.trim()); setDraft(''); } }}
          data-testid={`pb-group-chip-input-${g.id}`}
        />
      </div>
    </div>
  );
}

export default function PreBookPage({ onNavigate }: Props) {
  void onNavigate;
  const toast = useToast();
  const [tab, setTab] = useState<'review' | 'setup'>('review');
  const [showArchived, setShowArchived] = useState(false);
  const [subTab, setSubTab] = useState<'demand' | 'orders'>('demand');
  const [chanFilter, setChanFilter] = useState<'all' | 'USW' | 'DIST'>('all');
  const pickChannel = (k: string) => { const next = k === 'usw' ? 'USW' : k === 'dist' ? 'DIST' : 'all'; const same = chanFilter === next || next === 'all'; setChanFilter(same ? 'all' : next); if (!same) { setSubTab('orders'); toast(`Showing ${next === 'USW' ? 'US Wholesale' : 'Distributor'} orders`); } };
  const [demandFilter, setDemandFilter] = useState<'all' | 'hit' | 'under'>('under');
  const [orderFilter, setOrderFilter] = useState<'All' | 'Draft' | 'Submitted' | 'Confirmed' | 'Released'>('All');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const lbl = (sid: string, d: { id: string; label: string }) => renames[`${sid}:${d.id}`] ?? d.label;
  const commitRename = () => { if (renaming && renameVal.trim()) { setRenames((r) => ({ ...r, [renaming]: renameVal.trim() })); toast(`Renamed to “${renameVal.trim()}”`); } setRenaming(null); };
  const [previewOpen, setPreviewOpen] = useState(false);
  const [consOpen, setConsOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [skuQuery, setSkuQuery] = useState('');
  const [orderQuery, setOrderQuery] = useState('');
  const [activeDrop, setActiveDrop] = useState('drop3');
  const [activeSeason, setActiveSeason] = useState('SS27');
  const [openSeasons, setOpenSeasons] = useState<Set<string>>(new Set(['SS27']));
  const toggleSeason = (id: string) => setOpenSeasons((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const season = SEASONS.find((x) => x.id === activeSeason) ?? SEASONS[0];
  const seasonDrops = season.drops;
  const drop = seasonDrops.find((d) => d.id === activeDrop) ?? seasonDrops[seasonDrops.length - 1];
  const dropIndex = seasonDrops.indexOf(drop) + 1;

  // setup state
  const [setupDrops, setSetupDrops] = useState(initialSetupDrops);
  const [groups, setGroups] = useState(initialGroups);
  const [editDrop, setEditDrop] = useState<string | null>(null);
  const [collections, setCollections] = useState(['SS27']);
  const [activeColl, setActiveColl] = useState('SS27');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setActionsOpen(false); setMoreOpen(false); setRowMenu(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const demandRows = useMemo(() => {
    const q = skuQuery.trim().toLowerCase();
    return skus.filter((s) => {
      const hit = s.total >= s.moq;
      if (demandFilter === 'hit' && !hit) return false;
      if (demandFilter === 'under' && hit) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.sku.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.total / b.moq - a.total / a.moq);
  }, [demandFilter, skuQuery]);

  const orderRows = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderFilter !== 'All' && o.status !== orderFilter) return false;
      if (chanFilter !== 'all' && o.channel !== chanFilter) return false;
      if (q && !o.customer.toLowerCase().includes(q) && !o.id.includes(q)) return false;
      return true;
    });
  }, [orderFilter, orderQuery, chanFilter]);

  const totalUnits = skus.reduce((t, s) => t + s.total, 0);
  const atOrAbove = skus.filter((s) => s.total >= s.moq).length;
  const ordUnits = orders.reduce((t, o) => t + o.units, 0);
  const ordWhsl = orders.reduce((t, o) => t + o.wholesale, 0);
  const daysLeft = Math.max(0, Math.ceil((new Date(season.deadline).getTime() - Date.now()) / 86_400_000));
  const selCount = selected.size;

  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => (s.size === orderRows.length ? new Set() : new Set(orderRows.map((o) => o.id))));
  const runAction = (label: string, tone?: 'info' | 'error') => { toast(label, tone ?? 'success'); setActionsOpen(false); setSelected(new Set()); };
  const runMore = (label: string, tone?: 'info' | 'error') => { toast(label, tone ?? 'info'); setMoreOpen(false); };

  const addDrop = () => setSetupDrops((d) => [...d, { id: `d${Date.now()}`, label: `Drop ${d.length + 1}`, status: 'DRAFT', date: '—', moq: 'default', usw: '— → —', dist: '— → —', active: false }]);
  const removeDrop = (id: string) => { setSetupDrops((d) => d.filter((x) => x.id !== id)); toast('Drop removed.', 'info'); };
  const patchDrop = (id: string, patch: any) => setSetupDrops((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addGroup = () => setGroups((g) => [...g, { id: `g${Date.now()}`, name: `New product group ${g.length + 1}`, count: 0, chips: [] }]);
  const removeGroup = (id: string) => setGroups((g) => g.filter((x) => x.id !== id));
  const addChip = (id: string, chip: string) => setGroups((g) => g.map((x) => (x.id === id && !x.chips.includes(chip) ? { ...x, chips: [...x.chips, chip] } : x)));
  const removeChip = (id: string, chip: string) => setGroups((g) => g.map((x) => (x.id === id ? { ...x, chips: x.chips.filter((c) => c !== chip) } : x)));

  return (
    <div className="pb" data-testid="prebook-page">
      {/* top bar */}
      <div className={`pb-body ${tab === 'review' ? 'pb-body--review' : ''}`}>
        {/* sidebar */}
        <aside className="pb-side">
          <div className="ops-seg pb-mode-seg" role="tablist" data-testid="pb-mode-seg">
            <button role="tab" aria-selected={tab === 'review'} className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')} data-testid="pb-tab-review">Review <b>{SEASONS.filter((x) => !x.archived).reduce((a, x) => a + x.drops.filter((d) => d.status === 'open').length, 0)}</b></button>
            <button role="tab" aria-selected={tab === 'setup'} className={tab === 'setup' ? 'active' : ''} onClick={() => setTab('setup')} data-testid="pb-tab-setup">Setup</button>
          </div>
          <div className="pb-side-head"><span>{tab === 'setup' ? 'Pre-book Collections' : 'Seasons'}</span><span className="pb-side-tools">{tab === 'review' && <><button className="pb-side-add" aria-label="Export all drops" title="Export all drops" onClick={() => toast('Exporting all drops…')} data-testid="pb-export-all"><Download size={14} /></button><button className="pb-side-add" aria-label="Add season" title="Add season" onClick={() => toast('New season')}><Plus size={15} /></button></>}</span></div>
          {tab === 'review' ? (
            <div className="pbx-tree" data-testid="pb-drop-switcher">
              {SEASONS.filter((x) => showArchived || !x.archived).map((sn) => {
                const isOpen = openSeasons.has(sn.id); const openN = sn.drops.filter((d) => d.status === 'open').length; const closedN = sn.drops.length - openN;
                return (
                  <div key={sn.id} className={`pbx-season ${sn.id === season.id ? 'current' : ''} ${sn.archived ? 'archived' : ''}`} data-testid={`pb-season-${sn.id}`}>
                    <button className="pbx-season-head" onClick={() => toggleSeason(sn.id)} aria-expanded={isOpen} data-testid={`pb-season-toggle-${sn.id}`}>
                      <ChevronRight size={15} className={isOpen ? 'flip' : ''} />
                      <strong>{sn.id}</strong>
                      <em className={`pb-badge ${sn.archived ? 'archived' : sn.status}`}>{sn.archived ? 'Archived' : sn.status === 'closing' ? 'Closing' : sn.status === 'open' ? 'Open' : 'Closed'}</em>
                    </button>
                    {isOpen && (
                      <>
                        <div className="pbx-season-prog" aria-hidden="true"><i style={{ width: `${(closedN / sn.drops.length) * 100}%` }} /></div>
                        <p className="pbx-season-cap">{closedN} of {sn.drops.length} drops closed · closes {sn.deadline}</p>
                        <div className="pbx-drops">
                          {sn.drops.map((d) => {
                            const on = sn.id === season.id && activeDrop === d.id;
                            return (
                              <button key={d.id} className={`pb-drop-item ${on ? 'active' : ''} ${d.status}`} onClick={() => { setActiveSeason(sn.id); setActiveDrop(d.id); }} data-testid={`pb-drop-${sn.id}-${d.id}`}>
                                <FolderClosed size={15} />
                                <span>{lbl(sn.id, d)}</span>
                                {d.status === 'open' ? <em className="pb-drop-open">OPEN <b>{d.count}</b></em> : <em className="pb-drop-closed">CLOSED</em>}
                              </button>
                            );
                          })}
                          <button className="pb-drop-item pb-drop-new" onClick={() => toast(`New drop in ${sn.id}`)} data-testid={`pb-drop-new-${sn.id}`}><Plus size={14} /><span>New drop</span></button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pb-colls">
              {collections.map((c) => {
                const sn = SEASONS.find((x) => x.id === c);
                return (
                  <button key={c} className={`pb-coll ${activeColl === c ? 'active' : ''}`} onClick={() => setActiveColl(c)} data-testid={`pb-coll-${c}`}>
                    <span className={`pb-live ${sn?.status === 'closed' ? 'closed' : 'open'}`} />
                    <span className="pb-coll-main"><strong>{c}</strong><small>{sn ? `${sn.drops.length} drops · ${sn.drops.filter((d) => d.status === 'open').length} open` : 'New · no drops yet'}</small></span>
                    <ChevronRight size={14} />
                  </button>
                );
              })}
            </div>
          )}
          <div className="pb-side-foot">
            {tab === 'review'
              ? <><label className="pb-archive" data-testid="pb-show-archived"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /><span className="pb-check" aria-hidden="true"><Check size={11} strokeWidth={3} /></span> Show archived</label><span className="pb-mut">{SEASONS.filter((x) => showArchived || !x.archived).reduce((a, x) => a + x.drops.length, 0)} drops</span></>
              : <><button className="pb-foot-link" onClick={() => { const n = `SS${28 + collections.length - 1}`; setCollections((c) => [...c, n]); setActiveColl(n); toast(`Created ${n}`); }} data-testid="pb-new-prebook"><Plus size={14} /> New Pre-Book</button><button className="pb-foot-link muted" onClick={() => toast('Enable existing pre-book')}>Enable existing</button></>}
          </div>
        </aside>

        {/* main */}
        <main className="pb-main">
          {tab === 'review' ? (
            <>
              {/* hero */}
              <div className="pbx-hero">
              <div className="pbx-hero-body">
                <div className="pbx-hero-main">
                  <p className="pbx-kicker"><span className={`pb-live ${drop.status}`} />Season {season.id} · Drop {dropIndex} of {seasonDrops.length}{drop.status === 'open' && <> · <b>{daysLeft} days left</b></>}</p>
                  <div className="pb-drop-idtop"><strong>{season.id} <span>/ {renaming === `${season.id}:${drop.id}` ? <input className="pb-rename" autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }} data-testid="pb-rename-input" /> : lbl(season.id, drop)}</span></strong><em className={`pb-open-pill ${drop.status}`}>{drop.status.toUpperCase()}</em></div>
                  <div className="pbx-deadline-wrap">
                    <span className="pbx-deadline"><Calendar size={14} /> {drop.status === 'open' ? 'Closes' : 'Closed'} {season.deadline}</span>
                    <span className="pbx-days-track" aria-hidden="true"><i style={{ width: `${Math.max(4, 100 - (daysLeft / 90) * 100)}%` }} /></span>
                  </div>
                  <div className="pbx-hero-status">
                    <span className="pbx-chip ok"><CheckCircle2 size={14} /> Ready for customer visibility</span>
                    <button className="pbx-chip warn" onClick={() => setPreviewOpen((v) => !v)} data-testid="pb-preview-details"><Layers size={14} /> Purchasing · 4 standard · 0 consolidated · no POs <ChevronDown size={13} className={previewOpen ? 'flip' : ''} /></button>
                  </div>
                </div>
                <div className="pbx-report pbx-report--tiles" data-testid="pb-stat-combined">
                  {[
                    { key: 'all', name: 'Total Combined', dot: '#0f1f18', accounts: combined.accounts, units: combined.units, wholesale: combined.wholesale, hit: atOrAbove, of: skus.length, delta: 12, testId: 'pb-stat-total' },
                    { key: 'usw', name: 'US Wholesale', dot: '#16a37a', accounts: 2, units: chan.usw.units, wholesale: chan.usw.wholesale, hit: Math.round(atOrAbove * 0.5), of: skus.length, delta: -4, testId: 'pb-stat-usw' },
                    { key: 'dist', name: 'Distributor', dot: '#3b82f6', accounts: 2, units: chan.dist.units, wholesale: chan.dist.wholesale, hit: atOrAbove, of: skus.length, delta: 18, testId: 'pb-stat-dist' },
                  ].map((c, i) => { const rate = c.of ? Math.round((c.hit / c.of) * 100) : 0; const share = Math.round((c.units / combined.units) * 100); return (
                    <button type="button" key={c.key} className={`pbx-tile ${i === 0 ? 'total' : ''} ${chanFilter !== 'all' && ((c.key === 'usw' && chanFilter === 'USW') || (c.key === 'dist' && chanFilter === 'DIST')) ? 'on' : ''}`} onClick={() => pickChannel(c.key)} data-testid={c.testId} title={i === 0 ? 'Clear channel filter' : `Filter orders to ${c.name}`}>
                      <div className="pbx-tile-head"><span><i style={{ background: c.dot }} />{c.name}</span><em className={c.delta >= 0 ? 'up' : 'down'}>{c.delta >= 0 ? '↑' : '↓'} {Math.abs(c.delta)}%</em></div>
                      <div className="pbx-tile-big"><strong>{c.units.toLocaleString()}</strong><small>units · {c.accounts} accounts</small></div>
                      <div className="pbx-tile-grid">
                        <div><small>Wholesale</small><b className="g">{c.wholesale}</b></div>
                        <div><small>MOQ hit</small><b className={rate >= 90 ? 'g' : 'a'}>{c.hit}<span>/{c.of}</span></b></div>
                        <div><small>{i === 0 ? 'Avg / account' : 'Share'}</small><b>{i === 0 ? Math.round(c.units / c.accounts).toLocaleString() : `${share}%`}</b></div>
                      </div>
                      {i === 0
                        ? <div className="pbx-tile-mix"><div className="pbx-tile-bar mix"><i style={{ width: `${(chan.usw.units / combined.units) * 100}%`, background: '#16a37a' }} /><i style={{ width: `${(chan.dist.units / combined.units) * 100}%`, background: '#3b82f6' }} /></div><small><i style={{ background: '#16a37a' }} />USW {Math.round((chan.usw.units / combined.units) * 100)}%<i style={{ background: '#3b82f6' }} />DIST {Math.round((chan.dist.units / combined.units) * 100)}%</small></div>
                        : <div className="pbx-tile-bar"><i style={{ width: `${rate}%`, background: rate >= 90 ? '#16a37a' : '#e39a1c' }} /></div>}
                    </button>
                  ); })}
                </div>
                <div className="pb-drop-actions">
                  <div className="pb-more-wrap">
                    <button className="pb-more" aria-label="More" onClick={() => { setMoreOpen((v) => !v); setActionsOpen(false); }} data-testid="pb-more-btn"><MoreHorizontal size={18} /></button>
                    {moreOpen && (
                      <>
                        <div className="pb-menu-backdrop" onClick={() => setMoreOpen(false)} />
                        <div className="pb-menu pb-menu--left" role="menu" data-testid="pb-more-menu">
                          <button className="pb-menu-item" onClick={() => { setMoreOpen(false); setRenameVal(lbl(season.id, drop)); setRenaming(`${season.id}:${drop.id}`); }} data-testid="pb-rename-drop"><Pencil size={16} /> Rename drop</button>
                          <button className="pb-menu-item" onClick={() => runMore('Editing drop details…')}><Pencil size={16} /> Edit drop details</button>
                          <button className="pb-menu-item" onClick={() => runMore('Drop duplicated.')}><Copy size={16} /> Duplicate drop</button>
                          <button className="pb-menu-item" onClick={() => runMore('Exporting this drop…')}><Download size={16} /> Export this drop</button>
                          <div className="pb-menu-sep" />
                          <button className="pb-menu-item danger" onClick={() => runMore('Drop archived.', 'error')}><Archive size={16} /> Archive drop</button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="pb-actions-wrap">
                    <button className="pb-actions-btn" onClick={() => { setActionsOpen((v) => !v); setMoreOpen(false); }} data-testid="pb-actions-btn"><Zap size={15} /> Actions{selCount > 0 && <b className="pb-actions-count">{selCount}</b>} <ChevronDown size={14} /></button>
                    {actionsOpen && (
                      <>
                        <div className="pb-menu-backdrop" onClick={() => setActionsOpen(false)} />
                        <div className="pb-menu" role="menu" data-testid="pb-actions-menu">
                          <p className="pb-menu-head">{selCount > 0 ? `${selCount} order${selCount === 1 ? '' : 's'} selected` : 'No orders selected'}</p>
                          <button className="pb-menu-item" onClick={() => runAction(selCount > 0 ? `Released ${selCount} selected order${selCount === 1 ? '' : 's'}.` : 'Released all confirmed orders.')}><Send size={16} /> {selCount > 0 ? 'Release selected' : 'Release all confirmed'}</button>
                          <button className="pb-menu-item" onClick={() => runAction('Batch frozen for review.')}><Snowflake size={16} /> Freeze batch for review</button>
                          <div className="pb-menu-sep" />
                          <button className="pb-menu-item danger" onClick={() => runAction('Cancelled below-MOQ items.', 'error')}><Ban size={16} /> Cancel below-MOQ items</button>
                          <button className="pb-menu-item" onClick={() => runAction('Restored auto-cancelled items.', 'info')}><RotateCcw size={16} /> Restore auto-cancelled items</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              </div>
              {previewOpen && (
                <div className="pb-preview is-open pbx-preview-panel" data-testid="pb-preview">
                  <div className="pb-preview-body">
                    <p className="pb-preview-note"><Lock size={13} /> Sales channel: Not configured — freeze is unavailable</p>
                    <button className="pb-cons" onClick={() => setConsOpen((v) => !v)} data-testid="pb-cons-toggle">Consolidation details · 4 standard / 0 consolidated <ChevronDown size={16} className={consOpen ? 'flip' : ''} /></button>
                    {consOpen && (
                      <div className="pb-cons-table" data-testid="pb-cons-table">
                        <div className="pb-cons-tr pb-cons-th"><span>Order</span><span>Channel</span><span>Type</span><span className="r">Units</span><span>PO</span></div>
                        {orders.map((o) => (
                          <div className="pb-cons-tr" key={o.id}><span>{o.id}</span><span><em className={`pb-channel ${o.channel.toLowerCase()}`}>{o.channel}</em></span><span>Standard</span><span className="r">{o.units.toLocaleString()}</span><span className="pb-mut">Not created</span></div>
                        )
                        )}
                      </div>
                    )}
                    <p className="pb-preview-legend"><b className="ok">Standard</b> 4 releasable orders <span className="sep">·</span> <b className="warn">Consolidated</b> 0 blocked orders · 0 PO buckets</p>
                  </div>
                </div>
              )}

              {/* panel */}
              <section className="pb-panel">
                <div className="pb-panel-head">
                  <div className="pb-panel-left">
                    <div className="pb-panel-tabs">
                      <button className={subTab === 'demand' ? 'active' : ''} onClick={() => setSubTab('demand')} data-testid="pb-subtab-demand">SKU Demand <b className="pb-count">{skus.length}</b></button>
                      <button className={subTab === 'orders' ? 'active' : ''} onClick={() => setSubTab('orders')} data-testid="pb-subtab-orders">Orders <b className="pb-count">{orderRows.length}</b></button>
                    </div>
                    {subTab === 'orders' && chanFilter !== 'all' && <button className="pbx-chanchip" onClick={() => setChanFilter('all')} data-testid="pb-chan-clear"><i style={{ background: chanFilter === 'USW' ? '#16a37a' : '#3b82f6' }} />{chanFilter === 'USW' ? 'US Wholesale' : 'Distributor'} only <X size={12} /></button>}
                    {subTab === 'demand' && <><span className="pb-panel-num">{atOrAbove}/{skus.length} at MOQ</span><button className="pb-ext" onClick={() => toast('Import external volume')} data-testid="pb-ext-btn"><Upload size={14} /> External volume</button></>}
                  </div>
                  <div className="pb-panel-tools">
                    {subTab === 'demand' ? (
                      <div className="pb-seg3" role="tablist">
                        {(['all', 'hit', 'under'] as const).map((f) => (
                          <button key={f} className={demandFilter === f ? 'active' : ''} onClick={() => setDemandFilter(f)} data-testid={`pb-demand-${f}`}>{f[0].toUpperCase() + f.slice(1)} <b>{f === 'all' ? skus.length : f === 'hit' ? atOrAbove : skus.length - atOrAbove}</b></button>
                        ))}
                      </div>
                    ) : (
                      <div className="pb-seg5" role="tablist">
                        {(['All', 'Draft', 'Submitted', 'Confirmed', 'Released'] as const).map((f) => (
                          <button key={f} className={orderFilter === f ? 'active' : ''} onClick={() => setOrderFilter(f)}>{f}</button>
                        ))}
                      </div>
                    )}
                    <label className="pb-search"><Search size={15} /><input value={subTab === 'demand' ? skuQuery : orderQuery} onChange={(e) => (subTab === 'demand' ? setSkuQuery : setOrderQuery)(e.target.value)} placeholder={subTab === 'demand' ? 'Search SKUs...' : 'Search orders...'} data-testid="pb-panel-search" /></label>
                    {subTab === 'demand' && <button className="pb-ghost-btn" onClick={() => toast('Downloading…')}><Download size={15} /> Download</button>}
                  </div>
                </div>

                {subTab === 'demand' ? (
                  <div className="pbx-table pbx-table--demand">
                    <div className="pb-tr pb-th">
                      <span>SKU</span><span>Name</span><span className="r">USW</span><span className="r">DIST</span><span className="r">EXT</span><span className="r">Total</span><span className="r">MOQ</span><span>Fill</span><span>Gap</span><span />
                    </div>
                    {demandRows.length > 0 && (
                      <div className="pb-tr pb-total-row" data-testid="pb-demand-totals">
                        <span className="pb-sku-code">Σ</span>
                        <span className="pb-sku-name">{demandRows.length} SKUs</span>
                        <span className="r">{demandRows.reduce((x, r) => x + r.usw, 0).toLocaleString()}</span>
                        <span className="r">{demandRows.reduce((x, r) => x + r.dist, 0).toLocaleString()}</span>
                        <span className="r pb-mut">—</span>
                        <span className="r pb-strong">{demandRows.reduce((x, r) => x + r.total, 0).toLocaleString()}</span>
                        <span className="r pb-mut">{demandRows.reduce((x, r) => x + r.moq, 0).toLocaleString()}</span>
                        <span className="pb-fill"><em>{Math.round((demandRows.reduce((x, r) => x + r.total, 0) / demandRows.reduce((x, r) => x + r.moq, 0)) * 100)}%</em></span>
                        <span /><span />
                      </div>
                    )}
                    {demandRows.map((s) => {
                      const hit = s.total >= s.moq;
                      const open = expanded === s.sku;
                      return (
                        <div key={s.sku} className={`pb-row-wrap ${open ? 'is-open' : ''}`}>
                          <div className="pb-tr pb-row" onClick={() => setExpanded(open ? null : s.sku)} data-testid={`pb-sku-row-${s.sku}`}>
                            <span className="pb-sku-code"><ChevronRight size={14} className={open ? 'flip' : ''} />{s.sku}</span>
                            <span className="pb-sku-name">{s.name}</span>
                            <span className="r pb-mut">{s.usw}</span>
                            <span className="r">{s.dist}</span>
                            <span className="r pb-mut">{s.ext ?? '—'}</span>
                            <span className="r pb-strong">{s.total.toLocaleString()}</span>
                            <span className="r pb-mut">{s.moq}</span>
                            <Fill total={s.total} moq={s.moq} />
                            <span><em className={`pb-status ${hit ? 'hit' : s.total / s.moq >= 0.75 ? 'close' : 'under'}`}>{hit ? 'At MOQ' : `−${(s.moq - s.total).toLocaleString()}`}</em></span>
                            <span />
                          </div>
                          {open && (
                            <div className="pb-sku-expand" data-testid={`pb-sku-expand-${s.sku}`}>
                              <div className="pb-sku-breakdown">
                                <div><small>US Wholesale</small><b>{s.usw}</b></div>
                                <div><small>Distributor</small><b>{s.dist}</b></div>
                                <div><small>External</small><b>{s.ext ?? 0}</b></div>
                                <div><small>MOQ target</small><b>{s.moq}</b></div>
                                <div><small>Gap to MOQ</small><b className={hit ? 'ok' : 'warn'}>{hit ? 'Met' : `-${(s.moq - s.total).toLocaleString()}`}</b></div>
                              </div>
                              <p className="pb-sku-note">Size run O/S · {s.total.toLocaleString()} units committed · {hit ? 'MOQ satisfied — releasable.' : `needs ${(s.moq - s.total).toLocaleString()} more units to hit MOQ.`}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="pb-foot"><b>{skus.length} SKUs</b><span>{totalUnits.toLocaleString()} total units</span><span className="pb-foot-sep">|</span><span>{atOrAbove} at or above MOQ</span></div>
                  </div>
                ) : (
                  <div className="pbx-table pbx-table--orders">
                    <div className="pb-tr pb-oth">
                      <span className="pb-check"><input type="checkbox" aria-label="Select all" checked={selCount > 0 && selCount === orderRows.length} onChange={toggleAll} data-testid="pb-order-selectall" /></span>
                      <span>Order</span><span>Customer</span><span>Channel</span><span className="r">Units</span><span className="r">Wholesale</span><span>SO#</span><span>Status</span><span />
                    </div>
                    {orderRows.map((o) => {
                      const oid = o.id.replace('#', '');
                      const isOpen = expandedOrder === o.id;
                      return (
                        <div key={o.id} className={`pb-row-wrap ${selected.has(o.id) ? 'selected' : ''} ${isOpen ? 'is-open' : ''}`}>
                          <div className="pb-tr pb-orow" data-testid={`pb-order-row-${oid}`}>
                            <span className="pb-check"><input type="checkbox" aria-label={`Select ${o.id}`} checked={selected.has(o.id)} onChange={() => toggleSel(o.id)} data-testid={`pb-order-check-${oid}`} /></span>
                            <span className="pb-oid" onClick={() => setExpandedOrder(isOpen ? null : o.id)}><ChevronRight size={14} className={isOpen ? 'flip' : ''} />{o.id}</span>
                            <span className="pb-ocust" onClick={() => setExpandedOrder(isOpen ? null : o.id)}><b>{o.customer}</b><small>{o.email}</small></span>
                            <span><em className={`pb-channel ${o.channel.toLowerCase()}`}>{o.channel}</em></span>
                            <span className="r pb-strong">{o.units.toLocaleString()}</span>
                            <span className="r pb-strong">{money(o.wholesale)}</span>
                            <span className="pb-mut">—</span>
                            <span><em className="pb-ostatus"><i />{o.status}</em></span>
                            <span className="pb-omenu">
                              <button aria-label="Row actions" onClick={() => setRowMenu(rowMenu === o.id ? null : o.id)} data-testid={`pb-order-menu-${oid}`}><MoreHorizontal size={16} /></button>
                              {rowMenu === o.id && (
                                <>
                                  <div className="pb-menu-backdrop" onClick={() => setRowMenu(null)} />
                                  <div className="pb-menu pb-menu--row" role="menu">
                                    <button className="pb-menu-item" onClick={() => { toast(`Opening ${o.id}…`); setRowMenu(null); }}><Search size={15} /> View order</button>
                                    <button className="pb-menu-item" onClick={() => { toast(`Released ${o.id}.`); setRowMenu(null); }}><Send size={15} /> Release</button>
                                    <button className="pb-menu-item danger" onClick={() => { toast(`Cancelled ${o.id}.`, 'error'); setRowMenu(null); }}><Ban size={15} /> Cancel</button>
                                  </div>
                                </>
                              )}
                            </span>
                          </div>
                          {isOpen && (
                            <div className="pb-order-expand" data-testid={`pb-order-expand-${oid}`}>
                              {o.lines.map((l) => <div className="pb-oline" key={l.name}><span>{l.name}</span><b>{l.qty.toLocaleString()} units</b></div>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="pb-foot"><b>{orders.length} orders</b><span>{ordUnits.toLocaleString()} units</span><span className="pb-foot-sep">|</span><span>{money(ordWhsl)} wholesale</span><span className="pb-foot-upd">Updated just now</span></div>
                  </div>
                )}
              </section>
            </>
          ) : (
            /* ---------- SETUP ---------- */
            <div className="pb-setup">
              <h1 className="pb-setup-h"><Circle size={12} fill="currentColor" /> {activeColl}<small className="pb-setup-sub">Pre-book collection · {setupDrops.length} drops · {setupDrops.filter((d) => d.status !== 'closed').length} open</small></h1>

              <section className="pb-card">
                <div className="pb-card-head"><span className="pb-card-title"><Calendar size={16} /> Pre-book Drops <b className="pb-count dark">{setupDrops.length}</b></span><button className="pb-dark-btn" onClick={addDrop} data-testid="pb-new-drop"><Plus size={15} /> New drop</button></div>
                <div className="pb-drows">
                  {setupDrops.map((d) => {
                    const editing = editDrop === d.id;
                    return (
                      <div className={`pb-drow-wrap ${editing ? 'editing' : ''}`} key={d.id}>
                        <div className={`pb-drow ${d.active ? 'active' : ''}`} data-testid={`pb-setup-drop-${d.id}`}>
                          <div className="pb-drow-name" onClick={() => setEditDrop(editing ? null : d.id)}><strong>{d.label}</strong><em className={`pb-badge ${d.status === 'CLOSED' ? 'closed' : 'left'}`}>{d.status}</em><small><Calendar size={12} /> {d.date}</small></div>
                          <div className="pb-drow-moq"><small>MOQ</small><span>{d.moq}</span></div>
                          <div className="pb-drow-range"><small><i className="usw" /> US Wholesale</small><b>{d.usw}</b></div>
                          <div className="pb-drow-range"><small><i className="dist" /> Distributor</small><b>{d.dist}</b></div>
                          <div className="pb-drow-actions">
                            <button onClick={() => setEditDrop(editing ? null : d.id)} aria-label="Edit drop" data-testid={`pb-drop-edit-${d.id}`}><Pencil size={14} /></button>
                            <button className="danger" onClick={() => removeDrop(d.id)} aria-label="Remove drop" data-testid={`pb-drop-remove-${d.id}`}><Trash2 size={14} /></button>
                          </div>
                        </div>
                        {editing && (
                          <div className="pb-drow-edit" data-testid={`pb-drop-editform-${d.id}`}>
                            <label>MOQ policy<select value={d.moq} onChange={(e) => patchDrop(d.id, { moq: e.target.value })}><option value="default">default</option><option value="custom">custom</option><option value="none">none</option></select></label>
                            <label>US Wholesale window<input value={d.usw} onChange={(e) => patchDrop(d.id, { usw: e.target.value })} /></label>
                            <label>Distributor window<input value={d.dist} onChange={(e) => patchDrop(d.id, { dist: e.target.value })} /></label>
                            <button className="pb-dark-btn sm" onClick={() => { setEditDrop(null); toast(`${d.label} saved.`); }} data-testid={`pb-drop-save-${d.id}`}><Check size={14} /> Save</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="pb-card">
                <div className="pb-card-head"><span className="pb-card-title"><Users size={16} /> Product Groups <b className="pb-count dark">{groups.length}</b></span><button className="pb-dark-btn" onClick={addGroup} data-testid="pb-add-group"><Plus size={15} /> Add product group</button></div>
                <p className="pb-groups-note">Optional — split this pre-book into product groups, each visible only to its assigned customer groups. With no product groups, standard customer-group rules apply. Once any product group exists, products not in a group are hidden from customers.</p>
                {groups.map((g) => <GroupCard key={g.id} g={g} onRemove={removeGroup} onAddChip={addChip} onRemoveChip={removeChip} />)}
                {groups.length === 0 && <div className="pb-groups-empty">No product groups — standard customer-group rules apply.</div>}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
