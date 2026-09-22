import { useI18n } from '../i18n/index.jsx';

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
  const label = useLabel();
  const cls = STATUS_STYLE[value] || 'grey';
  return <span className={`badge ${cls}`}>{label('status', value)}</span>;
}

// Translate an enum value (status, kind, classification, docType…).
// Falls back to the humanised raw value when no translation exists.
export function useLabel() {
  const { t } = useI18n();
  return (group, value) => {
    if (value === undefined || value === null || value === '') return '';
    const k = `${group}.${value}`;
    const v = t(k);
    return v === k ? String(value).replace(/_/g, ' ') : v;
  };
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function Notice({ type = 'ok', children }) {
  if (!children) return null;
  return <div className={`notice ${type}`}>{children}</div>;
}
