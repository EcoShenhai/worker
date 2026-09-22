import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, atLeast } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import Logo from './Logo.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleKey = `roles.${user?.role}`;
  const roleLabel = user?.role ? (t(roleKey) === roleKey ? user.role : t(roleKey)) : '';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}><Logo size={28} /><div className="wordmark">Worker</div></div>
          <div className="sub">{t('brand.tagline')}</div>
        </div>
        <nav className="nav">
          <NavLink to="/" end>{t('nav.dashboard')}</NavLink>

          <div className="group-label">{t('nav.workspace')}</div>
          <NavLink to="/sessions">{t('nav.sessions')}</NavLink>
          <NavLink to="/documents">{t('nav.documents')}</NavLink>
          <NavLink to="/emails">{t('nav.correspondence')}</NavLink>
          <NavLink to="/knowledge">{t('nav.knowledge')}</NavLink>

          <div className="group-label">{t('nav.assistant')}</div>
          <NavLink to="/assistant">{t('nav.askWorker')}</NavLink>
          <NavLink to="/actions">{t('nav.actions')}</NavLink>

          {atLeast(user?.role, 'admin') && (
            <>
              <div className="group-label">{t('nav.administration')}</div>
              <NavLink to="/admin/tenant">{t('nav.organisation')}</NavLink>
              <NavLink to="/admin/users">{t('nav.users')}</NavLink>
              <NavLink to="/admin/audit">{t('nav.audit')}</NavLink>
              <NavLink to="/admin/subscription">{t('nav.subscription')}</NavLink>
              <NavLink to="/admin/payments">{t('nav.payments')}</NavLink>
              <NavLink to="/admin/billing">{t('nav.billing')}</NavLink>
            </>
          )}
        </nav>
        <div className="foot">
          <div className="name">{user?.name}</div>
          <div className="muted" style={{ fontSize: '0.72rem' }}>{roleLabel}</div>
          <button className="btn secondary sm block" onClick={doLogout}>{t('common.signOut')}</button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <span className="crumb">{t('brand.secureWorkspace')}</span>
          <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <LanguageSwitcher />
            <span className="badge green">{t('brand.badge')}</span>
          </span>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
