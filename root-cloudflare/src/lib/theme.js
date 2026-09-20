// ========================================================
// theme.js — 라이트/다크 테마 (바닐라 theme.js 이식 + 자동 전환 재설계)
// ========================================================
// 자동 규칙: 한국 서울 시각 기준 07:00~22:00 라이트, 22:00~다음날 07:00 다크.
//
// 예전 구현의 문제 두 가지를 고쳤다.
//  1) 시각을 new Date().getHours() 로 읽어서 "접속한 브라우저의 시간대"를 따랐다.
//     해외에서 접속하거나 PC 시간대가 다르면 서울과 다른 시각에 바뀌었다.
//     → 이제 서울 시각(UTC+9, 한국은 서머타임이 없어 고정 오프셋)으로 계산한다.
//  2) 토글을 한 번이라도 누르면 localStorage 에 'light'|'dark' 가 **영구 고정**되고,
//     자동으로 돌아가는 resetThemeToAuto() 는 어디서도 호출되지 않았다. 그래서 한 번 눌러 본
//     브라우저는 22시가 돼도 7시가 돼도 영영 안 바뀌었다("자동 전환이 적응이 안 된다"의 원인).
//     → 이제 수동 선택은 **다음 자동 전환 시각(07:00 또는 22:00 서울)까지만** 유지되고,
//       그 시각이 지나면 자동 규칙으로 돌아온다.
//
// 저장 형식(localStorage.hbtTheme): JSON {"t":"light"|"dark","u":<만료 epoch ms>}
//   없음/만료 = 자동. 예전 형식('light'|'dark' 문자열)은 읽을 때 "다음 전환 시각까지"짜리로 바꿔 이어받는다.
//
// ⚠ index.html 의 인라인 스크립트(첫 렌더 전 깜빡임 방지)가 이 규칙을 그대로 복제한다.
//   전환 시각·저장 형식을 바꾸면 두 곳을 같이 고쳐야 한다.
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'hbtTheme';
const AUTO_LIGHT_START_HOUR = 7;   // 서울 07:00 부터 라이트
const AUTO_DARK_START_HOUR = 22;   // 서울 22:00 부터 다크
const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 서울 = UTC+9 (서머타임 없음)
const HOUR_MS = 60 * 60 * 1000;

// 서울 시각의 "시"(0~23). UTC 시각에 9시간을 더한 값의 UTC 시를 읽으면 서울 시각이 된다.
export function getSeoulHour(now = Date.now()) {
  return new Date(now + KST_OFFSET_MS).getUTCHours();
}

export function getAutoTheme(now = Date.now()) {
  const hour = getSeoulHour(now);
  return hour >= AUTO_LIGHT_START_HOUR && hour < AUTO_DARK_START_HOUR ? 'light' : 'dark';
}

// now 이후 가장 가까운 자동 전환 시각(서울 07:00 또는 22:00)의 epoch ms.
export function getNextSwitchAt(now = Date.now()) {
  const kst = new Date(now + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  // 서울 기준 오늘/내일의 07시·22시 후보를 만들어(서울 벽시계 → epoch 는 오프셋을 다시 뺀다) 가장 이른 미래 값을 고른다.
  const candidates = [0, 1].flatMap((add) => [AUTO_LIGHT_START_HOUR, AUTO_DARK_START_HOUR]
    .map((h) => Date.UTC(y, m, d + add, h) - KST_OFFSET_MS));
  return Math.min(...candidates.filter((t) => t > now));
}

function readOverride(now = Date.now()) {
  let raw;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { return null; }
  if (!raw) return null;

  // 예전 형식: 'light'|'dark' 문자열(영구 고정이던 값) → 다음 전환 시각까지만 유효한 값으로 바꿔 이어받는다.
  if (raw === 'light' || raw === 'dark') {
    const migrated = { t: raw, u: getNextSwitchAt(now) };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch { /* 저장 실패해도 이번 계산엔 쓴다 */ }
    return migrated;
  }

  try {
    const v = JSON.parse(raw);
    if ((v.t === 'light' || v.t === 'dark') && Number.isFinite(v.u) && now < v.u) return v;
  } catch { /* 깨진 값 → 아래에서 정리 */ }

  // 만료됐거나 깨진 값은 지워서 자동으로 돌아간다.
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  return null;
}

export function getStoredTheme(now = Date.now()) {
  return readOverride(now)?.t ?? null;
}

export function resolveTheme(now = Date.now()) {
  return getStoredTheme(now) || getAutoTheme(now);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || resolveTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 자동 전환 — 다음 07:00/22:00(서울)에 정확히 맞춰 예약한다(예전엔 30분 주기 폴링이라 최대 30분 늦었다).
  // 절전·백그라운드 탭에서는 타이머가 밀릴 수 있어 탭 복귀·창 포커스 때도 다시 계산한다.
  // 다른 탭에서 토글하면 storage 이벤트로 같이 맞춘다.
  useEffect(() => {
    let timer;
    const recheck = () => {
      setTheme(resolveTheme());
      clearTimeout(timer);
      // +1초: 경계 직후에 확실히 "새 시간대"로 계산되게 한다. 24.8일 한도(2^31ms)보다 훨씬 짧다.
      timer = setTimeout(recheck, Math.max(1000, getNextSwitchAt() - Date.now() + 1000));
    };
    const onVisible = () => { if (document.visibilityState === 'visible') recheck(); };
    const onStorage = (e) => { if (e.key === STORAGE_KEY || e.key === null) recheck(); };
    recheck();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', recheck);
    window.addEventListener('storage', onStorage);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', recheck);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // 수동 전환 — 다음 자동 전환 시각까지만 유지한다. 지금 자동 값과 같아지는 쪽으로 돌려놓으면
  // 고정할 이유가 없으므로 저장을 지워 자동으로 되돌린다.
  const toggleTheme = useCallback(() => {
    setTheme((cur) => {
      const next = cur === 'dark' ? 'light' : 'dark';
      try {
        if (next === getAutoTheme()) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: next, u: getNextSwitchAt() }));
      } catch { /* 저장 실패해도 전환은 진행 */ }
      return next;
    });
  }, []);

  const resetThemeToAuto = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setTheme(getAutoTheme());
  }, []);

  return { theme, isDark: theme === 'dark', toggleTheme, resetThemeToAuto };
}
