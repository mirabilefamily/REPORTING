import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Box, Calendar, Check, ChevronLeft, Clock, Minus, Pencil, Plus, ShieldCheck, Trash2, User } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { money } from '@/lib/money';
import { useCart, useCountdown } from '@/lib/cart';
import './checkout.css';
import { CountrySelect } from './CountrySelect';

type Props = { onBack: () => void; onComplete: () => void };
type Step = 1 | 2 | 3;
type Address = { name: string; company: string; email: string; phone: string; line1: string; line2: string; city: string; state: string; zip: string; country: string };

const saved: Address = { name: 'Ryan Mirabile', company: 'Mirabile Distribution', email: 'ryan.mirabile@me.com', phone: '321-344-4590', line1: '15354 Rising View Dr # 1', line2: '', city: 'Montverde', state: 'Florida', zip: '34756-3546', country: 'United States' };
const blank: Address = { name: '', company: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', zip: '', country: 'United States' };

function Field({ label, value, onChange, placeholder, optional, testId }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; optional?: boolean; testId: string }) {
  return (
    <label className="co-field">
      <span>{label}{optional && ' (optional)'}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testId} />
    </label>
  );
}

function AddressCard({ a, selected, onSelect, radio, tag, onEdit }: { a: Address; selected?: boolean; onSelect?: () => void; radio?: boolean; tag?: string; onEdit?: () => void }) {
  return (
    <div className={`co-address ${selected ? 'is-selected' : ''} ${radio ? 'is-radio' : ''}`} onClick={onSelect} role={radio ? 'radio' : undefined} aria-checked={selected} data-testid={radio ? 'address-saved' : 'billing-address'}>
      {radio && <span className="co-radio"><i /></span>}
      <div className="co-address-body">
        <strong>{a.name}</strong>
        <span>{a.company}</span>
        <span>{a.line1}{a.line2 ? ` ${a.line2}` : ''} · {a.city}, {a.state}, {a.zip} · {a.country}</span>
      </div>
      <div className="co-address-side">{tag && <em>{tag}</em>}{onEdit && <button type="button" className="co-edit" onClick={(e) => { e.stopPropagation(); onEdit(); }} data-testid="address-edit"><Pencil /> Edit</button>}</div>
    </div>
  );
}

export default function CheckoutPage({ onBack, onComplete }: Props) {
  const notify = useToast();
  const cart = useCart();
  const timer = useCountdown(cart.reservedUntil);
  const [step, setStep] = useState<Step>(2);
  const [addrMode, setAddrMode] = useState<'saved' | 'new'>('saved');
  const [addresses, setAddresses] = useState<Address[]>([saved]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [addr, setAddr] = useState<Address>(blank);
  const [useFor, setUseFor] = useState<'Delivery' | 'Invoice' | 'Both'>('Delivery');
  const [saveAddr, setSaveAddr] = useState(true);
  const [sameBilling, setSameBilling] = useState(false);
  const [customWindow, setCustomWindow] = useState(false);
  const [shipWindow, setShipWindow] = useState('');
  const [po, setPo] = useState('');
  const set = (k: keyof Address) => (v: string) => setAddr((a) => ({ ...a, [k]: v }));

  const issues = useMemo(() => {
    const list: string[] = [];
    if (cart.count === 0) list.push('Your cart is empty. Add items from the Marketplace to continue.');
    if (addrMode === 'new') {
      const missing = [['name', 'Recipient name'], ['line1', 'Street address'], ['city', 'City'], ['state', 'State or province (required for U.S. and Canadian shipments)'], ['zip', 'Postal code']].filter(([k]) => !addr[k as keyof Address].trim()).map(([, l]) => l);
      if (missing.length) list.push(`Update the selected shipping address: ${missing.join(', ')}.`);
    }
    if (customWindow && !shipWindow) list.push('Choose a requested ship window or turn off the custom ship window option.');
    return list;
  }, [cart.count, addrMode, addr, customWindow, shipWindow]);

  const canContinue = issues.length === 0;

  const saveNewAddress = () => {
    const missing = [['name', 'Full name'], ['line1', 'Address'], ['city', 'City'], ['state', 'State'], ['zip', 'ZIP']].filter(([k]) => !addr[k as keyof Address].trim()).map(([, l]) => l);
    if (missing.length) { notify(`Please fill in ${missing.join(', ')}`, 'error'); return; }
    if (editingIdx !== null) {
      setAddresses((list) => list.map((a, i) => (i === editingIdx ? addr : a)));
      setSelectedIdx(editingIdx);
      notify('Address updated', 'success');
    } else {
      setAddresses((list) => [...list, addr]);
      setSelectedIdx(addresses.length);
      notify(saveAddr ? 'Address saved to your account' : 'Address added for this order', 'success');
    }
    setEditingIdx(null);
    setAddrMode('saved');
    setAddr(blank);
  };

  const placeOrder = () => {
    notify(`Order placed · ${cart.count} item${cart.count === 1 ? '' : 's'} · ${money(cart.total)}`, 'success');
    cart.clear();
    onComplete();
  };

  const addressForm = (
                <div className="co-form co-form-card" data-testid="address-form">
                  <div className="co-form-head"><strong>{editingIdx === null ? 'New address' : 'Edit address'}</strong><span>Fields marked optional can be left blank.</span></div>
                  <Field label="Full name" value={addr.name} onChange={set('name')} testId="addr-name" />
                  <Field label="Company" optional value={addr.company} onChange={set('company')} testId="addr-company" />
                  <div className="co-row"><Field label="Email" value={addr.email} onChange={set('email')} testId="addr-email" /><Field label="Phone" value={addr.phone} onChange={set('phone')} testId="addr-phone" /></div>
                  <Field label="Address" value={addr.line1} onChange={set('line1')} placeholder="Start typing to search..." testId="addr-line1" />
                  <Field label="Apt, suite, etc." optional value={addr.line2} onChange={set('line2')} testId="addr-line2" />
                  <div className="co-row"><Field label="City" value={addr.city} onChange={set('city')} testId="addr-city" /><Field label="State" value={addr.state} onChange={set('state')} testId="addr-state" /></div>
                  <div className="co-row"><Field label="ZIP" value={addr.zip} onChange={set('zip')} testId="addr-zip" /><CountrySelect value={addr.country} onChange={set('country')} testId="addr-country" /></div>
                  <div className="co-field"><span>Use address for</span>
                    <div className="co-segment" role="radiogroup">{(['Delivery', 'Invoice', 'Both'] as const).map((o) => <button key={o} type="button" role="radio" aria-checked={useFor === o} className={useFor === o ? 'active' : ''} onClick={() => setUseFor(o)} data-testid={`usefor-${o.toLowerCase()}`}>{o}</button>)}</div>
                  </div>
                  <div className="co-form-foot">
                    {editingIdx === null ? <label className="co-check"><input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} data-testid="save-address" /><span /> Save to my account for next time</label> : <span className="co-note" style={{ margin: 0 }}>Changes apply to this address on your account.</span>}
                    <div className="co-form-actions">
                      <button type="button" className="co-secondary co-secondary--sm" onClick={() => { setAddrMode('saved'); setAddr(blank); setEditingIdx(null); }} data-testid="addr-cancel">Cancel</button>
                      <button type="button" className="co-primary co-primary--sm" onClick={saveNewAddress} data-testid="addr-save">{editingIdx === null ? 'Save address' : 'Save changes'}</button>
                    </div>
                  </div>
                </div>
  );

  return (
    <div className="co" data-testid="checkout-page">
      <div className="co-main">
        <div className="co-top co-top--row">
          <button className="co-back" onClick={() => (step === 3 ? setStep(2) : onBack())} data-testid="checkout-back"><ChevronLeft /> Back</button>
          <ol className="co-steps" data-testid="checkout-steps">
            {[['Cart', 1], ['Shipping', 2], ['Payment', 3]].map(([label, n], i) => (
              <li key={label as string} className={step > (n as number) ? 'done' : step === n ? 'current' : ''}>
                <span className="co-step-dot">{step > (n as number) ? <Check /> : n}</span>
                <span className="co-step-label">{label}</span>
                {i < 2 && <span className="co-step-line" />}
              </li>
            ))}
          </ol>
          <span className="co-stepcount" data-testid="checkout-stepcount">Step {step} of 3 <em>· {step === 2 ? 'Shipping' : 'Payment'}</em></span>
        </div>

        {timer && <div className="co-reserve" data-testid="checkout-reserve"><Clock /> Inventory reserved · <strong>{timer} left</strong></div>}

        {step === 2 && (
          <>
            <section className="co-section">
              <h2>Contact</h2>
              <div className="co-contact" data-testid="checkout-contact"><span className="co-contact-icon"><User /></span><div><strong>Ryan M</strong><span>{saved.email} · {saved.phone}</span></div></div>
            </section>

            <section className="co-section">
              <div className="co-section-head"><h2>Shipping address</h2><span>Choose an address on file or add a new one</span></div>
              <div className="co-address-list" role="radiogroup">
                {addresses.map((a, i) => <div key={a.line1 + i} className={`co-address-slot ${addrMode === 'new' && editingIdx === i ? 'is-editing' : ''}`}><AddressCard a={a} radio selected={addrMode === 'saved' && selectedIdx === i} onSelect={() => { setAddrMode('saved'); setSelectedIdx(i); }} tag={i === 0 ? 'Both' : useFor} onEdit={() => { setAddr(a); setEditingIdx(i); setAddrMode('new'); }} />{addrMode === 'new' && editingIdx === i && addressForm}</div>)}
                <button type="button" className={`co-address co-address--new ${addrMode === 'new' && editingIdx === null ? 'is-selected' : ''}`} onClick={() => { setAddr(blank); setEditingIdx(null); setAddrMode('new'); }} role="radio" aria-checked={addrMode === 'new' && editingIdx === null} data-testid="address-new"><span className="co-radio"><i /></span><strong>+ Add a new address</strong></button>
              {addrMode === 'new' && editingIdx === null && addressForm}
              </div>


            </section>

            <section className="co-section">
              <div className="co-section-head"><h2>Billing address</h2><span>On file for invoices — edits update your account</span></div>
              <label className="co-check"><input type="checkbox" checked={sameBilling} onChange={(e) => setSameBilling(e.target.checked)} data-testid="same-billing" /><span /> Same as shipping address</label>
              {!sameBilling && <AddressCard a={saved} tag="Both" />}
            </section>

            <section className="co-section">
              <h2>Delivery</h2>
              <div className="co-address is-selected is-radio co-delivery" role="radio" aria-checked data-testid="delivery-option"><span className="co-radio"><i /></span><strong>Customer Routed</strong></div>
              <label className="co-check co-check--icon"><input type="checkbox" checked={customWindow} onChange={(e) => setCustomWindow(e.target.checked)} data-testid="custom-window" /><span /><Calendar /> Request a custom ship window</label>
              {customWindow && <input className="co-input" type="date" value={shipWindow} onChange={(e) => setShipWindow(e.target.value)} data-testid="ship-window" />}
            </section>

            <section className="co-section">
              <div className="co-section-head"><h2>Customer PO</h2><span>Optional</span></div>
              <input className="co-input" value={po} onChange={(e) => setPo(e.target.value)} placeholder="PO number / reference" data-testid="po-input" />
            </section>

            {!canContinue && (
              <div className="co-warning" role="alert" data-testid="checkout-issues">
                <strong><AlertTriangle /> Continue to payment is unavailable</strong>
                <span>Resolve the following to continue:</span>
                <ul>{issues.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            )}

            <button className="co-primary" disabled={!canContinue} onClick={() => setStep(3)} data-testid="continue-payment">Continue to payment <ArrowRight /></button>
          </>
        )}

        {step === 3 && (
          <>
            <section className="co-section">
              <h2>Payment</h2>
              <div className="co-terms" data-testid="payment-terms">
                <div><span>Terms</span><strong>50% Prepay, 50% Net 60</strong></div>
                <div><span>Due now</span><strong>{money(cart.total / 2)}</strong></div>
                <div><span>Due 60 days after shipment</span><strong>{money(cart.total / 2)}</strong></div>
              </div>
              <p className="co-note">Your prepayment will be invoiced to {saved.email}. The remaining balance is invoiced on shipment per your account terms.</p>
            </section>
            <section className="co-section">
              <h2>Ship to</h2>
              <AddressCard a={addrMode === 'saved' ? addresses[selectedIdx] : { ...saved, ...addr }} tag={selectedIdx === 0 ? 'Both' : useFor} />
              {po && <p className="co-note">Customer PO: <strong>{po}</strong></p>}
            </section>
            <div className="co-actions">
              <button className="co-secondary" onClick={() => setStep(2)} data-testid="back-shipping"><ChevronLeft /> Back to shipping</button>
              <button className="co-primary" onClick={placeOrder} disabled={cart.count === 0} data-testid="place-order">Place order · {money(cart.total)}</button>
            </div>
          </>
        )}
      </div>

      <aside className="co-summary" data-testid="checkout-summary">
        <ul className="co-lines">
          {cart.lines.map((l) => (
            <li key={l.product.id} data-testid={`co-line-${l.product.id}`}>
              <div className="co-thumb">{l.product.image ? <img src={l.product.image} alt="" /> : <Box />}<b>{l.qty}</b></div>
              <div className="co-line-body">
                <strong>{l.product.name} | Void | One Size</strong>
                <span>{l.product.sku}</span>
                <div className="co-qty">
                  <button onClick={() => cart.remove(l.product.id)} aria-label="Remove" data-testid={`co-remove-${l.product.id}`}><Trash2 /></button>
                  <button onClick={() => cart.setQty(l.product.id, l.qty - 1)} aria-label="Decrease" data-testid={`co-dec-${l.product.id}`}><Minus /></button>
                  <em>{l.qty}</em>
                  <button onClick={() => cart.setQty(l.product.id, l.qty + 1)} aria-label="Increase" data-testid={`co-inc-${l.product.id}`}><Plus /></button>
                </div>
              </div>
              <strong className="co-line-price">{money(l.qty * l.product.price)}</strong>
            </li>
          ))}
          {cart.lines.length === 0 && <li className="co-lines-empty">Your cart is empty.</li>}
        </ul>
        <dl className="co-totals">
          <div><dt>{cart.count} item{cart.count === 1 ? '' : 's'}</dt><dd data-testid="co-subtotal">{money(cart.total)}</dd></div>
          <div><dt>Shipping</dt><dd>Customer Routed</dd></div>
          <div className="grand"><dt>Total <small>USD</small></dt><dd data-testid="co-total">{money(cart.total)}</dd></div>
        </dl>
        <p className="co-secure"><ShieldCheck /> Secure checkout · encrypted end-to-end</p>
      </aside>
    </div>
  );
}
