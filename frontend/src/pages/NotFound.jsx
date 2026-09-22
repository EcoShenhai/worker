import { Link } from 'react-router-dom';
import { PageHead } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <>
      <PageHead title={t('notFound.title')} subtitle={t('notFound.subtitle')} />
      <Link className="btn" to="/">{t('notFound.back')}</Link>
    </>
  );
}
