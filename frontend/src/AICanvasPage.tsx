import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderClosed,
  FolderInput,
  FolderPlus,
  GripVertical,
  Mail,
  Maximize2,
  MoreHorizontal,
  Play,
  Plus,
  Sparkles,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react';
import CanvasEditor, { type StepNode } from '@/CanvasEditor';

type Canvas = {
  id: string;
  name: string;
  trigger: string;
  steps: number;
  enabled: boolean;
  lastRun: string;
  runs: number;
  nodes: StepNode[];
};

type CanvasGroup = {
  id: string;
  name: string;
  color: string;
  canvases: Canvas[];
};

const groupColors = ['#2f6bff', '#14b8a6', '#f5811f', '#0891b2', '#ff3048', '#5a8f2f'];

const triggerText = (trigger: string) => {
  if (trigger === 'Email trigger') return 'Each time an email is received';
  if (trigger === 'Schedule') return 'On a schedule';
  if (trigger === 'Webhook') return 'When a webhook is called';
  return 'Run manually';
};

const initialGroups: CanvasGroup[] = [
  {
    id: 'g-i3pl',
    name: 'I3PL',
    color: '#2f6bff',
    canvases: [
      {
        id: 'c-1', name: 'I3PL Shipment Reconciliation', trigger: 'Email trigger', steps: 10, enabled: true, lastRun: 'about 17 hours ago', runs: 9,
        nodes: [
          { id: 'c1-0', kind: 'trigger', title: 'I3PL Shipment Email Intake' },
          { id: 'c1-1', kind: 'ai', title: 'Parse I3PL Shipment Attachments' },
          { id: 'c1-2', kind: 'ai', title: 'Normalize & Aggregate I3PL Lines' },
          { id: 'c1-3', kind: 'pull', title: 'Pull Fulfil Customer Shipments' },
          { id: 'c1-4', kind: 'pull', title: 'Pull Fulfil Sales Order Lines' },
          { id: 'c1-5', kind: 'map', title: 'Map Fulfil Line Fields' },
          { id: 'c1-6', kind: 'ai', title: 'Aggregate Fulfil Lines by Order' },
          { id: 'c1-7', kind: 'ai', title: 'Reconcile I3PL vs Fulfil (Orders)' },
          { id: 'c1-8', kind: 'ai', title: 'Build HTML Reconciliation Report' },
          { id: 'c1-9', kind: 'email', title: 'Send Reconciliation Email' },
        ],
      },
      {
        id: 'c-2', name: 'I3PL Inventory Sync', trigger: 'Email trigger', steps: 10, enabled: true, lastRun: 'about 20 hours ago', runs: 18,
        nodes: [
          { id: 'c2-0', kind: 'trigger', title: 'I3PL Inventory Email Intake' },
          { id: 'c2-1', kind: 'ai', title: 'Parse Inventory Snapshot' },
          { id: 'c2-2', kind: 'ai', title: 'Normalize I3PL Inventory Lines' },
          { id: 'c2-3', kind: 'pull', title: 'Pull Fulfil Stock Levels' },
          { id: 'c2-4', kind: 'map', title: 'Map Inventory Fields' },
          { id: 'c2-5', kind: 'filter', title: 'Filter Active SKUs' },
          { id: 'c2-6', kind: 'ai', title: 'Compare I3PL vs Fulfil Stock' },
          { id: 'c2-7', kind: 'push', title: 'Push Adjustments to Fulfil' },
          { id: 'c2-8', kind: 'ai', title: 'Build Inventory Report' },
          { id: 'c2-9', kind: 'email', title: 'Send Inventory Summary' },
        ],
      },
    ],
  },
];

export default function AICanvasPage() {
  const [groups, setGroups] = useState<CanvasGroup[]>(initialGroups);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState<string | null>(null);
  const [groupMenuFor, setGroupMenuFor] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ groupId: string; canvasId: string | null } | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [canvasModalOpen, setCanvasModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [newCanvasGroup, setNewCanvasGroup] = useState('');
  const [newCanvasTrigger, setNewCanvasTrigger] = useState('Email trigger');
  const [newGroupName, setNewGroupName] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (id: string) =>
    setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const { totalCanvases, activeCanvases } = useMemo(() => {
    const all = groups.flatMap((g) => g.canvases);
    return { totalCanvases: all.length, activeCanvases: all.filter((c) => c.enabled).length };
  }, [groups]);

  const openCanvas = useMemo(() => groups.flatMap((g) => g.canvases).find((c) => c.id === openId) ?? null, [groups, openId]);

  const toggleCanvas = (id: string) =>
    setGroups((gs) => gs.map((g) => ({ ...g, canvases: g.canvases.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)) })));

  const runCanvas = (id: string) =>
    setGroups((gs) => gs.map((g) => ({ ...g, canvases: g.canvases.map((c) => (c.id === id ? { ...c, runs: c.runs + 1, lastRun: 'just now' } : c)) })));

  const deleteCanvas = (id: string) => {
    setGroups((gs) => gs.map((g) => ({ ...g, canvases: g.canvases.filter((c) => c.id !== id) })));
    setMenuFor(null);
  };

  const moveCanvas = (canvasId: string, fromGroupId: string, toGroupId: string) => {
    setGroups((gs) => {
      let moving: Canvas | undefined;
      const stripped = gs.map((g) => {
        if (g.id !== fromGroupId) return g;
        moving = g.canvases.find((c) => c.id === canvasId);
        return { ...g, canvases: g.canvases.filter((c) => c.id !== canvasId) };
      });
      if (!moving) return gs;
      return stripped.map((g) => (g.id === toGroupId ? { ...g, canvases: [...g.canvases, moving as Canvas] } : g));
    });
    setMenuFor(null);
    setMoveOpen(null);
  };

  const deleteGroup = (id: string) => {
    setGroups((gs) => gs.filter((g) => g.id !== id));
    setGroupMenuFor(null);
  };

  const reorderCanvas = (targetGroupId: string, targetCanvasId: string | null) => {
    const srcId = dragId;
    setDragId(null);
    setDragOver(null);
    if (!srcId || srcId === targetCanvasId) return;
    setGroups((gs) => {
      let moving: Canvas | undefined;
      const without = gs.map((g) => {
        const idx = g.canvases.findIndex((c) => c.id === srcId);
        if (idx < 0) return g;
        moving = g.canvases[idx];
        return { ...g, canvases: g.canvases.filter((c) => c.id !== srcId) };
      });
      if (!moving) return gs;
      return without.map((g) => {
        if (g.id !== targetGroupId) return g;
        const arr = [...g.canvases];
        if (targetCanvasId == null) {
          arr.push(moving as Canvas);
        } else {
          const ti = arr.findIndex((c) => c.id === targetCanvasId);
          arr.splice(ti < 0 ? arr.length : ti, 0, moving as Canvas);
        }
        return { ...g, canvases: arr };
      });
    });
  };

  const openCanvasModal = () => {
    setNewCanvasName('');
    setNewCanvasTrigger('Email trigger');
    setNewCanvasGroup(groups[0]?.id ?? '');
    setCanvasModalOpen(true);
  };

  const createCanvas = () => {
    if (!newCanvasName.trim() || !newCanvasGroup) return;
    const name = newCanvasName.trim();
    const canvas: Canvas = {
      id: `c-${Date.now()}`,
      name,
      trigger: newCanvasTrigger,
      steps: 0,
      enabled: false,
      lastRun: 'never',
      runs: 0,
      nodes: [{ id: `n-${Date.now()}`, kind: 'trigger', title: `${name} Trigger` }],
    };
    setGroups((gs) => gs.map((g) => (g.id === newCanvasGroup ? { ...g, canvases: [...g.canvases, canvas] } : g)));
    setCanvasModalOpen(false);
    setOpenId(canvas.id);
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const color = groupColors[groups.length % groupColors.length];
    setGroups((gs) => [...gs, { id: `g-${Date.now()}`, name: newGroupName.trim(), color, canvases: [] }]);
    setNewGroupName('');
    setGroupModalOpen(false);
  };

  if (openCanvas) {
    return (
      <CanvasEditor
        name={openCanvas.name}
        triggerText={triggerText(openCanvas.trigger)}
        enabled={openCanvas.enabled}
        nodes={openCanvas.nodes}
        onBack={() => setOpenId(null)}
        onToggle={() => toggleCanvas(openCanvas.id)}
        onRun={() => runCanvas(openCanvas.id)}
      />
    );
  }

  return (
    <div className="canvas-page">
      <div className="conn-heading">
        <div>
          <h1>AI Canvas</h1>
          <p>Design and manage AI-powered data workflows.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => setGroupModalOpen(true)}><FolderPlus size={15} /> New group</button>
          <button className="primary-button" onClick={openCanvasModal}><Plus size={15} /> New canvas</button>
        </div>
      </div>

      <div className="conn-stats">
        <div className="conn-stat"><div className="conn-stat-head"><Sparkles size={15} /><span>Total canvases</span></div><strong>{totalCanvases}</strong><p>All configured AI workflows</p></div>
        <div className="conn-stat"><div className="conn-stat-head conn-stat-ok"><CheckCircle2 size={15} /><span>Active</span></div><strong>{activeCanvases}</strong><p>Currently enabled</p></div>
        <div className="conn-stat"><div className="conn-stat-head"><FolderClosed size={15} /><span>Groups</span></div><strong>{groups.length}</strong><p>Organized collections</p></div>
      </div>

      <div className="flow-groups">
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          return (
          <section className={`flow-group card ${isCollapsed ? 'collapsed' : ''}`} key={group.id}>
            <div className="flow-group-head" onClick={() => toggleGroup(group.id)}>
              <span className={`group-chevron ${isCollapsed ? 'collapsed' : ''}`}><ChevronDown size={16} /></span>
              <span className="flow-group-dot" style={{ background: group.color }} />
              <span className="flow-group-name">{group.name}</span>
              <span className="flow-group-count">{group.canvases.length}</span>
              <div className="flow-menu-wrap canvas-group-menu-wrap" onClick={(e) => e.stopPropagation()}>
                <button
                  className="flow-group-menu"
                  aria-label={`${group.name} options`}
                  aria-haspopup="menu"
                  aria-expanded={groupMenuFor === group.id}
                  onClick={() => setGroupMenuFor(groupMenuFor === group.id ? null : group.id)}
                >
                  <MoreHorizontal size={18} />
                </button>
                {groupMenuFor === group.id && (
                  <div className="flow-menu" role="menu">
                    <button className="flow-menu-item" role="menuitem" onClick={() => setGroupMenuFor(null)}><SquarePen size={17} /> Rename Group</button>
                    <div className="flow-menu-sep" />
                    <button className="flow-menu-item danger" role="menuitem" onClick={() => deleteGroup(group.id)}><Trash2 size={17} /> Delete Group</button>
                  </div>
                )}
              </div>
            </div>

            {!isCollapsed && (group.canvases.length === 0 ? (
              <div
                className={`canvas-empty ${dragOver && dragOver.groupId === group.id ? 'drag-target' : ''}`}
                onDragOver={(e) => { if (!dragId) return; e.preventDefault(); setDragOver({ groupId: group.id, canvasId: null }); }}
                onDrop={(e) => { e.preventDefault(); reorderCanvas(group.id, null); }}
              >
                {dragId ? 'Drop canvas here' : 'No canvases in this group yet.'}
              </div>
            ) : (
              <div className="canvas-scroll">
                <div className="canvas-thead">
                  <span />
                  <span>State</span>
                  <span>Canvas name</span>
                  <span>Trigger</span>
                  <span>Last run</span>
                  <span>Stats</span>
                  <span />
                </div>
                {group.canvases.map((canvas) => (
                  <div
                    className={`canvas-row ${dragId === canvas.id ? 'dragging' : ''} ${dragOver && dragOver.canvasId === canvas.id ? 'drag-over' : ''}`}
                    key={canvas.id}
                    draggable
                    onDragStart={(e) => { setDragId(canvas.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    onDragOver={(e) => { if (!dragId) return; e.preventDefault(); setDragOver({ groupId: group.id, canvasId: canvas.id }); }}
                    onDrop={(e) => { e.preventDefault(); reorderCanvas(group.id, canvas.id); }}
                  >
                    <span className="canvas-grip" aria-hidden="true"><GripVertical size={16} /></span>
                    <button
                      className={`settings-toggle ${canvas.enabled ? 'on' : ''}`}
                      onClick={() => toggleCanvas(canvas.id)}
                      aria-label={canvas.enabled ? `Disable ${canvas.name}` : `Enable ${canvas.name}`}
                      aria-pressed={canvas.enabled}
                    />
                    <div className="canvas-name-cell">
                      <strong title={canvas.name} onClick={() => setOpenId(canvas.id)}>{canvas.name}</strong>
                    </div>
                    <div className="canvas-trigger">
                      <span className="canvas-trigger-name"><Mail size={13} /> {canvas.trigger}</span>
                      <span className="canvas-muted">{canvas.nodes.filter((n) => n.kind !== 'trigger').length} steps</span>
                    </div>
                    <div className="canvas-last">
                      <span className={`canvas-health ${canvas.enabled ? '' : 'idle'}`}>{canvas.enabled ? 'Healthy' : 'Idle'}</span>
                      <span className="canvas-muted">{canvas.lastRun}</span>
                    </div>
                    <div className="canvas-stats">
                      <strong>{canvas.runs}</strong>
                      <span className="canvas-muted">runs</span>
                    </div>
                    <div className="canvas-actions">
                      <button className="flow-run" onClick={() => runCanvas(canvas.id)}><Play size={12} fill="currentColor" /> RUN</button>
                      <div className="flow-menu-wrap">
                        <button
                          className="flow-menu-btn"
                          onClick={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: r.bottom + 8, left: Math.max(12, r.right - 236) });
                            setMenuFor(menuFor === canvas.id ? null : canvas.id);
                            setMoveOpen(null);
                          }}
                          aria-label={`${canvas.name} actions`}
                          aria-haspopup="menu"
                          aria-expanded={menuFor === canvas.id}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuFor === canvas.id && menuPos && (
                          <div className="flow-menu" role="menu" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, right: 'auto' }}>
                            {moveOpen === canvas.id ? (
                              <>
                                <button className="flow-menu-item" role="menuitem" onClick={() => setMoveOpen(null)}><ChevronLeft size={17} /> Move to group</button>
                                <div className="flow-menu-sep" />
                                {groups.filter((g) => g.id !== group.id).map((g) => (
                                  <button className="flow-menu-item" role="menuitem" key={g.id} onClick={() => moveCanvas(canvas.id, group.id, g.id)}>
                                    <span className="flow-menu-dot" style={{ background: g.color }} /> {g.name}
                                  </button>
                                ))}
                                {groups.length < 2 && <div className="flow-menu-empty">No other groups yet</div>}
                              </>
                            ) : (
                              <>
                                <button className="flow-menu-item" role="menuitem" onClick={() => { setOpenId(canvas.id); setMenuFor(null); }}><Maximize2 size={17} /> Open Canvas</button>
                                <button className="flow-menu-item" role="menuitem" onClick={() => setMoveOpen(canvas.id)}><FolderInput size={17} /> Move to Group<ChevronRight className="flow-menu-caret" size={15} /></button>
                                <div className="flow-menu-sep" />
                                <button className="flow-menu-item danger" role="menuitem" onClick={() => deleteCanvas(canvas.id)}><Trash2 size={17} /> Delete Canvas</button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div
                  className={`canvas-drop-end ${dragId && dragOver && dragOver.groupId === group.id && dragOver.canvasId === null ? 'active' : ''}`}
                  onDragOver={(e) => { if (!dragId) return; e.preventDefault(); setDragOver({ groupId: group.id, canvasId: null }); }}
                  onDrop={(e) => { e.preventDefault(); reorderCanvas(group.id, null); }}
                />
              </div>
            ))}
          </section>
          );
        })}
      </div>

      {(menuFor || groupMenuFor) && <div className="flow-menu-overlay" onClick={() => { setMenuFor(null); setGroupMenuFor(null); setMoveOpen(null); setMenuPos(null); }} />}

      {canvasModalOpen && (
        <div className="canvas-modal-overlay" onClick={() => setCanvasModalOpen(false)}>
          <div className="canvas-modal" role="dialog" aria-label="New canvas" onClick={(e) => e.stopPropagation()}>
            <div className="canvas-modal-head">
              <div className="canvas-modal-icon"><Sparkles size={18} /></div>
              <div><h2>New canvas</h2><p>Create an AI-powered workflow.</p></div>
              <button className="canvas-modal-close" onClick={() => setCanvasModalOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="canvas-modal-body">
              <label className="canvas-field"><span>Canvas name</span><input type="text" value={newCanvasName} onChange={(e) => setNewCanvasName(e.target.value)} placeholder="e.g. Order Enrichment" autoFocus /></label>
              <label className="canvas-field"><span>Group</span>
                <select value={newCanvasGroup} onChange={(e) => setNewCanvasGroup(e.target.value)}>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </label>
              <label className="canvas-field"><span>Trigger</span>
                <select value={newCanvasTrigger} onChange={(e) => setNewCanvasTrigger(e.target.value)}>
                  <option value="Email trigger">Email trigger</option>
                  <option value="Schedule">Schedule</option>
                  <option value="Webhook">Webhook</option>
                  <option value="Manual">Manual</option>
                </select>
              </label>
            </div>
            <div className="canvas-modal-foot">
              <button className="secondary-button" onClick={() => setCanvasModalOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={createCanvas} disabled={!newCanvasName.trim()}><Plus size={15} /> Create canvas</button>
            </div>
          </div>
        </div>
      )}

      {groupModalOpen && (
        <div className="canvas-modal-overlay" onClick={() => setGroupModalOpen(false)}>
          <div className="canvas-modal" role="dialog" aria-label="New group" onClick={(e) => e.stopPropagation()}>
            <div className="canvas-modal-head">
              <div className="canvas-modal-icon"><FolderPlus size={18} /></div>
              <div><h2>New group</h2><p>Organize your canvases into a collection.</p></div>
              <button className="canvas-modal-close" onClick={() => setGroupModalOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="canvas-modal-body">
              <label className="canvas-field"><span>Group name</span><input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Marketing" autoFocus /></label>
            </div>
            <div className="canvas-modal-foot">
              <button className="secondary-button" onClick={() => setGroupModalOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={createGroup} disabled={!newGroupName.trim()}><FolderPlus size={15} /> Create group</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
