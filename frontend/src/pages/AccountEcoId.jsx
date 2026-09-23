import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/client.js';
import EcoIdButtons from '../components/EcoIdButtons.jsx';

// Link the signed-in Worker account to EcoID. (Unlink is not offered: EcoID-created accounts have no known password.)
export default function AccountEcoId() {
  const location = useLocation();
  const [linked, setLinked] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    api.get('/auth/ecoid/status').then(({ data }) => setLinked(!!data.linked)).catch(() => setError('Could not load your EcoID status.'));
  }, [location.key]);
  return (
    <div style={{ maxWidth: 560 }}>
      <h2>EcoID</h2>
      {location.state?.flash && <div className="notice ok">{location.state.flash}</div>}
      {error && <div className="notice err">{error}</div>}
      {linked === null && !error && <span className="spinner" />}
      {linked === true && <p>Your Worker account is <strong>linked</strong> to your EcoID. You can sign in with "Continue with EcoID" or with your email and password.</p>}
      {linked === false && (<>
        <p>Your Worker account is <strong>not linked</strong> to EcoID yet. Link it to sign in with EcoID next time — your email and password keep working as before.</p>
        <div style={{ maxWidth: 320 }}><EcoIdButtons intent="link" /></div>
      </>)}
    </div>
  );
}
