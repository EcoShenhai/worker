import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, StatusBadge, Empty, Notice } from '../../components/ui.jsx';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatAmount(currency, amount) {
  if (amount === null || amount === undefined) return '—';
  return `${currency || ''} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
}

async function downloadPdf(url, filename) {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [invoiceResponse, receiptResponse] = await Promise.all([
        api.get('/billing/invoices'),
        api.get('/billing/receipts'),
      ]);

      setInvoices(invoiceResponse.data.invoices || []);
      setReceipts(receiptResponse.data.receipts || []);
    } catch (e) {
      setMsg({
        type: 'err',
        text: e.response?.data?.message || 'Could not load billing documents.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDownload = async (type, id, number) => {
    const key = `${type}-${id}`;
    setBusy(key);
    setMsg(null);

    try {
      await downloadPdf(
        `/billing/${type}s/${id}/pdf`,
        `${number || type}.pdf`
      );
    } catch (e) {
      setMsg({
        type: 'err',
        text: e.response?.data?.message || `Could not download ${type}.`,
      });
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHead
        title="Billing"
        subtitle="Invoices and receipts for completed Worker subscription payments."
      />

      {msg && <Notice type={msg.type}>{msg.text}</Notice>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-head">
          <h3>Billing documents</h3>
        </div>
        <div className="card-body">
          <p style={{ marginTop: 0 }}>
            Download invoices and receipts for your organisation's completed
            subscription payments.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            These documents record Worker subscription payments and are provided
            for payment and reimbursement purposes. They are not represented as
            KRA/eTIMS tax invoices unless separately issued through a compliant
            eTIMS integration.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-head">
          <h3>Invoices</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty"><span className="spinner" /></div>
          ) : invoices.length === 0 ? (
            <Empty>No invoices yet.</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="mono">{invoice.invoiceNumber}</td>
                    <td>{formatDate(invoice.issueDate)}</td>
                    <td>{invoice.description}</td>
                    <td className="mono">
                      {formatAmount(invoice.currency, invoice.totalAmount)}
                    </td>
                    <td><StatusBadge value={invoice.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn secondary sm"
                        disabled={busy === `invoice-${invoice.id}`}
                        onClick={() => handleDownload(
                          'invoice',
                          invoice.id,
                          invoice.invoiceNumber
                        )}
                      >
                        {busy === `invoice-${invoice.id}`
                          ? <span className="spinner" />
                          : 'Download PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Receipts</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty"><span className="spinner" /></div>
          ) : receipts.length === 0 ? (
            <Empty>No receipts yet.</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Provider</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="mono">{receipt.receiptNumber}</td>
                    <td>{formatDate(receipt.receiptDate)}</td>
                    <td>
                      <span className="badge grey">
                        {String(receipt.provider || '').toUpperCase()}
                      </span>
                    </td>
                    <td className="muted mono" style={{ fontSize: '0.76rem' }}>
                      {receipt.providerReceipt || receipt.providerReference || '—'}
                    </td>
                    <td className="mono">
                      {formatAmount(receipt.currency, receipt.amount)}
                    </td>
                    <td><StatusBadge value={receipt.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn secondary sm"
                        disabled={busy === `receipt-${receipt.id}`}
                        onClick={() => handleDownload(
                          'receipt',
                          receipt.id,
                          receipt.receiptNumber
                        )}
                      >
                        {busy === `receipt-${receipt.id}`
                          ? <span className="spinner" />
                          : 'Download PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
