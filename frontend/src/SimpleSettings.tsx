import { useState } from 'react';
import { useToast } from '@/lib/toast';
import './team.css';

type Item = { id: string; label: string; hint: string; on: boolean };
const company: { title: string; desc: string; items: Item[] }[] = [
  { title: 'Ordering', desc: 'Defaults applied to new orders and pre-books.', items: [
    { id: 'po', label: 'Require a PO number on every order', hint: 'Checkout will not continue without a purchase-order reference.', on: false },
    { id: 'ship', label: 'Default to Customer Routed shipping', hint: 'Pre-selects your freight forwarder on new orders.', on: true },
    { id: 'reorder', label: 'Allow re-ordering from past orders', hint: 'Shows the Re-order button on order details.', on: true } ] },
  { title: 'Documents', desc: 'What we attach and how it is delivered.', items: [
    { id: 'coo', label: 'Certificate of Origin on international shipments', hint: 'Generated automatically for every new shipment.', on: true },
    { id: 'inv', label: 'Email invoices as PDF', hint: 'Sent to ap@mirabiledistro.com when an invoice is issued.', on: true } ] },
];
const notifications: { title: string; desc: string; items: Item[] }[] = [
  { title: 'Orders & shipments', desc: 'Email alerts for order activity.', items: [
    { id: 'confirm', label: 'Order confirmed', hint: 'When a sales order is accepted.', on: true },
    { id: 'shipped', label: 'Shipment released or shipped', hint: 'Includes tracking and shipping documents.', on: true },
    { id: 'chat', label: 'New shipment message', hint: 'Replies from the Goorin Bros. team.', on: true } ] },
  { title: 'Billing & pre-book', desc: 'Money and deadline reminders.', items: [
    { id: 'due', label: 'Invoice due in 7 days', hint: 'Reminder before Net 60 balances are due.', on: true },
    { id: 'prebook', label: 'Pre-book deadline approaching', hint: '3 days before a drop closes.', on: true },
    { id: 'digest', label: 'Weekly account digest', hint: 'Monday summary of orders, balances and drops.', on: false } ] },
];

export function SimpleSettings({ section }: { section: 'company' | 'notifications' }) {
  const notify = useToast();
  const groups = section === 'company' ? company : notifications;
  const [state, setState] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.flatMap((g) => g.items.map((i) => [i.id, i.on]))));
  const toggle = (i: Item) => { const v = !state[i.id]; setState({ ...state, [i.id]: v }); notify(`${i.label} ${v ? 'on' : 'off'}`); };
  return (
    <div className="tm" data-testid={`settings-${section}`}>
      {groups.map((g) => (
        <section key={g.title} className="tm-card ss-card">
          <header><div><h3>{g.title}</h3><p>{g.desc}</p></div></header>
          <ul className="ss-list">{g.items.map((i) => (
            <li key={i.id}><div><strong>{i.label}</strong><span>{i.hint}</span></div><button role="switch" aria-checked={state[i.id]} className={`sh-switch ${state[i.id] ? 'on' : ''}`} onClick={() => toggle(i)} data-testid={`toggle-${i.id}`}><i /></button></li>
          ))}</ul>
        </section>
      ))}
    </div>
  );
}
