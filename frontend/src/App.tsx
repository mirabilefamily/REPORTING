import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BarChart2,
  Bell,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Command,
  DollarSign,
  History,
  KeyRound,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeftClose,
  PieChart as PieChartIcon,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  User,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { Session } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import AuthPage from './AuthPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './DashboardPage';
import MyOrdersPage from './MyOrdersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CustomReportingPage from './pages/CustomReportingPage';
import PnlPage from './pages/PnlPage';
import ProfitabilityPage from './pages/ProfitabilityPage';
import CashFlowPage from './pages/CashFlowPage';
import ForecastGoalsPage from './pages/ForecastGoalsPage';
import InventoryPage from './pages/InventoryPage';
import { navSlug } from '@/lib/nav';

type NavItem = { label: string; icon: typeof BarChart2 };
type NavGroup = { title: string; icon: typeof BarChart2; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: 'Analytics',
    icon: BarChart2,
    items: [
      { label: 'Dashboard',        icon: LayoutGrid },
      { label: 'Analytics',        icon: BarChart2 },
      { label: 'Custom Reporting', icon: Sparkles },
    ],
  },
  {
    title: 'Financials',
    icon: DollarSign,
    items: [
      { label: 'P&L',           icon: DollarSign },
      { label: 'Profitability', icon: PieChartIcon },
      { label: 'Cash Flow',     icon: Wallet },
    ],
  },
  {
    title: 'Planning',
    icon: Target,
    items: [
      { label: 'Forecast Goals', icon: Target },
    ],
  },
  {
    title: 'Operations',
    icon: ClipboardList,
    items: [
      { label: 'Open Orders', icon: ClipboardList },
      { label: 'Inventory',   icon: Boxes },
    ],
  },
];

// Flat collapsed-rail order (not grouped). Separators are visual only.
type RailEntry = { kind: 'item'; label: string; icon: typeof BarChart2 } | { kind: 'sep' };
const RAIL: RailEntry[] = [
  { kind: 'item', label: 'Dashboard',        icon: LayoutGrid },
  { kind: 'item', label: 'Analytics',        icon: BarChart2 },
  { kind: 'item', label: 'Custom Reporting', icon: Sparkles },
  { kind: 'sep' },
  { kind: 'item', label: 'P&L',              icon: DollarSign },
  { kind: 'item', label: 'Profitability',    icon: PieChartIcon },
  { kind: 'item', label: 'Cash Flow',        icon: Wallet },
  { kind: 'sep' },
  { kind: 'item', label: 'Forecast Goals',   icon: Target },
  { kind: 'sep' },
  { kind: 'item', label: 'Open Orders',      icon: ClipboardList },
  { kind: 'item', label: 'Inventory',        icon: Boxes },
];

const flattenNav = (): NavItem[] => navGroups.flatMap((g) => g.items);
const allLabels = () => flattenNav().map((i) => i.label);

function App() {
  return <StaffApp />;
}

function StaffApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuest] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [activeNav, setActiveNav] = useState<string>(() => {
    const labels = allLabels();
    const fromHash = labels.find((l) => `#${navSlug(l)}` === window.location.hash);
    if (fromHash) return fromHash;
    if (window.location.hash === '#settings') return 'Settings';
    return 'Dashboard';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.querySelector('.page-content')?.scrollTo({ top: 0 });
    const slug = activeNav === 'Settings' ? 'settings' : navSlug(activeNav);
    if (window.history.state?.nav !== activeNav) {
      const stale = window.history.state?.sub;
      window.history[stale ? 'replaceState' : 'pushState']({ nav: activeNav }, '', `#${slug}`);
    }
  }, [activeNav]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => { if (e.state?.nav) setActiveNav(e.state.nav); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const goto = (label: string) => { setActiveNav(label); setMobileOpen(false); };

  const ActiveIcon = useMemo(() => {
    if (activeNav === 'Settings') return Settings;
    const all = flattenNav();
    return (all.find((i) => i.label === activeNav) ?? all[0]).icon;
  }, [activeNav]);

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setAuthReady(true);
      }).catch(() => setAuthReady(true));
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });
      return () => sub.subscription.unsubscribe();
    } catch {
      setAuthReady(true);
    }
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setGuest(false);
    setUserMenuOpen(false);
  };

  if (!authReady) return null;
  if (!session && !guest) return <AuthPage />;

  const isPlaceholder = false;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`} data-testid="sidebar">
        <div
          className="brand-lockup"
          onClick={sidebarCollapsed ? () => setSidebarCollapsed(false) : undefined}
          role={sidebarCollapsed ? 'button' : undefined}
          tabIndex={sidebarCollapsed ? 0 : undefined}
          onKeyDown={sidebarCollapsed ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSidebarCollapsed(false); } } : undefined}
          style={sidebarCollapsed ? { cursor: 'pointer' } : undefined}
          data-testid="brand-lockup"
        >
          <img className="brand-logo expanded-brand-logo brand-logo-image" src="/goorin_reporting_logo.png?v=8" alt="Goorin REPORTING" />
          <img className="brand-logo collapsed-brand-logo" src="/favicon.png?v=12" alt="Goorin" />
        </div>

        <div className="sidebar-scroll">
          {sidebarCollapsed && !mobileOpen ? (
            // ── Collapsed rail: FLAT list, every page icon visible, thin separators ──
            RAIL.map((entry, i) => {
              if (entry.kind === 'sep') return <div key={`sep-${i}`} className="rail-separator" aria-hidden="true" />;
              const Icon = entry.icon;
              const active = activeNav === entry.label;
              return (
                <button
                  key={entry.label}
                  className={`nav-item nav-item-rail ${active ? 'active' : ''}`}
                  onClick={() => goto(entry.label)}
                  data-tooltip={entry.label}
                  data-testid={`nav-${navSlug(entry.label)}`}
                >
                  <Icon size={20} strokeWidth={1.8} />
                </button>
              );
            })
          ) : (
            // ── Expanded sidebar / mobile drawer: labelled group with items ──
            navGroups.map((group) => (
              <div className="nav-group" key={group.title}>
                <p className="nav-label">{group.title}</p>
                {group.items.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    className={`nav-item ${activeNav === label ? 'active' : ''}`}
                    onClick={() => goto(label)}
                    data-testid={`nav-${navSlug(label)}`}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button
            className={`nav-item ${sidebarCollapsed ? 'nav-item-rail' : ''} ${activeNav === 'Settings' ? 'active' : ''}`}
            onClick={() => goto('Settings')}
            data-tooltip={sidebarCollapsed ? 'Settings' : undefined}
            data-testid="nav-settings"
          >
            <Settings size={sidebarCollapsed ? 20 : 16} strokeWidth={1.75} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
        </div>
        <button className="collapse-button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar"><PanelLeftClose size={16} /></button>
      </aside>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      <main className={`main-content ${sidebarCollapsed ? 'main-collapsed' : ''}`}>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="breadcrumb"><ActiveIcon size={17} /><strong>{activeNav}</strong></div>
          <div className="search-wrap" style={{ maxWidth: 480 }}>
            <div className="search-bar">
              <Search size={14} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search accounts, items, orders…"
                aria-label="Search"
                data-testid="topbar-search-input"
              />
            </div>
          </div>
          <div className="top-actions">
            <button
              className="btn-ai"
              onClick={() => { /* placeholder — no-op */ }}
              aria-label="AI Assist"
              data-testid="ai-assist-btn"
            >
              <Sparkles size={14} strokeWidth={1.9} />
              <span>AI Assist</span>
            </button>
            <div className="notification-wrap">
              <button className="notification-button" onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false); }} aria-label="Notifications" aria-expanded={notificationsOpen} aria-haspopup="dialog" data-testid="notifications-button"><Bell />{!notificationDismissed && <span className="notification-dot" />}</button>
              {notificationsOpen && (
                <div className="notification-popover" role="dialog" aria-label="Notifications">
                  <div className="notification-header">
                    <strong>Notifications</strong>
                    <div className="notification-header-actions">
                      <button className="notification-clear" onClick={() => setNotificationDismissed(true)}>Clear all</button>
                      <span className="notification-count">{notificationDismissed ? 0 : 1}</span>
                    </div>
                  </div>
                  {!notificationDismissed ? (
                    <div className="notification-list">
                      <div className="notification-item">
                        <span className="notification-status" />
                        <div className="notification-copy">
                          <div className="notification-title-row"><strong>September close ready to review</strong><time>12 min ago</time></div>
                          <p>P&amp;L, cash flow and inventory reports have been refreshed.</p>
                          <div className="notification-actions">
                            <button onClick={() => { goto('P&L'); setNotificationsOpen(false); }}>View P&amp;L <ArrowUpRight size={13} /></button>
                            <button onClick={() => setNotificationDismissed(true)}>Dismiss</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="notification-empty"><CheckCircle2 size={20} /><strong>All caught up</strong><p>There are no new notifications.</p></div>
                  )}
                </div>
              )}
            </div>
            <span className="top-divider" aria-hidden="true" />
            <div className="profile-menu-wrap">
              <button className={`user-profile ${userMenuOpen ? 'profile-open' : ''}`} onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false); }} aria-expanded={userMenuOpen} aria-haspopup="menu" data-testid="profile-button">
                <div className="user-avatar">RM</div><div className="user-copy"><strong>Ryan M</strong><span>Admin</span></div><ChevronDown className="profile-chevron" size={14} />
              </button>
              {userMenuOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-account">
                    <div className="profile-account-top"><div className="user-avatar profile-account-avatar">RM</div><div><strong>Ryan Mirabile</strong><span>ryan@goorin.com</span></div></div>
                    <dl className="profile-account-meta">
                      <div><dt>Role</dt><dd>Sales Operations · Admin</dd></div>
                      <div><dt>Team</dt><dd>Wholesale · Goorin Bros.</dd></div>
                    </dl>
                  </div>
                  <div className="profile-menu-section">
                    <button className="profile-menu-item" role="menuitem"><UserPlus size={21} /><span>Invite users</span></button>
                    <button className="profile-menu-item" role="menuitem" onClick={() => { goto('Settings'); setUserMenuOpen(false); }}><Shield size={21} /><span>Access &amp; permissions</span></button>
                    <button className="profile-menu-item" role="menuitem" onClick={() => { goto('Settings'); setUserMenuOpen(false); }}><Settings size={21} /><span>Workspace settings</span></button>
                  </div>
                  <div className="profile-menu-section">
                    <button className="profile-menu-item" role="menuitem" onClick={() => { goto('Settings'); setUserMenuOpen(false); }}><User size={21} /><span>Account settings</span></button>
                    <button className="profile-menu-item" role="menuitem"><KeyRound size={21} /><span>Change password</span></button>
                    <button className="profile-menu-item logout-item" role="menuitem" onClick={handleSignOut}><LogOut size={21} /><span>Log out</span></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          {activeNav === 'Dashboard' && <DashboardPage name="Ryan" onNavigate={goto} />}
          {activeNav === 'Analytics' && <AnalyticsPage />}
          {activeNav === 'Custom Reporting' && <CustomReportingPage />}
          {activeNav === 'Open Orders' && <MyOrdersPage />}
          {activeNav === 'P&L' && <PnlPage />}
          {activeNav === 'Profitability' && <ProfitabilityPage />}
          {activeNav === 'Cash Flow' && <CashFlowPage />}
          {activeNav === 'Forecast Goals' && <ForecastGoalsPage />}
          {activeNav === 'Inventory' && <InventoryPage />}
          {activeNav === 'Settings' && <SettingsPage />}
          {isPlaceholder && (
            <div className="page-heading" data-testid="placeholder-page">
              <div><h1>{activeNav}</h1><p>This section is coming soon.</p></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
