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

  // 로그아웃 — 유저/관리자 키를 전부 지운다(드롭다운 로그아웃 버튼이 공용이므로 분기 없음)
  const logout = useCallback(() => {
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) return;
    ['user', 'authToken', 'adminAuthToken', 'isAdmin', 'adminName', 'adminIp', 'profileImage']
      .forEach((k) => localStorage.removeItem(k));
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
