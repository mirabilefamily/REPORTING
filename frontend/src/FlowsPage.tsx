import { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderInput,
  FolderPlus,
  GitBranch,
  GripVertical,
  MoreHorizontal,
  Play,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react';
import FlowEditor from '@/FlowEditor';
import FlowDetail from '@/FlowDetail';
import { useToast } from '@/lib/toast';

type Flow = {
  id: string;
  name: string;
  source: string;
  dest: string;
  schedule: string;
  cron: string;
  lastRun: string;
  nextRel: string;
  nextAbs: string;
  enabled: boolean;
};

type FlowGroup = {
  name: string;
  color: string;
  flows: Flow[];
};

const initialGroups: FlowGroup[] = [
  {
    name: 'Send to Shopify',
    color: '#14b8a6',
    flows: [
      { id: 'sh-1', name: 'Fulfil Returns → Shopify Refunds', source: 'Fulfil.io', dest: 'Shopify', schedule: 'Every 5 minutes', cron: '*/5 * * * *', lastRun: '1 minute ago', nextRel: 'in 2 minutes', nextAbs: 'Aug 29 at 9:25 PM EDT', enabled: true },
      { id: 'sh-2', name: 'Airtable to Shopify: Item Update', source: 'Airtable', dest: 'Shopify', schedule: 'Every minute', cron: '* * * * *', lastRun: '1 minute ago', nextRel: 'in less than a minute', nextAbs: 'Aug 29 at 6:23 PM EDT', enabled: true },
      { id: 'sh-3', name: 'Airtable to Shopify: Item Create', source: 'Airtable', dest: 'Shopify', schedule: 'Every 5 minutes', cron: '*/5 * * * *', lastRun: '3 minutes ago', nextRel: 'in 2 minutes', nextAbs: 'Aug 29 at 6:25 PM EDT', enabled: true },
    ],
  },
  {
    name: 'Send to Fulfil',
    color: '#3b6fe0',
    flows: [
      { id: 'ff-1', name: 'Airtable to Fulfil.io: Component Update', source: 'Airtable', dest: 'Fulfil.io', schedule: 'Daily at 6:00 AM', cron: '0 6 * * *', lastRun: 'about 15 hours ago', nextRel: 'in about 9 hours', nextAbs: 'Aug 30 at 6:00 AM EDT', enabled: true },
      { id: 'ff-2', name: 'Airtable to Fulfil.io: Component Create', source: 'Airtable', dest: 'Fulfil.io', schedule: 'Every 30 minutes', cron: '*/30 * * * *', lastRun: '23 minutes ago', nextRel: 'in 7 minutes', nextAbs: 'Aug 29 at 9:30 PM EDT', enabled: true },
      { id: 'ff-3', name: 'Airtable to Fulfil.io: Item Update', source: 'Airtable', dest: 'Fulfil.io', schedule: 'Every hour on the hour', cron: '0 * * * *', lastRun: '24 minutes ago', nextRel: 'in 36 minutes', nextAbs: 'Aug 29 at 10:00 PM EDT', enabled: true },
      { id: 'ff-4', name: 'Airtable to Fulfil.io: Item Create', source: 'Airtable', dest: 'Fulfil.io', schedule: 'Every 30 minutes', cron: '*/30 * * * *', lastRun: '24 minutes ago', nextRel: 'in 6 minutes', nextAbs: 'Aug 29 at 9:30 PM EDT', enabled: true },
    ],
  },
  {
    name: 'Send to Extensiv',
    color: '#f5811f',
    flows: [
      { id: 'ex-1', name: 'Airtable to Extensiv: Item Create (SD Returns)', source: 'Airtable', dest: 'Extensiv', schedule: 'Daily at 7:00 AM', cron: '0 7 * * *', lastRun: 'about 14 hours ago', nextRel: 'in about 10 hours', nextAbs: 'Aug 30 at 7:00 AM EDT', enabled: true },
      { id: 'ex-2', name: 'Airtable to Extensiv: Item Create (ATS)', source: 'Airtable', dest: 'Extensiv', schedule: 'Daily at 6:00 AM', cron: '0 6 * * *', lastRun: 'about 15 hours ago', nextRel: 'in about 9 hours', nextAbs: 'Aug 30 at 6:00 AM EDT', enabled: true },
      { id: 'ex-3', name: 'Airtable to Extensiv: Item Create (Cross Dock Buckle)', source: 'Airtable', dest: 'Extensiv', schedule: 'Daily at 5:00 AM', cron: '0 5 * * *', lastRun: 'about 16 hours ago', nextRel: 'in about 8 hours', nextAbs: 'Aug 30 at 5:00 AM EDT', enabled: true },
      { id: 'ex-4', name: 'Airtable to Extensiv: Item Create (Cross Dock Lids Canada)', source: 'Airtable', dest: 'Extensiv', schedule: 'Daily at 4:00 AM', cron: '0 4 * * *', lastRun: 'about 17 hours ago', nextRel: 'in about 7 hours', nextAbs: 'Aug 30 at 4:00 AM EDT', enabled: true },
      { id: 'ex-5', name: 'Airtable to Extensiv: Item Create (Cross Dock)', source: 'Airtable', dest: 'Extensiv', schedule: 'Daily at 3:00 AM', cron: '0 3 * * *', lastRun: 'about 18 hours ago', nextRel: 'in about 6 hours', nextAbs: 'Aug 30 at 3:00 AM EDT', enabled: true },
      { id: 'ex-6', name: 'Airtable to Extensiv: Item Create (B2B General)', source: 'Airtable', dest: 'Extensiv', schedule: 'Daily at 2:00 AM', cron: '0 2 * * *', lastRun: 'about 19 hours ago', nextRel: 'in about 5 hours', nextAbs: 'Aug 30 at 2:00 AM EDT', enabled: true },
      { id: 'ex-7', name: 'Airtable to Extensiv: Item Create (DTC)', source: 'Airtable', dest: 'Extensiv', schedule: 'Daily at 1:00 AM', cron: '0 1 * * *', lastRun: 'about 20 hours ago', nextRel: 'in about 4 hours', nextAbs: 'Aug 30 at 1:00 AM EDT', enabled: true },
      { id: 'ex-8', name: 'Airtable to Extensiv: Item Update (ATS)', source: 'Airtable', dest: 'Extensiv', schedule: 'Weekly on Sunday at 12:00 AM', cron: '0 0 * * 0', lastRun: '7 days ago', nextRel: 'in about 3 hours', nextAbs: 'Aug 30 at 12:00 AM EDT', enabled: true },
      { id: 'ex-9', name: 'Airtable to Extensiv: Item Update (SD Returns)', source: 'Airtable', dest: 'Extensiv', schedule: 'Weekly on Sunday at 12:00 AM', cron: '0 0 * * 0', lastRun: '7 days ago', nextRel: 'in about 3 hours', nextAbs: 'Aug 30 at 12:00 AM EDT', enabled: true },
      { id: 'ex-10', name: 'Airtable to Extensiv: Item Update (Cross Dock Buckle)', source: 'Airtable', dest: 'Extensiv', schedule: 'Weekly on Sunday at 12:00 AM', cron: '0 0 * * 0', lastRun: '7 days ago', nextRel: 'in about 3 hours', nextAbs: 'Aug 30 at 12:00 AM EDT', enabled: true },
      { id: 'ex-11', name: 'Airtable to Extensiv: Item Update (Cross Dock Lids Canada)', source: 'Airtable', dest: 'Extensiv', schedule: 'Weekly on Sunday at 12:00 AM', cron: '0 0 * * 0', lastRun: '7 days ago', nextRel: 'in about 3 hours', nextAbs: 'Aug 30 at 12:00 AM EDT', enabled: true },
      { id: 'ex-12', name: 'Airtable to Extensiv: Item Update (Cross Dock)', source: 'Airtable', dest: 'Extensiv', schedule: 'Weekly on Sunday at 12:00 AM', cron: '0 0 * * 0', lastRun: '7 days ago', nextRel: 'in about 3 hours', nextAbs: 'Aug 30 at 12:00 AM EDT', enabled: true },
      { id: 'ex-13', name: 'Airtable to Extensiv: Item Update (B2B General)', source: 'Airtable', dest: 'Extensiv', schedule: 'Weekly on Sunday at 12:00 AM', cron: '0 0 * * 0', lastRun: '7 days ago', nextRel: 'in about 3 hours', nextAbs: 'Aug 30 at 12:00 AM EDT', enabled: true },
      { id: 'ex-14', name: 'Airtable to Extensiv: Item Update (DTC)', source: 'Airtable', dest: 'Extensiv', schedule: 'Weekly on Sunday at 12:00 AM', cron: '0 0 * * 0', lastRun: '7 days ago', nextRel: 'in about 3 hours', nextAbs: 'Aug 30 at 12:00 AM EDT', enabled: true },
    ],
  },
];

export default function FlowsPage() {
  const toast = useToast();
  const [groups, setGroups] = useState<FlowGroup[]>(initialGroups);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [editing, setEditing] = useState<Flow | null>(null);
  const [viewing, setViewing] = useState<Flow | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (name: string) =>
    setCollapsed((s) => { const n = new Set(s); if (n.has(name)) n.delete(name); else n.add(name); return n; });

  const openEditor = (flow: Flow) => {
    setMenuFor(null);
    setMenuPos(null);
    setEditing(flow);
  };

  const { totalFlows, activeFlows } = useMemo(() => {
    const all = groups.flatMap((g) => g.flows);
    return { totalFlows: all.length, activeFlows: all.filter((f) => f.enabled).length };
  }, [groups]);

  const toggleFlow = (id: string) => {
    const flow = groups.flatMap((g) => g.flows).find((f) => f.id === id);
    setGroups((gs) => gs.map((g) => ({ ...g, flows: g.flows.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)) })));
    if (flow) toast(`${flow.name} ${flow.enabled ? 'disabled' : 'enabled'}.`, 'info');
  };

  const deleteFlow = (id: string) => {
    const flow = groups.flatMap((g) => g.flows).find((f) => f.id === id);
    setGroups((gs) => gs.map((g) => ({ ...g, flows: g.flows.filter((f) => f.id !== id) })));
    setMenuFor(null);
    if (flow) toast(`${flow.name} deleted.`, 'info');
  };

  const duplicateFlow = (id: string) => {
    setGroups((gs) =>
      gs.map((g) => {
        const idx = g.flows.findIndex((f) => f.id === id);
        if (idx < 0) return g;
        const original = g.flows[idx];
        const copy: Flow = { ...original, id: `${original.id}-copy-${Date.now()}`, name: `${original.name} (Copy)` };
        const flows = [...g.flows];
        flows.splice(idx + 1, 0, copy);
        return { ...g, flows };
      }),
    );
    setMenuFor(null);
    toast('Flow duplicated.');
  };

  if (viewing) {
    return (
      <FlowDetail
        flow={{
          id: viewing.id,
          name: viewing.name,
          source: viewing.source,
          dest: viewing.dest,
          schedule: viewing.schedule,
          cron: viewing.cron,
          nextRel: viewing.nextRel,
          enabled: viewing.enabled,
        }}
        onBack={() => setViewing(null)}
      />
    );
  }

  if (editing) {
    return (
      <FlowEditor
        flow={{
          id: editing.id,
          name: editing.name,
          source: editing.source,
          dest: editing.dest,
          schedule: editing.schedule,
          cron: editing.cron,
        }}
        onBack={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flows-page">
      <div className="conn-heading">
        <div>
          <h1>Active Flows</h1>
          <p>Configure and manage data pipelines across systems.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button"><FolderPlus size={15} /> New group</button>
          <button className="primary-button"><Plus size={15} /> New flow</button>
        </div>
      </div>

      <div className="conn-stats">
        <div className="conn-stat"><div className="conn-stat-head"><GitBranch size={15} /><span>Total flows</span></div><strong>{totalFlows}</strong><p>All configured pipelines</p></div>
        <div className="conn-stat"><div className="conn-stat-head conn-stat-ok"><CheckCircle2 size={15} /><span>Active</span></div><strong>{activeFlows}</strong><p>Currently enabled flows</p></div>
        <div className="conn-stat"><div className="conn-stat-head"><Activity size={15} /><span>Running</span></div><strong>0</strong><p>No active executions</p></div>
      </div>

      <div className="flow-groups">
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.name);
          return (
          <section className={`flow-group card ${isCollapsed ? 'collapsed' : ''}`} key={group.name}>
            <div className="flow-group-head" onClick={() => toggleGroup(group.name)}>
              <span className={`group-chevron ${isCollapsed ? 'collapsed' : ''}`}><ChevronDown size={16} /></span>
              <span className="flow-group-dot" style={{ background: group.color }} />
              <span className="flow-group-name">{group.name}</span>
              <span className="flow-group-count">{group.flows.length}</span>
              <button className="flow-group-menu" aria-label={`${group.name} options`} onClick={(e) => e.stopPropagation()}><MoreHorizontal size={18} /></button>
            </div>
            {!isCollapsed && (
            <div className="flow-scroll">
              <div className="flow-thead">
                <span />
                <span>State</span>
                <span>Flow name</span>
                <span>Schedule</span>
                <span>Last run</span>
                <span>Next run</span>
                <span />
              </div>
              {group.flows.map((flow) => (
                <div className="flow-row" key={flow.id}>
                  <span className="flow-grip"><GripVertical size={16} /></span>
                  <button
                    className={`settings-toggle ${flow.enabled ? 'on' : ''}`}
                    onClick={() => toggleFlow(flow.id)}
                    aria-label={flow.enabled ? `Disable ${flow.name}` : `Enable ${flow.name}`}
                    aria-pressed={flow.enabled}
                  />
                  <div className="flow-name-cell">
                    <button className="flow-name-link" title={flow.name} onClick={() => setViewing(flow)}>{flow.name}</button>
                    <span className="flow-path">{flow.source}<ChevronRight size={12} />{flow.dest}</span>
                  </div>
                  <div className="flow-sched">
                    <strong>{flow.schedule}</strong>
                    <span className="flow-cron">{flow.cron}</span>
                  </div>
                  <div className="flow-last">
                    <span className="flow-health">Healthy</span>
                    <span className="flow-muted">{flow.lastRun}</span>
                  </div>
                  <div className="flow-nextcol">
                    <strong>{flow.nextRel}</strong>
                    <span className="flow-muted">{flow.nextAbs}</span>
                  </div>
                  <div className="flow-actions">
                    <button className="flow-run" onClick={() => toast(`Running ${flow.name}...`, 'info')}><Play size={12} fill="currentColor" /> RUN</button>
                    <div className="flow-menu-wrap">
                      <button
                        className="flow-menu-btn"
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: r.bottom + 8, left: Math.max(12, r.right - 236) });
                          setMenuFor(menuFor === flow.id ? null : flow.id);
                        }}
                        aria-label={`${flow.name} actions`}
                        aria-haspopup="menu"
                        aria-expanded={menuFor === flow.id}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {menuFor === flow.id && menuPos && (
                        <div className="flow-menu" role="menu" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, right: 'auto' }}>
                          <button className="flow-menu-item" role="menuitem" onClick={() => openEditor(flow)}><SquarePen size={17} /> Edit Configuration</button>
                          <button className="flow-menu-item" role="menuitem" onClick={() => duplicateFlow(flow.id)}><Copy size={17} /> Duplicate Flow</button>
                          <button className="flow-menu-item" role="menuitem" onClick={() => setMenuFor(null)}><FolderInput size={17} /> Move to Group<ChevronRight className="flow-menu-caret" size={15} /></button>
                          <div className="flow-menu-sep" />
                          <button className="flow-menu-item danger" role="menuitem" onClick={() => deleteFlow(flow.id)}><Trash2 size={17} /> Delete Flow</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>
          );
        })}
      </div>

      {menuFor && <div className="flow-menu-overlay" onClick={() => { setMenuFor(null); setMenuPos(null); }} />}
    </div>
  );
}
