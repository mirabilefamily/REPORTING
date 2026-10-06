import { useRef, useState } from 'react';
import { Columns3, GripVertical, Pin } from 'lucide-react';
import PopoverPortal from './PopoverPortal';

const INK       = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_50  = '#F8FAFC';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';

type ColumnDef = { key: string; label: string; pinned?: boolean };

export default function ColumnsPopover({ columns, visibleCols, setVisibleCols, testIdPrefix }: {
  columns: ColumnDef[];
  visibleCols: Record<string, boolean>;
  setVisibleCols: (next: Record<string, boolean>) => void;
  testIdPrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const visibleCount = columns.filter((c) => visibleCols[c.key]).length;

  const toggle = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (col?.pinned) return;
    setVisibleCols({ ...visibleCols, [key]: !visibleCols[key] });
  };
  const reset = () => {
    const next: Record<string, boolean> = {};
    columns.forEach((c) => { next[c.key] = true; });
    setVisibleCols(next);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          height: 34, padding: '0 10px', borderRadius: 8,
          border: '1px solid #EDEDEF',
          background: hover ? SLATE_50 : '#FFFFFF',
          color: SLATE_700, fontSize: 13, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background-color 120ms',
        }}
        data-testid={`${testIdPrefix}-columns-btn`}
      >
        <Columns3 size={14} strokeWidth={2} /> Columns
      </button>
      <PopoverPortal open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement="bottom-end" minWidth={280} padding={16} testId={`${testIdPrefix}-columns-menu`}>
        <div>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>Columns</p>
            <button
              type="button"
              onClick={reset}
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: SLATE_500, fontFamily: 'inherit' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = CORAL_DK; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = SLATE_500; }}
              data-testid={`${testIdPrefix}-columns-reset`}
            >
              Reset
            </button>
          </div>
          <p style={{ margin: '4px 0 10px', fontSize: 12, color: SLATE_500 }}>Show or hide table columns.</p>
          <div style={{ maxHeight: 320, overflowY: 'auto', marginLeft: -4, marginRight: -4 }}>
            {columns.map((c) => {
              const checked = !!visibleCols[c.key];
              const pinned = !!c.pinned;
              return (
                <div
                  key={c.key}
                  className="flex items-center"
                  style={{ height: 32, padding: '0 8px', borderRadius: 6, gap: 10, cursor: pinned ? 'default' : 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => toggle(c.key)}
                  data-testid={`${testIdPrefix}-col-row-${c.key}`}
                >
                  {pinned ? (
                    <span title="Always visible" style={{ width: 16, display: 'inline-grid', placeItems: 'center', color: SLATE_500 }} data-testid={`${testIdPrefix}-col-pin-${c.key}`}>
                      <Pin size={12} strokeWidth={2} />
                    </span>
                  ) : (
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? CORAL : SLATE_300}`, background: checked ? CORAL : '#FFFFFF', display: 'inline-grid', placeItems: 'center' }} data-testid={`${testIdPrefix}-col-toggle-${c.key}`}>
                      {checked && <span style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                    </span>
                  )}
                  <span style={{ flex: 1, fontSize: 13, color: INK }}>{c.label}</span>
                  <GripVertical size={12} strokeWidth={1.8} color={SLATE_400} />
                </div>
              );
            })}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: SLATE_500 }} data-testid={`${testIdPrefix}-columns-footer`}>{visibleCount} of {columns.length} columns visible</p>
        </div>
      </PopoverPortal>
    </>
  );
}
