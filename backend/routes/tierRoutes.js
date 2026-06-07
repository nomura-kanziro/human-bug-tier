const express = require('express');
const router = express.Router();
const { getAllTierLists, createTierList } = require('../controllers/tierController');

// GET /api/tierlists - 모든 티어 리스트 조회
router.get('/', getAllTierLists);

// POST /api/tierlists - 티어 리스트 저장
router.post('/', createTierList);

module.exports = router;