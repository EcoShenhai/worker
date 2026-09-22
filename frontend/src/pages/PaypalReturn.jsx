import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function PaypalReturn() {
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('paypal.confirming');

  useEffect(() => {
    const orderId = searchParams.get('token');

    if (!orderId) {
      setStatus('error');
      setMessage('paypal.noOrder');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await api.post('/payments/paypal/capture', { orderId });
        if (!cancelled) {
          setStatus('success');
          setMessage('paypal.confirmed');
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setMessage(
            e.response?.data?.message ||
            'paypal.failed'
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
        title={t('paypal.title')}
        subtitle={t('paypal.subtitle')}
      />

      <div className="card">
        <div className="card-body">
          {status === 'processing' && (
            <>
              <span className="spinner" />
              <p style={{ marginTop: '1rem' }}>{t(message)}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <h3>{t('paypal.success')}</h3>
              <p>{t(message)}</p>
              <Link className="btn" to="/admin/subscription">
                {t('paypal.viewSubscription')}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h3>{t('paypal.errorTitle')}</h3>
              <p>{t(message)}</p>
              <Link className="btn" to="/admin/subscription">
                {t('paypal.returnToSubscription')}
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
