export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Worker" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id="workerLogoGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12855F" />
          <stop offset="1" stopColor="#0A5C41" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#workerLogoGrad)" />
      <path d="M15 20 L25 45 L32 30 L39 45 L49 20" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="30" r="2.4" fill="#BFE9D5" />
    </svg>
  );
}
