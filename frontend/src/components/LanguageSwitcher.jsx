import { LANGS, useI18n } from '../i18n/index.jsx';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      className={`lang-select ${className}`.trim()}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label={t('common.language')}
      title={t('common.language')}
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code} lang={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
