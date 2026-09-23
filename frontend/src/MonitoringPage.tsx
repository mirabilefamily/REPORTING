import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type Metric = {
  label: string;
  value: string;
  detail: string;
  tone?: 'green' | 'red' | 'orange' | 'blue';
  trend?: 'up' | 'down';
  delta?: string;
};

const metrics: Metric[] = [
  { label: 'Reliability', value: '99.8%', detail: 'vs last week', tone: 'green', trend: 'up', delta: '+1.2%' },
  { label: 'Throughput', value: '1,248', detail: 'records today', tone: 'blue', trend: 'up', delta: '+8.4%' },
  { label: 'Efficiency', value: '84.2%', detail: 'of capacity', tone: 'orange', trend: 'down', delta: '-2.1%' },
  { label: 'Infrastructure', value: '18 / 18', detail: 'healthy links', tone: 'green', trend: 'up', delta: 'All up' },
  { label: 'P95 latency', value: '142 ms', detail: 'vs yesterday', tone: 'green', trend: 'down', delta: '-18 ms' },
];

type PipelineRow = {
  name: string;
  age: string;
  success: string;
  runs: number;
  avgTime: string;
  skipped: number;
  active: boolean;
};

const pipelineRows: PipelineRow[] = [
  { name: 'Airtable to Extensiv: Item Create (ATS)', age: '15h ago', success: '100.0%', runs: 1, avgTime: '11s', skipped: 0, active: true },
  { name: 'Item Create (B2B General)', age: '19h ago', success: '100.0%', runs: 1, avgTime: '10s', skipped: 0, active: true },
  { name: 'Item Create (Cross Dock Buckle)', age: '16h ago', success: '100.0%', runs: 1, avgTime: '8s', skipped: 0, active: true },
  { name: 'Item Create (Cross Dock Lids Canada)', age: '17h ago', success: '100.0%', runs: 1, avgTime: '19s', skipped: 0, active: true },
  { name: 'Item Create (Cross Dock)', age: '18h ago', success: '100.0%', runs: 1, avgTime: '7s', skipped: 0, active: true },
  { name: 'Item Create (DTC)', age: '20h ago', success: '100.0%', runs: 1, avgTime: '11s', skipped: 0, active: true },
  { name: 'Item Create (SD Returns)', age: '14h ago', success: '100.0%', runs: 1, avgTime: '7s', skipped: 0, active: true },
  { name: 'Item Update (ATS)', age: '6d ago', success: '—', runs: 0, avgTime: '—', skipped: 0, active: false },
  { name: 'Item Update (B2B General)', age: '6d ago', success: '—', runs: 0, avgTime: '—', skipped: 0, active: false },
  { name: 'Item Update (Cross Dock Buckle)', age: '6d ago', success: '—', runs: 0, avgTime: '—', skipped: 0, active: false },
];

type ChartTab = 'Overview' | 'Success' | 'Exceptions';

const rangeOptions = ['Last hour', 'Last 24 hours', 'Last 7 days', 'Last 30 days', 'Last 90 days'] as const;
type Range = (typeof rangeOptions)[number];

const xLabels: Record<Range, string[]> = {
  'Last hour': ['00:00', '00:15', '00:30', '00:45', 'Now'],
  'Last 24 hours': ['00:00', '06:00', '12:00', '18:00', 'Now'],
  'Last 7 days': ['6d', '4d', '2d', '1d', 'Now'],
  'Last 30 days': ['30d', '20d', '10d', '5d', 'Now'],
  'Last 90 days': ['90d', '60d', '30d', '15d', 'Now'],
};

const series: Record<ChartTab, { values: number[]; max: number; color: string; yTicks: string[]; label: string }> = {
  Overview: {
    values: [420, 610, 540, 780, 700, 960, 880, 1120, 1040, 1260, 1180, 1360, 1420],
    max: 1500,
    color: '#ff3048',
    yTicks: ['1.5k', '1k', '500', '0'],
    label: 'executions',
  },
  Success: {
    values: [410, 600, 532, 770, 690, 948, 872, 1108, 1030, 1248, 1170, 1348, 1410],
    max: 1500,
    color: '#12b76a',
    yTicks: ['1.5k', '1k', '500', '0'],
    label: 'successful runs',
  },
  Exceptions: {
    values: [2, 5, 3, 8, 4, 6, 3, 9, 5, 4, 7, 2, 6],
    max: 30,
    color: '#f59e0b',
    yTicks: ['30', '20', '10', '0'],
    label: 'exceptions',
  },
};

const W = 900;
const H = 180;

function buildPaths(values: number[], max: number) {
  const n = values.length;
  const stepX = W / (n - 1);
  const pts = values.map((v, i) => [i * stepX, H - (v / max) * (H - 16) - 8] as const);
  let line = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    line += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  return { line, area };
}

export default function MonitoringPage() {
  const [range, setRange] = useState<Range>('Last 24 hours');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [chartTab, setChartTab] = useState<ChartTab>('Overview');

  const active = series[chartTab];
  const paths = useMemo(() => buildPaths(active.values, active.max), [active]);
  const labels = xLabels[range];
  const gradientId = `monFill-${chartTab}`;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>System telemetry</h1>
          <p>Real-time pipeline monitoring and operational health.</p>
        </div>
        <div className="heading-actions">
          <div className="range-select">
            <button className="range-button" onClick={() => setRangeOpen((o) => !o)} aria-haspopup="menu" aria-expanded={rangeOpen}>
              {range}
              <ChevronDown className={`range-caret ${rangeOpen ? 'open' : ''}`} size={15} />
            </button>
            {rangeOpen && (
              <>
                <div className="range-overlay" onClick={() => setRangeOpen(false)} />
                <div className="range-menu" role="menu">
                  {rangeOptions.map((opt) => (
                    <button key={opt} role="menuitem" className={`range-option ${opt === range ? 'active' : ''}`} onClick={() => { setRange(opt); setRangeOpen(false); }}>
                      <span>{opt}</span>{opt === range && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <section className="mon-hero">
        <div className="mon-kpis">
          {metrics.map((metric) => {
            const TrendIcon = metric.trend === 'down' ? TrendingDown : TrendingUp;
            return (
              <div className="mon-kpi" key={metric.label}>
                <span className="mon-kpi-label">{metric.label}</span>
                <strong className="mon-kpi-value">{metric.value}</strong>
                <div className="mon-kpi-foot">
                  <span className={`mon-kpi-trend tone-${metric.tone}`}><TrendIcon size={13} />{metric.delta}</span>
                  <span className="mon-kpi-detail">{metric.detail}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mon-chart-head">
          <div className="mon-chart-title">
            <h2>Executions over time</h2>
            <p>{range} · {active.label} by interval</p>
          </div>
          <div className="mon-seg">
            {(['Overview', 'Success', 'Exceptions'] as const).map((tab) => (
              <button key={tab} className={chartTab === tab ? 'active' : ''} onClick={() => setChartTab(tab)}>{tab}</button>
            ))}
          </div>
        </div>
        <div className="mon-chart-body">
          <div className="mon-yaxis">{active.yTicks.map((t) => <span key={t}>{t}</span>)}</div>
          <div className="mon-plot">
            <span className="mon-grid" /><span className="mon-grid" /><span className="mon-grid" /><span className="mon-grid" />
            <svg className="mon-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label={`${chartTab} trend`}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={active.color} stopOpacity=".18" />
                  <stop offset="1" stopColor={active.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={paths.area} fill={`url(#${gradientId})`} />
              <path d={paths.line} fill="none" stroke={active.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="mon-xaxis">{labels.map((l) => <span key={l}>{l}</span>)}</div>
        <div className="mon-summary">
          <span><i className="tone-green" /> Success <strong>1,242</strong></span>
          <span><i className="tone-red" /> Failed <strong>6</strong></span>
          <span><i className="tone-orange" /> Throttled <strong>0</strong></span>
          <span><i className="tone-blue" /> Running <strong>12</strong></span>
        </div>
      </section>

      <section className="mon-table-card">
        <div className="mon-table-head">
          <div className="mon-table-title">
            <h2>Pipeline performance</h2>
            <p>Execution stats per pipeline for the selected timeframe.</p>
          </div>
          <div className="pl-header-actions">
            <button className="pl-btn-ghost">Flows <ArrowRight size={14} /></button>
            <button className="pl-btn-dark"><Sparkles size={14} /> AI Canvas</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="pipeline-table">
            <thead><tr><th>Flow name</th><th>Status</th><th>Success</th><th>Runs</th><th>Avg time</th><th>Activity</th><th aria-label="Open" /></tr></thead>
            <tbody>
              {pipelineRows.map((row) => (
                <tr key={row.name}>
                  <td>
                    <div className="pl-flow">
                      <span className={`pl-flow-dot ${row.active ? '' : 'idle'}`} />
                      <div className="pl-flow-copy">
                        <div className="pl-flow-name"><strong>{row.name}</strong><span className="pl-tag">Flow</span></div>
                        <span className="pl-flow-age">{row.age}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className={`pl-pill ${row.active ? '' : 'idle'}`}><i />Healthy</span></td>
                  <td className="pl-num"><strong>{row.success}</strong></td>
                  <td className="pl-num">{row.runs}</td>
                  <td className="pl-num"><strong>{row.avgTime}</strong></td>
                  <td>
                    {row.active ? (
                      <div className="pl-activity">
                        <span className="pl-activity-ok" />
                        <svg className="pl-spark" viewBox="0 0 90 16" preserveAspectRatio="none" aria-hidden="true"><path d="M0 12 L11 6 L22 11 L33 4 L45 9 L57 3 L69 8 L80 5 L90 7" fill="none" stroke="#ff3048" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    ) : (
                      <span className="pl-activity-flat" aria-label="No activity" />
                    )}
                  </td>
                  <td><button className="pl-open" aria-label={`Open ${row.name}`}><ArrowUpRight size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
