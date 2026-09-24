import { useEffect, useState } from 'react';
import api from '../api/client.js';

// Territory & language reference data (public endpoint), fetched once per page load.
let cache = null;
let pending = null;

export function loadInternational() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = api.get('/meta/international')
      .then((r) => { cache = r.data; return cache; })
      .finally(() => { pending = null; });
  }
  return pending;
}

export function useInternational() {
  const [data, setData] = useState(cache);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!cache) loadInternational().then(setData).catch(setError);
  }, []);
  return { data, error, loading: !data && !error };
}

// Pre-select from the browser locale, but only when it names a region explicitly (e.g. en-KE).
export function guessTerritory(codes) {
  try {
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const l of langs) {
      const region = new Intl.Locale(l).region;
      if (region && codes.has(region)) return region;
    }
  } catch (e) { /* ignore */ }
  return '';
}
