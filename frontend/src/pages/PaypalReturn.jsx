import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead } from '../components/ui.jsx';

export default function PaypalReturn() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Confirming your PayPal payment...');

  useEffect(() => {
    const orderId = searchParams.get('token');

    if (!orderId) {
      setStatus('error');
      setMessage('No PayPal order was returned.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await api.post('/payments/paypal/capture', { orderId });
        if (!cancelled) {
          setStatus('success');
          setMessage('Payment confirmed. Your Worker subscription is now active.');
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setMessage(
            e.response?.data?.message ||
            'The PayPal payment could not be confirmed.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <>
      <PageHead
        title="PayPal payment"
        subtitle="Subscription payment confirmation."
      />

      <div className="card">
        <div className="card-body">
          {status === 'processing' && (
            <>
              <span className="spinner" />
              <p style={{ marginTop: '1rem' }}>{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <h3>Payment successful</h3>
              <p>{message}</p>
              <Link className="btn" to="/admin/subscription">
                View subscription
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h3>Payment could not be confirmed</h3>
              <p>{message}</p>
              <Link className="btn" to="/admin/subscription">
                Return to subscription
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
