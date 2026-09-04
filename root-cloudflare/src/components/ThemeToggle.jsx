// 라이트/다크 토글 스위치 (header.html 의 #theme-toggle-btn 이식). 클릭 처리는 useTheme 훅.
import { useTheme } from '../lib/theme';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      id="theme-toggle-btn"
      className={`theme-toggle-btn${isDark ? ' is-dark' : ''}`}
      data-theme-toggle
      role="switch"
      aria-checked={isDark ? 'true' : 'false'}
      aria-label="다크 모드 전환"
      title="화면 밝기 전환"
      onClick={toggleTheme}
    >
      <span className="theme-toggle-icon theme-toggle-icon-sun" aria-hidden="true">☀️</span>
      <span className="theme-toggle-track"><span className="theme-toggle-thumb" /></span>
      <span className="theme-toggle-icon theme-toggle-icon-moon" aria-hidden="true">🌙</span>
    </button>
  );
}
