import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import DsSelect from './DsSelect';
import { GROUP_DIMENSIONS, GROUP_PALETTE, type Group } from '../mocks/groups';

type Props = {
  group: Group;
  onChange: (next: Group) => void;
  onDelete: () => void;
  testId?: string;
};

const INK = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const CORAL_DK = '#C9422E';

export default function GroupEditorCard({ group, onChange, onDelete, testId = 'group-editor' }: Props) {
  const [adding, setAdding] = useState('');
  const addValue = () => {
    const v = adding.trim();
    if (!v) return;
    if (group.values.includes(v)) { setAdding(''); return; }
    onChange({ ...group, values: [...group.values, v] });
    setAdding('');
  };
  const removeValue = (v: string) => onChange({ ...group, values: group.values.filter((x) => x !== v) });

  return (
    <div className="rounded-2xl" style={{ padding: 16, border: '1px solid #EDEDEF', background: '#FFFFFF' }} data-testid={testId}>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder="Group name"
          className="ds-input"
          style={{ width: 260 }}
          data-testid={`${testId}-name`}
        />
        <DsSelect
          value={group.dimension}
          options={GROUP_DIMENSIONS as unknown as string[]}
          onChange={(v) => onChange({ ...group, dimension: v })}
          testId={`${testId}-dimension`}
          minWidth={140}
        />
        <div className="ml-auto">
          <button
            type="button"
            onClick={onDelete}
            className="btn-ghost"
            style={{ width: 32, height: 32, padding: 0 }}
            aria-label="Delete group"
            data-testid={`${testId}-delete`}
            onMouseEnter={(e) => { e.currentTarget.style.color = CORAL_DK; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center flex-wrap mt-3" style={{ gap: 12 }}>
        <div className="inline-flex items-center" style={{ gap: 6 }} role="radiogroup" aria-label="Group color">
          {GROUP_PALETTE.map((c) => {
            const active = c === group.color;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ ...group, color: c })}
                aria-label={`Color ${c}`}
                className="rounded-full cursor-pointer transition-transform duration-150"
                style={{
                  width: 18, height: 18, background: c, padding: 0,
                  border: active ? `2px solid #FFFFFF` : 'none',
                  boxShadow: active ? `0 0 0 2px ${INK}` : 'none',
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                }}
                data-testid={`${testId}-color-${c.replace('#', '')}`}
              />
            );
          })}
        </div>
        <span
          className="chip-coral"
          style={{ fontVariantNumeric: 'tabular-nums' }}
          data-testid={`${testId}-value-count`}
        >
          Values {group.values.length}
        </span>
        <input
          type="text"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValue(); } }}
          placeholder="Add exact value + Enter"
          className="ds-input"
          style={{ flex: 1, minWidth: 180 }}
          data-testid={`${testId}-add-value`}
        />
      </div>

      {group.values.length > 0 && (
        <div className="flex flex-wrap mt-3" style={{ gap: 6 }} data-testid={`${testId}-chips`}>
          {group.values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center"
              style={{ padding: '4px 6px 4px 10px', background: SLATE_100, color: SLATE_700, borderRadius: 999, fontSize: 12.5, fontWeight: 500, gap: 4 }}
            >
              {v}
              <button
                type="button"
                onClick={() => removeValue(v)}
                aria-label={`Remove ${v}`}
                className="inline-grid"
                style={{ placeItems: 'center', width: 18, height: 18, border: 'none', background: 'transparent', color: SLATE_500, cursor: 'pointer', padding: 0, borderRadius: 999, fontSize: 14, lineHeight: 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_200; e.currentTarget.style.color = INK; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SLATE_500; }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
