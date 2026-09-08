import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Mfa from './pages/Mfa.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Sessions from './pages/Sessions.jsx';
import SessionDetail from './pages/SessionDetail.jsx';
import Documents from './pages/Documents.jsx';
import DocumentEditor from './pages/DocumentEditor.jsx';
import Emails from './pages/Emails.jsx';
import Knowledge from './pages/Knowledge.jsx';
import Assistant from './pages/Assistant.jsx';
import Actions from './pages/Actions.jsx';
import Users from './pages/admin/Users.jsx';
import Audit from './pages/admin/Audit.jsx';
import Payments from './pages/admin/Payments.jsx';
import NotFound from './pages/NotFound.jsx';

const P = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-wrap"><span className="spinner" /></div>;
  return user ? P(<Dashboard />) : <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/mfa" element={<Mfa />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={<Home />} />
      <Route path="/sessions" element={P(<Sessions />)} />
      <Route path="/sessions/:id" element={P(<SessionDetail />)} />
      <Route path="/documents" element={P(<Documents />)} />
      <Route path="/documents/:id" element={P(<DocumentEditor />)} />
      <Route path="/emails" element={P(<Emails />)} />
      <Route path="/knowledge" element={P(<Knowledge />)} />
      <Route path="/assistant" element={P(<Assistant />)} />
      <Route path="/actions" element={P(<Actions />)} />

      <Route path="/admin/users" element={P(<Users />)} />
      <Route path="/admin/audit" element={P(<Audit />)} />
      <Route path="/admin/payments" element={P(<Payments />)} />

      <Route path="*" element={P(<NotFound />)} />
    </Routes>
  );
}
