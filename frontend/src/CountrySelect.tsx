import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export const countries = ['United States', 'Canada', 'Mexico', 'United Kingdom', 'Ireland', 'Germany', 'France', 'Netherlands', 'Belgium', 'Spain', 'Portugal', 'Italy', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Australia', 'New Zealand', 'Japan', 'South Korea', 'Singapore', 'Hong Kong', 'United Arab Emirates', 'South Africa', 'Brazil', 'Chile', 'Colombia'];

const aliases: Record<string, string> = { USA: 'United States', US: 'United States', UK: 'United Kingdom' };

export function CountrySelect({ label = 'Country', value, onChange, testId }: { label?: string; value: string; onChange: (v: string) => void; testId: string }) {
  const current = aliases[value] ?? value;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = countries.filter((c) => c.toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (c: string) => { onChange(c); setOpen(false); setQ(''); };
  const toggle = () => { setOpen((o) => !o); setQ(''); setIdx(0); setTimeout(() => input.current?.focus(), 0); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(list.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[idx]) pick(list[idx]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <label className="co-field cs" ref={wrap as never}>
      <span>{label}</span>
      <button type="button" className={`mk-select cs-btn ${open ? 'open' : ''}`} onClick={toggle} aria-haspopup="listbox" aria-expanded={open} data-testid={testId}>
        <span>{current || 'Select country'}</span><ChevronDown />
      </button>
      {open && (
        <div className="cs-pop" data-testid={`${testId}-popover`}>
          <div className="cs-search"><Search /><input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKey} placeholder="Search countries…" data-testid={`${testId}-search`} /></div>
          <ul role="listbox">
            {list.length === 0 && <li className="cs-empty">No matches</li>}
            {list.map((c, i) => (
              <li key={c} role="option" aria-selected={c === current} className={`${c === current ? 'sel' : ''} ${i === idx ? 'hl' : ''}`} onMouseEnter={() => setIdx(i)} onMouseDown={(e) => { e.preventDefault(); pick(c); }} data-testid={`${testId}-opt-${c.toLowerCase().replace(/\s+/g, '-')}`}>
                {c}{c === current && <Check />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </label>
  );
}
