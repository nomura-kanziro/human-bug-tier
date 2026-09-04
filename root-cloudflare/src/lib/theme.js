// ========================================================
// theme.js — 라이트/다크 테마 (바닐라 theme.js 이식)
// ========================================================
// 저장 규칙(localStorage.hbtTheme): 'light'|'dark' = 수동 고정, 없음 = 시각 기준 자동
// (07:00~22:00 라이트, 그 외 다크). index.html 인라인 스크립트가 첫 렌더 전에 data-theme 을 먼저 정한다.
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'hbtTheme';
const AUTO_LIGHT_START_HOUR = 7;
const AUTO_DARK_START_HOUR = 22;

export function getAutoTheme() {
  const hour = new Date().getHours();
  return hour >= AUTO_LIGHT_START_HOUR && hour < AUTO_DARK_START_HOUR ? 'light' : 'dark';
}

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function resolveTheme() {
  return getStoredTheme() || getAutoTheme();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || resolveTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 수동 고정이 없을 때만 자동 전환 시각(07/22시)을 넘기면 재계산 — 탭 복귀 + 30분 주기
  useEffect(() => {
    const recheck = () => {
      if (getStoredTheme()) return;
      setTheme(getAutoTheme());
    };
    const onVisible = () => { if (document.visibilityState === 'visible') recheck(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(recheck, 30 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((cur) => {
      const next = cur === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* 저장 실패해도 전환은 진행 */ }
      return next;
    });
  }, []);

  const resetThemeToAuto = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setTheme(getAutoTheme());
  }, []);

  return { theme, isDark: theme === 'dark', toggleTheme, resetThemeToAuto };
}
