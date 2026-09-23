import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { LinesheetDoc } from './LinesheetDoc';
import { CATALOG, LS_CUSTOMERS, PRICE_LISTS } from './lib/linesheet';
import { linesheetApi, type SavedLinesheet } from './lib/linesheetApi';
import './ops.css';
import './linesheet.css';

export default function SharedLinesheetPage({ token }: { token: string }) {
  const [ls, setLs] = useState<SavedLinesheet | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { linesheetApi.shared(token).then(setLs).catch((e) => setErr(e.message)); }, [token]);

  if (err) return <div className="ls-share ls-share-err" data-testid="share-error"><img src="/goorin-sidebar-icon.png" alt="Goorin" /><h1>This linesheet link isn't available</h1><p>{err}. Ask your Goorin rep for a fresh link.</p></div>;
  if (!ls) return <div className="ls-share"><p className="ls-muted">Loading linesheet…</p></div>;

  const customer = LS_CUSTOMERS.find((c) => c.id === ls.customerId);
  const list = PRICE_LISTS.find((p) => p.id === (ls.ctx === 'customer' ? customer?.priceList ?? 'usw' : ls.priceListId))!;
  const items = CATALOG.filter((i) => ls.itemIds.includes(i.id));
  return (
    <div className="ls-share" data-testid="share-page">
      <div className="ls-preview-bar no-print">
        <span className="ls-preview-info"><b>Goorin Bros.</b> · Shared linesheet · {items.length} styles{customer ? ` · prepared for ${customer.name}` : ''}</span>
        <button className="ops-btn" onClick={() => window.print()} data-testid="share-print"><Printer size={15} /> Print</button>
        <button className="ops-btn dark" onClick={() => window.print()} data-testid="share-download"><Download size={15} /> Download PDF</button>
      </div>
      <LinesheetDoc doc={ls} items={items} list={list} customerName={customer?.name} preparedBy={`${ls.createdBy} · wholesale@goorin.com`} dateIso={ls.updatedAt} />
    </div>
  );
}
