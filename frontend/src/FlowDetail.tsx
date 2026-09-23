import { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  RotateCcw,
  Timer,
} from 'lucide-react';

type FlowDetailProps = {
  flow: {
    id: string;
    name: string;
    source: string;
    dest: string;
    schedule: string;
    cron: string;
    nextRel: string;
    enabled: boolean;
  };
  onBack: () => void;
};

const logLines = [
  { text: 'Fetched 778 record(s)', time: '23:54:41' },
  { text: 'Skipped 526 record(s) by skip condition (channel not_equals)', time: '23:54:41' },
  { text: 'Skipped record 2255: all 1 item(s) were exchanged in Loop (order 11272261895)', time: '23:54:44' },
  { text: 'Skipped record 2250: all 1 item(s) were exchanged in Loop (order 11270561895)', time: '23:54:44' },
  { text: 'Skipped record 2249: all 1 item(s) were exchanged in Loop (order 11268101895)', time: '23:54:45' },
  { text: 'Skipped record 2248: all 1 item(s) were exchanged in Loop (order 11259561895)', time: '23:54:45' },
  { text: 'Skipped record 2239: all 1 item(s) were exchanged in Loop (order 11254121895)', time: '23:54:47' },
];

const runRows = [
  { id: '228701', started: '3 minutes ago', dur: '1m 42s' },
  { id: '228693', started: '8 minutes ago', dur: '1m 46s' },
  { id: '228687', started: '13 minutes ago', dur: '1m 58s' },
  { id: '228680', started: '18 minutes ago', dur: '1m 41s' },
  { id: '228643', started: '44 minutes ago', dur: '2m 5s' },
  { id: '228635', started: 'about 1 hour ago', dur: '1m 46s' },
];

type ChipKind = 'pos' | 'neg' | 'empty';
type ConfigChange = { field: string; from: string; fromKind: ChipKind; to: string; toKind: ChipKind; when: string };

const configHistory: ConfigChange[] = [
  { field: 'Alert on already-satisfied skips', from: 'Yes', fromKind: 'neg', to: 'No', toKind: 'pos', when: '29 days ago' },
  { field: 'Loop exchange filter', from: 'empty', fromKind: 'empty', to: '2 fields', toKind: 'pos', when: '29 days ago' },
  { field: 'Schedule (cron)', from: 'empty', fromKind: 'empty', to: '*/5 * * * *', toKind: 'pos', when: '29 days ago' },
  { field: 'Schedule (cron)', from: '*/5 * * * *', fromKind: 'neg', to: 'empty', toKind: 'empty', when: '30 days ago' },
  { field: 'Schedule (cron)', from: '0 * * * *', fromKind: 'neg', to: '*/5 * * * *', toKind: 'pos', when: 'about 1 month ago' },
];

function Chip({ text, kind }: { text: string; kind: ChipKind }) {
  if (kind === 'empty') return <em className="fd-chip-empty">{text}</em>;
  return <span className={`fd-chip fd-chip-${kind}`}>{text}</span>;
}

export default function FlowDetail({ flow, onBack }: FlowDetailProps) {
  const [enabled, setEnabled] = useState(flow.enabled);
  const [running, setRunning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const chartPoints = '0,150 70,132 150,96 240,60 340,44 460,40 620,40 900,40 1200,40';

  return (
    <div className="fd-page">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to flows</button>

      <div className="fd-header">
        <div className="fd-title">
          <h1>{flow.name}</h1>
          <span className={`fd-badge ${running ? 'fd-badge-run' : 'fd-badge-ok'}`}>{running ? 'RUNNING' : 'HEALTHY'}</span>
        </div>
        <div className="fd-header-actions">
          <button
            className="fd-enable"
            onClick={() => setEnabled((v) => !v)}
            aria-pressed={enabled}
          >
            <span>ENABLED</span>
            <span className={`settings-toggle ${enabled ? 'on' : ''}`} />
          </button>
          <button className="fd-run" onClick={() => setRunning(true)}>
            <Play size={14} fill="currentColor" /> RUN NOW
          </button>
          <div className="fd-menu-wrap">
            <button className="fd-more" aria-label="Flow actions" onClick={() => setMenuOpen((v) => !v)}>
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <>
                <div className="fd-menu-overlay" onClick={() => setMenuOpen(false)} />
                <div className="fd-menu" role="menu">
                  <button role="menuitem" onClick={() => setMenuOpen(false)}>Edit configuration</button>
                  <button role="menuitem" onClick={() => setMenuOpen(false)}>Duplicate flow</button>
                  <button className="danger" role="menuitem" onClick={() => setMenuOpen(false)}>Delete flow</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fd-meta">
        <span className="fd-pill"><Database size={14} /> {flow.source} <ArrowRight size={12} className="fd-pill-arrow" /> {flow.dest}</span>
        <span className="fd-pill"><Clock size={14} /> {flow.schedule} <code>{flow.cron}</code></span>
        <span className="fd-pill"><CalendarDays size={14} /> Next run: {flow.nextRel}</span>
      </div>

      {running && (
        <section className="fd-live">
          <div className="fd-live-top">
            <div className="fd-live-head">
              <span className="fd-live-spin"><Loader2 size={18} className="spin" /></span>
              <div>
                <strong>Run #228707 In Progress</strong>
                <span className="fd-live-sub"><Activity size={13} /> Manual trigger <i /> <Timer size={13} /> 9s</span>
              </div>
            </div>
            <button className="fd-view-details">VIEW DETAILS <ArrowRight size={15} /></button>
          </div>

          <div className="fd-live-stats">
            <div className="fd-mini"><span>RECORDS READ</span><strong className="fd-num-blue">778</strong></div>
            <div className="fd-mini"><span className="fd-lbl-green">WRITTEN</span><strong className="fd-num-green">0</strong></div>
            <div className="fd-mini"><span className="fd-lbl-red">FAILED</span><strong className="fd-num-red">0</strong></div>
          </div>

          <div className="fd-console">
            {logLines.map((line, i) => (
              <div className="fd-log" key={i}>
                <CheckCircle2 size={14} className="fd-log-check" />
                <span className="fd-log-text">{line.text}</span>
                <span className="fd-log-time">{line.time}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="fd-stats">
        <div className="fd-stat fd-stat-ok">
          <div className="fd-stat-head"><CheckCircle2 size={17} /> SUCCESS RATE</div>
          <strong className="fd-num-green">98.3%</strong>
          <p>7-day rolling average</p>
        </div>
        <div className="fd-stat fd-stat-info">
          <div className="fd-stat-head"><Activity size={17} /> TOTAL RUNS</div>
          <strong className="fd-num-blue">298</strong>
          <p>Over the last 7 days</p>
        </div>
        <div className="fd-stat">
          <div className="fd-stat-head"><Timer size={17} /> AVG DURATION</div>
          <strong>1m 45s</strong>
          <p>Execution time (7d)</p>
        </div>
      </div>

      <section className="fd-card">
        <div className="fd-card-head">
          <div>
            <h2>Execution History</h2>
            <p>Recent run logs and performance over time.</p>
          </div>
          <button className="fd-link">VIEW ALL <ArrowRight size={15} /></button>
        </div>

        <div className="fd-chart">
          <svg viewBox="0 0 1200 170" preserveAspectRatio="none" className="fd-chart-svg">
            <defs>
              <linearGradient id="fdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#12b76a" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#12b76a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`${chartPoints} 1200,170 0,170`} fill="url(#fdFill)" />
            <polyline points={chartPoints} fill="none" stroke="#12b76a" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            <line x1="0" y1="162" x2="1200" y2="162" stroke="#ff3048" strokeWidth="2" strokeDasharray="4 8" />
          </svg>
        </div>

        <div className="fd-runs">
          <div className="fd-runs-head">
            <span>Run ID</span>
            <span>Status</span>
            <span>Started</span>
            <span className="fd-r-dur">Duration</span>
            <span className="fd-r-rec">Records processed</span>
          </div>
          {runRows.map((r) => (
            <div className="fd-run-row" key={r.id}>
              <span className="fd-run-id">#{r.id}</span>
              <span><span className="fd-run-status">SUCCESS</span></span>
              <span className="fd-run-started"><strong>{r.started}</strong><em>Scheduled</em></span>
              <span className="fd-r-dur fd-run-dur">{r.dur}</span>
              <span className="fd-r-rec fd-run-rec">
                READ <b>778</b> <i>WRITTEN</i> <b className="fd-num-green">0</b> <i>FAILED</i> <b>0</b>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="fd-card">
        <div className="fd-card-head">
          <div>
            <h2>Configuration History</h2>
            <p>Audit log of changes made to this flow.</p>
          </div>
          <button className="fd-link">VIEW ALL ACTIVITY <ArrowRight size={15} /></button>
        </div>

        <div className="fd-timeline">
          {configHistory.map((c, i) => (
            <div className="fd-tl-item" key={i}>
              <span className="fd-tl-icon"><Pencil size={13} /></span>
              <div className="fd-tl-body">
                <div className="fd-tl-top">
                  <span className="fd-tl-badge">UPDATED</span>
                  <span className="fd-tl-meta">by rmirabile@goorin.com <i /> {c.when}</span>
                  <button className="fd-restore"><RotateCcw size={13} /> Restore</button>
                </div>
                <div className="fd-tl-change">
                  <span className="fd-tl-field">{c.field}</span>
                  <Chip text={c.from} kind={c.fromKind} />
                  <ArrowRight size={14} className="fd-tl-arrow" />
                  <Chip text={c.to} kind={c.toKind} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
