import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/workflows', label: 'Workflows', icon: FlowIcon },
  { to: '/test-console', label: 'Test Console', icon: BoltIcon },
  { to: '/logs', label: 'Execution Logs', icon: LogIcon },
  { to: '/ai-assistant', label: 'AI Assistant', icon: SparkIcon },
  { to: '/api-keys', label: 'API Keys', icon: KeyIcon },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          background: 'var(--ink-900)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          padding: '18px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 22px' }}>
          <svg width="26" height="26" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="#141b29" />
            <circle cx="8" cy="10" r="3" fill="#37C6C0" />
            <circle cx="8" cy="22" r="3" fill="#37C6C0" />
            <circle cx="24" cy="16" r="3" fill="#F5A623" />
            <path d="M11 10H16C18 10 18 16 21 16" stroke="#5B7BFA" strokeWidth="1.6" fill="none" />
            <path d="M11 22H16C18 22 18 16 21 16" stroke="#5B7BFA" strokeWidth="1.6" fill="none" />
          </svg>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>Flowbase</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-low)', marginTop: 2 }}>Orchestration Engine</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--text-hi)' : 'var(--text-mid)',
                background: isActive ? 'var(--ink-800)' : 'transparent',
              })}
            >
              <Icon /> {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-mid)', padding: '0 10px 8px' }}>{user?.email}</div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', background: 'var(--ink-950)' }}>
        <Outlet />
      </main>
    </div>
  );
}

function iconProps() {
  return { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
}
function DashboardIcon() { return <svg {...iconProps()}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>; }
function FlowIcon() { return <svg {...iconProps()}><circle cx="5" cy="6" r="2.3"/><circle cx="5" cy="18" r="2.3"/><circle cx="19" cy="12" r="2.3"/><path d="M7 6h5c2 0 2 6 5 6M7 18h5c2 0 2-6 5-6"/></svg>; }
function BoltIcon() { return <svg {...iconProps()}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>; }
function LogIcon() { return <svg {...iconProps()}><path d="M4 4h16v4H4zM4 10h10v4H4zM4 16h16v4H4z"/></svg>; }
function SparkIcon() { return <svg {...iconProps()}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>; }
function KeyIcon() { return <svg {...iconProps()}><circle cx="8" cy="15" r="4"/><path d="M11 12 20 3M16 8l3 3M13 11l2.5 2.5"/></svg>; }
