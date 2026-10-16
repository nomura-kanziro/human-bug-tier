// ========================================================
// siteSettingController.js — 사이트 운영 설정 (이벤트 디자인 = 계절 배경)
// ========================================================
// GET  /api/site/settings                 (공개)        — 모든 방문자가 페이지를 열 때 현재 계절 배경을 받아 간다
// POST /api/admin/site/seasonal-theme     (requireAdmin) — 관리자 페이지 "이벤트 디자인 적용"에서 켜기/끄기
//
// 계절 배경은 값 하나(seasonalTheme)로 저장하므로 동시에 두 개가 켜질 수 없다 —
// 할로윈이 켜진 상태에서 크리스마스를 켜면 값이 'christmas' 로 바뀌면서 할로윈은 자연히 꺼진다.
// 방문자마다 DB 를 읽지 않도록 메모리에 캐시하고, 관리자가 바꿀 때 캐시도 같이 바꾼다
// (서버 프로세스는 1개만 돈다 — pm2 instances 1).
// ========================================================
const mongoose = require('mongoose');
const SiteSetting = require('../models/SiteSetting');

const SEASONAL_THEMES = ['none', 'halloween', 'christmas'];
const SEASONAL_KEY = 'seasonalTheme';

let cachedSeason = null; // null = 아직 DB 에서 안 읽음

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

async function readSeason() {
  if (cachedSeason !== null) return cachedSeason;
  if (!isDbConnected()) return 'none';
  const doc = await SiteSetting.findOne({ key: SEASONAL_KEY }).lean();
  cachedSeason = SEASONAL_THEMES.includes(doc?.value) ? doc.value : 'none';
  return cachedSeason;
}

// GET /api/site/settings — 공개. 실패해도 사이트가 깨지지 않도록 기본값('none')으로 답한다.
const getSiteSettings = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, seasonalTheme: await readSeason() });
  } catch (err) {
    console.error('사이트 설정 조회 에러:', err);
    res.json({ ok: true, seasonalTheme: 'none' });
  }
};

// POST /api/admin/site/seasonal-theme { theme: 'none' | 'halloween' | 'christmas' }
const setSeasonalTheme = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    const theme = String(req.body?.theme || '').trim();
    if (!SEASONAL_THEMES.includes(theme)) {
      return res.status(400).json({ error: '알 수 없는 디자인입니다.' });
    }
    await SiteSetting.findOneAndUpdate(
      { key: SEASONAL_KEY },
      { $set: { value: theme, updatedBy: req.auth?.nickname || '관리자' } },
      { upsert: true, new: true },
    );
    cachedSeason = theme;
    res.json({ ok: true, seasonalTheme: theme });
  } catch (err) {
    console.error('이벤트 디자인 변경 에러:', err);
    res.status(500).json({ error: '이벤트 디자인을 바꾸지 못했습니다.' });
  }
};

module.exports = { getSiteSettings, setSeasonalTheme, SEASONAL_THEMES };
