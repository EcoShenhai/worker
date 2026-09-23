// EcoID access token -> Worker session (same tokens as the emailed-code login), or link to the signed-in account.
import api, { setToken, setSession } from '../api/client.js';

export const ECOID_PENDING_KEY = 'ecoid_pending_token';
export const errMsg = (e, fallback = 'Sign-in failed.') =>
  e?.response?.data?.error?.message || e?.response?.data?.message || (e?.message && !/^Request failed/.test(e.message) ? e.message : '') || fallback;

export async function completeEcoId(ecoidToken, { intent, setUser, navigate }) {
  if (intent === 'link') {
    await api.post('/auth/ecoid/link', { ecoidToken });
    navigate('/account/ecoid', { replace: true, state: { flash: 'Your EcoID is now linked. Next time you can sign in with EcoID.' } });
    return;
  }
  const { data } = await api.post('/auth/ecoid/exchange', { ecoidToken });
  if (data.accessToken) {
    setSession(data);
    setUser(data.user);
    navigate(data.user?.requiresPasswordChange ? '/change-password' : '/', { replace: true });
    return;
  }
  if (data.needsOnboarding) {
    sessionStorage.setItem(ECOID_PENDING_KEY, ecoidToken);
    navigate('/auth/ecoid/register', { replace: true, state: { email: data.email, name: data.name } });
    return;
  }
  throw new Error('Unexpected response from sign-in.');
}
