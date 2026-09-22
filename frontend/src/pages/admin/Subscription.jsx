import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, StatusBadge, Notice } from '../../components/ui.jsx';
import { useI18n } from '../../i18n/index.jsx';

// Plan id -> landing.pricing.* translation key (ids are backend values; never change them).
const PLAN_KEY = { starter: 'starter', professional: 'professional', business: 'premium' };

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 10,
    description: 'For small teams getting started with AI-assisted administrative work.',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 20,
    description: 'For organizations with regular, high-volume document production.',
    popular: true,
  },
  {
    id: 'business',
    name: 'Premium',
    price: 50,
    description: 'For larger organizations with substantial administrative workloads.',
  },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function daysRemaining(value) {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function Subscription() {
  const { t } = useI18n();
  const planName = (id) => (PLAN_KEY[id] ? t(`landing.pricing.${PLAN_KEY[id]}.name`) : id);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [selected, setSelected] = useState(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tenant');
      setTenant(data.tenant);
      setSelected(data.tenant?.subscriptionPlan || null);
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('subscription.loadFailed') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const payWithMpesa = async (e) => {
    e.preventDefault();
    if (selected === null) {
      setMsg({ type: 'err', text: t('subscription.selectFirst') });
      return;
    }
    setBusy('mpesa');
    setMsg(null);
    try {
      await api.post('/payments/subscription/mpesa/initiate', { phone });
      setMsg({ type: 'ok', text: t('subscription.mpesaSent') });
      setPhone('');
      await load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('subscription.mpesaFailed') });
    } finally {
      setBusy('');
    }
  };

  const payWithPaypal = async () => {
    if (selected === null) {
      setMsg({ type: 'err', text: t('subscription.selectFirst') });
      return;
    }
    setBusy('paypal');
    setMsg(null);
    try {
      const { data } = await api.post('/payments/subscription/paypal/create');
      if (!data.approveUrl) throw new Error(t('subscription.noApproveUrl'));
      window.location.href = data.approveUrl;
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || e.message || t('subscription.paypalFailed') });
      setBusy('');
    }
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;

  if (!tenant) {
    return (
      <>
        <PageHead title={t('nav.subscription')} subtitle={t('subscription.subtitleShort')} />
        <div className="card">
          <div className="card-body">
            <p className="muted">{t('tenant.noOrg')}</p>
          </div>
        </div>
      </>
    );
  }

  const trialDays = daysRemaining(tenant.trialEndsAt);

  return (
    <>
      <PageHead
        title={t('nav.subscription')}
        subtitle={t('subscription.subtitle')}
      />

      {msg && <Notice type={msg.type}>{msg.text}</Notice>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-head">
          <h3>{t('subscription.current')}</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
            <div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>{t('subscription.organisation')}</div>
              <strong>{tenant.name}</strong>
            </div>

            <div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>{t('subscription.status')}</div>
              <StatusBadge value={tenant.subscriptionStatus} />
            </div>

            <div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>{t('subscription.plan')}</div>
              <strong>{tenant.subscriptionPlan ? planName(tenant.subscriptionPlan) : t('subscription.freeTrial')}</strong>
            </div>

            {tenant.subscriptionStatus === 'trialing' && tenant.trialEndsAt && (
              <div>
                <div className="muted" style={{ fontSize: '0.78rem' }}>{t('subscription.trialEnds')}</div>
                <strong>{formatDate(tenant.trialEndsAt)}</strong>
                <div className="muted" style={{ fontSize: '0.78rem' }}>
                  {t(trialDays === 1 ? 'subscription.dayRemaining' : 'subscription.daysRemaining', { n: trialDays })}
                </div>
              </div>
            )}

            {tenant.subscriptionStatus === 'active' && tenant.subscriptionEndsAt && (
              <div>
                <div className="muted" style={{ fontSize: '0.78rem' }}>{t('subscription.renewsEnds')}</div>
                <strong>{formatDate(tenant.subscriptionEndsAt)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      <PageHead
        title={t('subscription.chooseTitle')}
        subtitle={t('subscription.chooseSubtitle')}
      />

      <div className="grid cols-3">
        {PLANS.map((plan) => (
          <div
            className="card"
            key={plan.id}
            style={{
              border: selected === plan.id ? '2px solid currentColor' : undefined,
              position: 'relative',
            }}
          >
            {plan.popular && (
              <div style={{ position: 'absolute', top: '-0.7rem', right: '1rem' }}>
                <span className="badge green">{t('landing.pricing.mostPopular')}</span>
              </div>
            )}

            <div className="card-head">
              <h3>{planName(plan.id)}</h3>
            </div>

            <div className="card-body">
              <div style={{ marginBottom: '0.7rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 700 }}>${plan.price}</span>
                <span className="muted"> {t('subscription.perMonth')}</span>
              </div>

              <p className="muted" style={{ minHeight: '3.5rem' }}>
                {PLAN_KEY[plan.id] ? t(`landing.pricing.${PLAN_KEY[plan.id]}.desc`) : plan.description}
              </p>

              <button
                className={selected === plan.id ? 'btn' : 'btn secondary'}
                onClick={async () => {
                  setMsg(null);
                  try {
                    await api.post("/tenant/subscription", { plan: plan.id });
                    setSelected(plan.id);
                    await load();
                    setMsg({ type: "ok", text: t('subscription.planSelected', { plan: planName(plan.id) }) });
                  } catch (e) {
                    setMsg({ type: "err", text: e.response?.data?.message || t('subscription.selectFailed') });
                  }
                }}
              >
                {selected === plan.id ? t('subscription.selected') : t('subscription.selectPlan')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-head">
          <h3>{t('subscription.activateTitle')}</h3>
        </div>
        <div className="card-body">
          {!selected ? (
            <p className="muted" style={{ margin: 0 }}>
              {t('subscription.selectAbove')}
            </p>
          ) : (
            <div className="grid cols-2">
              <div>
                <h4>M-Pesa</h4>
                <p className="muted">
                  {t('subscription.stkNote')}
                </p>
                <form onSubmit={payWithMpesa}>
                  <div className="field">
                    <label>{t('subscription.phone')}</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('subscription.phonePlaceholder')}
                      required
                    />
                  </div>
                  <button className="btn" disabled={busy === 'mpesa'}>
                    {busy === 'mpesa' ? <span className="spinner" /> : t('subscription.payMpesa')}
                  </button>
                </form>
              </div>

              <div>
                <h4>PayPal</h4>
                <p className="muted">
                  {t('subscription.paypalNote')}
                </p>
                <button
                  className="btn secondary"
                  onClick={payWithPaypal}
                  disabled={busy === 'paypal'}
                >
                  {busy === 'paypal' ? <span className="spinner" /> : t('subscription.payPaypal')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-head">
          <h3>{t('nav.billing')}</h3>
        </div>
        <div className="card-body">
          <p style={{ marginTop: 0 }}>
            {t('subscription.settleNote')}
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            {t('subscription.activationNote')}
            {t('subscription.historyNote')}
          </p>
        </div>
      </div>
    </>
  );
}
