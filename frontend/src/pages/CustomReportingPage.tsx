import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Grid3x3,
  LineChart,
  Mail,
  MoreHorizontal,
  Pencil,
  PieChart as PieChartIcon,
  Play,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PopoverPortal from '../components/PopoverPortal';
import { SegTabs } from '../DashboardPage';
import DateRangePicker from '../components/DateRangePicker';

import { usePageRange } from '../lib/pageRange';

// ─── Tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
const CARD_SHADOW_HOVER = '0 0 0 1px rgba(15,23,42,0.08), 0 6px 16px rgba(15,23,42,0.06)';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const INTER = { fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", WebkitFontSmoothing: 'antialiased' } as const;
const INK = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50 = '#F8FAFC';
const CORAL = '#FF6F61';
const CORAL_DK = '#C9422E';
const CORAL_50 = '#FFF1EF';
const CORAL_600 = '#DB4D3F';
const EMERALD = '#047857';

type Tab = 'My Reports' | 'Shared' | 'Scheduled' | 'Templates';
const TABS: readonly Tab[] = ['My Reports', 'Shared', 'Scheduled', 'Templates'] as const;
const DATA_SOURCES = ['Sales', 'Orders', 'Inventory', 'Customers', 'Financials', 'Forecast'] as const;
const DIMENSIONS = ['Channel', 'Customer', 'SKU', 'Category', 'Region', 'Rep', 'Date · Day', 'Date · Week', 'Date · Month', 'Date · Quarter', 'Order Status'] as const;
const METRICS = ['Revenue', 'Gross Profit', 'Margin %', 'Units', 'AOV', 'Orders', 'Returns', 'Fill Rate', 'Days of Supply', 'Forecast Attainment'] as const;
const VIZ_TYPES = ['Table', 'Bar', 'Line', 'Area', 'Pie', 'KPI', 'Pivot'] as const;
const OPERATORS = ['equals', 'not equals', 'contains', 'starts with', 'ends with', 'greater than', 'less than', 'between', 'is empty', 'is not empty'] as const;
type Operator = typeof OPERATORS[number];
type FieldKind = 'string' | 'number' | 'date';

const NUMERIC_FIELDS = new Set<string>(['Revenue', 'Gross Profit', 'Margin %', 'Units', 'AOV', 'Orders', 'Returns', 'Fill Rate', 'Days of Supply', 'Forecast Attainment']);
// Enum value options for known fields — use DsSelect for these instead of a text input.
const VALUE_OPTIONS: Record<string, readonly string[]> = {
  'Channel':      ['Ecommerce', 'Amazon', 'US Wholesale', 'Distributors', 'Retail'],
  'Order Status': ['Open', 'Partial', 'Fulfilled', 'Backordered', 'Canceled'],
  'Status':       ['Healthy', 'Low', 'Critical', 'Out'],
  'Region':       ['West', 'Central', 'East', 'International'],
};
function fieldKind(field: string): FieldKind {
  if (field.startsWith('Date')) return 'date';
  if (NUMERIC_FIELDS.has(field)) return 'number';
  return 'string';
}
function operatorsFor(kind: FieldKind): readonly Operator[] {
  if (kind === 'number') return ['equals', 'not equals', 'greater than', 'less than', 'between', 'is empty', 'is not empty'];
  if (kind === 'date')   return ['equals', 'greater than', 'less than', 'between'];
  return ['equals', 'not equals', 'contains', 'starts with', 'ends with', 'is empty', 'is not empty'];
}
const AGG = ['sum', 'avg', 'min', 'max'] as const;

type Visibility = 'Private' | 'Shared';
type FilterRule = { field: string; op: string; value: string; value2?: string; conj?: 'AND' | 'OR' };
type Report = {
  id: string;
  name: string;
  description: string;
  dataSource: string;
  dimensions: string[];
  metrics: string[];
  filters: FilterRule[];
  viz: string;
  visibility: Visibility;
  owner: string;
  ownerInitials: string;
  tab: Tab;
  updatedAt: string; // ISO
  spark: number[];
};

const nowISO = () => new Date().toISOString();
const rid = () => `r_${Math.random().toString(36).slice(2, 10)}`;

const SEED_REPORTS: Report[] = [
  { id: 'r_whs_reorder',  name: 'Wholesale Reorder Health',   description: 'Reorder rate by channel and rep',           dataSource: 'Sales',     dimensions: ['Channel', 'Rep'],              metrics: ['Revenue', 'Orders'],       filters: [], viz: 'Bar',    visibility: 'Private', owner: 'Ryan Mirabile',  ownerInitials: 'RM', tab: 'My Reports', updatedAt: nowISO(), spark: [12,14,13,16,18,17,19,21,22,24,23,26] },
  { id: 'r_dtc_funnel',   name: 'DTC Funnel Weekly',          description: 'Sessions → add-to-cart → purchase',          dataSource: 'Orders',    dimensions: ['Date · Week'],                 metrics: ['Revenue', 'AOV'],          filters: [], viz: 'Line',   visibility: 'Private', owner: 'Ryan Mirabile',  ownerInitials: 'RM', tab: 'My Reports', updatedAt: nowISO(), spark: [20,21,22,20,23,24,26,28,27,29,30,32] },
  { id: 'r_retail_slow',  name: 'Retail Slow Movers',          description: 'Low velocity SKUs by location',               dataSource: 'Inventory', dimensions: ['SKU', 'Region'],               metrics: ['Days of Supply', 'Units'], filters: [], viz: 'Table',  visibility: 'Shared',  owner: 'Priya Narayan',  ownerInitials: 'PN', tab: 'My Reports', updatedAt: nowISO(), spark: [8,10,12,11,14,13,15,14,16,17,15,16] },
  { id: 'r_top_accounts', name: 'Top 50 Accounts YTD',        description: 'Net sales ranked by account',                 dataSource: 'Sales',     dimensions: ['Customer', 'Rep'],             metrics: ['Revenue'],                  filters: [], viz: 'Table',  visibility: 'Shared',  owner: 'Erwin Samson',   ownerInitials: 'ES', tab: 'Shared',     updatedAt: nowISO(), spark: [30,32,34,33,35,36,38,40,39,41,42,44] },
  { id: 'r_returns',      name: 'Returns by Reason',          description: 'Return rate split by reason × channel',      dataSource: 'Orders',    dimensions: ['Channel', 'Order Status'],     metrics: ['Returns'],                  filters: [], viz: 'Bar',    visibility: 'Private', owner: 'Ryan Mirabile',  ownerInitials: 'RM', tab: 'My Reports', updatedAt: nowISO(), spark: [10,9,11,10,12,11,13,12,14,13,15,14] },
  { id: 'r_margin_sku',   name: 'Margin by SKU · 90 days',     description: 'Gross margin on highest-revenue SKUs',       dataSource: 'Sales',     dimensions: ['SKU'],                         metrics: ['Gross Profit', 'Margin %'], filters: [], viz: 'Table',  visibility: 'Shared',  owner: 'Devon Rhodes',   ownerInitials: 'DR', tab: 'Shared',     updatedAt: nowISO(), spark: [18,19,17,20,21,22,20,23,25,24,26,28] },
  { id: 'r_cash_flow',    name: 'Rolling Cash Flow',           description: 'Weekly inflow/outflow trend',                dataSource: 'Financials',dimensions: ['Date · Week'],                 metrics: ['Revenue'],                  filters: [], viz: 'Area',   visibility: 'Private', owner: 'Ryan Mirabile',  ownerInitials: 'RM', tab: 'My Reports', updatedAt: nowISO(), spark: [50,48,52,54,51,55,57,58,56,60,62,61] },
  { id: 'r_forecast_rep', name: 'Forecast Attainment by Rep', description: 'Pipeline vs quota per rep',                  dataSource: 'Forecast',  dimensions: ['Rep'],                         metrics: ['Forecast Attainment', 'Revenue'], filters: [], viz: 'Bar', visibility: 'Shared', owner: 'James Lee', ownerInitials: 'JL', tab: 'Shared', updatedAt: nowISO(), spark: [40,42,41,44,46,45,47,49,48,51,50,53] },
];

type Template = { id: string; name: string; description: string; dataSource: string; dimensions: string[]; metrics: string[]; viz: string; icon: typeof BarChart3 };
const TEMPLATES: Template[] = [
  { id: 't_wf',    name: 'Channel Revenue Waterfall',  description: 'YoY $ change by channel',                 dataSource: 'Sales',     dimensions: ['Channel'],              metrics: ['Revenue'],                   viz: 'Bar',   icon: BarChart3 },
  { id: 't_sku',   name: 'Top SKUs by Margin',          description: 'Highest-margin products this quarter',    dataSource: 'Sales',     dimensions: ['SKU'],                  metrics: ['Gross Profit', 'Margin %'],  viz: 'Table', icon: TrendingUp },
  { id: 't_coh',   name: 'Customer Cohort Retention',   description: 'Monthly cohort retention curves',         dataSource: 'Customers', dimensions: ['Date · Month'],         metrics: ['Orders'],                    viz: 'Line',  icon: Users },
  { id: 't_aging', name: 'Open Order Aging',            description: 'Days-since-open bucketed by status',      dataSource: 'Orders',    dimensions: ['Order Status'],         metrics: ['Orders', 'Revenue'],         viz: 'Bar',   icon: Clock },
  { id: 't_vs',    name: 'Forecast vs Actual by Rep',   description: 'Attainment against quota per rep',        dataSource: 'Forecast',  dimensions: ['Rep'],                  metrics: ['Revenue', 'Forecast Attainment'], viz: 'Bar', icon: Activity },
  { id: 't_dos',   name: 'Inventory Days of Supply',    description: 'Stock cover per SKU, flagged if < 30d',  dataSource: 'Inventory', dimensions: ['SKU', 'Region'],        metrics: ['Days of Supply', 'Units'],   viz: 'Table', icon: Sparkles },
];

const STORAGE_KEY = 'customReports.v1';
const loadReports = (): Report[] => {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) as Report[]; } catch {}
  return SEED_REPORTS;
};
const saveReports = (rs: Report[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rs)); } catch {} };

const relativeTime = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d ago`;
  const w = Math.floor(dd / 7);
  if (w < 4) return `${w}w ago`;
  return `${Math.floor(dd / 30)}mo ago`;
};

// ─── Preview mock data ─────────────────────────────────────────────────
function seededRand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}
const DIM_VALUES: Record<string, string[]> = {
  'Channel':        ['US Wholesale', 'Distributors', 'Retail', 'Ecommerce', 'Amazon'],
  'Customer':       ['Lids', 'SASAtrend', 'Industrias Mercury', 'Nordstrom', 'Buckle Inc.'],
  'SKU':            ['101-2450 Dean Trucker', '101-2510 Dusty Baker', '101-2470 Angler Mesh', '101-2615 Farmer', '101-2452 Dean Washed'],
  'Category':       ['Trucker', 'Snapback', 'Fitted', 'Dad Hat', 'Felt'],
  'Region':         ['West', 'Midwest', 'Northeast', 'South', 'International'],
  'Rep':            ['Jovon Clements', 'Erwin Samson', 'Priya Narayan', 'Devon Rhodes', 'James Lee'],
  'Date · Day':     ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  'Date · Week':    ['W40', 'W41', 'W42', 'W43', 'W44', 'W45', 'W46', 'W47'],
  'Date · Month':   ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  'Date · Quarter': ['Q1', 'Q2', 'Q3', 'Q4'],
  'Order Status':   ['New', 'In Production', 'Confirmed', 'Shipped', 'Delivered'],
};
function buildPreviewRows(dims: string[], mets: string[], source: string, limit = 25) {
  const seed = `${source}|${dims.join(',')}|${mets.join(',')}`;
  const rand = seededRand(seed);
  const d0 = dims[0] ? DIM_VALUES[dims[0]] ?? [] : ['All'];
  const d1 = dims[1] ? DIM_VALUES[dims[1]] ?? [] : [''];
  const rows: Record<string, string | number>[] = [];
  for (const a of d0) for (const b of d1) {
    const row: Record<string, string | number> = {};
    if (dims[0]) row[dims[0]] = a; if (dims[1] && b) row[dims[1]] = b;
    mets.forEach((m) => {
      const base = m === 'Margin %' || m === 'Fill Rate' || m === 'Forecast Attainment' ? 40 + rand() * 55
                 : m === 'Days of Supply' ? 10 + rand() * 180
                 : m === 'Units' || m === 'Orders' || m === 'Returns' ? Math.floor(500 + rand() * 25_000)
                 : m === 'AOV' ? 60 + rand() * 180
                 : 10_000 + rand() * 500_000;
      row[m] = Math.round(base * 100) / 100;
    });
    rows.push(row);
    if (rows.length >= limit) break;
  }
  return rows.slice(0, limit);
}
const fmtMetric = (m: string, v: number) => {
  if (m === 'Margin %' || m === 'Fill Rate' || m === 'Forecast Attainment') return `${v.toFixed(1)}%`;
  if (m === 'Days of Supply') return `${Math.round(v)}d`;
  if (m === 'Units' || m === 'Orders' || m === 'Returns') return Math.round(v).toLocaleString('en-US');
  if (m === 'AOV') return `$${v.toFixed(2)}`;
  return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : v >= 1_000 ? `$${Math.round(v / 1_000)}K` : `$${v.toFixed(0)}`;
};

// ─── UI primitives ─────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 100, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: INK, color: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: 12.5, fontWeight: 500, animation: 'cr-toast-in 180ms ease-out both' }} data-testid="cr-toast">
      <CheckCircle2 size={13} strokeWidth={2.2} />{message}
      <style>{`@keyframes cr-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function vizIcon(viz: string) {
  if (viz === 'Bar') return BarChart3;
  if (viz === 'Line') return LineChart;
  if (viz === 'Area') return TrendingUp;
  if (viz === 'Pie') return PieChartIcon;
  if (viz === 'KPI') return Activity;
  if (viz === 'Pivot') return Grid3x3;
  return Grid3x3;
}

function MetaChip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1" style={{ padding: '3px 8px', background: SLATE_50, color: SLATE_700, borderRadius: 6, fontSize: 10.5, fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
      {icon}{children}
    </span>
  );
}

function Chip({ label, active, onToggle, variant = 'default', trailing }: { label: string; active?: boolean; onToggle?: () => void; variant?: 'default' | 'coral'; trailing?: React.ReactNode }) {
  const bg = active ? (variant === 'coral' ? CORAL_50 : INK) : '#FFFFFF';
  const fg = active ? (variant === 'coral' ? CORAL_DK : '#FFFFFF') : SLATE_700;
  const border = active ? (variant === 'coral' ? '#FDD7D2' : INK) : SLATE_200;
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-1.5 transition-colors duration-150" style={{ height: 28, padding: '0 10px', background: bg, color: fg, border: `1px solid ${border}`, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
      {label}{trailing}
    </button>
  );
}

function Spark({ data, color = INK, height = 24 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - 2 - ((v - min) / span) * (height - 4)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

// ─── Report card ───────────────────────────────────────────────────────
function ReportCard({ r, onOpen, onAction }: { r: Report; onOpen: () => void; onAction: (a: string) => void }) {
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = vizIcon(r.viz);
  return (
    <div
      className="rounded-2xl bg-white relative transition-shadow duration-150 cursor-pointer"
      style={{ padding: 20, boxShadow: hover ? '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px #EDEDEF' : CARD_SHADOW }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMenuOpen(false); }}
      onClick={onOpen}
      data-testid={`cr-report-card-${r.id}`}
    >
      <div className="flex items-start justify-between">
        <div style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, background: CORAL_50, color: CORAL_600, borderRadius: 8 }}>
          <Icon size={16} strokeWidth={1.9} />
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="transition-colors duration-150" style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, color: menuOpen ? INK : SLATE_400, borderRadius: 6, cursor: 'pointer', background: menuOpen ? SLATE_50 : 'transparent' }} data-testid={`cr-card-menu-${r.id}`}>
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50, minWidth: 160, background: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(15,23,42,0.14), 0 0 0 1px rgba(15,23,42,0.06)', padding: 4 }}>
                {['Rename', 'Duplicate', 'Share', 'Schedule', 'Delete'].map((a) => (
                  <button key={a} type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onAction(a); }}
                    style={{ display: 'block', width: '100%', height: 32, padding: '0 10px', textAlign: 'left', background: 'transparent', color: a === 'Delete' ? CORAL_DK : SLATE_700, fontSize: 13, fontWeight: 500, borderRadius: 6, cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                    {a}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <h3 style={{ margin: '14px 0 0', fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</h3>
      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: SLATE_500, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 38 }}>{r.description}</p>
      <div className="flex flex-wrap" style={{ gap: 6, marginTop: 16 }}>
        <MetaChip>{r.viz}</MetaChip>
        <MetaChip>{r.dimensions.length} {r.dimensions.length === 1 ? 'dim' : 'dims'}</MetaChip>
        <MetaChip>{r.metrics.length} {r.metrics.length === 1 ? 'metric' : 'metrics'}</MetaChip>
        <MetaChip icon={<Clock size={10} strokeWidth={2} />}>Run {relativeTime(r.updatedAt)}</MetaChip>
      </div>
      <div className="flex items-center justify-between" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F1F3' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{r.ownerInitials}</span>
          <span style={{ fontSize: 12, color: '#52525B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.owner}</span>
        </div>
        <span style={{ padding: '3px 8px', borderRadius: 6, background: r.visibility === 'Shared' ? CORAL_50 : SLATE_50, color: r.visibility === 'Shared' ? CORAL_DK : SLATE_700, fontSize: 10.5, fontWeight: 500 }}>{r.visibility}</span>
      </div>
    </div>
  );
}

// ─── Template card ─────────────────────────────────────────────────────
function TemplateCard({ t, onUse }: { t: Template; onUse: () => void }) {
  const [hover, setHover] = useState(false);
  const Icon = t.icon;
  return (
    <div className="rounded-2xl bg-white transition-shadow duration-150" style={{ padding: 20, boxShadow: hover ? '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px #EDEDEF' : CARD_SHADOW }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-testid={`cr-template-${t.id}`}>
      <div className="flex items-start justify-between">
        <div style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, background: CORAL_50, color: CORAL_600, borderRadius: 8 }}><Icon size={16} strokeWidth={1.9} /></div>
        <span style={{ padding: '3px 8px', borderRadius: 6, background: INK, color: '#fff', fontSize: 10.5, fontWeight: 500 }}>Template</span>
      </div>
      <h3 style={{ margin: '14px 0 0', fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>{t.name}</h3>
      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: SLATE_500, lineHeight: 1.5, minHeight: 38 }}>{t.description}</p>
      <div className="flex flex-wrap" style={{ gap: 6, marginTop: 16 }}>
        <MetaChip>{t.dataSource}</MetaChip>
        <MetaChip>{t.viz}</MetaChip>
        <MetaChip>{t.dimensions.length} {t.dimensions.length === 1 ? 'dim' : 'dims'}</MetaChip>
        <MetaChip>{t.metrics.length} {t.metrics.length === 1 ? 'metric' : 'metrics'}</MetaChip>
      </div>
      <div className="flex items-center justify-end" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F1F3' }}>
        <button type="button" onClick={onUse} className="inline-flex items-center gap-1.5 transition-colors duration-150" style={{ height: 28, padding: '0 10px', background: 'transparent', color: CORAL_DK, borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = CORAL_50; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} data-testid={`cr-use-template-${t.id}`}>
          Use template<Play size={11} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

// ─── Viz preview ───────────────────────────────────────────────────────
function VizPreview({ viz, rows, dims, mets }: { viz: string; rows: Record<string, string | number>[]; dims: string[]; mets: string[] }) {
  if (!mets.length) {
    return (
      <div className="rounded-2xl flex flex-col items-center justify-center text-center" style={{ minHeight: 260, padding: 40, background: CORAL_50, border: `1.5px dashed ${CORAL}` }} data-testid="cr-viz-empty">
        <Sparkles size={22} strokeWidth={1.8} style={{ color: CORAL_DK, marginBottom: 8 }} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: CORAL_DK }}>Pick a metric to preview.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: CORAL_DK, opacity: 0.8 }}>Choose at least one metric from the left panel.</p>
      </div>
    );
  }
  if (viz === 'KPI') {
    const first = mets[0];
    const total = rows.reduce((s, r) => s + (Number(r[first]) || 0), 0);
    return (
      <div className="rounded-2xl bg-white flex items-center justify-center" style={{ minHeight: 260, padding: 40, boxShadow: CARD_SHADOW }} data-testid="cr-viz-kpi">
        <div className="text-center">
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{first}</p>
          <p style={{ ...TABULAR, margin: '8px 0 0', fontSize: 56, fontWeight: 600, color: INK, letterSpacing: '-0.025em', lineHeight: 1 }}>{fmtMetric(first, total)}</p>
        </div>
      </div>
    );
  }
  if (viz === 'Bar' || viz === 'Line' || viz === 'Area') {
    const m = mets[0]; const values = rows.slice(0, 12).map((r) => Number(r[m]) || 0);
    const max = Math.max(...values, 1);
    return (
      <div className="rounded-2xl bg-white" style={{ padding: 24, boxShadow: CARD_SHADOW }} data-testid={`cr-viz-${viz.toLowerCase()}`}>
        <div style={{ height: 220, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          {viz === 'Bar' && values.map((v, i) => (<div key={i} style={{ flex: 1, height: `${(v / max) * 100}%`, background: CORAL, borderRadius: '4px 4px 0 0', opacity: 0.85, transition: 'height 200ms ease' }} />))}
          {(viz === 'Line' || viz === 'Area') && (
            <svg viewBox={`0 0 ${(values.length - 1) * 40} 220`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              {viz === 'Area' && (<path d={`M0,220 ${values.map((v, i) => `L${i * 40},${220 - (v / max) * 200}`).join(' ')} L${(values.length - 1) * 40},220 Z`} fill={CORAL} fillOpacity={0.14} />)}
              <polyline fill="none" stroke={CORAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" points={values.map((v, i) => `${i * 40},${220 - (v / max) * 200}`).join(' ')} />
            </svg>
          )}
        </div>
        <div className="flex items-center justify-between mt-2" style={{ fontSize: 10, color: SLATE_400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {rows.slice(0, 12).map((r, i) => (<span key={i}>{String(r[dims[0]] ?? i + 1).slice(0, 10)}</span>))}
        </div>
      </div>
    );
  }
  if (viz === 'Pie') {
    const m = mets[0]; const vals = rows.slice(0, 5).map((r) => Number(r[m]) || 0); const total = vals.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    const PIE_COLORS = [CORAL, '#C9422E', '#F99487', SLATE_700, SLATE_400];
    const slices = vals.map((v) => { const s = acc / total * 360; acc += v; const e = acc / total * 360; return { s, e }; });
    const polar = (deg: number) => { const r = 90, cx = 100, cy = 100; const rad = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; };
    return (
      <div className="rounded-2xl bg-white flex items-center gap-8" style={{ padding: 24, minHeight: 260, boxShadow: CARD_SHADOW }} data-testid="cr-viz-pie">
        <svg viewBox="0 0 200 200" style={{ width: 200, height: 200 }}>
          {slices.map((sl, i) => { const [x1, y1] = polar(sl.s); const [x2, y2] = polar(sl.e); const large = sl.e - sl.s > 180 ? 1 : 0; return (<path key={i} d={`M100,100 L${x1},${y1} A90,90 0 ${large} 1 ${x2},${y2} Z`} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={0.9} />); })}
        </svg>
        <div className="flex-1">
          {rows.slice(0, 5).map((r, i) => (<div key={i} className="flex items-center justify-between gap-3" style={{ padding: '6px 0', borderTop: i === 0 ? 'none' : `1px solid ${SLATE_100}` }}><span className="inline-flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />{String(r[dims[0]] ?? i + 1)}</span><span style={{ ...TABULAR, fontWeight: 600, color: INK }}>{fmtMetric(m, Number(r[m]) || 0)}</span></div>))}
        </div>
      </div>
    );
  }
  return <PreviewTable rows={rows} dims={dims} mets={mets} />;
}

function PreviewTable({ rows, dims, mets }: { rows: Record<string, string | number>[]; dims: string[]; mets: string[] }) {
  return (
    <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }} data-testid="cr-viz-table">
      <div style={{ overflowX: 'auto' }}>
        <table className="data-numeric-center" style={{ ...TABULAR, width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ background: SLATE_50 }}>
              {dims.map((d) => (<th key={d} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>{d}</th>))}
              {mets.map((m) => (<th key={m} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: SLATE_500, textTransform: 'uppercase', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>{m}</th>))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (<tr><td colSpan={dims.length + mets.length} style={{ padding: 32, textAlign: 'center', color: SLATE_400, fontSize: 13 }}>No rows match.</td></tr>)}
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${SLATE_100}` }}>
                {dims.map((d) => (<td key={d} style={{ padding: '10px 16px', fontSize: 13, color: INK, whiteSpace: 'nowrap' }}>{String(r[d] ?? '')}</td>))}
                {mets.map((m) => (<td key={m} style={{ padding: '10px 16px', fontSize: 13, color: INK, textAlign: 'right', fontWeight: 500 }}>{fmtMetric(m, Number(r[m]) || 0)}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Share / Schedule modals ───────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15,23,42,0.4)' }} onClick={onClose} data-testid="cr-modal">
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 100%)', background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: INK }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, color: SLATE_500, background: 'transparent', borderRadius: 8, cursor: 'pointer' }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────
type View = 'library' | 'builder' | 'viewer';
export default function CustomReportingPage() {
  const [view, setView] = useState<View>('library');
  const [tab, setTab] = useState<Tab>('My Reports');
  const [reports, setReports] = useState<Report[]>(() => loadReports());
  useEffect(() => saveReports(reports), [reports]);

  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [toast, setToastMsg] = useState<string | null>(null);
  const showToast = (m: string) => setToastMsg(m);

  // Builder state
  const [bName, setBName] = useState('Untitled report');
  const [bSource, setBSource] = useState<string>('Sales');
  const [bDims, setBDims] = useState<string[]>([]);
  const [bMets, setBMets] = useState<string[]>([]);
  const [bFilters, setBFilters] = useState<FilterRule[]>([]);
  const [bViz, setBViz] = useState<string>('Table');
  const [bVisibility, setBVisibility] = useState<Visibility>('Private');
  const [bMobileConfigOpen, setBMobileConfigOpen] = useState(false);
  const [shareModal, setShareModal] = useState<Report | null>(null);
  const [scheduleModal, setScheduleModal] = useState<Report | null>(null);

  const openBuilderNew = () => {
    setEditId(null); setBName('Untitled report'); setBSource('Sales'); setBDims([]); setBMets([]); setBFilters([]); setBViz('Table'); setBVisibility('Private'); setView('builder');
  };
  const openBuilderFromTemplate = (t: Template) => {
    setEditId(null); setBName(t.name); setBSource(t.dataSource); setBDims([...t.dimensions]); setBMets([...t.metrics]); setBFilters([]); setBViz(t.viz); setBVisibility('Private'); setView('builder');
  };
  const openBuilderEdit = (r: Report) => {
    setEditId(r.id); setBName(r.name); setBSource(r.dataSource); setBDims([...r.dimensions]); setBMets([...r.metrics]); setBFilters([...r.filters]); setBViz(r.viz); setBVisibility(r.visibility); setView('builder');
  };
  const openViewer = (r: Report) => { setViewId(r.id); setView('viewer'); };

  const handleSave = (run?: boolean) => {
    const now = nowISO();
    if (editId) {
      setReports((rs) => rs.map((r) => r.id === editId ? { ...r, name: bName, dataSource: bSource, dimensions: bDims, metrics: bMets, filters: bFilters, viz: bViz, visibility: bVisibility, updatedAt: now } : r));
      showToast(run ? 'Saved & ran' : 'Saved');
    } else {
      const r: Report = { id: rid(), name: bName, description: `${bSource} · ${bDims.join(', ') || 'no dimensions'} · ${bMets.join(', ') || 'no metrics'}`, dataSource: bSource, dimensions: bDims, metrics: bMets, filters: bFilters, viz: bViz, visibility: bVisibility, owner: 'Ryan Mirabile', ownerInitials: 'RM', tab: 'My Reports', updatedAt: now, spark: Array.from({ length: 12 }, (_, i) => 20 + Math.round(Math.sin(i) * 10) + i) };
      setReports((rs) => [r, ...rs]); setEditId(r.id); showToast(run ? 'Created & ran' : 'Created');
    }
    if (run) { /* stay in builder with preview refreshed */ } else { setView('library'); }
  };

  const handleCardAction = (r: Report, action: string) => {
    if (action === 'Duplicate') { setReports((rs) => [{ ...r, id: rid(), name: `${r.name} (copy)`, updatedAt: nowISO(), tab: 'My Reports' }, ...rs]); showToast('Duplicated to My Reports'); }
    else if (action === 'Delete') { setReports((rs) => rs.filter((x) => x.id !== r.id)); showToast('Deleted'); }
    else if (action === 'Rename') { const n = window.prompt('Rename report', r.name); if (n && n.trim()) { setReports((rs) => rs.map((x) => x.id === r.id ? { ...x, name: n.trim(), updatedAt: nowISO() } : x)); showToast('Renamed'); } }
    else if (action === 'Share') { setShareModal(r); }
    else if (action === 'Schedule') { setScheduleModal(r); }
  };

  const currentReports = useMemo(() => reports.filter((r) => r.tab === tab), [reports, tab]);

  // Preview rows (debounced)
  const [previewRows, setPreviewRows] = useState<Record<string, string | number>[]>([]);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (view !== 'builder') return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPreviewRows(buildPreviewRows(bDims, bMets, bSource)), 150);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [bDims, bMets, bSource, view]);

  // Keyboard shortcuts in builder
  useEffect(() => {
    if (view !== 'builder') return;
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSave(true); }
      if (e.key === 'Escape') { if (window.confirm('Discard changes?')) setView('library'); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, bName, bSource, bDims, bMets, bFilters, bViz, bVisibility, editId]);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-full" data-testid="custom-reporting-page" style={{ ...INTER, ...TABULAR, background: '#FAFAFA' }}>
      <div className="page-canvas">
        <PageHeader
          title="Custom Reporting"
          testIdPrefix="cr"
        />

        {view === 'library' && (
          <LibraryView
            tab={tab}
            setTab={setTab}
            reports={currentReports}
            templates={TEMPLATES}
            onNew={openBuilderNew}
            onUseTemplate={openBuilderFromTemplate}
            onOpenReport={openViewer}
            onCardAction={(r, a) => (a === 'Rename' || a === 'Share' || a === 'Schedule' || a === 'Delete' || a === 'Duplicate') ? handleCardAction(r, a) : openBuilderEdit(r)}
          />
        )}

        {view === 'builder' && (
          <BuilderView
            name={bName} setName={setBName}
            source={bSource} setSource={setBSource}
            dims={bDims} setDims={setBDims}
            mets={bMets} setMets={setBMets}
            filters={bFilters} setFilters={setBFilters}
            viz={bViz} setViz={setBViz}
            visibility={bVisibility} setVisibility={setBVisibility}
            previewRows={previewRows}
            onDiscard={() => setView('library')}
            onSave={() => handleSave(false)}
            onSaveRun={() => handleSave(true)}
            mobileConfigOpen={bMobileConfigOpen}
            setMobileConfigOpen={setBMobileConfigOpen}
          />
        )}

        {view === 'viewer' && viewId && (() => {
          const r = reports.find((x) => x.id === viewId);
          if (!r) return null;
          const rows = buildPreviewRows(r.dimensions, r.metrics, r.dataSource);
          return (
            <ViewerView
              r={r} rows={rows}
              onBack={() => setView('library')}
              onEdit={() => openBuilderEdit(r)}
              onRefresh={() => showToast('Refreshed')}
              onShare={() => setShareModal(r)}
              onSchedule={() => setScheduleModal(r)}
              onExport={(fmt) => showToast(`Exported ${fmt.toUpperCase()}`)}
            />
          );
        })()}
      </div>

      {shareModal && (
        <Modal title={`Share "${shareModal.name}"`} onClose={() => setShareModal(null)}>
          <div className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: `1px solid ${SLATE_100}` }}>
            <span style={{ fontSize: 13, color: INK, fontWeight: 500 }}>Anyone in workspace can view</span>
            <ToggleSwitch on={shareModal.visibility === 'Shared'} onToggle={() => { const next: Visibility = shareModal.visibility === 'Shared' ? 'Private' : 'Shared'; setReports((rs) => rs.map((x) => x.id === shareModal.id ? { ...x, visibility: next, tab: next === 'Shared' ? 'Shared' : 'My Reports' } : x)); setShareModal({ ...shareModal, visibility: next }); }} />
          </div>
          <div style={{ padding: '14px 0' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: SLATE_500 }}>Link</p>
            <div className="flex gap-2">
              <input readOnly value={`https://app.goorin.co/reports/${shareModal.id}`} style={{ flex: 1, height: 36, padding: '0 10px', border: `1px solid ${SLATE_200}`, borderRadius: 8, fontSize: 12, color: SLATE_700, background: SLATE_50 }} />
              <button type="button" onClick={() => { navigator.clipboard?.writeText(`https://app.goorin.co/reports/${shareModal.id}`); showToast('Link copied'); setShareModal(null); }} className="inline-flex items-center gap-1.5" style={{ height: 36, padding: '0 12px', background: INK, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><Copy size={13} />Copy</button>
            </div>
          </div>
          <div style={{ padding: '14px 0 0', borderTop: `1px solid ${SLATE_100}` }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: SLATE_500 }}>Recipients</p>
            <div className="flex flex-wrap gap-1.5">
              {['ryan@mirabile.com', 'priya@goorin.co', 'james@goorin.co'].map((e) => (<Chip key={e} label={e} active variant="coral" />))}
            </div>
          </div>
        </Modal>
      )}

      {scheduleModal && <ScheduleModal r={scheduleModal} onClose={() => setScheduleModal(null)} onSave={() => { setScheduleModal(null); showToast('Schedule created'); }} />}

      {toast && <Toast message={toast} onDone={() => setToastMsg(null)} />}
    </div>
  );
}

// ─── Library view ──────────────────────────────────────────────────────
function LibraryView({ tab, setTab, reports, templates, onNew, onUseTemplate, onOpenReport, onCardAction }: {
  tab: Tab; setTab: (t: Tab) => void; reports: Report[]; templates: Template[];
  onNew: () => void; onUseTemplate: (t: Template) => void; onOpenReport: (r: Report) => void; onCardAction: (r: Report, a: string) => void;
}) {
  const counts = useMemo(() => ({
    'My Reports': reports.filter((r) => r.tab === 'My Reports').length,
    'Shared':     reports.filter((r) => r.tab === 'Shared').length,
    'Scheduled':  reports.filter((r) => (r as any).scheduled).length,
    'Templates':  templates.length,
  }), [reports, templates]);
  return (
    <>
      {/* Top summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16, marginTop: 16 }} data-testid="cr-summary-strip">
        {(['My Reports', 'Shared', 'Scheduled', 'Templates'] as const).map((k) => (
          <div key={k} className="rounded-2xl bg-white" style={{ padding: '18px 20px', boxShadow: CARD_SHADOW }} data-testid={`cr-summary-${k.toLowerCase().replace(/\s+/g, '-')}`}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6E6E73' }}>{k}</p>
            <p style={{ margin: '6px 0 0', fontSize: 'clamp(22px, 2vw, 24px)', fontWeight: 600, lineHeight: 1.1, color: INK, letterSpacing: '-0.02em' }}>{counts[k]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6" data-testid="cr-library-toolbar">
        <div className="flex items-center" style={{ gap: 4 }} role="tablist">
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <button key={t} type="button" role="tab" aria-selected={active} onClick={() => setTab(t)} className="ph-tab" data-active={active} data-testid={`cr-tab-${t.toLowerCase().replace(/\s+/g, '-')}`}>
                {t}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onNew} className="inline-flex items-center gap-1.5 transition-colors duration-150" style={{ height: 36, padding: '0 14px', background: INK, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1A1A1C'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
          data-testid="cr-new-report">
          <Plus size={14} strokeWidth={2.2} />New Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ marginTop: 16 }} data-testid="cr-grid">
        {tab === 'Templates'
          ? templates.map((t) => <TemplateCard key={t.id} t={t} onUse={() => onUseTemplate(t)} />)
          : tab === 'Scheduled'
            ? (() => {
                const scheduled = reports.filter((r) => (r as any).scheduled);
                if (scheduled.length === 0) {
                  return (
                    <div className="col-span-full rounded-2xl bg-white flex flex-col items-center justify-center text-center" style={{ minHeight: 220, padding: 40, boxShadow: CARD_SHADOW }} data-testid="cr-scheduled-empty">
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>No scheduled reports</p>
                      <p style={{ margin: '4px 0 14px', fontSize: 12, color: SLATE_500 }}>Open any report, then click Schedule to automate delivery.</p>
                    </div>
                  );
                }
                return scheduled.map((r) => <ReportCard key={r.id} r={r} onOpen={() => onOpenReport(r)} onAction={(a) => onCardAction(r, a)} />);
              })()
            : reports.length === 0
              ? <div className="col-span-full rounded-2xl bg-white flex flex-col items-center justify-center text-center" style={{ minHeight: 220, padding: 40, boxShadow: CARD_SHADOW }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>No reports yet</p>
                  <p style={{ margin: '4px 0 14px', fontSize: 12, color: SLATE_500 }}>Create a new report or pick a template.</p>
                  <button type="button" onClick={onNew} className="btn-coral" data-testid="cr-new-report-btn"><Plus size={14} />New Report</button>
                </div>
              : reports.slice().sort((a, b) => ((b as any).pinned ? 1 : 0) - ((a as any).pinned ? 1 : 0)).map((r) => <ReportCard key={r.id} r={r} onOpen={() => onOpenReport(r)} onAction={(a) => onCardAction(r, a)} />)
        }
      </div>
    </>
  );
}

// ─── Builder view ──────────────────────────────────────────────────────
function BuilderView(props: {
  name: string; setName: (v: string) => void;
  source: string; setSource: (v: string) => void;
  dims: string[]; setDims: (v: string[]) => void;
  mets: string[]; setMets: (v: string[]) => void;
  filters: FilterRule[]; setFilters: (v: FilterRule[]) => void;
  viz: string; setViz: (v: string) => void;
  visibility: Visibility; setVisibility: (v: Visibility) => void;
  previewRows: Record<string, string | number>[];
  onDiscard: () => void; onSave: () => void; onSaveRun: () => void;
  mobileConfigOpen: boolean; setMobileConfigOpen: (v: boolean) => void;
}) {
  const { name, setName, source, setSource, dims, setDims, mets, setMets, filters, setFilters, viz, setViz, visibility, setVisibility, previewRows, onDiscard, onSave, onSaveRun, mobileConfigOpen, setMobileConfigOpen } = props;
  const toggle = (list: string[], setList: (v: string[]) => void, v: string) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const LeftPanel = (
    <aside className="rounded-2xl bg-white" style={{ padding: 20, boxShadow: CARD_SHADOW, width: '100%' }} data-testid="cr-builder-left">
      <PanelSection title="Data Source">
        {DATA_SOURCES.map((s) => (
          <label key={s} className="flex items-center gap-2 cursor-pointer" style={{ padding: '6px 0' }}>
            <input type="radio" name="cr-source" checked={source === s} onChange={() => setSource(s)} style={{ accentColor: CORAL }} data-testid={`cr-source-${s.toLowerCase()}`} />
            <span style={{ fontSize: 13, color: INK }}>{s}</span>
          </label>
        ))}
      </PanelSection>

      <PanelSection title="Dimensions">
        <div className="flex flex-wrap gap-1.5">
          {DIMENSIONS.map((d) => (<Chip key={d} label={d} active={dims.includes(d)} onToggle={() => toggle(dims, setDims, d)} variant="coral" />))}
        </div>
      </PanelSection>

      <PanelSection title="Metrics">
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => (<Chip key={m} label={m} active={mets.includes(m)} onToggle={() => toggle(mets, setMets, m)} variant="coral" trailing={mets.includes(m) ? <span style={{ marginLeft: 4, padding: '0 4px', borderRadius: 4, background: CORAL_DK, color: '#fff', fontSize: 9, fontWeight: 700 }}>fx</span> : null} />))}
        </div>
      </PanelSection>

      <PanelSection title="Filters">
        {filters.map((f, i) => (
          <FilterRow
            key={i}
            index={i}
            rule={f}
            fieldOptions={[...DIMENSIONS, ...METRICS]}
            onChange={(next) => setFilters(filters.map((x, j) => j === i ? next : x))}
            onRemove={() => setFilters(filters.filter((_, j) => j !== i))}
            onConjChange={(c) => setFilters(filters.map((x, j) => j === i ? { ...x, conj: c } : x))}
          />
        ))}
        <button type="button" onClick={() => setFilters([...filters, { field: DIMENSIONS[0], op: 'equals', value: '', conj: filters.length > 0 ? 'AND' : undefined }])} className="btn-ghost btn-sm inline-flex items-center" style={{ gap: 6, color: CORAL_DK, marginTop: filters.length > 0 ? 4 : 0 }} data-testid="cr-add-filter"><Plus size={13} strokeWidth={2.2} />Add filter</button>
      </PanelSection>

      <PanelSection title="Visualization">
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {VIZ_TYPES.map((v) => {
            const Icon = vizIcon(v);
            const active = viz === v;
            return (
              <button key={v} type="button" onClick={() => setViz(v)} className="flex flex-col items-center justify-center transition-colors duration-150" style={{ height: 56, background: active ? CORAL_50 : '#FFFFFF', border: active ? `1.5px solid ${CORAL_600}` : `1px solid ${SLATE_200}`, borderRadius: 10, cursor: 'pointer', gap: 4 }} data-testid={`cr-viz-${v.toLowerCase()}`}>
                <Icon size={16} strokeWidth={1.9} style={{ color: active ? CORAL_DK : SLATE_700 }} />
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 500, color: active ? CORAL_DK : SLATE_700 }}>{v}</span>
              </button>
            );
          })}
        </div>
      </PanelSection>
    </aside>
  );

  return (
    <>
      <div className="mt-4 flex flex-col lg:flex-row gap-4" data-testid="cr-builder">
        <div className="hidden lg:block" style={{ width: 360, flexShrink: 0, position: 'sticky', top: 24, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 48px)', overflowX: 'hidden', overflowY: 'auto' }}>{LeftPanel}</div>

        <div className="flex-1 min-w-0">
          {/* Guided progress indicator (4 steps) */}
          <div className="flex items-center flex-wrap rounded-2xl bg-white" style={{ padding: '14px 20px', boxShadow: CARD_SHADOW, marginBottom: 12, gap: 8 }} data-testid="cr-builder-steps">
            {([
              ['1', 'Source',    !!source],
              ['2', 'Dimensions', dims.length > 0],
              ['3', 'Metrics',    mets.length > 0],
              ['4', 'Visualize',  !!viz && mets.length > 0],
            ] as const).map(([n, lab, done], i, arr) => (
              <div key={n} className="inline-flex items-center" style={{ gap: 8 }}>
                <span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 999, background: done ? CORAL : '#F3F3F5', color: done ? '#FFFFFF' : SLATE_500, fontSize: 11, fontWeight: 700 }}>{done ? <CheckCircle2 size={13} strokeWidth={2.4} /> : n}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: done ? INK : SLATE_500 }}>{lab}</span>
                {i < arr.length - 1 && <span style={{ width: 24, height: 1, background: SLATE_200, marginLeft: 4, marginRight: 4 }} />}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <span className="inline-flex items-center" style={{ gap: 6, fontSize: 11.5, color: SLATE_500 }} data-testid="cr-autosaved"><span style={{ width: 6, height: 6, borderRadius: 999, background: '#10B981' }} />Autosaved</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white" style={{ padding: '14px 20px', boxShadow: CARD_SHADOW, marginBottom: 16 }} data-testid="cr-builder-topstrip">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <input value={name} onChange={(e) => setName(e.target.value)} data-testid="cr-builder-name" style={{ flex: 1, minWidth: 160, maxWidth: 420, height: 32, padding: '0 10px', background: 'transparent', border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }} />
              <ToggleSwitch on={visibility === 'Shared'} onToggle={() => setVisibility(visibility === 'Shared' ? 'Private' : 'Shared')} />
              <span style={{ fontSize: 12, color: SLATE_500, fontWeight: 500 }}>{visibility}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={() => { if (window.confirm('Discard changes?')) onDiscard(); }} style={ghostBtn} data-testid="cr-discard">Discard</button>
              <button type="button" onClick={onSave} className="inline-flex items-center gap-1.5" style={primaryBtn} data-testid="cr-save"><Save size={13} />Save</button>
              <button type="button" onClick={onSaveRun} className="inline-flex items-center gap-1.5" style={coralBtn} data-testid="cr-save-run"><Play size={13} />Save & Run</button>
            </div>
          </div>

          <VizPreview viz={viz} rows={previewRows} dims={dims} mets={mets} />

          {mets.length > 0 && (
            <div className="mt-4" data-testid="cr-builder-table">
              <h4 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Columns · {dims.join(' · ') || 'no dimension'}</h4>
              <PreviewTable rows={previewRows} dims={dims} mets={mets} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Configure FAB + bottom sheet */}
      <button type="button" onClick={() => setMobileConfigOpen(true)} className="lg:hidden inline-flex items-center gap-1.5" style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 60, height: 48, padding: '0 18px', background: CORAL, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px rgba(255,111,97,0.4)', cursor: 'pointer' }} data-testid="cr-mobile-configure"><Edit3 size={16} />Configure</button>
      {mobileConfigOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,23,42,0.5)' }} onClick={() => setMobileConfigOpen(false)} data-testid="cr-mobile-sheet">
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85vh', background: '#fff', borderRadius: '20px 20px 0 0', padding: 16, overflowY: 'auto', animation: 'cr-sheet-in 220ms ease-out both' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK }}>Configure</h3>
              <button type="button" onClick={() => setMobileConfigOpen(false)} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, color: SLATE_500, borderRadius: 8, cursor: 'pointer', background: 'transparent' }}><X size={16} /></button>
            </div>
            {LeftPanel}
            <style>{`@keyframes cr-sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          </div>
        </div>
      )}
    </>
  );
}

const fieldStyle: React.CSSProperties = { height: 30, padding: '0 8px', background: '#fff', border: `1px solid ${SLATE_200}`, borderRadius: 6, fontSize: 12, color: INK, outline: 'none' };
const ghostBtn: React.CSSProperties = { height: 34, padding: '0 12px', background: '#fff', color: SLATE_700, border: `1px solid ${SLATE_200}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const primaryBtn: React.CSSProperties = { height: 34, padding: '0 14px', background: INK, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const coralBtn: React.CSSProperties = { height: 34, padding: '0 14px', background: CORAL, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };

function FilterSelect({ label, value, options, onChange, minWidth = 110, width, testId }: { label?: string; value: string; options: readonly string[]; onChange: (v: string) => void; minWidth?: number; width?: number | string; testId?: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-between"
        style={{ minWidth, width, height: 32, padding: '0 10px', gap: 8, background: '#FFFFFF', border: `1px solid ${open ? CORAL : SLATE_200}`, borderRadius: 10, fontSize: 13, fontWeight: 500, color: INK, cursor: 'pointer', outline: 'none', boxShadow: open ? `0 0 0 2px rgba(255,111,97,0.25)` : 'none', transition: 'border-color 120ms ease, box-shadow 120ms ease' }}
        onMouseEnter={(e) => { if (!open) { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = '#D4D4D8'; } }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = SLATE_200; } }}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid={testId}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{value || label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: SLATE_400, flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      <PopoverPortal open={open} onClose={() => setOpen(false)} anchorRef={btnRef} placement="bottom-start" minWidth={200} padding={6} testId={testId ? `${testId}-menu` : undefined}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { onChange(opt); setOpen(false); }}
            className="w-full flex items-center justify-between"
            style={{ height: 32, padding: '0 10px', background: 'transparent', color: opt === value ? INK : SLATE_700, fontSize: 13, fontWeight: opt === value ? 600 : 500, borderRadius: 6, textAlign: 'left', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAFA'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            role="option"
            aria-selected={opt === value}
            data-testid={testId ? `${testId}-option-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined}
          >
            {opt}
            {opt === value && <span className="h-1.5 w-1.5 rounded-full" style={{ background: CORAL }} />}
          </button>
        ))}
      </PopoverPortal>
    </>
  );
}

function FilterRow({ index, rule, fieldOptions, onChange, onRemove, onConjChange }: {
  index: number;
  rule: FilterRule;
  fieldOptions: readonly string[];
  onChange: (next: FilterRule) => void;
  onRemove: () => void;
  onConjChange: (c: 'AND' | 'OR') => void;
}) {
  const kind = fieldKind(rule.field);
  const availOps = operatorsFor(kind);
  const needsNoValue = rule.op === 'is empty' || rule.op === 'is not empty';
  const needsRange   = rule.op === 'between';
  const isDate       = kind === 'date';
  const placeholder  = isDate ? 'YYYY-MM-DD' : kind === 'number' ? '0' : 'value';

  const handleFieldChange = (next: string) => {
    const nextKind = fieldKind(next);
    const nextOps  = operatorsFor(nextKind);
    const op = (nextOps as readonly string[]).includes(rule.op) ? rule.op : nextOps[0];
    onChange({ ...rule, field: next, op });
  };
  const handleOpChange = (next: string) => {
    const stripValue = next === 'is empty' || next === 'is not empty';
    onChange({ ...rule, op: next, value: stripValue ? '' : rule.value, value2: next === 'between' ? (rule.value2 ?? '') : undefined });
  };

  return (
    <div style={{ marginBottom: 8 }}>
      {index > 0 && (
        <div className="flex items-center" style={{ gap: 4, margin: '0 0 6px 0' }} role="tablist" aria-label="Conjunction">
          {(['AND', 'OR'] as const).map((c) => {
            const active = (rule.conj ?? 'AND') === c;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onConjChange(c)}
                className="ph-tab"
                data-active={active}
                style={{ height: 24, padding: '0 10px', fontSize: 11, letterSpacing: '0.14em' }}
                data-testid={`cr-filter-${index}-conj-${c.toLowerCase()}`}
              >{c}</button>
            );
          })}
        </div>
      )}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}
        data-testid={`cr-filter-row-${index}`}
      >
        {/* Row 1: Field (full width) */}
        <FilterSelect value={rule.field} options={fieldOptions} onChange={handleFieldChange} minWidth={0} width="100%" testId={`cr-filter-${index}-field`} />

        {/* Row 2: Op + Value + Remove */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 110px) minmax(0, 1fr) 28px', gap: 6, alignItems: 'center' }}>
          <FilterSelect value={rule.op} options={availOps} onChange={handleOpChange} minWidth={0} width="100%" testId={`cr-filter-${index}-op`} />

          {needsNoValue ? (
            <span style={{ fontSize: 12, color: SLATE_400, fontStyle: 'italic', paddingLeft: 4 }} aria-hidden="true">—</span>
          ) : needsRange ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: 4, alignItems: 'center', minWidth: 0 }}>
              <input value={rule.value} onChange={(e) => onChange({ ...rule, value: e.target.value })} placeholder={isDate ? 'From' : 'Min'} className="ds-input" style={{ minWidth: 0, width: '100%', height: 32, padding: '0 10px', fontSize: 13 }} data-testid={`cr-filter-${index}-value`} />
              <span style={{ fontSize: 11, color: SLATE_500 }}>and</span>
              <input value={rule.value2 ?? ''} onChange={(e) => onChange({ ...rule, value2: e.target.value })} placeholder={isDate ? 'To' : 'Max'} className="ds-input" style={{ minWidth: 0, width: '100%', height: 32, padding: '0 10px', fontSize: 13 }} data-testid={`cr-filter-${index}-value2`} />
            </div>
          ) : VALUE_OPTIONS[rule.field] ? (
            <FilterSelect value={rule.value} options={VALUE_OPTIONS[rule.field]!} onChange={(v) => onChange({ ...rule, value: v })} minWidth={0} width="100%" testId={`cr-filter-${index}-value`} />
          ) : (
            <input value={rule.value} onChange={(e) => onChange({ ...rule, value: e.target.value })} placeholder={placeholder} className="ds-input" style={{ minWidth: 0, width: '100%', height: 32, padding: '0 10px', fontSize: 13 }} data-testid={`cr-filter-${index}-value`} />
          )}

          <button
            type="button"
            onClick={onRemove}
            className="btn-ghost"
            style={{ width: 28, height: 28, padding: 0, display: 'grid', placeItems: 'center', borderRadius: 10, color: SLATE_400, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F4F6'; e.currentTarget.style.color = '#B04435'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SLATE_400; }}
            aria-label="Remove filter"
            data-testid={`cr-filter-${index}-remove`}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}


function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 0', borderTop: `1px solid ${SLATE_100}` }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{title}</h4>
      {children}
    </div>
  );
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} style={{ position: 'relative', width: 34, height: 20, borderRadius: 999, background: on ? CORAL : SLATE_300, cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', transition: 'left 150ms ease' }} />
    </button>
  );
}

// ─── Viewer view ───────────────────────────────────────────────────────
function ViewerView({ r, rows, onBack, onEdit, onRefresh, onShare, onSchedule, onExport }: {
  r: Report; rows: Record<string, string | number>[]; onBack: () => void; onEdit: () => void; onRefresh: () => void;
  onShare: () => void; onSchedule: () => void; onExport: (fmt: 'csv' | 'xlsx' | 'pdf' | 'image') => void;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const [comparePeriods, setComparePeriods] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2" data-testid="cr-viewer-toolbar">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5" style={{ background: 'transparent', color: SLATE_500, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '0 4px' }} data-testid="cr-viewer-back"><ArrowLeft size={14} />Reports / <span style={{ color: INK, fontWeight: 600 }}>{r.name}</span></button>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setComparePeriods((v) => !v)} className="inline-flex items-center gap-1.5" style={{ height: 34, padding: '0 12px', background: comparePeriods ? CORAL_50 : '#fff', color: comparePeriods ? CORAL_DK : SLATE_700, border: `1px solid ${comparePeriods ? CORAL_200 : SLATE_200}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }} data-testid="cr-viewer-compare"><Clock size={13} />Compare periods</button>
          <button type="button" onClick={onRefresh} style={ghostBtn} className="inline-flex items-center gap-1.5" data-testid="cr-refresh"><RefreshCw size={13} />Refresh</button>
          <button type="button" onClick={onShare} style={ghostBtn} className="inline-flex items-center gap-1.5" data-testid="cr-viewer-share"><Share2 size={13} />Share</button>
          <button type="button" onClick={onSchedule} style={ghostBtn} className="inline-flex items-center gap-1.5" data-testid="cr-viewer-schedule"><Clock size={13} />Schedule</button>
          <button ref={exportBtnRef} type="button" onClick={() => setExportOpen((v) => !v)} style={ghostBtn} data-testid="cr-viewer-export">Export</button>
          <PopoverPortal open={exportOpen} onClose={() => setExportOpen(false)} anchorRef={exportBtnRef} placement="bottom-start" minWidth={160} padding={4} testId="cr-viewer-export-menu">
            {(['csv', 'xlsx', 'pdf', 'image'] as const).map((fmt) => (
              <button key={fmt} type="button" onClick={() => { setExportOpen(false); onExport(fmt); }} className="w-full text-left" style={{ height: 32, padding: '0 10px', background: 'transparent', color: SLATE_700, fontSize: 13, fontWeight: 500, borderRadius: 6, cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAFA'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} data-testid={`cr-export-${fmt}`}>{fmt.toUpperCase()}</button>
            ))}
          </PopoverPortal>
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5" style={primaryBtn} data-testid="cr-viewer-edit"><Pencil size={13} />Edit</button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          <VizPreview viz={r.viz} rows={rows} dims={r.dimensions} mets={r.metrics} />
          <div className="mt-4"><PreviewTable rows={rows} dims={r.dimensions} mets={r.metrics} /></div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white" style={{ padding: 20, boxShadow: CARD_SHADOW }} data-testid="cr-viewer-about">
            <h4 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>About this report</h4>
            <div className="mt-3" style={{ fontSize: 12, color: SLATE_700, lineHeight: 1.6 }}>
              <AboutRow label="Owner" value={<span className="inline-flex items-center gap-1.5"><span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{r.ownerInitials}</span>{r.owner}</span>} />
              <AboutRow label="Visibility" value={<span style={{ padding: '2px 8px', borderRadius: 999, background: r.visibility === 'Shared' ? CORAL_50 : SLATE_100, color: r.visibility === 'Shared' ? CORAL_DK : SLATE_700, fontSize: 11, fontWeight: 500 }}>{r.visibility}</span>} />
              <AboutRow label="Source" value={r.dataSource} />
              <AboutRow label="Viz" value={r.viz} />
              <AboutRow label="Updated" value={relativeTime(r.updatedAt)} />
            </div>
            <div style={{ paddingTop: 10, marginTop: 10, borderTop: `1px solid ${SLATE_100}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: SLATE_500 }}>Dimensions</p>
              <div className="flex flex-wrap gap-1">{r.dimensions.map((d) => (<span key={d} style={{ padding: '2px 8px', background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 11 }}>{d}</span>))}{!r.dimensions.length && <span style={{ fontSize: 11, color: SLATE_400 }}>None</span>}</div>
            </div>
            <div style={{ paddingTop: 10, marginTop: 10, borderTop: `1px solid ${SLATE_100}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: SLATE_500 }}>Metrics</p>
              <div className="flex flex-wrap gap-1">{r.metrics.map((m) => (<span key={m} style={{ padding: '2px 8px', background: CORAL_50, color: CORAL_DK, borderRadius: 999, fontSize: 11 }}>{m}</span>))}{!r.metrics.length && <span style={{ fontSize: 11, color: SLATE_400 }}>None</span>}</div>
            </div>
            {r.filters.length > 0 && (
              <div style={{ paddingTop: 10, marginTop: 10, borderTop: `1px solid ${SLATE_100}` }}>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: SLATE_500 }}>Filters</p>
                <div className="flex flex-wrap gap-1">{r.filters.map((f, i) => (<span key={i} style={{ padding: '2px 8px', background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 11 }}>{f.field} {f.op} {f.value}</span>))}</div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white" style={{ padding: 20, boxShadow: CARD_SHADOW }} data-testid="cr-viewer-scheduled">
            <h4 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Scheduled sends</h4>
            <p style={{ margin: '10px 0 12px', fontSize: 13, color: SLATE_500 }}>No sends scheduled yet.</p>
            <button type="button" onClick={onSchedule} className="inline-flex items-center gap-1.5" style={{ ...ghostBtn, width: '100%', justifyContent: 'center' }} data-testid="cr-viewer-schedule-add"><Plus size={13} />Schedule</button>
          </div>
        </div>
      </div>
    </>
  );
}

function AboutRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ padding: '4px 0' }}>
      <span style={{ color: SLATE_500 }}>{label}</span>
      <span style={{ color: INK }}>{value}</span>
    </div>
  );
}

function ScheduleModal({ r, onClose, onSave }: { r: Report; onClose: () => void; onSave: () => void }) {
  const [freq, setFreq] = useState('Weekly');
  const [day, setDay] = useState('Mon');
  const [time, setTime] = useState('09:00');
  const [recipients, setRecipients] = useState(['ryan@mirabile.com']);
  const [newEmail, setNewEmail] = useState('');
  return (
    <Modal title={`Schedule "${r.name}"`} onClose={onClose}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Frequency</label>
          <SegTabs tabs={['Daily', 'Weekly', 'Monthly'] as unknown as readonly string[]} value={freq} onChange={(v: any) => setFreq(v)} testId="cr-sch-freq" slugPrefix="cr-sch-freq" />
        </div>
        {freq === 'Weekly' && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Day</label>
            <SegTabs tabs={['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as unknown as readonly string[]} value={day} onChange={(v: any) => setDay(v)} testId="cr-sch-day" slugPrefix="cr-sch-day" />
          </div>
        )}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: '100%', height: 36, padding: '0 10px', border: `1px solid ${SLATE_200}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: SLATE_500, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Recipients</label>
          <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 8 }}>{recipients.map((e) => (<Chip key={e} label={e} active variant="coral" onToggle={() => setRecipients(recipients.filter((x) => x !== e))} />))}</div>
          <div className="flex gap-2">
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newEmail.includes('@')) { setRecipients([...recipients, newEmail]); setNewEmail(''); } }} placeholder="Add email" style={{ flex: 1, height: 36, padding: '0 10px', border: `1px solid ${SLATE_200}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none' }} />
            <button type="button" onClick={() => { if (newEmail.includes('@')) { setRecipients([...recipients, newEmail]); setNewEmail(''); } }} className="inline-flex items-center gap-1.5" style={{ height: 36, padding: '0 12px', background: SLATE_100, color: SLATE_700, border: `1px solid ${SLATE_200}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}><Mail size={13} />Add</button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2" style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${SLATE_100}` }}>
        <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
        <button type="button" onClick={onSave} className="inline-flex items-center gap-1.5" style={coralBtn} data-testid="cr-sch-save"><Clock size={13} />Save schedule</button>
      </div>
    </Modal>
  );
}
