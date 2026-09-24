import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { Notice } from './ui.jsx';
import { useI18n } from '../i18n/index.jsx';

// Trial / grace / read-only notice shown at the top of every page.
let cache = { at: 0, access: null };
const DAY_MS = 24 * 60 * 60 * 1000;

export default function AccessBanner() {
  const { t } = useI18n();
  const [access, setAccess] = useState(cache.access);

  useEffect(() => {
    if (Date.now() - cache.at < 60 * 1000) return;
    api.get('/tenant')
      .then(({ data }) => {
        cache = { at: Date.now(), access: (data.tenant && data.tenant.access) || null };
        setAccess(cache.access);
      })
      .catch(() => {});
  }, []);

  if (!access) return null;
  const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  let type;
  let text;
  if (access.state === 'read_only') {
    type = 'err';
    text = t('access.readOnly');
  } else if (access.state === 'grace') {
    type = 'warn';
    text = t('access.grace', { date: fmt(access.endedAt), n: access.daysLeft });
  } else if (access.state === 'trial' && access.endsAt) {
    const days = Math.ceil((new Date(access.endsAt) - Date.now()) / DAY_MS);
    if (days > 3) return null;
    type = 'warn';
    text = t('access.trialEnding', { n: Math.max(days, 0) });
  } else {
    return null;
  }

  return (
    <Notice type={type}>
      {text} <Link to="/admin/subscription">{t('access.choosePlan')}</Link>
    </Notice>
  );
}
