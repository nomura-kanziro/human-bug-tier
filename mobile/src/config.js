// ========================================================
// config.js — 앱이 붙을 서버 주소
// ========================================================
// 기본은 운영 주소(app.json → expo.extra.apiBase). 웹 프론트(root-cloudflare)와 같은 /api 를 쓰므로
// Cloudflare Pages 프록시 → Oracle 백엔드로 그대로 간다(앱 전용 서버를 따로 두지 않는다).
// 로컬 개발: 같은 Wi-Fi 의 PC 에서 `cd backend && npm start` 후, 앱 화면의 "서버 주소"에 http://<PC IP>:5000 을 넣는다
// (휴대폰에서 localhost 는 휴대폰 자신이라 PC 에 닿지 않는다).
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const DEFAULT_API_BASE = String(extra.apiBase || 'https://human-bug-tier.com').replace(/\/+$/, '');
export const SITE_URL = String(extra.siteUrl || DEFAULT_API_BASE);

// 한 요청을 기다리는 최대 시간 — 모바일 회선에서 화면이 오래 멈춰 보이지 않게 짧게 둔다
export const REQUEST_TIMEOUT_MS = 8000;

// 주소 입력값을 정리한다(끝의 / 제거, http(s) 없으면 붙임)
export function normalizeBase(input) {
  const raw = String(input || '').trim().replace(/\/+$/, '');
  if (!raw) return DEFAULT_API_BASE;
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
}
