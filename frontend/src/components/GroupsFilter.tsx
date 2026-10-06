import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PopoverPortal from './PopoverPortal';
import type { Group } from '../mocks/groups';

const INK       = '#0F172A';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_50  = '#F8FAFC';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';

export default function GroupsFilter({ groups, selectedIds, onChange, minWidth = 150, testId }: {
  groups: Group[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  minWidth?: number;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const n = selectedIds.length;
  const label = n === 0 ? 'All groups' : `${n} group${n === 1 ? '' : 's'}`;
  const active = n > 0;
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-between"
        style={{
          minWidth, height: 34, padding: '0 10px', borderRadius: 8,
          background: '#FFFFFF',
          border: `1px solid ${active ? CORAL : '#E5E7EB'}`,
          color: active ? CORAL_DK : INK,
          fontSize: 13, fontWeight: active ? 600 : 500,
          cursor: 'pointer', fontFamily: 'inherit', gap: 8,
        }}
        data-testid={testId}
        data-active={active || undefined}
      >
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
        <ChevronDown size={13} strokeWidth={2} color={active ? CORAL_DK : SLATE_400} />
      </button>
      <PopoverPortal open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement="bottom-start" minWidth={260} padding={6} testId={`${testId}-menu`}>
        {groups.length === 0 ? (
          <p style={{ margin: 0, padding: '12px 10px', fontSize: 13, color: SLATE_500, fontStyle: 'italic' }}>No groups saved yet.</p>
        ) : (
          <>
            <div className="flex items-center justify-between" style={{ padding: '4px 8px 6px' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: SLATE_500 }}>Filter by group</span>
              <button type="button" onClick={() => onChange([])} className="btn-ghost" style={{ height: 22, padding: '0 8px', fontSize: 11, color: CORAL_DK }} data-testid={`${testId}-clear`}>Clear</button>
            </div>
            <div style={{ height: 1, background: '#F3F3F5', margin: '2px 0 4px' }} />
            {groups.map((g) => {
              const checked = selectedIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(g.id)}
                  className="w-full flex items-center"
                  style={{ gap: 10, height: 34, padding: '0 10px', background: 'transparent', fontSize: 13, color: INK, fontWeight: checked ? 600 : 500, borderRadius: 7, cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  data-testid={`${testId}-opt-${g.id}`}
                >
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? CORAL : SLATE_300}`, background: checked ? CORAL : '#FFFFFF', display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
                    {checked && <span style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </span>
                  <span className="inline-block rounded-full shrink-0" style={{ width: 8, height: 8, background: g.color }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: SLATE_400, whiteSpace: 'nowrap' }}>({g.values.length} values)</span>
                </button>
              );
            })}
          </>
        )}
      </PopoverPortal>
    </>
  );
}
