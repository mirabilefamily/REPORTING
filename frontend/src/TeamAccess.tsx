import { useState } from 'react';
import { Mail, MoreHorizontal, Send, Shield, ShieldCheck, User, UserX } from 'lucide-react';
import { useToast } from '@/lib/toast';
import './team.css';

type Role = 'Admin' | 'Buyer' | 'Finance' | 'Viewer';
type Member = { id: string; name: string; email: string; role: Role; status: 'active' | 'invited' | 'suspended'; last: string; you?: boolean };
const roles: { id: Role; desc: string }[] = [
  { id: 'Admin', desc: 'Full access · manage team, orders, payments' },
  { id: 'Buyer', desc: 'Place orders, pre-books and manage cart' },
  { id: 'Finance', desc: 'View statements, invoices and pay balances' },
  { id: 'Viewer', desc: 'Read-only access to orders and resources' },
];
const seed: Member[] = [
  { id: 'm1', name: 'Ryan M', email: 'ryan.mirabile@me.com', role: 'Admin', status: 'active', last: 'Signed in Jul 1, 2026, 7:03 PM', you: true },
  { id: 'm2', name: 'Dana Ortiz', email: 'dana@mirabiledistro.com', role: 'Buyer', status: 'active', last: 'Signed in Jun 28, 2026, 9:12 AM' },
  { id: 'm3', name: 'Priya Shah', email: 'ap@mirabiledistro.com', role: 'Finance', status: 'invited', last: 'Invited Jun 30, 2026' },
];

export function TeamAccess() {
  const notify = useToast();
  const [members, setMembers] = useState(seed);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('Buyer');
  const [menu, setMenu] = useState<string | null>(null);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const invite = () => {
    if (!valid) { notify('Enter a valid email address', 'error'); return; }
    if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) { notify('That person is already on this account', 'info'); return; }
    setMembers((ms) => [...ms, { id: `m${Date.now()}`, name: name.trim() || email.split('@')[0], email: email.trim(), role, status: 'invited', last: 'Invited just now' }]);
    notify(`Invite sent to ${email}`); setEmail(''); setName('');
  };
  const update = (id: string, patch: Partial<Member>, msg: string) => { setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m))); notify(msg); setMenu(null); };
  const counts = { active: members.filter((m) => m.status === 'active').length, invited: members.filter((m) => m.status === 'invited').length };
  return (
    <div className="tm" data-testid="team-access">
      <div className="tm-summary"><div><strong>{members.length}</strong><span>seats used</span></div><div><strong>{counts.active}</strong><span>active</span></div><div><strong>{counts.invited}</strong><span>pending invites</span></div><div><strong>{roles.length}</strong><span>access levels</span></div></div>
      <section className="tm-card">
        <header><div><h3>Invite a teammate</h3><p>They'll receive an email with instructions to join this account.</p></div></header>
        <form className="tm-invite" onSubmit={(e) => { e.preventDefault(); invite(); }}>
          <label className="co-field"><span>Email address</span><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coworker@company.com" type="email" data-testid="invite-email" /></label>
          <label className="co-field"><span>Name <em>(optional)</em></span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" data-testid="invite-name" /></label>
          <label className="co-field"><span>Access level</span><select className="mk-select tm-select" value={role} onChange={(e) => setRole(e.target.value as Role)} data-testid="invite-role">{roles.map((r) => <option key={r.id}>{r.id}</option>)}</select></label>
          <button type="submit" className="co-primary tm-send" disabled={!valid} data-testid="invite-send"><Send /> Send invite</button>
        </form>
        <p className="tm-roledesc"><ShieldCheck /> <strong>{role}:</strong> {roles.find((r) => r.id === role)!.desc}</p>
      </section>
      <section className="tm-card tm-table-card">
        <header><div><h3>Team members</h3><p>Change access levels or remove people who no longer need access.</p></div></header>
        <div className="dash-table-wrap"><table className="dash-table od-table tm-table">
          <thead><tr><th>User</th><th>Status</th><th>Role</th><th>Last active</th><th /></tr></thead>
          <tbody>{members.map((m) => (
            <tr key={m.id} data-testid={`member-${m.id}`}>
              <td><div className="tm-user"><span className={`tm-avatar ${m.status}`}>{m.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}</span><div><strong>{m.name} {m.you && <em>You</em>}</strong><span>{m.email}</span></div></div></td>
              <td><span className={`dash-pill tone-${m.status === 'active' ? 'green' : m.status === 'invited' ? 'amber' : 'grey'}`}><i />{m.status}</span></td>
              <td>{m.you ? <span className="tm-role-fixed"><Shield /> Admin</span> : <select className="mk-select tm-select tm-select--sm" value={m.role} onChange={(e) => update(m.id, { role: e.target.value as Role }, `${m.name} is now ${e.target.value}`)} data-testid={`role-${m.id}`}>{roles.map((r) => <option key={r.id}>{r.id}</option>)}</select>}</td>
              <td className="muted">{m.last}</td>
              <td className="tm-actions">{!m.you && <>
                <button className="tm-more" onClick={() => setMenu(menu === m.id ? null : m.id)} aria-label="More" data-testid={`more-${m.id}`}><MoreHorizontal /></button>
                {menu === m.id && <div className="tm-menu" data-testid={`menu-${m.id}`}>
                  {m.status === 'invited' && <button onClick={() => update(m.id, {}, `Invite resent to ${m.email}`)}><Mail /> Resend invite</button>}
                  {m.status === 'active' && <button onClick={() => update(m.id, { status: 'suspended' }, `${m.name} suspended`)}><UserX /> Suspend access</button>}
                  {m.status === 'suspended' && <button onClick={() => update(m.id, { status: 'active' }, `${m.name} reactivated`)}><User /> Reactivate</button>}
                  <button className="danger" onClick={() => { setMembers((ms) => ms.filter((x) => x.id !== m.id)); notify(`${m.name} removed`); setMenu(null); }}><UserX /> Remove from account</button>
                </div>}
              </>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
}
