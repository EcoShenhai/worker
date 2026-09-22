import Logo from './Logo.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

// Auth-card header: language switcher + Worker logo/wordmark.
export default function AuthBrand({ logo = true }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}><LanguageSwitcher /></div>
      {logo
        ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Logo size={40} /><div className="wordmark">Worker</div></div>
        : <div className="wordmark">Worker</div>}
    </>
  );
}
