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

type NavItem = { label: string; icon: typeof BarChart2; children?: NavItem[] };

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Analytics',
    items: [
      { label: 'Dashboard', icon: LayoutGrid },
      {
        label: 'Analytics',
        icon: BarChart2,
        children: [
          { label: 'Operational',      icon: BarChart2 },
          { label: 'Custom Reporting', icon: BarChart2 },
        ],
      },
    ],
  },
  {
    title: 'Financials',
    items: [
      { label: 'P&L', icon: DollarSign },
      { label: 'Profitability', icon: PieChartIcon },
      { label: 'Cash Flow', icon: Wallet },
    ],
  },
  {
    title: 'Planning',
    items: [
      { label: 'Forecast Goals', icon: Target },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Open Orders', icon: ClipboardList },
      { label: 'Inventory', icon: Boxes },
    ],
  },
];

const flattenNav = (): NavItem[] => navGroups.flatMap((g) => g.items.flatMap((i) => i.children ? [i, ...i.children] : [i]));
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
  const [flyoutGroup, setFlyoutGroup] = useState<{ label: string; top: number } | null>(null);
  const flyoutCloseTimer = useRef<number | null>(null);
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

  const goto = (label: string) => { setActiveNav(label); setMobileOpen(false); setFlyoutGroup(null); };

  // Close flyout on ESC
  useEffect(() => {
    if (!flyoutGroup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFlyoutGroup(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flyoutGroup]);

  // Close flyout if sidebar expands or user opens mobile drawer
  useEffect(() => {
    if (!sidebarCollapsed || mobileOpen) setFlyoutGroup(null);
  }, [sidebarCollapsed, mobileOpen]);

  const openFlyout = (label: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (flyoutCloseTimer.current !== null) { window.clearTimeout(flyoutCloseTimer.current); flyoutCloseTimer.current = null; }
    setFlyoutGroup({ label, top: rect.top });
  };

  const scheduleFlyoutClose = () => {
    if (flyoutCloseTimer.current !== null) window.clearTimeout(flyoutCloseTimer.current);
    flyoutCloseTimer.current = window.setTimeout(() => setFlyoutGroup(null), 300);
  };

  const cancelFlyoutClose = () => {
    if (flyoutCloseTimer.current !== null) { window.clearTimeout(flyoutCloseTimer.current); flyoutCloseTimer.current = null; }
  };

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
          <img className="brand-logo collapsed-brand-logo" src="/favicon.png?v=10" alt="Goorin" />
        </div>

        <div className="sidebar-scroll">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              {!sidebarCollapsed && <p className="nav-label">{group.title}</p>}
              {group.items.map(({ label, icon: Icon, children }) => {
                if (children && children.length > 0) {
                  const childActive = children.some((c) => c.label === activeNav);
                  const expanded = childActive || activeNav === label;
                  // Collapsed rail: icon opens flyout; never expand inline.
                  if (sidebarCollapsed && !mobileOpen) {
                    return (
                      <button
                        key={label}
                        className={`nav-item ${childActive ? 'parent-active' : ''}`}
                        onClick={(e) => openFlyout(label, e)}
                        title={label}
                        aria-haspopup="menu"
                        aria-expanded={flyoutGroup?.label === label}
                        data-testid={`nav-${navSlug(label)}`}
                      >
                        <Icon size={21} strokeWidth={1.8} />
                        {childActive && <span className="nav-group-dot" aria-hidden="true" />}
                      </button>
                    );
                  }
                  return (
                    <div key={label}>
                      <button
                        className={`nav-item ${childActive ? 'parent-active' : ''}`}
                        onClick={() => goto(childActive ? label : children[0].label)}
                        title={sidebarCollapsed ? label : undefined}
                        aria-expanded={expanded}
                        data-testid={`nav-${navSlug(label)}`}
                      >
                        <Icon size={21} strokeWidth={1.8} />
                        {!sidebarCollapsed && <span>{label}</span>}
                        {!sidebarCollapsed && (
                          <ChevronDown
                            size={14}
                            strokeWidth={2}
                            className="nav-chevron"
                            style={{ marginLeft: 'auto', color: '#9aa09b', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s ease' }}
                          />
                        )}
                      </button>
                      {expanded && !sidebarCollapsed && children.map((c) => (
                        <button
                          key={c.label}
                          className={`nav-item nav-item-child ${activeNav === c.label ? 'active' : ''}`}
                          onClick={() => goto(c.label)}
                          data-testid={`nav-${navSlug(c.label)}`}
                        >
                          <span>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                }
                return (
                  <button
                    className={`nav-item ${activeNav === label ? 'active' : ''}`}
                    key={label}
                    onClick={() => goto(label)}
                    title={sidebarCollapsed ? label : undefined}
                    data-testid={`nav-${navSlug(label)}`}
                  >
                    <Icon size={21} strokeWidth={1.8} />
                    {!sidebarCollapsed && <span>{label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button
            className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`}
            onClick={() => goto('Settings')}
            title={sidebarCollapsed ? 'Settings' : undefined}
            data-testid="nav-settings"
          >
            <Settings size={21} />
            <span className={sidebarCollapsed ? 'sr-only' : ''}>Settings</span>
          </button>
        </div>
        <button className="collapse-button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar"><PanelLeftClose size={16} /></button>
      </aside>

      {/* Collapsed sidebar flyout for expandable groups */}
      {flyoutGroup && sidebarCollapsed && !mobileOpen && (() => {
        const g = navGroups.flatMap((gr) => gr.items).find((it) => it.label === flyoutGroup.label);
        if (!g || !g.children) return null;
        return (
          <>
            <div className="sidebar-flyout-overlay" onClick={() => setFlyoutGroup(null)} aria-hidden="true" />
            <div
              className="sidebar-flyout"
              style={{ top: Math.max(12, flyoutGroup.top) }}
              role="menu"
              aria-label={`${flyoutGroup.label} sub navigation`}
              onMouseEnter={cancelFlyoutClose}
              onMouseLeave={scheduleFlyoutClose}
              data-testid={`sidebar-flyout-${navSlug(flyoutGroup.label)}`}
            >
              <div className="sidebar-flyout-head">
                <span>{flyoutGroup.label}</span>
                <ChevronLeft size={14} strokeWidth={2} style={{ color: '#CBD5E1' }} />
              </div>
              {g.children.map((c) => (
                <button
                  key={c.label}
                  className={`sidebar-flyout-item ${activeNav === c.label ? 'active' : ''}`}
                  onClick={() => goto(c.label)}
                  role="menuitem"
                  autoFocus={activeNav === c.label}
                  data-testid={`sidebar-flyout-item-${navSlug(c.label)}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        );
      })()}

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
              className="ai-assist-btn"
              onClick={() => { /* placeholder — no-op */ }}
              aria-label="AI Assist"
              data-testid="ai-assist-btn"
            >
              <Sparkles size={15} strokeWidth={1.9} style={{ color: '#FF6F61' }} />
              <span>AI Assist</span>
            </button>
            <div className="notification-wrap">
              <button className="icon-button notification-button" onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false); }} aria-label="Notifications" aria-expanded={notificationsOpen} aria-haspopup="dialog" data-testid="notifications-button"><Bell size={17} />{!notificationDismissed && <span className="notification-dot" />}</button>
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
                <div className="user-avatar">RM</div><div className="user-copy"><strong>Ryan M</strong><span>Goorin Bros. · Staff</span></div><ChevronDown className="profile-chevron" size={14} />
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
          {(activeNav === 'Analytics' || activeNav === 'Operational') && <AnalyticsPage />}
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
