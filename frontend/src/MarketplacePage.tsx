import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Box, Clock, Download, Heart, Info, LayoutGrid, List, Maximize2, Plus, Search, SlidersHorizontal, TrendingUp, Truck, Upload, X } from 'lucide-react';
import { Lightbox, viewStyle } from './Lightbox';
import { useBackable } from '@/lib/nav';
import { useToast } from '@/lib/toast';
import { money } from '@/lib/money';
import { useCart, useCountdown, type Product } from '@/lib/cart';
import { products, collections, shapes } from '@/lib/products';
import { Qty } from './Qty';
import './marketplace.css';

type Props = { onCheckout: () => void };
type Sort = 'Featured' | 'Newest' | 'Price: Low to High' | 'Price: High to Low' | 'Availability';
const sorts: Sort[] = ['Featured', 'Newest', 'Price: Low to High', 'Price: High to Low', 'Availability'];


function Card({ p, view, fav, onFav, onAdd, onQty, inCart, onOpen }: { p: Product; view: 'tile' | 'list'; fav: boolean; onFav: () => void; onAdd: () => void; onQty: (n: number) => void; inCart: number; onOpen: (i: number) => void }) {
  const low = p.available > 0 && p.available < 10;
  const out = p.available === 0;
  const [slide, setSlide] = useState(0);
  return (
    <article className={`mk-card ${view === 'list' ? 'mk-card--list' : ''} ${out ? 'is-out' : ''}`} data-testid={`product-card-${p.id}`}>
      <div className="mk-media">
        {p.trending && <span className="mk-badge mk-badge--trend"><TrendingUp /> Trending</span>}
        {low && <span className="mk-badge mk-badge--low">Low · {p.available}</span>}
        {out && <span className="mk-badge mk-badge--out">Sold out</span>}
        <button className={`mk-fav ${fav ? 'is-on' : ''}`} onClick={onFav} aria-label={fav ? 'Remove from favorites' : 'Add to favorites'} data-testid={`fav-${p.id}`}><Heart /></button>
        <button className="mk-media-btn" onClick={() => onOpen(slide)} aria-label={`Enlarge ${p.name}`} data-testid={`enlarge-${p.id}`}>
          {p.image ? <img src={p.image} alt={p.name} loading="lazy" style={viewStyle(slide)} /> : <span className="mk-placeholder"><Box /></span>}
          <span className="mk-zoom"><Maximize2 /></span>
        </button>
        {p.recipe && <span className="mk-recipe">Original Recipe</span>}
        {p.images > 1 && (
          <span className="mk-dots" role="tablist">
            {Array.from({ length: p.images }).map((_, i) => <button key={i} role="tab" aria-selected={i === slide} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={`Image ${i + 1}`} data-testid={`dot-${p.id}-${i}`} />)}
          </span>
        )}
      </div>
      <div className="mk-body">
        <div className="mk-title"><h3>{p.name}</h3><button className="mk-info" aria-label="Product details" data-testid={`info-${p.id}`}><Info /></button></div>
        <p className="mk-sku">{p.sku}<span className="mk-coll">{p.collection}</span></p>
        <div className="mk-price"><strong>{money(p.price)}</strong><small>WHSL</small><span>MSRP {money(p.msrp)}</span></div>
        <p className="mk-stock">{out ? 'Out of stock' : `${p.available.toLocaleString()} available`}</p>
        <p className="mk-max">Max {p.max}</p>
        {inCart > 0 ? (
          <div className="mk-line" data-testid={`line-${p.id}`}>
            <Qty id={p.id} value={inCart} max={p.max} onChange={onQty} />
            <strong className="mk-line-total" data-testid={`line-total-${p.id}`}>{money(inCart * p.price)}</strong>
          </div>
        ) : (
          <button className="mk-add" onClick={onAdd} disabled={out} data-testid={`add-${p.id}`}><Plus /> Add to cart</button>
        )}
      </div>
    </article>
  );
}

export default function MarketplacePage({ onCheckout }: Props) {
  const notify = useToast();
  const cart = useCart();
  const timer = useCountdown(cart.reservedUntil);
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState(collections[0]);
  const [shape, setShape] = useState(shapes[0]);
  const [sort, setSort] = useState<Sort>('Featured');
  const [favOnly, setFavOnly] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'tile' | 'list'>('tile');
  const [open, setOpen] = useState<{ p: Product; i: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = (collection !== collections[0] ? 1 : 0) + (shape !== shapes[0] ? 1 : 0) + (sort !== 'Featured' ? 1 : 0) + (favOnly ? 1 : 0);
  useBackable(!!open, () => setOpen(null));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = products.filter((p) => (collection === collections[0] || p.collection === collection) && (shape === shapes[0] || p.shape === shape) && (!favOnly || favs.has(p.id)) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.collection.toLowerCase().includes(q)));
    const by: Record<Sort, (a: Product, b: Product) => number> = {
      Featured: (a, b) => Number(!!b.trending) - Number(!!a.trending),
      Newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      'Price: Low to High': (a, b) => a.price - b.price,
      'Price: High to Low': (a, b) => b.price - a.price,
      Availability: (a, b) => b.available - a.available,
    };
    return [...r].sort(by[sort]);
  }, [query, collection, shape, sort, favOnly, favs]);

  const toggleFav = (id: string) => setFavs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const qtyOf = (id: string) => cart.lines.find((l) => l.product.id === id)?.qty ?? 0;

  const downloadTemplate = () => {
    const rows = ['SKU,Quantity', ...products.slice(0, 4).map((p) => `${p.sku},`)];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = 'goorin-order-template.csv';
    a.click();
  };

  return (
    <div className="mk" data-testid="marketplace-page">
      <div className="mk-toolbar">
        <div className={`mk-toolbar-row ${filtersOpen ? 'is-open' : ''}`}>
          <button className="mk-btn mk-filters-btn" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} data-testid="mk-filters-toggle"><SlidersHorizontal /> Filters{activeFilters ? ` · ${activeFilters}` : ''}</button>
          <label className="mk-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, SKUs, collections" data-testid="mk-search" /></label>
          <select className="mk-select mk-select--wide" value={collection} onChange={(e) => setCollection(e.target.value)} data-testid="mk-collection">{collections.map((c) => <option key={c}>{c}</option>)}</select>
          <select className="mk-select" value={shape} onChange={(e) => setShape(e.target.value)} data-testid="mk-shape">{shapes.map((c) => <option key={c}>{c}</option>)}</select>
          <select className="mk-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} data-testid="mk-sort">{sorts.map((c) => <option key={c}>{c}</option>)}</select>
          <button className={`mk-btn ${favOnly ? 'is-active' : ''}`} onClick={() => setFavOnly(!favOnly)} data-testid="mk-favorites"><Heart /> Favorites{favs.size ? ` · ${favs.size}` : ''}</button>
          <div className="mk-segment" role="tablist">
            <button role="tab" aria-selected={view === 'tile'} className={view === 'tile' ? 'active' : ''} onClick={() => setView('tile')} data-testid="mk-view-tile"><LayoutGrid /> Tile</button>
            <button role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} data-testid="mk-view-list"><List /> List</button>
          </div>
          <span className="mk-divider" />
          <button className="mk-btn" onClick={downloadTemplate} data-testid="mk-template"><Download /> Template</button>
          <button className="mk-btn" onClick={() => notify('Bulk import: upload a filled CSV template to add items to your cart.', 'info')} data-testid="mk-import"><Upload /> Import</button>
        </div>
        <div className="mk-toolbar-foot">
          <div className="mk-foot-left">
            <span data-testid="mk-count">Showing <strong>{list.length}</strong> of {products.length} products</span>
            {(query || collection !== collections[0] || shape !== shapes[0] || favOnly) && (
              <div className="mk-chips" data-testid="mk-active-filters">
                {query && <button onClick={() => setQuery('')}>“{query}” <X /></button>}
                {collection !== collections[0] && <button onClick={() => setCollection(collections[0])}>{collection} <X /></button>}
                {shape !== shapes[0] && <button onClick={() => setShape(shapes[0])}>{shape} <X /></button>}
                {favOnly && <button onClick={() => setFavOnly(false)}>Favorites <X /></button>}
                <button className="mk-chips-clear" onClick={() => { setQuery(''); setCollection(collections[0]); setShape(shapes[0]); setFavOnly(false); }} data-testid="mk-clear-filters">Clear all</button>
              </div>
            )}
          </div>
          <span><Truck /> Ships from San Diego, USA</span>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mk-empty" data-testid="mk-empty"><Search /><strong>No products found</strong><span>Try a different search or clear your filters.</span><button onClick={() => { setQuery(''); setCollection(collections[0]); setShape(shapes[0]); setFavOnly(false); }}>Clear filters</button></div>
      ) : (
        <div className={`mk-grid ${view === 'list' ? 'mk-grid--list' : ''}`}>
          {list.map((p) => <Card key={p.id} p={p} view={view} fav={favs.has(p.id)} onFav={() => toggleFav(p.id)} inCart={qtyOf(p.id)} onAdd={() => { cart.add(p); notify(`${p.name} added to cart`); }} onQty={(n) => cart.setQty(p.id, n)} onOpen={(i) => setOpen({ p, i })} />)}
        </div>
      )}

      {open && <Lightbox p={open.p} start={open.i} inCart={qtyOf(open.p.id)} onAdd={() => { cart.add(open.p); notify(`${open.p.name} added to cart`); }} onQty={(n) => cart.setQty(open.p.id, n)} onClose={() => setOpen(null)} />}

      {cart.count > 0 && createPortal(
        <div className="mk-cartbar-wrap" data-testid="cart-bar">
          <div className="mk-reserve"><Clock /> Inventory reserved · <strong>{timer} left</strong></div>
          <div className="mk-cartbar">
            <div className="mk-cart-thumbs">{cart.lines.slice(0, 3).map((l) => <span key={l.product.id}>{l.product.image ? <img src={l.product.image} alt="" /> : <Box />}</span>)}{cart.lines.length > 3 && <em>+{cart.lines.length - 3}</em>}</div>
            <div className="mk-cart-sum"><strong data-testid="cart-bar-count">{cart.count} item{cart.count === 1 ? '' : 's'}</strong><i /><strong data-testid="cart-bar-total">{money(cart.total)}</strong></div>
            <button className="mk-checkout" onClick={onCheckout} data-testid="cart-bar-checkout">Checkout <ArrowRight /></button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
