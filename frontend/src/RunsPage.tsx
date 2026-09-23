import { useMemo, useState } from 'react';
import { Activity, Calendar, CheckCircle2, ChevronDown, Eye, Loader, MinusCircle, RefreshCw, XCircle } from 'lucide-react';

type RunStatus = 'success' | 'failed' | 'running' | 'skipped';

type Run = {
  id: string;
  status: RunStatus;
  flow: string;
  trigger: string;
  started: string;
  duration: string;
  records: string;
};

const statusConfig: Record<RunStatus, { label: string; icon: typeof CheckCircle2 }> = {
  success: { label: 'success', icon: CheckCircle2 },
  failed: { label: 'failed', icon: XCircle },
  running: { label: 'running', icon: Loader },
  skipped: { label: 'skipped', icon: MinusCircle },
};

const runs: Run[] = [
  { id: '#228617', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '1 minute ago', duration: '346ms', records: '-' },
  { id: '#228616', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '2 minutes ago', duration: '524ms', records: '-' },
  { id: '#228615', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '3 minutes ago', duration: '405ms', records: '-' },
  { id: '#228614', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '4 minutes ago', duration: '390ms', records: '-' },
  { id: '#228613', status: 'running', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '4 minutes ago', duration: '—', records: '-' },
  { id: '#228612', status: 'success', flow: 'Fulfil Returns \u2192 Shopify Refunds', trigger: 'Schedule', started: '5 minutes ago', duration: '1m 40s', records: '18' },
  { id: '#228611', status: 'success', flow: 'Airtable to Shopify: Item Create', trigger: 'Schedule', started: '5 minutes ago', duration: '472ms', records: '2' },
  { id: '#228610', status: 'failed', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '6 minutes ago', duration: '188ms', records: '-' },
  { id: '#228609', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '7 minutes ago', duration: '351ms', records: '-' },
  { id: '#228608', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '8 minutes ago', duration: '409ms', records: '-' },
  { id: '#228607', status: 'skipped', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '9 minutes ago', duration: '12ms', records: '-' },
  { id: '#228606', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '10 minutes ago', duration: '468ms', records: '-' },
  { id: '#228605', status: 'success', flow: 'Fulfil Returns \u2192 Shopify Refunds', trigger: 'Schedule', started: '10 minutes ago', duration: '1m 47s', records: '21' },
  { id: '#228604', status: 'success', flow: 'Airtable to Shopify: Item Create', trigger: 'Schedule', started: '10 minutes ago', duration: '432ms', records: '4' },
  { id: '#228603', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '11 minutes ago', duration: '385ms', records: '-' },
  { id: '#228602', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '12 minutes ago', duration: '361ms', records: '-' },
  { id: '#228601', status: 'success', flow: 'Fulfil Returns \u2192 Shopify Refunds', trigger: 'Schedule', started: '15 minutes ago', duration: '1m 32s', records: '9' },
  { id: '#228600', status: 'failed', flow: 'Fulfil Returns \u2192 Shopify Refunds', trigger: 'Schedule', started: '20 minutes ago', duration: '2m 11s', records: '-' },
  { id: '#228599', status: 'success', flow: 'Airtable to Shopify: Item Create', trigger: 'Schedule', started: '22 minutes ago', duration: '418ms', records: '3' },
  { id: '#228598', status: 'success', flow: 'Airtable to Shopify: Item Update', trigger: 'Schedule', started: '25 minutes ago', duration: '397ms', records: '-' },
];

export default function RunsPage() {
  const [flow, setFlow] = useState('all');
  const [status, setStatus] = useState<'all' | RunStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const flowOptions = useMemo(() => Array.from(new Set(runs.map((r) => r.flow))), []);

  const visible = useMemo(
    () => runs.filter((r) => (flow === 'all' || r.flow === flow) && (status === 'all' || r.status === status)),
    [flow, status],
  );

  const succeeded = useMemo(() => runs.filter((r) => r.status === 'success').length, []);
  const failed = useMemo(() => runs.filter((r) => r.status === 'failed').length, []);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <div className="runs-page">
      <div className="conn-heading">
        <div>
          <h1>Runs</h1>
          <p>Execution history across every flow, updated in real time.</p>
        </div>
      </div>

      <div className="conn-stats">
        <div className="conn-stat"><div className="conn-stat-head"><Activity size={15} /><span>Total runs</span></div><strong>{runs.length}</strong><p>Across all flows</p></div>
        <div className="conn-stat"><div className="conn-stat-head conn-stat-ok"><CheckCircle2 size={15} /><span>Succeeded</span></div><strong>{succeeded}</strong><p>Completed without errors</p></div>
        <div className="conn-stat"><div className="conn-stat-head"><XCircle size={15} /><span>Failed</span></div><strong>{failed}</strong><p>{failed === 0 ? 'No failures detected' : 'Need attention'}</p></div>
      </div>

      <section className="runs-card">
        <div className="runs-card-header">
          <div className="runs-header-title">
            <h2>Recent runs</h2>
            <span className="runs-count">{visible.length} of {runs.length}</span>
          </div>
          <div className="runs-header-controls">
            <div className="runs-select-wrap">
              <select value={flow} onChange={(e) => setFlow(e.target.value)} aria-label="Filter by flow">
                <option value="all">All Flows</option>
                {flowOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <ChevronDown className="runs-caret" size={15} />
            </div>
            <div className="runs-select-wrap">
              <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | RunStatus)} aria-label="Filter by status">
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="running">Running</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
              <ChevronDown className="runs-caret" size={15} />
            </div>
            <button className="runs-refresh" onClick={refresh}><RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh</button>
          </div>
        </div>

        <div className="runs-table-wrap">
          <table className="runs-table">
            <thead>
              <tr>
                <th>ID</th><th>Status</th><th>Flow</th><th>Trigger</th><th>Started</th><th className="runs-right">Duration</th><th className="runs-right">Records</th><th aria-label="View" />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={8} className="runs-empty">No runs match these filters.</td></tr>
              ) : (
                visible.map((r) => {
                  const cfg = statusConfig[r.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={r.id}>
                      <td className="runs-id">{r.id}</td>
                      <td><span className={`runs-status ${r.status}`}><Icon size={13} className={r.status === 'running' ? 'spin' : ''} />{cfg.label}</span></td>
                      <td className="runs-flow">{r.flow}</td>
                      <td className="runs-trigger">{r.trigger}</td>
                      <td className="runs-started"><Calendar size={14} />{r.started}</td>
                      <td className="runs-right runs-duration">{r.duration}</td>
                      <td className="runs-right runs-records">{r.records}</td>
                      <td className="runs-right"><button className="runs-view" aria-label={`View run ${r.id}`}><Eye size={16} /></button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
