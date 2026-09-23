import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';

export type DateRangeValue = 'Last 30d' | 'QTD' | 'YTD' | 'Custom';

type Props = {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  testId?: string;
};

const OPTIONS: DateRangeValue[] = ['Last 30d', 'QTD', 'YTD', 'Custom'];

export default function DateRangePicker({ value, onChange, testId = 'date-range' }: Props) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const label = value === 'Custom' && customFrom && customTo ? `${customFrom} → ${customTo}` : value;

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
        aria-haspopup="menu"
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
          <div className="date-range-pop" role="menu" data-testid={`${testId}-menu`}>
            {OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                role="menuitem"
                className={`date-range-option ${value === opt ? 'active' : ''}`}
                onClick={() => {
                  onChange(opt);
                  if (opt !== 'Custom') setOpen(false);
                }}
                data-testid={`${testId}-${opt.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span>{opt}</span>
              </button>
            ))}
            {value === 'Custom' && (
              <div className="date-range-custom">
                <label htmlFor={`${testId}-from`}>From</label>
                <input
                  id={`${testId}-from`}
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  data-testid={`${testId}-from`}
                />
                <label htmlFor={`${testId}-to`}>To</label>
                <input
                  id={`${testId}-to`}
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  data-testid={`${testId}-to`}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
