// ========================================================
// routes/tierRoutes.js - 커스텀 티어 게시글 + 댓글 API 라우터 (/api/tierlists)
// ========================================================
// 이 라우터는 requireAuth/requireAdmin이 아니라 optionalAuth를 라우터 전체에
// 공통 적용한다(router.use). optionalAuth는 토큰이 있으면 req.auth를 채우고
// 없어도 그냥 통과시킨다 — 각 컨트롤러는 utils/jwtAuth의 getActor(req)로
// "누가 요청했는지"를 판단하는데, getActor는 req.auth(JWT 로그인)가 없으면
// req.body의 author/nickname 값으로 폴백한다. 즉 이 게시판은 로그인 없이도
// 닉네임만으로 글/댓글을 쓸 수 있는 구조이며, 작성/수정/삭제 등 실제 소유권이
// 필요한 동작은 각 컨트롤러 내부에서 actor.nickname 유무 및
// isTierListOwner/isCommentOwner 비교로 개별 검사한다(라우터 단에서
// 미들웨어로 막지 않음).
// ========================================================
const express = require('express');
const router = express.Router();
const {
  getAllTierLists,
  getTierListById,
  createTierList,
  updateTierList,
  likeTierList,
  deleteTierList,
  reportTierList,
} = require('../controllers/tierController');
const {
  getTierComments,
  createTierComment,
  updateTierComment,
  deleteTierComment,
  reportTierComment,
} = require('../controllers/tierCommentController');
const { optionalAuth } = require('../middleware/auth');

// 이 라우터의 모든 하위 경로에 공통 적용 — 이후 각 핸들러에서 req.auth로 로그인 여부 참조 가능
router.use(optionalAuth);

router.get('/', getAllTierLists); // 목록 조회 — ?search=, ?author=, ?mine=true(본인 비공개 글 포함) 쿼리 지원
router.get('/:id/comments', getTierComments);
router.post('/:id/comments', createTierComment);
router.patch('/:id/comments/:commentId', updateTierComment);
router.delete('/:id/comments/:commentId', deleteTierComment);
router.post('/:id/comments/:commentId/report', reportTierComment);
router.post('/:id/report', reportTierList); // 본인 글은 신고 불가, 이미 신고된 글 중복 신고 불가(컨트롤러에서 검사)
router.get('/:id', getTierListById);        // 상세 조회 시 viewCount 1 증가 + 현재 유저의 좋아요 여부(likedByMe) 포함
router.post('/', createTierList);           // 새 게시글 등록 (로그인 필요 — actor.nickname 없으면 401)
router.patch('/:id/like', likeTierList);    // 좋아요 — voterKey(닉네임/이메일 기반) 단위로 중복 방지
router.put('/:id', updateTierList);         // PUT/PATCH 모두 같은 핸들러 — 본인 게시글만 수정 가능(소유자 검사)
router.patch('/:id', updateTierList);
router.delete('/:id', deleteTierList);      // 게시글 삭제 시 관련 댓글/좋아요 레코드도 함께 정리

module.exports = router;