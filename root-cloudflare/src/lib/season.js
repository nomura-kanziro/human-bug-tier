// ========================================================
// season.js — 이벤트 디자인(계절 배경) 상태
// ========================================================
// 관리자가 "이벤트 디자인 적용"에서 켠 배경(halloween | christmas | none)을 서버에서 받아
// <html data-season="…"> 으로 붙인다. 실제 모양은 styles/season.css + components/SeasonalBackdrop.jsx.
// - 첫 화면 깜빡임을 줄이려고 마지막 값을 localStorage(hbtSeason)에 기억해 두고, index.html 이 React 보다 먼저 붙인다.
// - 관리자가 바꾸면 같은 탭에는 SEASON_EVENT 로 바로 알리고, 다른 방문자는 다음 접속(또는 30분마다 재확인) 때 바뀐다.
import { apiRequest, isStaticPreview } from './api';

export const SEASONS = {
  halloween: { label: '할로윈', icon: '🎃' },
  christmas: { label: '크리스마스', icon: '🎄' },
};

export const SEASON_EVENT = 'hbt:season-change';
const STORAGE_KEY = 'hbtSeason';

export function normalizeSeason(value) {
  return Object.prototype.hasOwnProperty.call(SEASONS, value) ? value : 'none';
}

export function getAppliedSeason() {
  return normalizeSeason(document.documentElement.getAttribute('data-season'));
}

// 화면에 적용 + 기억 + 같은 탭에 알림
export function applySeason(value) {
  const season = normalizeSeason(value);
  const root = document.documentElement;
  if (season === 'none') root.removeAttribute('data-season');
  else root.setAttribute('data-season', season);
  try {
    if (season === 'none') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, season);
  } catch { /* 저장 실패해도 이번 화면에는 적용됨 */ }
  window.dispatchEvent(new CustomEvent(SEASON_EVENT, { detail: season }));
  return season;
}

// 서버의 현재 값을 받아 적용. 실패하면 지금 화면을 그대로 둔다.
export async function syncSeasonFromServer() {
  if (isStaticPreview()) return getAppliedSeason();
  try {
    const res = await apiRequest('/api/site/settings', { auth: false });
    if (res.ok) return applySeason(res.data?.seasonalTheme);
  } catch { /* 네트워크 오류 — 기존 값 유지 */ }
  return getAppliedSeason();
}
