import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, atLeast } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}><Logo size={28} /><div className="wordmark">Worker</div></div>
          <div className="sub">AI administrative workspace</div>
        </div>
        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>

          <div className="group-label">Workspace</div>
          <NavLink to="/sessions">Sessions &amp; Recordings</NavLink>
          <NavLink to="/documents">Documents</NavLink>
          <NavLink to="/emails">Correspondence</NavLink>
          <NavLink to="/knowledge">Knowledge Base</NavLink>

          <div className="group-label">Assistant</div>
          <NavLink to="/assistant">Ask Worker</NavLink>
          <NavLink to="/actions">Outstanding Actions</NavLink>

          {atLeast(user?.role, 'admin') && (
            <>
              <div className="group-label">Administration</div>
              <NavLink to="/admin/tenant">Organisation</NavLink>
              <NavLink to="/admin/users">Users</NavLink>
              <NavLink to="/admin/audit">Audit Trail</NavLink>
              <NavLink to="/admin/payments">Payments</NavLink>
            </>
          )}
        </nav>
        <div className="foot">
          <div className="name">{user?.name}</div>
          <div className="muted" style={{ fontSize: '0.72rem' }}>{user?.role}</div>
          <button className="btn secondary sm block" onClick={doLogout}>Sign out</button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <span className="crumb">Secure administrative workspace</span>
          <span style={{ marginLeft: 'auto' }} className="badge green">English · Audio</span>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
