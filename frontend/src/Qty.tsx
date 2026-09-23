import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export function Qty({ value, max, onChange, id }: { value: number; max: number; onChange: (n: number) => void; id: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    onChange(Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : value);
    setDraft(null);
  };
  return (
    <div className="mk-qty" data-testid={`qty-${id}`}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease quantity" data-testid={`qty-dec-${id}`}><Minus /></button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        aria-label="Quantity"
        data-testid={`qty-input-${id}`}
      />
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity" data-testid={`qty-inc-${id}`}><Plus /></button>
    </div>
  );
}
