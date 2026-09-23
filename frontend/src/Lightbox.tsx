import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, ChevronLeft, ChevronRight, Plus, X, ZoomIn } from 'lucide-react';
import type { Product } from '@/lib/cart';
import { Qty } from './Qty';
import { money } from '@/lib/money';

export const VIEWS = ['Front', 'Patch detail', 'Brim', 'Mesh back'];
export const viewStyle = (i: number): React.CSSProperties => [
  { transform: 'scale(1)', objectPosition: '50% 50%' },
  { transform: 'scale(2.1)', objectPosition: '50% 32%' },
  { transform: 'scale(1.6)', objectPosition: '50% 88%' },
  { transform: 'scale(1.7)', objectPosition: '92% 45%' },
][i % 4];

export type LightboxItem = Pick<Product, 'id' | 'name' | 'sku' | 'price' | 'msrp' | 'max' | 'available' | 'image' | 'images'> & { collection?: string; tag?: string };
type Props = { p: LightboxItem; start: number; inCart: number; onAdd: () => void; onQty: (n: number) => void; onClose: () => void };

export function Lightbox({ p, start, inCart, onAdd, onQty, onClose }: Props) {
  const count = Math.max(1, p.images);
  const [i, setI] = useState(Math.min(start, count - 1));
  const [zoom, setZoom] = useState(false);
  const touchX = useRef<number | null>(null);
  const go = (d: number) => { setZoom(false); setI((v) => (v + d + count) % count); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return createPortal(
    <div className="lb" role="dialog" aria-modal="true" aria-label={`${p.name} gallery`} data-testid="lightbox" onClick={onClose}>
      <div className="lb-panel" onClick={(e) => e.stopPropagation()}>
        <button className="lb-close" onClick={onClose} aria-label="Close" data-testid="lightbox-close"><X /></button>
        <div
          className={`lb-stage ${zoom ? 'is-zoom' : ''}`}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { if (touchX.current === null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); touchX.current = null; }}
          onClick={() => setZoom((z) => !z)}
          data-testid="lightbox-stage"
        >
          {p.image ? <img key={i} src={p.image} alt={`${p.name} – ${VIEWS[i % 4]}`} style={zoom ? { transform: 'scale(2.4)', objectPosition: '50% 50%' } : viewStyle(i)} /> : <span className="lb-empty"><Box /> No image available</span>}
          {count > 1 && <>
            <button className="lb-nav lb-prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous image" data-testid="lightbox-prev"><ChevronLeft /></button>
            <button className="lb-nav lb-next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next image" data-testid="lightbox-next"><ChevronRight /></button>
          </>}
          <span className="lb-counter" data-testid="lightbox-counter">{i + 1} / {count} · {VIEWS[i % 4]}</span>
          <span className="lb-zoomhint"><ZoomIn /> {zoom ? 'Click to reset' : 'Click to zoom'}</span>
        </div>
        {count > 1 && (
          <div className="lb-thumbs" data-testid="lightbox-thumbs">
            {Array.from({ length: count }).map((_, k) => (
              <button key={k} className={k === i ? 'on' : ''} onClick={() => { setZoom(false); setI(k); }} aria-label={`View ${VIEWS[k % 4]}`} data-testid={`lightbox-thumb-${k}`}>
                <span className="lb-thumb">{p.image && <img src={p.image} alt="" style={viewStyle(k)} />}</span><span>{VIEWS[k % 4]}</span>
              </button>
            ))}
          </div>
        )}
        <div className="lb-info">
          <div><h3>{p.name}</h3><p>{p.sku}{p.collection ? ` · ${p.collection}` : ''}{p.tag ? ` · ${p.tag}` : ''}</p></div>
          <div className="lb-price"><strong>{money(p.price)}</strong><small>WHSL</small><span>MSRP {money(p.msrp)}</span></div>
          {inCart > 0 ? <Qty id={`lb-${p.id}`} value={inCart} max={p.max} onChange={onQty} /> : <button className="mk-add" onClick={onAdd} disabled={p.available === 0} data-testid={`lightbox-add-${p.id}`}><Plus /> Add to cart</button>}
        </div>
      </div>
    </div>,
    document.body
  );
}
