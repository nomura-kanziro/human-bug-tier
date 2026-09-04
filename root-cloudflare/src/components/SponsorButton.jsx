// 후원(커피) 버튼. SPONSOR_PROFILE_URL 에 프로토콜이 없으면 https:// 를 붙이고,
// 비어 있으면 클릭이 안 먹는 비활성(aria-disabled) 상태로 둔다. (common.js renderSponsorButton 이식)
export const SPONSOR_PROFILE_URL = 'buymeacoffee.com/limjinhengm';

export function getSponsorProfileUrl() {
  const url = String(SPONSOR_PROFILE_URL || '').trim();
  if (!url || url === '#') return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `https://${url}`;
}

export default function SponsorButton() {
  const url = getSponsorProfileUrl();
  const props = url
    ? { href: url, target: '_blank', rel: 'noopener noreferrer' }
    : { href: '#', 'aria-disabled': 'true', onClick: (e) => e.preventDefault() };
  return (
    <a id="header-sponsor-btn" className="header-sponsor-btn" title="후원하기" aria-label="후원하기" {...props}>
      <svg className="header-sponsor-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path d="M8.2 3.2c.15.7.15 1.2 0 1.9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M12 2.4c.2.85.2 1.5 0 2.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M15.8 3.2c.15.7.15 1.2 0 1.9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M5 8.4h12.2v5.6c0 2.5-2 4.5-4.5 4.5H9.5A4.5 4.5 0 0 1 5 14V8.4z" fill="currentColor" />
        <path d="M17.2 9.2h2.1a2.55 2.55 0 0 1 0 5.1h-2.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 20.4h8.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </a>
  );
}
