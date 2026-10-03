import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export type DateRangeValue = 'Today' | 'Yesterday' | 'Last 7d' | 'Last 30d' | 'Last 90d' | 'MTD' | 'QTD' | 'YTD' | 'Custom';

type Props = {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  testId?: string;
};

const PRESETS: DateRangeValue[] = ['Today', 'Yesterday', 'Last 7d', 'Last 30d', 'Last 90d', 'MTD', 'QTD', 'YTD'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Date helpers ────────────────────────────────────────────────────
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const fmt = (d: Date) => `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;

function presetRange(preset: DateRangeValue, today: Date): { from: Date; to: Date } | null {
  if (preset === 'Custom') return null;
  const to = startOfDay(today);
  if (preset === 'Today') return { from: to, to };
  if (preset === 'Yesterday') { const y = addDays(to, -1); return { from: y, to: y }; }
  if (preset === 'Last 7d') return { from: addDays(to, -6), to };
  if (preset === 'Last 30d') return { from: addDays(to, -29), to };
  if (preset === 'Last 90d') return { from: addDays(to, -89), to };
  if (preset === 'MTD') return { from: new Date(to.getFullYear(), to.getMonth(), 1), to };
  if (preset === 'QTD') {
    const q = Math.floor(to.getMonth() / 3) * 3;
    return { from: new Date(to.getFullYear(), q, 1), to };
  }
  if (preset === 'YTD') return { from: new Date(to.getFullYear(), 0, 1), to };
  return null;
}

// Build 42-cell grid (6 weeks) for a given year/month
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length < 42) cells.push(null);
  return cells;
}

export default function DateRangePicker({ value, onChange, testId = 'date-range' }: Props) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);
  // Default left month = (today - 1 month), right month = today
  const [leftMonth, setLeftMonth] = useState<Date>(addMonths(today, -1));

  // Compute active range for highlighting (works for both presets & custom)
  const activeRange = useMemo(() => {
    if (value === 'Custom') {
      if (customFrom && customTo) return { from: customFrom, to: customTo };
      if (customFrom) return { from: customFrom, to: customFrom };
      return null;
    }
    return presetRange(value, today);
  }, [value, customFrom, customTo, today]);

  // Label shown on the pill
  const label = useMemo(() => {
    if (value === 'Custom' && customFrom && customTo) {
      return sameDay(customFrom, customTo) ? fmt(customFrom) : `${fmt(customFrom)} – ${fmt(customTo)}`;
    }
    if (value === 'Custom' && customFrom) return `${fmt(customFrom)} – …`;
    return value;
  }, [value, customFrom, customTo]);

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);

  function handleDayClick(d: Date) {
    // First click starts a new range; second click completes it
    if (!customFrom || (customFrom && customTo)) {
      setCustomFrom(d);
      setCustomTo(null);
      setHovered(null);
      if (value !== 'Custom') onChange('Custom');
    } else {
      // customFrom set, customTo not set
      if (d < customFrom) {
        setCustomTo(customFrom);
        setCustomFrom(d);
      } else {
        setCustomTo(d);
      }
      if (value !== 'Custom') onChange('Custom');
    }
  }

  function handlePreset(p: DateRangeValue) {
    setCustomFrom(null);
    setCustomTo(null);
    setHovered(null);
    onChange(p);
    // Realign calendar to the preset's end month
    const r = presetRange(p, today);
    if (r) setLeftMonth(addMonths(new Date(r.to.getFullYear(), r.to.getMonth(), 1), -1));
    setOpen(false);
  }

  function cellState(d: Date | null): { inRange: boolean; isStart: boolean; isEnd: boolean; isToday: boolean } {
    if (!d) return { inRange: false, isStart: false, isEnd: false, isToday: false };
    const isToday = sameDay(d, today);
    // Determine range considering hovered preview
    let from: Date | null = null;
    let to: Date | null = null;
    if (value === 'Custom') {
      if (customFrom && !customTo && hovered) {
        from = hovered < customFrom ? hovered : customFrom;
        to = hovered < customFrom ? customFrom : hovered;
      } else if (customFrom && customTo) {
        from = customFrom; to = customTo;
      } else if (customFrom) {
        from = customFrom; to = customFrom;
      }
    } else if (activeRange) {
      from = activeRange.from; to = activeRange.to;
    }
    if (!from || !to) return { inRange: false, isStart: false, isEnd: false, isToday };
    const inRange = d >= from && d <= to;
    const isStart = sameDay(d, from);
    const isEnd = sameDay(d, to);
    return { inRange, isStart, isEnd, isToday };
  }

  function renderMonth(m: Date) {
    const grid = monthGrid(m.getFullYear(), m.getMonth());
    return (
      <div className="drp-month">
        <div className="drp-month-head">
          <span className="drp-month-title">{MONTHS[m.getMonth()]} {m.getFullYear()}</span>
        </div>
        <div className="drp-weekdays">
          {WEEKDAYS.map((w, i) => <span key={i} className="drp-weekday">{w}</span>)}
        </div>
        <div className="drp-grid">
          {grid.map((d, i) => {
            if (!d) return <span key={i} className="drp-cell empty" aria-hidden="true" />;
            const { inRange, isStart, isEnd, isToday } = cellState(d);
            const cls = [
              'drp-cell',
              inRange ? 'in-range' : '',
              isStart ? 'is-start' : '',
              isEnd ? 'is-end' : '',
              isStart && isEnd ? 'is-single' : '',
              isToday ? 'is-today' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={i}
                type="button"
                className={cls}
                onMouseEnter={() => setHovered(d)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleDayClick(d)}
                data-testid={`${testId}-day-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`}
              >
                <span className="drp-cell-label">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="date-range-wrap"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      data-testid={`${testId}-wrap`}
    >
      <button
        type="button"
        className={`date-range-btn ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Date range"
        data-testid={`${testId}-button`}
      >
        <CalendarIcon size={14} strokeWidth={1.9} />
        <span className="date-range-label">{label}</span>
        <ChevronDown size={12} className="date-range-chev" />
      </button>
      {open && (
        <>
          <div className="date-range-pop-overlay" onClick={() => setOpen(false)} />
          <div className="drp-pop" role="dialog" aria-label="Choose a date range" data-testid={`${testId}-menu`}>
            <aside className="drp-presets" aria-label="Preset date ranges">
              {PRESETS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`drp-preset ${value === opt ? 'active' : ''}`}
                  onClick={() => handlePreset(opt)}
                  data-testid={`${testId}-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span>{opt}</span>
                </button>
              ))}
              <button
                type="button"
                className={`drp-preset ${value === 'Custom' ? 'active' : ''}`}
                onClick={() => { onChange('Custom'); setCustomFrom(null); setCustomTo(null); }}
                data-testid={`${testId}-custom`}
              >
                <span>Custom</span>
              </button>
            </aside>

            <div className="drp-cal">
              <div className="drp-cal-nav">
                <button
                  type="button"
                  className="drp-nav-btn"
                  onClick={() => setLeftMonth(addMonths(leftMonth, -1))}
                  aria-label="Previous month"
                  data-testid={`${testId}-prev`}
                >
                  <ChevronLeft size={14} strokeWidth={2} />
                </button>
                <div className="drp-cal-months">
                  {renderMonth(leftMonth)}
                  {renderMonth(rightMonth)}
                </div>
                <button
                  type="button"
                  className="drp-nav-btn"
                  onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
                  aria-label="Next month"
                  data-testid={`${testId}-next`}
                >
                  <ChevronRight size={14} strokeWidth={2} />
                </button>
              </div>

              <div className="drp-footer">
                <div className="drp-footer-label" data-testid={`${testId}-selection`}>
                  {customFrom && customTo
                    ? `${fmt(customFrom)} — ${fmt(customTo)}`
                    : customFrom
                      ? `${fmt(customFrom)} — Select end date`
                      : activeRange
                        ? `${fmt(activeRange.from)} — ${fmt(activeRange.to)}`
                        : 'Select a range'}
                </div>
                <div className="drp-footer-actions">
                  <button
                    type="button"
                    className="drp-btn-ghost"
                    onClick={() => { setCustomFrom(null); setCustomTo(null); }}
                    data-testid={`${testId}-clear`}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="drp-btn-primary"
                    disabled={!(customFrom && customTo)}
                    onClick={() => { onChange('Custom'); setOpen(false); }}
                    data-testid={`${testId}-apply`}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
