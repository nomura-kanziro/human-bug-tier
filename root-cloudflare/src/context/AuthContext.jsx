// ========================================================
// AuthContext — 로그인 신원(유저/관리자) 을 localStorage 에서 읽어 앱 전체에 제공
// ========================================================
// 저장 키는 바닐라와 동일하게 유지한다(root-render 와 같은 백엔드·같은 브라우저 저장소 공유):
//   user(JSON: nickname/email), authToken, isAdmin('true'), adminName, adminAuthToken, profileImage(base64)
// 관리자도 일반 유저와 같은 신원 형태(nickname/email)로 다뤄 프로필 UI를 통일한다(관리자 티 안 내기).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LOGO_URL } from '../lib/paths';

const AuthContext = createContext(null);

function readIdentity() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (isAdmin) {
    return { nickname: localStorage.getItem('adminName') || '관리자', email: '', isAdmin: true };
  }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return { nickname: user.nickname || '', email: user.email || '', isAdmin: false };
  } catch {
    return { nickname: '', email: '', isAdmin: false };
  }
}

function readProfileImage() {
  return localStorage.getItem('profileImage') || LOGO_URL;
}

// 로그인 상태는 브라우저를 닫아도 유지하되(토큰 서버 만료 유저 7일/관리자 24시간),
// 활동 없이 방치된 채 1시간이 지나면 클라이언트에서 먼저 자동 로그아웃시킨다.
// 마지막 활동 시각(lastActiveAt)은 localStorage 에 두어 같은 브라우저의 모든 탭이 공유한다
// (한 탭에서 활동하면 다른 탭도 방치로 보지 않고, 브라우저를 닫아 둔 시간도 그대로 반영된다).
// loginAt 은 Login.jsx/AdminLogin.jsx 가 로그인 성공 시 기록하며(바닐라 common.js 와 같은 키),
// 아직 활동 기록이 없는 로그인 직후에는 loginAt 을 활동 시각 대용으로 쓴다.
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 방치 1시간
const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // 1분마다 확인
const ACTIVITY_WRITE_THROTTLE_MS = 10 * 1000; // 활동 시각 기록은 10초에 최대 1번(이벤트 폭주 방지)
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'wheel'];

const SESSION_KEYS = ['user', 'authToken', 'adminAuthToken', 'isAdmin', 'adminName', 'adminIp', 'profileImage', 'loginAt', 'lastActiveAt'];

const isLoggedInNow = () => Boolean(localStorage.getItem('authToken')) || localStorage.getItem('isAdmin') === 'true';
const lastActivity = () => Math.max(Number(localStorage.getItem('lastActiveAt') || 0), Number(localStorage.getItem('loginAt') || 0));

export function AuthProvider({ children }) {
  const [identity, setIdentity] = useState(readIdentity);
  const [profileImage, setProfileImage] = useState(readProfileImage);

  const refresh = useCallback(() => {
    setIdentity(readIdentity());
    setProfileImage(readProfileImage());
  }, []);

  // 다른 탭에서 로그인/로그아웃하면 storage 이벤트로 동기화
  useEffect(() => {
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [refresh]);

  // 방치 1시간이면 자동 로그아웃 — 마운트 직후 1회 + 1분마다 확인
  // (마운트 직후 확인이 "브라우저를 닫아 두었다가 1시간 넘어 다시 연 경우"를 잡는다)
  useEffect(() => {
    const checkTimeout = () => {
      if (!isLoggedInNow()) return;
      const last = lastActivity();
      if (!last) return; // 기록이 없는 옛 세션은 첫 활동 때 lastActiveAt 이 생긴다
      if (Date.now() - last < SESSION_TIMEOUT_MS) return;

      SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
      refresh();
      window.alert('1시간 동안 활동이 없어 자동으로 로그아웃되었습니다. 다시 로그인해주세요.');
    };
    checkTimeout();
    const timer = setInterval(checkTimeout, SESSION_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // 사용자 활동(마우스·키보드·스크롤·터치)이 있으면 마지막 활동 시각을 갱신 — 로그인 중일 때만 기록
  useEffect(() => {
    let lastWrite = 0;
    const markActive = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_WRITE_THROTTLE_MS) return;
      lastWrite = now;
      if (!isLoggedInNow()) return;
      // 이미 방치 시간이 지났는데 타이머가 아직 못 돈 경우(절전 복귀 등)에는 활동으로 되살리지 않는다
      const last = lastActivity();
      if (last && now - last >= SESSION_TIMEOUT_MS) return;
      try { localStorage.setItem('lastActiveAt', String(now)); } catch { /* 저장 불가 환경은 무시 */ }
    };
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, markActive));
  }, []);

  // 로그아웃 — 유저/관리자 키를 전부 지운다(드롭다운 로그아웃 버튼이 공용이므로 분기 없음)
  const logout = useCallback(() => {
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) return;
    SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
    refresh();
  }, [refresh]);

  // 프로필 사진: 서버 업로드 없이 base64 를 localStorage 에만 저장(기기 바꾸면 초기화 — 알려진 한계)
  const changeProfileImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        localStorage.setItem('profileImage', String(ev.target.result));
        setProfileImage(String(ev.target.result));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const value = useMemo(() => ({
    ...identity,
    isLoggedIn: Boolean(identity.nickname),
    profileImage,
    refresh,
    logout,
    changeProfileImage,
  }), [identity, profileImage, refresh, logout, changeProfileImage]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
