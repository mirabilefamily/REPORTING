import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowUpDown,
  Calculator,
  ChevronDown,
  ArrowLeft,
  Clock,
  Copy,
  Database,
  Filter,
  GitMerge,
  Globe,
  Grid2x2,
  History,
  Layers,
  Mail,
  Maximize,
  Minimize2,
  Minus,
  Play,
  Plus,
  Save,
  Settings2,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
  Zap,
} from 'lucide-react';

export type StepKind =
  | 'trigger' | 'pull' | 'push' | 'filter' | 'map' | 'dedupe' | 'sort'
  | 'limit' | 'formula' | 'group' | 'join' | 'ai' | 'email' | 'webhook';

export type StepNode = { id: string; kind: StepKind; title: string };

type PlacedNode = StepNode & { x: number; y: number };
type Edge = { id: string; from: string; to: string };

const NODE_W = 236;
const NODE_H = 62;

const stepMeta: Record<StepKind, { icon: typeof Zap; label: string; accent: string; tint: string; desc: string }> = {
  trigger: { icon: Zap, label: 'Trigger', accent: '#c98a12', tint: '#fdf1d3', desc: 'Where the flow starts' },
  pull: { icon: Database, label: 'Pull data', accent: '#2f6bff', tint: '#e6efff', desc: 'Read records from a connection' },
  push: { icon: Upload, label: 'Push data', accent: '#2f6bff', tint: '#e6efff', desc: 'Write records to a connection' },
  filter: { icon: Filter, label: 'Filter', accent: '#5a8f2f', tint: '#eaf5db', desc: 'Keep only matching records' },
  map: { icon: Shuffle, label: 'Map fields', accent: '#0d9488', tint: '#d9f5f0', desc: 'Rename / reshape fields' },
  dedupe: { icon: Copy, label: 'Dedupe', accent: '#8a6d3b', tint: '#f2ead9', desc: 'Drop duplicate records' },
  sort: { icon: ArrowUpDown, label: 'Sort', accent: '#5b6470', tint: '#eceef1', desc: 'Order records by a field' },
  limit: { icon: Minimize2, label: 'Limit', accent: '#5b6470', tint: '#eceef1', desc: 'Keep the first or last N records' },
  formula: { icon: Calculator, label: 'Formula', accent: '#0891b2', tint: '#d9f2f7', desc: 'Add a computed column' },
  group: { icon: Layers, label: 'Group', accent: '#b7770a', tint: '#fdf1d8', desc: 'Aggregate records by a key' },
  join: { icon: GitMerge, label: 'Join', accent: '#5b6470', tint: '#eceef1', desc: 'Merge two record streams' },
  ai: { icon: Sparkles, label: 'AI step', accent: '#d6409f', tint: '#fbe6f4', desc: 'Process records with AI' },
  email: { icon: Mail, label: 'Send email', accent: '#d52d42', tint: '#ffe8eb', desc: 'Email a summary or records' },
  webhook: { icon: Globe, label: 'Webhook', accent: '#e0662e', tint: '#fdece0', desc: 'Call an external HTTP endpoint' },
};

const libraryOrder: StepKind[] = ['trigger', 'pull', 'push', 'filter', 'map', 'dedupe', 'sort', 'limit', 'formula', 'group', 'join', 'ai', 'email', 'webhook'];

type ConfigField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

const configSchema: Partial<Record<StepKind, ConfigField[]>> = {
  trigger: [
    { key: 'event', label: 'Trigger event', type: 'select', options: ['Email received', 'On a schedule', 'Incoming webhook', 'Manual run'], required: true },
  ],
  pull: [
    { key: 'connection', label: 'Connection', type: 'select', options: ['Goorin Fulfil.io (Fulfill.io)', 'Airtable (Ops)', 'Extensiv 3PL', 'Postgres (Warehouse)'], required: true },
    { key: 'resource', label: 'Resource', type: 'select', options: ['Inventory (Stock Levels by Location)', 'Orders', 'Shipments', 'Products'], required: true },
    { key: 'maxRecords', label: 'Max records', type: 'number', placeholder: '10000' },
  ],
  push: [
    { key: 'connection', label: 'Connection', type: 'select', options: ['Goorin Fulfil.io (Fulfill.io)', 'Airtable (Ops)', 'Extensiv 3PL', 'Postgres (Warehouse)'], required: true },
    { key: 'resource', label: 'Resource', type: 'select', options: ['Orders', 'Shipments', 'Products', 'Inventory'], required: true },
    { key: 'mode', label: 'Write mode', type: 'select', options: ['Upsert', 'Insert only', 'Update only'] },
  ],
  filter: [
    { key: 'field', label: 'Field', type: 'text', placeholder: 'e.g. status', required: true },
    { key: 'operator', label: 'Operator', type: 'select', options: ['equals', 'does not equal', 'contains', 'greater than', 'less than', 'is empty'] },
    { key: 'value', label: 'Value', type: 'text', placeholder: 'e.g. active' },
  ],
  map: [
    { key: 'mappings', label: 'Field mappings', type: 'textarea', placeholder: 'source_field -> target_field' },
  ],
  dedupe: [
    { key: 'key', label: 'Dedupe key', type: 'text', placeholder: 'e.g. email', required: true },
    { key: 'keep', label: 'Keep', type: 'select', options: ['First record', 'Last record'] },
  ],
  sort: [
    { key: 'field', label: 'Sort field', type: 'text', placeholder: 'e.g. created_at', required: true },
    { key: 'direction', label: 'Direction', type: 'select', options: ['Ascending', 'Descending'] },
  ],
  limit: [
    { key: 'count', label: 'Record count', type: 'number', placeholder: '100' },
    { key: 'from', label: 'Keep from', type: 'select', options: ['Top', 'Bottom'] },
  ],
  formula: [
    { key: 'column', label: 'Column name', type: 'text', placeholder: 'e.g. total', required: true },
    { key: 'expression', label: 'Expression', type: 'textarea', placeholder: 'price * quantity' },
  ],
  group: [
    { key: 'by', label: 'Group by', type: 'text', placeholder: 'e.g. region', required: true },
    { key: 'aggregate', label: 'Aggregate', type: 'select', options: ['Count', 'Sum', 'Average', 'Min', 'Max'] },
  ],
  join: [
    { key: 'type', label: 'Join type', type: 'select', options: ['Inner', 'Left', 'Right', 'Full outer'] },
    { key: 'on', label: 'Match on', type: 'text', placeholder: 'e.g. order_id', required: true },
  ],
  ai: [
    { key: 'model', label: 'Model', type: 'select', options: ['GPT-4o', 'GPT-4o mini', 'Claude 3.5 Sonnet'] },
    { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Describe what to do with each record' },
  ],
  email: [
    { key: 'to', label: 'To', type: 'text', placeholder: 'name@company.com', required: true },
    { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Subject line' },
    { key: 'body', label: 'Message', type: 'textarea', placeholder: 'Email body' },
  ],
  webhook: [
    { key: 'method', label: 'Method', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'] },
    { key: 'url', label: 'Endpoint URL', type: 'text', placeholder: 'https://', required: true },
  ],
};

function buildInitial(initialNodes: StepNode[], name: string): { placed: PlacedNode[]; edges: Edge[] } {
  const src = initialNodes.length ? initialNodes : [{ id: 't-0', kind: 'trigger' as StepKind, title: name }];
  const placed = src.map((n, i) => ({ ...n, x: 360, y: 40 + i * 108 }));
  const edges: Edge[] = [];
  for (let i = 0; i < placed.length - 1; i++) {
    edges.push({ id: `e-${placed[i].id}-${placed[i + 1].id}`, from: placed[i].id, to: placed[i + 1].id });
  }
  return { placed, edges };
}

function edgeD(a: { x: number; y: number }, b: { x: number; y: number }) {
  const sx = a.x + NODE_W / 2;
  const sy = a.y + NODE_H;
  const tx = b.x + NODE_W / 2;
  const ty = b.y;
  const k = Math.max(36, Math.abs(ty - sy) * 0.5);
  return `M ${sx} ${sy} C ${sx} ${sy + k}, ${tx} ${ty - k}, ${tx} ${ty}`;
}

type Props = {
  name: string;
  triggerText: string;
  enabled: boolean;
  nodes: StepNode[];
  onBack: () => void;
  onToggle: () => void;
  onRun: () => void;
};

export default function CanvasEditor({ name, triggerText, enabled, nodes: initialNodes, onBack, onToggle, onRun }: Props) {
  const init = useMemo(() => buildInitial(initialNodes, name), [initialNodes, name]);
  const [nodes, setNodes] = useState<PlacedNode[]>(init.placed);
  const [edges, setEdges] = useState<Edge[]>(init.edges);
  const [selected, setSelected] = useState<string | null>(nodes[0]?.id ?? null);
  const [zoom, setZoom] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [connect, setConnect] = useState<{ from: string; x: number; y: number } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});

  const surfaceRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const toSurface = useCallback((clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / zoomRef.current, y: (clientY - rect.top) / zoomRef.current };
  }, []);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const p = toSurface(e.clientX, e.clientY);
      setNodes((ns) => ns.map((n) => (n.id === drag.id ? { ...n, x: Math.max(0, p.x - drag.dx), y: Math.max(0, p.y - drag.dy) } : n)));
    };
    const up = () => { setDrag(null); setDirty(true); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [drag, toSurface]);

  useEffect(() => {
    if (!connect) return;
    const targetAt = (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY) as Element | null;
      const nodeEl = el?.closest('[data-nodeid]');
      const id = nodeEl?.getAttribute('data-nodeid') || null;
      return id && id !== connect.from ? id : null;
    };
    const move = (e: PointerEvent) => {
      const p = toSurface(e.clientX, e.clientY);
      setConnect((c) => (c ? { ...c, x: p.x, y: p.y } : c));
      setHoverTarget(targetAt(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      const to = targetAt(e.clientX, e.clientY);
      const target = to ? nodes.find((n) => n.id === to) : null;
      if (target && target.kind !== 'trigger') {
        setEdges((es) => (es.some((x) => x.from === connect.from && x.to === to) ? es : [...es, { id: `e-${connect.from}-${to}-${Date.now()}`, from: connect.from, to: to! }]));
        setDirty(true);
      }
      setConnect(null);
      setHoverTarget(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [connect, toSurface, nodes]);

  const startDrag = (e: ReactPointerEvent, node: PlacedNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelected(node.id);
    const p = toSurface(e.clientX, e.clientY);
    setDrag({ id: node.id, dx: p.x - node.x, dy: p.y - node.y });
  };

  const startConnect = (e: ReactPointerEvent, node: PlacedNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelected(node.id);
    setConnect({ from: node.id, x: node.x + NODE_W / 2, y: node.y + NODE_H });
  };

  const addStep = (kind: StepKind) => {
    const meta = stepMeta[kind];
    const count = nodes.length;
    setNodes((ns) => [...ns, { id: `n-${Date.now()}`, kind, title: meta.label, x: 60 + (count % 4) * 30, y: 60 + (count % 4) * 30 }]);
    setDirty(true);
  };

  const removeStep = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id));
    setSelected((s) => (s === id ? null : s));
    setDirty(true);
  };

  const removeEdge = (id: string) => {
    setEdges((es) => es.filter((e) => e.id !== id));
    setDirty(true);
  };

  const renameStep = (id: string, title: string) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, title } : n)));
    setDirty(true);
  };

  const setConfig = (id: string, key: string, value: string) => {
    setConfigs((c) => ({ ...c, [id]: { ...c[id], [key]: value } }));
    setDirty(true);
  };

  const zoomIn = () => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
  const fit = () => setZoom(1);

  const stepCount = useMemo(() => nodes.filter((n) => n.kind !== 'trigger').length, [nodes]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const surfaceW = useMemo(() => Math.max(1200, ...nodes.map((n) => n.x + NODE_W + 240)), [nodes]);
  const surfaceH = useMemo(() => Math.max(680, ...nodes.map((n) => n.y + NODE_H + 240)), [nodes]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selected) ?? null, [nodes, selected]);

  return (
    <div className="ce-page">
      <div className="ce-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to AI Canvas"><ArrowLeft size={18} /></button>
        <h1 className="ce-name">{name}</h1>
        <span className="ce-trigger-pill"><Mail size={13} /> {triggerText}</span>

        <div className="ce-header-right">
          <button className={`ce-active ${enabled ? 'on' : ''}`} onClick={onToggle} aria-pressed={enabled}>
            <span className="ce-active-label">{enabled ? 'Active' : 'Paused'}</span>
            <span className="ce-active-switch"><i /></span>
          </button>
          <div className="ce-toolset">
            <button className="ce-tool accent"><Sparkles size={15} /> AI Build</button>
            <button className="ce-tool accent"><Wand2 size={15} /> Enhance</button>
            <span className="ce-tool-div" />
            <button className="ce-tool"><Grid2x2 size={15} /> Arrange</button>
            <button className="ce-tool"><Settings2 size={15} /> Settings</button>
            <button className="ce-tool"><Clock size={15} /> Runs</button>
            <button className="ce-tool"><History size={15} /> Versions</button>
          </div>
          <button className="ce-save" disabled={!dirty} onClick={() => setDirty(false)}><Save size={15} /> Save</button>
          <button className="ce-run" onClick={onRun}><Play size={14} fill="currentColor" /> Run</button>
        </div>
      </div>

      <div className={`ce-body ${selectedNode ? 'has-settings' : ''}`}>
        <aside className="ce-library">
          <div className="ce-library-head">
            <strong>Step library</strong>
            <span>Click to add to canvas</span>
          </div>
          <div className="ce-library-list">
            {libraryOrder.map((kind) => {
              const meta = stepMeta[kind];
              const Icon = meta.icon;
              return (
                <button className="ce-lib-item" key={kind} onClick={() => addStep(kind)}>
                  <span className="ce-lib-icon" style={{ color: meta.accent, background: meta.tint }}><Icon size={16} /></span>
                  <span className="ce-lib-copy"><strong>{meta.label}</strong><span>{meta.desc}</span></span>
                  <Plus className="ce-lib-add" size={15} />
                </button>
              );
            })}
          </div>
        </aside>

        <div className="ce-canvas">
          <div className="ce-flowmap">
            <div className="ce-flowmap-title"><span className="ce-flowmap-dot" /> Flow map</div>
            <p>Drag steps to arrange · drag a bottom dot to connect</p>
            <div className="ce-flowmap-status"><span className="ready">Ready</span><span className="check">Check</span></div>
          </div>

          <div className="ce-scroll" onClick={() => setSelected(null)}>
            <div ref={surfaceRef} className="ce-surface" style={{ width: surfaceW, height: surfaceH, transform: `scale(${zoom})` }}>
              <svg className="ce-edges" width={surfaceW} height={surfaceH}>
                <defs>
                  <marker id="ce-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M1 1 L8 4.5 L1 8" fill="none" stroke="#98a1a9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                </defs>
                {edges.map((e) => {
                  const a = nodeById.get(e.from);
                  const b = nodeById.get(e.to);
                  if (!a || !b) return null;
                  const d = edgeD(a, b);
                  return (
                    <g className="ce-edge" key={e.id} onClick={(ev) => { ev.stopPropagation(); removeEdge(e.id); }}>
                      <path className="ce-edge-hit" d={d} />
                      <path className="ce-edge-line" d={d} markerEnd="url(#ce-arrow)" />
                    </g>
                  );
                })}
                {connect && (() => {
                  const a = nodeById.get(connect.from);
                  if (!a) return null;
                  const sx = a.x + NODE_W / 2;
                  const sy = a.y + NODE_H;
                  const k = Math.max(36, Math.abs(connect.y - sy) * 0.5);
                  return <path className="ce-edge-temp" d={`M ${sx} ${sy} C ${sx} ${sy + k}, ${connect.x} ${connect.y - k}, ${connect.x} ${connect.y}`} />;
                })()}
              </svg>

              {nodes.map((node) => {
                const meta = stepMeta[node.kind];
                const Icon = meta.icon;
                const isTrigger = node.kind === 'trigger';
                return (
                  <div
                    key={node.id}
                    data-nodeid={node.id}
                    className={`ce-node graph ${isTrigger ? 'trigger' : ''} ${selected === node.id ? 'selected' : ''} ${drag?.id === node.id ? 'dragging' : ''}`}
                    style={{ '--accent': meta.accent, left: node.x, top: node.y, width: NODE_W } as CSSProperties}
                    onPointerDown={(e) => startDrag(e, node)}
                    onClick={(e) => { e.stopPropagation(); setSelected(node.id); }}
                  >
                    {!isTrigger && <span className={`ce-port ce-port-in ${hoverTarget === node.id ? 'hot' : ''}`} aria-hidden="true" />}
                    <span
                      className="ce-port ce-port-out"
                      title="Drag to connect"
                      onPointerDown={(e) => startConnect(e, node)}
                    />
                    <span className="ce-node-icon" style={{ color: meta.accent, background: meta.tint }}><Icon size={15} /></span>
                    <span className="ce-node-copy">
                      <strong title={node.title}>{node.title}</strong>
                      <em>{meta.label.toUpperCase()}</em>
                    </span>
                    {!isTrigger && (
                      <button className="ce-node-remove" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeStep(node.id); }} aria-label={`Remove ${node.title}`}><Minus size={13} /></button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ce-footbar">
            <span>{nodes.length} nodes · {stepCount} steps · {edges.length} links</span>
          </div>

          <div className="ce-zoom">
            <button onClick={zoomIn} aria-label="Zoom in"><Plus size={16} /></button>
            <button onClick={zoomOut} aria-label="Zoom out"><Minus size={16} /></button>
            <button onClick={fit} aria-label="Fit to view"><Maximize size={15} /></button>
          </div>
        </div>

        {selectedNode && (() => {
          const meta = stepMeta[selectedNode.kind];
          const Icon = meta.icon;
          const fields = configSchema[selectedNode.kind] ?? [];
          const cfg = configs[selectedNode.id] ?? {};
          return (
            <aside className="ce-settings">
              <div className="ce-set-head">
                <span className="ce-set-icon" style={{ color: meta.accent, background: meta.tint }}><Icon size={19} /></span>
                <div className="ce-set-titles">
                  <strong>{meta.label}</strong>
                  <span>Step settings</span>
                </div>
                <div className="ce-set-head-actions">
                  <button className="ce-set-icon-btn danger" disabled={selectedNode.kind === 'trigger'} onClick={() => removeStep(selectedNode.id)} aria-label="Delete step"><Trash2 size={16} /></button>
                  <button className="ce-set-icon-btn" onClick={() => setSelected(null)} aria-label="Close settings"><X size={16} /></button>
                </div>
              </div>

              <div className="ce-set-body">
                <div className="ce-set-card">
                  <h4>Step details</h4>
                  <p>Name this step so it is easy to recognize on the canvas.</p>
                  <div className="ce-field">
                    <label className="ce-field-label" htmlFor="ce-step-name">Step name</label>
                    <input id="ce-step-name" className="ce-input" value={selectedNode.title} onChange={(e) => renameStep(selectedNode.id, e.target.value)} placeholder="Untitled step" />
                  </div>
                </div>

                {fields.length > 0 && (
                  <div className="ce-set-card">
                    <h4>Configuration</h4>
                    <p>{meta.desc}.</p>
                    {fields.map((f) => (
                      <div className="ce-field" key={f.key}>
                        <label className="ce-field-label" htmlFor={`ce-${f.key}`}>{f.label}{f.required && <i>*</i>}</label>
                        {f.type === 'select' ? (
                          <div className="ce-select-wrap">
                            <select id={`ce-${f.key}`} className="ce-select" value={cfg[f.key] ?? ''} onChange={(e) => setConfig(selectedNode.id, f.key, e.target.value)}>
                              <option value="" disabled>Select an option</option>
                              {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <ChevronDown className="ce-select-caret" size={16} />
                          </div>
                        ) : f.type === 'textarea' ? (
                          <textarea id={`ce-${f.key}`} className="ce-textarea" placeholder={f.placeholder} value={cfg[f.key] ?? ''} onChange={(e) => setConfig(selectedNode.id, f.key, e.target.value)} />
                        ) : (
                          <input id={`ce-${f.key}`} className="ce-input" type={f.type === 'number' ? 'number' : 'text'} placeholder={f.placeholder} value={cfg[f.key] ?? ''} onChange={(e) => setConfig(selectedNode.id, f.key, e.target.value)} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="ce-set-card">
                  <h4>Preview</h4>
                  <p>Safely test this step and its upstream inputs. No records are written or sent.</p>
                  <div className="ce-preview-row">
                    <span className="ce-preview-status"><i /> Ready to test</span>
                    <button className="ce-preview-btn"><Play size={13} fill="currentColor" /> Preview</button>
                  </div>
                </div>
              </div>
            </aside>
          );
        })()}
      </div>
    </div>
  );
}
