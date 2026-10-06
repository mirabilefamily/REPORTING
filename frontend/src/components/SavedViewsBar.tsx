import { useRef, useState } from 'react';
import { Bookmark, Pencil } from 'lucide-react';
import PopoverPortal from './PopoverPortal';

export type SavedView<F> = {
  id: string;
  name: string;
  filters: F;
  pinned: boolean;
  createdAt: string;
};

const INK       = '#0F172A';
const SLATE_500 = '#64748B';
const SLATE_100 = '#F1F5F9';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';
const CORAL_BG  = '#FFF1EF';

export function SavedViewsPills<F>({ views, activeId, onApply, onClear, testIdPrefix }: {
  views: SavedView<F>[];
  activeId: string | null;
  onApply: (view: SavedView<F>) => void;
  onClear: () => void;
  testIdPrefix: string;
}) {
  const pinned = views.filter((v) => v.pinned).slice(0, 6);
  if (pinned.length === 0) return null;
  return (
    <>
      <div className="inline-flex items-center flex-wrap" style={{ gap: 4 }} data-testid={`${testIdPrefix}-saved-views-pills`}>
        {pinned.map((v) => {
          const active = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => (active ? onClear() : onApply(v))}
              style={{
                padding: '4px 10px', borderRadius: 999,
                fontSize: 11.5, fontWeight: active ? 600 : 500,
                background: active ? CORAL_BG : SLATE_100,
                color: active ? CORAL_DK : INK,
                border: active ? `1px solid ${CORAL}` : '1px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                transition: 'background-color 120ms, border-color 120ms',
              }}
              data-testid={`${testIdPrefix}-view-pill-${v.id}`}
              data-active={active || undefined}
              title={v.name}
            >
              {v.name}
            </button>
          );
        })}
      </div>
      <span aria-hidden="true" style={{ width: 1, height: 20, background: '#EDEDEF' }} />
    </>
  );
}

export function SaveViewControl<F>({ views, setViews, activeId, setActiveId, getCurrentFilters, testIdPrefix }: {
  views: SavedView<F>[];
  setViews: (v: SavedView<F>[]) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  getCurrentFilters: () => F;
  testIdPrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'save' | 'edit'>('save');
  const [name, setName] = useState('');
  const [pin, setPin] = useState(true);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const activeView = views.find((v) => v.id === activeId) || null;

  const openSave = () => { setMode('save'); setName(''); setPin(true); setOpen(true); };
  const openEdit = () => {
    if (!activeView) return;
    setMode('edit'); setName(activeView.name); setPin(activeView.pinned); setOpen(true);
  };

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (mode === 'save') {
      const v: SavedView<F> = {
        id: `v_${Math.random().toString(36).slice(2, 10)}`,
        name: trimmed, filters: getCurrentFilters(), pinned: pin,
        createdAt: new Date().toISOString(),
      };
      setViews([...views, v]); setActiveId(v.id);
    } else if (activeView) {
      setViews(views.map((v) => (v.id === activeView.id ? { ...v, name: trimmed, pinned: pin } : v)));
    }
    setOpen(false);
  };
  const remove = () => {
    if (!activeView) return;
    setViews(views.filter((v) => v.id !== activeView.id));
    setActiveId(null); setOpen(false);
  };

  return (
    <>
      {activeView ? (
        <button
          ref={anchorRef}
          type="button"
          onClick={openEdit}
          style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: CORAL_DK, fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
          data-testid={`${testIdPrefix}-edit-view`}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          <Pencil size={12} strokeWidth={2.2} /> Edit view
        </button>
      ) : (
        <button
          ref={anchorRef}
          type="button"
          onClick={openSave}
          className="btn-ghost btn-sm inline-flex items-center gap-1.5"
          data-testid={`${testIdPrefix}-save-view-btn`}
        >
          <Bookmark size={13} strokeWidth={2} /> Save view
        </button>
      )}
      <PopoverPortal open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement="bottom-end" minWidth={280} padding={14} testId={`${testIdPrefix}-save-view-popover`}>
        <div className="flex flex-col" style={{ gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11.5, color: SLATE_500, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>View name</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Late + Ocean"
              className="ds-input w-full"
              style={{ marginTop: 4 }}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
              data-testid={`${testIdPrefix}-save-view-name`}
            />
          </div>
          <label className="inline-flex items-center cursor-pointer" style={{ gap: 8 }}>
            <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} style={{ accentColor: CORAL }} data-testid={`${testIdPrefix}-save-view-pin`} />
            <span style={{ fontSize: 13, color: INK }}>Pin to toolbar</span>
          </label>
          <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
            {mode === 'edit' && (
              <button type="button" onClick={remove} className="btn-ghost btn-sm" style={{ color: CORAL_DK }} data-testid={`${testIdPrefix}-save-view-delete`}>Delete</button>
            )}
            <div className="ml-auto inline-flex items-center" style={{ gap: 6 }}>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm" data-testid={`${testIdPrefix}-save-view-cancel`}>Cancel</button>
              <button type="button" onClick={commit} className="btn-primary btn-sm" data-testid={`${testIdPrefix}-save-view-commit`}>Save</button>
            </div>
          </div>
        </div>
      </PopoverPortal>
    </>
  );
}
