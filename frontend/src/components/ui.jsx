// Small shared UI helpers.
export function PageHead({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <div className="title-serif">{title}</div>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
    </div>
  );
}

const STATUS_STYLE = {
  draft: 'grey', in_review: 'amber', approved: 'green', final: 'blue', archived: 'grey',
  open: 'blue', processing: 'amber', ready: 'green',
  pending: 'amber', transcribing: 'amber', transcribed: 'green', failed: 'red',
  sent: 'green', received: 'blue', completed: 'green', cancelled: 'grey',
  active: 'green', suspended: 'red',
};
export function StatusBadge({ value }) {
  const cls = STATUS_STYLE[value] || 'grey';
  return <span className={`badge ${cls}`}>{String(value || '').replace(/_/g, ' ')}</span>;
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function Notice({ type = 'ok', children }) {
  if (!children) return null;
  return <div className={`notice ${type}`}>{children}</div>;
}
