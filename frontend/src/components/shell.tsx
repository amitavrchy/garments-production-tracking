'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, ReactNode } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Shirt,
  Scissors,
  ChartNoAxesCombined,
  ShieldCheck,
  PackageCheck,
  Truck,
  Wallet,
  Boxes,
  Users,
  Settings,
  Layers3,
  ChevronDown,
  Search,
  Bell,
  Menu,
  LogOut,
  X,
  ArrowUpRight,
  CalendarRange,
  Factory,
  Command,
} from 'lucide-react';
import { useSession } from './providers';
import { Login } from './login';
import { Loading, Modal, Empty } from './primitives';
import { title } from '@/lib/types';
import { api } from '@/lib/api';
import { OfflineOutbox } from './offline-outbox';
const groups = [
  {
    label: 'WORKSPACE',
    items: [
      ['/workspace', 'Overview', LayoutDashboard],
      ['/control-tower', 'Control tower', ActivityIcon],
      ['/approvals', 'Approval desk', ShieldCheck],
      ['/orders', 'Buyer orders', ShoppingBag],
      ['/styles', 'Style library', Shirt],
      ['/planning', 'Planning', CalendarRange],
    ],
  },
  {
    label: 'PRODUCTION',
    items: [
      ['/cutting', 'Cutting room', Scissors],
      ['/production', 'Hourly production', ChartNoAxesCombined],
      ['/quality', 'Quality control', ShieldCheck],
      ['/finishing', 'Finishing & packing', PackageCheck],
      ['/shipments', 'Shipments', Truck],
    ],
  },
  {
    label: 'ADVANCED OPERATIONS',
    items: [
      ['/capacity', 'Capacity & balancing', CalendarRange],
      ['/procurement', 'Procurement', ShoppingBag],
      ['/warehouse', 'Warehouse & fabric', Boxes],
      ['/traceability', 'Bundle traceability', Layers3],
      ['/equipment', 'Equipment & losses', Factory],
      ['/workforce', 'Workforce intelligence', Users],
      ['/assurance', 'Quality assurance', ShieldCheck],
      ['/commercial', 'Costing & subcontracting', Wallet],
      ['/governance', 'Compliance & impact', PackageCheck],
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      ['/inventory', 'Materials & store', Boxes],
      ['/payroll', 'Payroll', Wallet],
      ['/team', 'People & floor', Users],
      ['/reports', 'Reports & insights', ChartNoAxesCombined],
    ],
  },
] as const;
function ActivityIcon({ size = 19 }: { size?: number }) {
  return <ChartNoAxesCombined size={size} />;
}
export function Shell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useSession(),
    path = usePathname(),
    router = useRouter();
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(''),
    [alerts, setAlerts] = useState<any[] | null>(null),
    [alertError, setAlertError] = useState(''),
    [signoutError, setSignoutError] = useState('');
  const [results, setResults] = useState<
      { id: string; title: string; kind: string; href: string }[]
    >([]),
    [factoryName, setFactoryName] = useState('Factory workspace');
  useEffect(() => {
    if (!user) return;
    void api('/data/factories')
      .then((rows) => setFactoryName(rows[0]?.name || 'Factory workspace'))
      .catch(() => {});
  }, [user]);
  useEffect(() => {
    if (!search || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      void api(`/search?q=${encodeURIComponent(query)}`)
        .then((r) => {
          if (active) setResults(r);
        })
        .catch(() => {
          if (active) setResults([]);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search, query]);
  useEffect(() => {
    setMobile(false);
  }, [path]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
  if (loading) return <Loading />;
  if (!user) return <Login />;
  const nav = groups.flatMap((g) => [...g.items]);
  const current =
    nav.find(([href]) => href === path)?.[1] || (path === '/settings' ? 'Settings' : 'Workspace');
  const notify = async () => {
    setAlerts([]);
    setAlertError('');
    try {
      const data = await api('/reports/overview');
      setAlerts(data.alerts);
    } catch (e) {
      setAlertError(e instanceof Error ? e.message : 'Could not load alerts');
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobile && <div className="sidebar-backdrop" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <Link className="brand" href="/workspace">
          <span className="brand-mark">
            <Layers3 size={24} />
          </span>
          loom<span className="brand-period">.</span>
        </Link>
        <div className="factory-switch">
          <span className="factory-icon">
            <Factory size={20} />
          </span>
          <div>
            <strong>{factoryName}</strong>
            <span>Production workspace</span>
          </div>
        </div>
        <nav>
          {groups.map((g) => (
            <div className="nav-group" key={g.label}>
              <span className="nav-label">{g.label}</span>
              {g.items
                .filter(
                  ([href]) =>
                    href !== '/payroll' ||
                    ['FACTORY_ADMIN', 'ACCOUNTS', 'IE', 'SUPERVISOR'].includes(user.role),
                )
                .map(([href, label, Icon]) => (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-item ${path === href ? 'active' : ''}`}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                    {path === href && <i />}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="shift-card">
            <span className="status-dot" />
            <strong>Day shift</strong>
            <span>08:00 – 17:00 · Dhaka</span>
          </div>
          <Link className={`nav-item ${path === '/settings' ? 'active' : ''}`} href="/settings">
            <Settings size={19} />
            Settings
          </Link>
          <div className="profile">
            <div className="avatar">
              {user.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <strong>{user.name}</strong>
              <span>{title(user.role)}</span>
            </div>
            <button
              aria-label="Sign out"
              className="icon-button"
              onClick={async () => {
                try {
                  await logout();
                } catch {
                  setSignoutError('Could not sign out. Please try again.');
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
          {signoutError && (
            <p className="sidebar-error" role="alert">
              {signoutError}
            </p>
          )}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <button className="search-trigger" onClick={() => setSearch(true)}>
              <Search size={17} />
              <span>Go to workspace…</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="notification-button icon-button"
              aria-label="View notifications"
              onClick={notify}
            >
              <Bell size={20} />
              <i />
            </button>
            <div className="avatar small">{user.name[0]}</div>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <OfflineOutbox />
        <footer className="app-footer">
          <span>Loom · Garments production workspace</span>
          <span>Asia/Dhaka · All quantities in pieces</span>
        </footer>
      </div>
      {search && (
        <Modal
          title="Go to workspace"
          subtitle="Find a module. Press Escape to close."
          onClose={() => setSearch(false)}
        >
          <div className="search-modal">
            <div className="search-input">
              <Search size={20} />
              <input
                autoFocus
                placeholder="Search orders, production, payroll…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="command-results">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    router.push(result.href);
                    setSearch(false);
                    setQuery('');
                  }}
                >
                  <Search size={19} />
                  <span>
                    {result.title}
                    <small className="cell-secondary">{result.kind}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
              {nav
                .filter(([, label]) => label.toLowerCase().includes(query.toLowerCase()))
                .map(([href, label, Icon]) => (
                  <button
                    key={href}
                    onClick={() => {
                      router.push(href);
                      setSearch(false);
                      setQuery('');
                    }}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
            </div>
          </div>
        </Modal>
      )}
      {alerts !== null && (
        <Modal
          title="Factory notifications"
          subtitle="Delivery risks and time & action milestones."
          onClose={() => setAlerts(null)}
        >
          <div className="notifications">
            {alertError ? (
              <p role="alert">{alertError}</p>
            ) : alerts.length ? (
              alerts.map((a, i) => (
                <Link key={i} href="/orders" onClick={() => setAlerts(null)}>
                  <span className="alert-icon">
                    <Bell size={18} />
                  </span>
                  <div>
                    <strong>{a.title}</strong>
                    <p>{a.detail}</p>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))
            ) : (
              <Empty
                title="All clear"
                description="No overdue milestones or delivery risks right now."
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
