import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, StatusBadge, Empty, Notice } from '../../components/ui.jsx';

export default function Payments() {
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
      setMsg({ type: 'ok', text: 'STK push sent. Ask the payer to approve on their phone.' });
      setMpesa({ phone: '', amount: '', purpose: 'subscription' });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Could not initiate payment.' });
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="Payments" subtitle="M-Pesa (Daraja STK push) and PayPal transactions." />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <div className="grid cols-2">
        <div className="card">
          <div className="card-head"><h3>Request M-Pesa payment</h3></div>
          <div className="card-body">
            <form onSubmit={initiateMpesa}>
              <div className="field"><label>Phone (07.. or 2547..)</label><input value={mpesa.phone} onChange={(e) => setMpesa({ ...mpesa, phone: e.target.value })} required /></div>
              <div className="field"><label>Amount (KES)</label><input type="number" min="1" value={mpesa.amount} onChange={(e) => setMpesa({ ...mpesa, amount: e.target.value })} required /></div>
              <div className="field"><label>Purpose</label><input value={mpesa.purpose} onChange={(e) => setMpesa({ ...mpesa, purpose: e.target.value })} /></div>
              <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : 'Send STK push'}</button>
            </form>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Transactions</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div className="empty"><span className="spinner" /></div> : payments.length === 0 ? <Empty>No transactions.</Empty> : (
              <table>
                <thead><tr><th>Provider</th><th>Amount</th><th>Status</th><th>Ref.</th></tr></thead>
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
