// ========================================================
// routes/noticeRoutes.js - 공지사항/새소식 API 라우터 (/api/notices)
// ========================================================
// 조회는 공개, 작성/수정/고정/삭제/유튜브 동기화는 관리자 전용(requireAdmin).
// 라우트 등록 순서가 중요하다: Express는 등록된 순서대로 매칭을 시도하므로
// '/youtube-sync/status' 같은 고정 경로나 '/:id/pin' 같은 더 구체적인 패턴을
// 반드시 '/:id' (동적 파라미터)보다 먼저 선언해야 한다. 그렇지 않으면 '/:id'가
// 먼저 매칭되어 "youtube-sync"를 id 값으로 오인해버린다.
// ========================================================
const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { requireAdmin } = require('../middleware/auth');

// 공개 조회 — ?category=notice|news, ?limit=n 쿼리로 필터링/개수 제한 가능 (메인 페이지 미리보기 등에서 사용)
router.get('/', noticeController.getNotices);

// 유튜브 동기화 — GET /:id 보다 먼저 등록 (위 주석 참고)
// 유튜브 커뮤니티 게시물을 가져와 공지/새소식으로 반영하는 기능의 상태 조회/수동 실행
router.get('/youtube-sync/status', requireAdmin, noticeController.getYoutubeSyncState);
router.post('/youtube-sync', requireAdmin, noticeController.syncYoutubePosts);

router.get('/:id', noticeController.getNoticeById);

// 관리자 전용 (공지 작성/수정/삭제) — /:id/pin 을 /:id 보다 먼저
router.post('/', requireAdmin, noticeController.createNotice); // 등록 시 전체 회원에게 알림 브로드캐스트
// 상단 고정 토글 — 최대 고정 개수(MAX_PINNED=5) 초과 시 거부
router.patch('/:id/pin', requireAdmin, noticeController.togglePin);
// PUT/PATCH 둘 다 동일한 updateNotice 핸들러로 연결 (부분 수정도 허용하는 구조)
router.put('/:id', requireAdmin, noticeController.updateNotice);
router.patch('/:id', requireAdmin, noticeController.updateNotice);
router.delete('/:id', requireAdmin, noticeController.deleteNotice);

module.exports = router;