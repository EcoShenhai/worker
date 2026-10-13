import React from 'react'; // React in scope for apps built with the classic JSX runtime

// Refund and cancellation terms shown before payment (2026-10-13), shared by the Shenhai B2X apps. The full
// policy is at /refund-policy. kind: 'plan' (renewing subscription), 'once' (one-time payment), 'credits' (prepaid).
const TEXT = {
  plan: 'Plans renew automatically until you stop renewal; the plan then runs to the end of the paid period. Amounts already paid are not refunded, except for duplicate or wrong charges, a payment taken without the plan being activated, a service not delivered, or where the law of your country requires.',
  once: 'This is a one-time payment. It is refunded if you were charged twice or the activation fails on our side; it is not refunded once the activation is complete, except where the law of your country requires.',
  credits: 'Credits are prepaid and used as you go. Unused credits are not refunded, except for duplicate or wrong charges, a service not delivered, or where the law of your country requires.',
};

export default function RefundNote({ kind = 'plan', className = 'muted', style }) {
  return (
    <p className={className} data-refund-note style={{ fontSize: '.8rem', lineHeight: 1.5, margin: '12px 0 0', ...style }}>
      {TEXT[kind] || TEXT.plan}{' '}
      <a href="/refund-policy" style={{ color: 'inherit', textDecoration: 'underline' }}>Refund and Cancellation Policy</a>
    </p>
  );
}
