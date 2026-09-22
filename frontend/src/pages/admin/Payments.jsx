import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, StatusBadge, Empty, Notice } from '../../components/ui.jsx';
import { useI18n } from '../../i18n/index.jsx';

export default function Payments() {
  const { t } = useI18n();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [mpesa, setMpesa] = useState({ phone: '', amount: '', purpose: 'subscription' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments');
      setPayments(data.payments || data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const initiateMpesa = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await api.post('/payments/mpesa/initiate', { phone: mpesa.phone, amount: Number(mpesa.amount), purpose: mpesa.purpose });
      setMsg({ type: 'ok', text: t('payments.stkSent') });
      setMpesa({ phone: '', amount: '', purpose: 'subscription' });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('payments.initiateFailed') });
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title={t('nav.payments')} subtitle={t('payments.subtitle')} />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <div className="grid cols-2">
        <div className="card">
          <div className="card-head"><h3>{t('payments.requestTitle')}</h3></div>
          <div className="card-body">
            <form onSubmit={initiateMpesa}>
              <div className="field"><label>{t('payments.phone')}</label><input value={mpesa.phone} onChange={(e) => setMpesa({ ...mpesa, phone: e.target.value })} required /></div>
              <div className="field"><label>{t('payments.amountKes')}</label><input type="number" min="1" value={mpesa.amount} onChange={(e) => setMpesa({ ...mpesa, amount: e.target.value })} required /></div>
              <div className="field"><label>{t('payments.purpose')}</label><input value={mpesa.purpose} onChange={(e) => setMpesa({ ...mpesa, purpose: e.target.value })} /></div>
              <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : t('payments.sendStk')}</button>
            </form>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>{t('payments.transactions')}</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div className="empty"><span className="spinner" /></div> : payments.length === 0 ? <Empty>{t('payments.empty')}</Empty> : (
              <table>
                <thead><tr><th>{t('payments.table.provider')}</th><th>{t('payments.table.amount')}</th><th>{t('payments.table.status')}</th><th>{t('payments.table.ref')}</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td><span className="badge grey">{p.provider}</span></td>
                      <td className="mono">{p.currency} {p.amount}</td>
                      <td><StatusBadge value={p.status} /></td>
                      <td className="muted mono" style={{ fontSize: '0.76rem' }}>{p.providerReceipt || p.providerRef || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
