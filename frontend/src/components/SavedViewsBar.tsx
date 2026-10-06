import { useRef, useState } from 'react';
import { Bookmark, BookmarkPlus, X } from 'lucide-react';
import PopoverPortal from './PopoverPortal';

export type SavedView<F> = {
  id: string;
  name: string;
  filters: F;
  pinned: boolean;
  createdAt: string;
};

const INK       = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_100 = '#F1F5F9';
const SLATE_50  = '#F8FAFC';
const CORAL     = '#FF6F61';
const CORAL_DK  = '#C9422E';
const CORAL_BG  = '#FFF1EF';

const BTN_PILL: React.CSSProperties = {
  height: 34, padding: '0 10px', borderRadius: 8,
  border: '1px solid #EDEDEF', background: '#FFFFFF',
  color: SLATE_700, fontSize: 13, fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  cursor: 'pointer', fontFamily: 'inherit',
  transition: 'background-color 120ms',
};

export function SavedViewsPills<F>({ views, activeId, onApply, onClear, onUnpin, testIdPrefix }: {
  views: SavedView<F>[];
  activeId: string | null;
  onApply: (view: SavedView<F>) => void;
  onClear: () => void;
  onUnpin: (id: string) => void;
  testIdPrefix: string;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const pinned = views.filter((v) => v.pinned).slice(0, 6);
  if (pinned.length === 0) return null;
  return (
    <>
      <div className="inline-flex items-center flex-wrap" style={{ gap: 6 }} data-testid={`${testIdPrefix}-saved-views-pills`}>
        {pinned.map((v) => {
          const active = v.id === activeId;
          const hovered = hoverId === v.id;
          const bg = active ? CORAL_BG : (hovered ? SLATE_100 : SLATE_50);
          const border = active ? CORAL : '#EDEDEF';
          const color = active ? CORAL_DK : SLATE_700;
          return (
            <div
              key={v.id}
              role="button"
              tabIndex={0}
              className="inline-flex items-center"
              onMouseEnter={() => setHoverId(v.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                height: 30, padding: '0 10px', borderRadius: 8,
                border: `1px solid ${border}`, background: bg, color,
                fontSize: 13, fontWeight: 500, gap: 6, cursor: 'pointer',
                transition: 'background-color 120ms, border-color 120ms',
              }}
              onClick={() => (active ? onClear() : onApply(v))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); active ? onClear() : onApply(v); } }}
              data-testid={`${testIdPrefix}-view-pill-${v.id}`}
              data-active={active || undefined}
              title={v.name}
            >
              <Bookmark size={12} strokeWidth={2} color={active ? CORAL_DK : SLATE_500} />
              <span style={{ whiteSpace: 'nowrap' }}>{v.name}</span>
              {hovered && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // eslint-disable-next-line no-alert
                    if (window.confirm(`Unpin "${v.name}"? This removes it from the toolbar.`)) onUnpin(v.id);
                  }}
                  style={{ background: 'transparent', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: active ? CORAL_DK : SLATE_500, marginLeft: 2 }}
                  aria-label={`Unpin ${v.name}`}
                  data-testid={`${testIdPrefix}-view-pill-${v.id}-unpin`}
                >
                  <X size={11} strokeWidth={2.4} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <span aria-hidden="true" style={{ width: 1, height: 20, background: '#EDEDEF' }} />
    </>
  );
}

export function SaveViewControl<F>({ views, setViews, setActiveId, getCurrentFilters, getFilterSummary, testIdPrefix }: {
  views: SavedView<F>[];
  setViews: (v: SavedView<F>[]) => void;
  setActiveId: (id: string | null) => void;
  getCurrentFilters: () => F;
  getFilterSummary: () => string[];
  testIdPrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [name, setName] = useState('');
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const summary = open ? getFilterSummary() : [];

  const openPopover = () => { setName(''); setOpen(true); };
  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const v: SavedView<F> = {
      id: `v_${Math.random().toString(36).slice(2, 10)}`,
      name: trimmed,
      filters: getCurrentFilters(),
      pinned: true,
      createdAt: new Date().toISOString(),
    };
    // Prepend so new pill appears LEFT-MOST
    setViews([v, ...views]);
    setActiveId(v.id);
    setName('');
    setOpen(false);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={openPopover}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ ...BTN_PILL, background: hover ? SLATE_50 : '#FFFFFF' }}
        data-testid={`${testIdPrefix}-save-view-btn`}
      >
        <BookmarkPlus size={14} strokeWidth={2} /> Save view
      </button>
      <PopoverPortal open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement="bottom-end" minWidth={300} padding={16} testId={`${testIdPrefix}-save-view-popover`}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>Save current view</p>
          <p style={{ margin: '4px 0 10px', fontSize: 12, color: SLATE_500 }}>Captures tabs, search, and all filters.</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Late ocean"
            className="ds-input w-full"
            style={{ height: 40 }}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
            data-testid={`${testIdPrefix}-save-view-name`}
          />
          <div style={{ marginTop: 10 }}>
            {summary.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: SLATE_500, fontStyle: 'italic' }} data-testid={`${testIdPrefix}-save-view-empty`}>
                No filters applied — save as blank view?
              </p>
            ) : (
              <div className="flex flex-wrap" style={{ gap: 4 }} data-testid={`${testIdPrefix}-save-view-chips`}>
                {summary.map((s) => (
                  <span key={s} style={{ padding: '2px 8px', borderRadius: 999, background: SLATE_100, color: SLATE_700, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>{s}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end" style={{ gap: 6, marginTop: 14 }}>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm" data-testid={`${testIdPrefix}-save-view-cancel`}>Cancel</button>
            <button type="button" onClick={commit} className="btn-primary btn-sm" data-testid={`${testIdPrefix}-save-view-commit`}>Save view</button>
          </div>
        </div>
      </PopoverPortal>
    </>
  );
}
