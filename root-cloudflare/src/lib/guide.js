// 가이드 모드 상태 저장소 — 켜져 있는 스테이지·단계는 sessionStorage 에 두어 새로고침해도 이어지고,
// 클리어한 스테이지는 localStorage 에 남겨 /guide 페이지에서 보여 준다. (서버 저장 없음)
import { useSyncExternalStore } from 'react';

const SESSION_KEY = 'hbtGuideSession';
const CLEARED_KEY = 'hbtGuideCleared';

function readSession() {
  try {
    const v = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (v && typeof v.course === 'string' && Number.isInteger(v.step) && v.step >= 0) return { course: v.course, step: v.step };
  } catch { /* 저장소를 못 읽으면 꺼진 상태로 시작 */ }
  return null;
}

function readCleared() {
  try {
    const v = JSON.parse(localStorage.getItem(CLEARED_KEY));
    if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
  } catch { /* 무시 */ }
  return [];
}

let session = readSession();
let cleared = readCleared();
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

function setSession(next) {
  session = next;
  try {
    if (next) sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* 저장만 실패 — 동작은 계속 */ }
  emit();
}

export const guideStart = (course) => setSession({ course, step: 0 });
export const guideGoto = (step) => { if (session) setSession({ ...session, step }); };
export const guideStop = () => setSession(null);

export function guideMarkCleared(course) {
  if (cleared.includes(course)) return;
  cleared = [...cleared, course];
  try { localStorage.setItem(CLEARED_KEY, JSON.stringify(cleared)); } catch { /* 무시 */ }
  emit();
}

export function guideResetCleared() {
  cleared = [];
  try { localStorage.removeItem(CLEARED_KEY); } catch { /* 무시 */ }
  emit();
}

export const useGuide = () => useSyncExternalStore(subscribe, () => session);
export const useGuideCleared = () => useSyncExternalStore(subscribe, () => cleared);
