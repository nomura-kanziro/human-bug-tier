// Oracle 샘플 라우트: GET /db-sample (최근 20행), POST /db-sample {name, note}
// 테이블은 scripts/init-sample.js 로 만든다.
const express = require('express');
const oracledb = require('oracledb');
const { query } = require('./db');

const router = express.Router();

// POST 남용 방지 — IP 당 1분에 10회 (메모리 기반, 프로세스 재시작 시 초기화)
const WINDOW_MS = 60 * 1000;
const MAX_POSTS = 10;
const hits = new Map();

function postLimiter(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_POSTS) {
    hits.set(ip, recent);
    return res.status(429).json({ ok: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' });
  }
  recent.push(now);
  hits.set(ip, recent);
  // 오래된 IP 기록 정리(메모리 무한 증가 방지)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  next();
}

router.get('/db-sample', async (req, res) => {
  try {
    const result = await query(
      'SELECT ID, NAME, NOTE, CREATED_AT FROM HBT_SAMPLE ORDER BY ID DESC FETCH FIRST 20 ROWS ONLY'
    );
    res.json({ ok: true, rows: result.rows });
  } catch (err) {
    console.error('[db-sample GET]', err);
    res.status(500).json({ ok: false });
  }
});

router.post('/db-sample', postLimiter, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const note = req.body?.note == null ? '' : req.body.note;
  if (name.length < 1 || name.length > 50) {
    return res.status(400).json({ ok: false, message: 'name 은 1~50자여야 합니다.' });
  }
  if (typeof note !== 'string' || note.length > 200) {
    return res.status(400).json({ ok: false, message: 'note 는 0~200자 문자열이어야 합니다.' });
  }
  try {
    const result = await query(
      'INSERT INTO HBT_SAMPLE (NAME, NOTE) VALUES (:name, :note) RETURNING ID INTO :id',
      { name, note: note || null, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } }
    );
    res.status(201).json({ ok: true, id: result.outBinds.id[0] });
  } catch (err) {
    console.error('[db-sample POST]', err);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
