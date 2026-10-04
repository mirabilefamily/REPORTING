import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Placement = 'bottom-start' | 'bottom-end';

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  placement?: Placement;
  offset?: number;
  minWidth?: number | 'anchor';
  maxWidth?: number;
  maxHeight?: number;
  padding?: number | string;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  children: React.ReactNode;
  /** when true, closes on body scroll (default true) */
  closeOnScroll?: boolean;
  /** when true, closes on outside click (default true) */
  closeOnOutside?: boolean;
};

/**
 * Portal-based popover that escapes any `overflow: hidden` parent (cards, sticky columns).
 * Viewport-aware: flips to top if there's not enough space below.
 */
export default function PopoverPortal({
  open,
  anchorRef,
  onClose,
  placement = 'bottom-start',
  offset = 6,
  minWidth,
  maxWidth,
  maxHeight = 420,
  padding = 10,
  className,
  style,
  testId,
  children,
  closeOnScroll = true,
  closeOnOutside = true,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width?: number; flipped: boolean }>({ top: 0, left: 0, flipped: false });

  const compute = useCallback(() => {
    if (!anchorRef.current || !panelRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    const panelH = panel.offsetHeight || maxHeight;
    const panelW = panel.offsetWidth || 0;
    const vpH = window.innerHeight;
    const vpW = window.innerWidth;

    // Vertical: prefer below, flip to top if not enough space.
    const spaceBelow = vpH - a.bottom - offset;
    const spaceAbove = a.top - offset;
    const flip = spaceBelow < Math.min(panelH, maxHeight) && spaceAbove > spaceBelow;
    const top = flip ? Math.max(8, a.top - panelH - offset) : a.bottom + offset;

    // Horizontal: align to start/end of anchor and clamp to viewport.
    let left = placement === 'bottom-end' ? a.right - panelW : a.left;
    if (minWidth === 'anchor') {
      left = a.left;
    }
    const w = minWidth === 'anchor' ? a.width : panelW;
    const maxLeft = vpW - (w || panelW || 240) - 8;
    left = Math.max(8, Math.min(left, maxLeft));

    setPos({ top, left, width: minWidth === 'anchor' ? a.width : undefined, flipped: flip });
  }, [anchorRef, offset, placement, minWidth, maxHeight]);

  useLayoutEffect(() => {
    if (!open) return;
    compute();
    // Recompute after mount in case content loads
    const id = window.requestAnimationFrame(compute);
    return () => window.cancelAnimationFrame(id);
  }, [open, compute, children]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onResize = () => compute();
    const onScroll = (e: Event) => {
      // Ignore scroll inside the panel itself
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      if (closeOnScroll) onClose(); else compute();
    };
    const onClick = (e: MouseEvent) => {
      if (!closeOnOutside) return;
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('mousedown', onClick, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('mousedown', onClick, true);
    };
  }, [open, onClose, compute, closeOnScroll, closeOnOutside, anchorRef]);

  if (!open) return null;

  const minW = minWidth === 'anchor' ? pos.width : minWidth;

  return createPortal(
    <div
      ref={panelRef}
      className={className}
      role="menu"
      data-testid={testId}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 100,
        minWidth: minW,
        maxWidth,
        maxHeight,
        overflowY: 'auto',
        background: '#FFFFFF',
        borderRadius: 10,
        border: '1px solid #E5E5E7',
        boxShadow: '0 10px 30px rgba(15,23,42,0.14), 0 0 0 1px rgba(15,23,42,0.04)',
        padding,
        animation: 'popover-portal-in 120ms ease-out',
        ...style,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
