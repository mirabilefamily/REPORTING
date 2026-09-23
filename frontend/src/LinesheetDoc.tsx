import { Box } from 'lucide-react';
import { fmt, priceFor, type LsItem, type PriceList } from './lib/linesheet';

export type LsDoc = { title: string; notes: string; showMsrp: boolean; showMoq: boolean };
const today = (iso?: string) => new Date(iso ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function LinesheetDoc({ doc, items, list, customerName, preparedBy = 'Ryan Mirabile · ryan@goorin.com', dateIso }: { doc: LsDoc; items: LsItem[]; list: PriceList; customerName?: string; preparedBy?: string; dateIso?: string }) {
  const cur = list.id === 'intl' ? 'EUR' : 'USD';
  return (
    <article className="ls-doc" data-testid="ls-doc">
      <header className="ls-doc-head">
        <div><img src="/goorin-sidebar-icon.png" alt="Goorin" className="ls-doc-logo" /><p className="ls-doc-kicker">Goorin Bros. · Wholesale linesheet</p><h1>{doc.title}</h1></div>
        <dl>
          <div><dt>Prepared for</dt><dd>{customerName ?? 'Wholesale partners'}</dd></div>
          <div><dt>Price list</dt><dd>{list.name} · {cur}</dd></div>
          <div><dt>Date</dt><dd>{today(dateIso)}</dd></div>
          <div><dt>Prepared by</dt><dd>{preparedBy}</dd></div>
        </dl>
      </header>
      {doc.notes && <p className="ls-doc-notes">{doc.notes}</p>}
      <section className="ls-doc-grid">
        {items.map((i) => (
          <div className="ls-doc-item" key={i.id}>
            <div className="ls-doc-img">{i.image ? <img src={i.image} alt={i.name} /> : <Box size={28} />}</div>
            <strong>{i.name}</strong>
            <small>{i.color} · {i.size}</small>
            <small className="ls-doc-sku">{i.sku}</small>
            <small>{i.collection} · {i.season}</small>
            <div className="ls-doc-price"><b>{fmt(priceFor(i, list), cur)}</b>{doc.showMsrp && <small>MSRP {fmt(i.msrp, cur)}</small>}</div>
            {doc.showMoq && <small className="ls-doc-moq">MOQ {i.moq} · {i.delivery}</small>}
          </div>
        ))}
      </section>
      <footer className="ls-doc-foot"><span>Goorin Bros. · 1612 Stockton St, San Francisco, CA · wholesale@goorin.com</span><span>{list.note} · Prices in {cur}, subject to change · {items.length} styles</span></footer>
    </article>
  );
}
