import { useMemo, useState } from 'react';

// Territory & language pickers. Wording rule: "territory", never "country".
export const territoryLabel = (t) => (t.native === t.name ? t.native : `${t.native} (${t.name})`);
export const languageLabel = (l) => (l.native.toLowerCase() === l.name.toLowerCase() ? l.native : `${l.native} (${l.name})`);

const matches = (t, q) => t.code.toLowerCase() === q || t.name.toLowerCase().includes(q) || t.native.toLowerCase().includes(q);

export function TerritorySelect({ territories, value, onChange, required, searchPlaceholder, placeholder }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? territories.filter((t) => matches(t, s)) : territories;
    if (value && !base.some((t) => t.code === value)) {
      const cur = territories.find((t) => t.code === value);
      if (cur) return [cur, ...base];
    }
    return base;
  }, [q, territories, value]);

  const onSearch = (e) => {
    const next = e.target.value;
    setQ(next);
    const s = next.trim().toLowerCase();
    if (!s) return;
    const hits = territories.filter((t) => matches(t, s));
    if (hits.length === 1 && hits[0].code !== value) onChange(hits[0].code);
  };

  return (
    <div>
      <input type="search" value={q} onChange={onSearch} placeholder={searchPlaceholder} aria-label={searchPlaceholder} style={{ marginBottom: '0.4rem' }} />
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="" disabled>{placeholder}</option>
        {list.map((t) => <option key={t.code} value={t.code}>{territoryLabel(t)}</option>)}
      </select>
    </div>
  );
}

export function LanguageSelect({ languages, value, onChange, preferred, showStt, labels = {}, defaultOption }) {
  const ordered = useMemo(() => {
    if (!preferred || !preferred.length) return languages;
    const first = preferred.map((c) => languages.find((l) => l.code === c)).filter(Boolean);
    return [...first, ...languages.filter((l) => !preferred.includes(l.code))];
  }, [languages, preferred]);
  const note = (l) => (!showStt || l.sttTier === 'standard' ? '' : ` — ${l.sttTier === 'beta' ? labels.beta : labels.unavailable}`);
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {defaultOption !== undefined && <option value="">{defaultOption}</option>}
      {ordered.map((l) => <option key={l.code} value={l.code}>{languageLabel(l)}{note(l)}</option>)}
    </select>
  );
}
