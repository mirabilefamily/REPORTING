import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

type Opt = { value: string; label: string; count?: number };

export function MultiSelect({ label, options, value, onChange, testId }: { label: string; options: Opt[]; value: Set<string>; onChange: (v: Set<string>) => void; testId: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);

  const toggle = (v: string) => { const n = new Set(value); n.has(v) ? n.delete(v) : n.add(v); onChange(n); };
  const shown = options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  const summary = value.size === 0 ? `All ${label.toLowerCase()}` : value.size === 1 ? options.find((o) => o.value === Array.from(value)[0])?.label : `${value.size} ${label.toLowerCase()}`;

  return (
    <div className={`ls-ms ${open ? 'open' : ''} ${value.size ? 'has' : ''}`} ref={ref} data-testid={testId}>
      <button type="button" className="ls-ms-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid={`${testId}-toggle`}>
        <span>{summary}</span>
        {value.size > 0 && <b className="ls-ms-n">{value.size}</b>}
        <ChevronDown size={14} className="ls-ms-chev" />
      </button>
      {open && (
        <div className="ls-ms-pop" role="listbox" aria-multiselectable data-testid={`${testId}-menu`}>
          <label className="ls-ms-search"><Search size={13} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} data-testid={`${testId}-search`} />{q && <button type="button" onClick={() => setQ('')} aria-label="Clear"><X size={12} /></button>}</label>
          <div className="ls-ms-list">
            {shown.length === 0 && <p className="ls-muted">No matches.</p>}
            {shown.map((o) => { const on = value.has(o.value); return (
              <button type="button" key={o.value} role="option" aria-selected={on} className={`ls-ms-opt ${on ? 'on' : ''}`} onClick={() => toggle(o.value)} data-testid={`${testId}-opt-${o.value}`}>
                <i className="ls-ms-box">{on && <Check size={11} strokeWidth={3} />}</i><span>{o.label}</span>{o.count !== undefined && <small>{o.count}</small>}
              </button>
            ); })}
          </div>
          <div className="ls-ms-foot">
            <button type="button" className="ls-link" onClick={() => onChange(new Set())} disabled={value.size === 0} data-testid={`${testId}-clear`}>Clear</button>
            <button type="button" className="ls-link" onClick={() => onChange(new Set(shown.map((o) => o.value)))} data-testid={`${testId}-all`}>Select {q ? 'matches' : 'all'}</button>
            <span className="ls-spacer" />
            <button type="button" className="ops-btn dark sm" onClick={() => setOpen(false)} data-testid={`${testId}-done`}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
