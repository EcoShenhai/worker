import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, StatusBadge, Notice } from '../../components/ui.jsx';

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
      setMsg({ type: 'err', text: e.response?.data?.message || 'Could not load subscription.' });
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
      setMsg({ type: 'err', text: 'Select a subscription plan first.' });
      return;
    }
    setBusy('mpesa');
    setMsg(null);
    try {
      await api.post('/payments/subscription/mpesa/initiate', { phone });
      setMsg({ type: 'ok', text: 'M-Pesa STK push sent. Approve the payment on your phone. Your subscription will activate after payment confirmation.' });
      setPhone('');
      await load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Could not initiate M-Pesa payment.' });
    } finally {
      setBusy('');
    }
  };

  const payWithPaypal = async () => {
    if (selected === null) {
      setMsg({ type: 'err', text: 'Select a subscription plan first.' });
      return;
    }
    setBusy('paypal');
    setMsg(null);
    try {
      const { data } = await api.post('/payments/subscription/paypal/create');
      if (!data.approveUrl) throw new Error('PayPal approval URL was not returned.');
      window.location.href = data.approveUrl;
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || e.message || 'Could not start PayPal payment.' });
      setBusy('');
    }
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;

  if (!tenant) {
    return (
      <>
        <PageHead title="Subscription" subtitle="Manage your Worker subscription." />
        <div className="card">
          <div className="card-body">
            <p className="muted">This account is not associated with an organisation.</p>
          </div>
        </div>
      </>
    );
  }

  const trialDays = daysRemaining(tenant.trialEndsAt);

  return (
    <>
      <PageHead
        title="Subscription"
        subtitle="Manage your Worker plan, trial and billing."
      />

      {msg && <Notice type={msg.type}>{msg.text}</Notice>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-head">
          <h3>Current subscription</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
            <div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>Organisation</div>
              <strong>{tenant.name}</strong>
            </div>

            <div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>Status</div>
              <StatusBadge value={tenant.subscriptionStatus} />
            </div>

            <div>
              <div className="muted" style={{ fontSize: '0.78rem' }}>Plan</div>
              <strong>{tenant.subscriptionPlan ? tenant.subscriptionPlan : '7-day free trial'}</strong>
            </div>

            {tenant.subscriptionStatus === 'trialing' && tenant.trialEndsAt && (
              <div>
                <div className="muted" style={{ fontSize: '0.78rem' }}>Trial ends</div>
                <strong>{formatDate(tenant.trialEndsAt)}</strong>
                <div className="muted" style={{ fontSize: '0.78rem' }}>
                  {trialDays === 1 ? '1 day remaining' : `${trialDays} days remaining`}
                </div>
              </div>
            )}

            {tenant.subscriptionStatus === 'active' && tenant.subscriptionEndsAt && (
              <div>
                <div className="muted" style={{ fontSize: '0.78rem' }}>Renews / ends</div>
                <strong>{formatDate(tenant.subscriptionEndsAt)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      <PageHead
        title="Choose a plan"
        subtitle="All plans include the Worker administrative workflow. Your 7-day trial is free."
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
                <span className="badge green">MOST POPULAR</span>
              </div>
            )}

            <div className="card-head">
              <h3>{plan.name}</h3>
            </div>

            <div className="card-body">
              <div style={{ marginBottom: '0.7rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 700 }}>${plan.price}</span>
                <span className="muted"> / month</span>
              </div>

              <p className="muted" style={{ minHeight: '3.5rem' }}>
                {plan.description}
              </p>

              <button
                className={selected === plan.id ? 'btn' : 'btn secondary'}
                onClick={async () => {
                  setMsg(null);
                  try {
                    await api.post("/tenant/subscription", { plan: plan.id });
                    setSelected(plan.id);
                    await load();
                    setMsg({ type: "ok", text: `${plan.name} selected. Your plan is saved and ready for payment.` });
                  } catch (e) {
                    setMsg({ type: "err", text: e.response?.data?.message || "Could not select plan." });
                  }
                }}
              >
                {selected === plan.id ? 'Selected' : 'Select plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-head">
          <h3>Activate your subscription</h3>
        </div>
        <div className="card-body">
          {!selected ? (
            <p className="muted" style={{ margin: 0 }}>
              Select a plan above to continue to payment.
            </p>
          ) : (
            <div className="grid cols-2">
              <div>
                <h4>M-Pesa</h4>
                <p className="muted">
                  An STK push will be sent to the phone number below.
                </p>
                <form onSubmit={payWithMpesa}>
                  <div className="field">
                    <label>Phone number</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07.. or 2547.."
                      required
                    />
                  </div>
                  <button className="btn" disabled={busy === 'mpesa'}>
                    {busy === 'mpesa' ? <span className="spinner" /> : 'Pay with M-Pesa'}
                  </button>
                </form>
              </div>

              <div>
                <h4>PayPal</h4>
                <p className="muted">
                  Continue to PayPal to pay for the selected plan in USD.
                </p>
                <button
                  className="btn secondary"
                  onClick={payWithPaypal}
                  disabled={busy === 'paypal'}
                >
                  {busy === 'paypal' ? <span className="spinner" /> : 'Pay with PayPal'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-head">
          <h3>Billing</h3>
        </div>
        <div className="card-body">
          <p style={{ marginTop: 0 }}>
            Paid subscriptions can be settled through <strong>M-Pesa</strong> or <strong>PayPal</strong>.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Your selected plan will be activated after successful payment confirmation.
            Payment history is available under Administration → Payments.
          </p>
        </div>
      </div>
    </>
  );
}
