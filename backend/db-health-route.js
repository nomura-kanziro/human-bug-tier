// Oracle DB 연결 확인용 라우트: GET /db-health
const express = require('express');
const { query } = require('./db');

const router = express.Router();

router.get('/db-health', async (req, res) => {
  try {
    const result = await query('SELECT 1 AS OK FROM DUAL');
    res.json({ ok: true, rows: result.rows });
  } catch (err) {
    console.error('[db-health]', err);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
