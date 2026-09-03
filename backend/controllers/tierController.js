/* ======================================================================
 * tierController.js — 커스텀 티어 메이커 게시판(TierList) CRUD 컨트롤러
 * ----------------------------------------------------------------------
 * 프론트의 "커스텀 티어 제작" 게시판(목록/상세/글쓰기/수정/삭제/추천/신고)이
 * 호출하는 API 핸들러 모음이다. 인증은 JWT 기반 getActor(req)로 처리하며,
 * "글쓴이 = actor.nickname" 비교로 소유권을 검증한다(로그인 세션과 별개로
 * 닉네임 매칭 방식 — isTierListOwner/getVoterKey 헬퍼 참고).
 * ====================================================================== */
const TierList = require('../models/TierList');
const TierLike = require('../models/TierLike');
const TierPostComment = require('../models/TierPostComment');
const { getActor } = require('../utils/jwtAuth');
const { isTierListOwner, getVoterKey } = require('../utils/ownership');

// ====== 게시글 목록 조회 (검색 / 글쓴이 필터 / 마이페이지용 mine=true) ======
const getAllTierLists = async (req, res) => {
  try {
    const { search, author, mine } = req.query;
    const actor = getActor(req);

    // mine=true 는 "내 글 전체보기"(비공개 포함) 용도 — 본인 글일 때만 isPublic 필터를 건너뛴다.
    // 조건: ①mine=true ②author 쿼리로 조회 대상 지정 ③실제 로그인한 actor 의 닉네임이
    //       그 author 와 일치할 때만 통과 → 마이페이지에서 "내가 쓴 글" 목록을 비공개 글까지
    //       포함해서 볼 수 있게 하되, 남의 닉네임을 author 로 넣어 mine=true 를 붙여도
    //       actor 불일치로 우회 조회가 불가능하도록 막는다.
    const isOwnerRequest = mine === 'true' && Boolean(author) && actor?.nickname === author;
    // 본인 요청이 아니면 기본적으로 공개(isPublic:true) 게시글만 노출한다.
    const filter = isOwnerRequest ? {} : { isPublic: true };

    if (author) {
      filter.author = author;
    }

    // 검색어는 제목/작성자/설명 3개 필드에 대해 대소문자 무시 부분일치(정규식 OR)로 매칭
    if (search) {
      const keyword = search.trim();
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { author: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    // 최신 작성순 정렬로 목록 반환
    const tierLists = await TierList.find(filter).sort({ createdAt: -1 });
    res.json(tierLists);
  } catch (err) {
    console.error('티어 리스트 목록 조회 실패:', err);
    res.status(500).json({ error: '티어 리스트 불러오기 실패' });
  }
};

// ====== 게시글 상세 조회 (조회수 증가 + 내가 추천했는지 여부 포함) ======
const getTierListById = async (req, res) => {
  try {
    const tierList = await TierList.findById(req.params.id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 상세 조회할 때마다 조회수 +1 (누가 봐도 무조건 증가 — 중복 방지 로직 없음)
    tierList.viewCount += 1;
    await tierList.save();

    // 현재 접속자가 이 글을 이미 추천했는지 TierLike 컬렉션에서 확인
    // (voterKey = 로그인 유저 식별용 키, getVoterKey 헬퍼가 생성)
    const actor = getActor(req);
    let likedByMe = false;
    if (actor?.nickname) {
      const voterKey = getVoterKey(actor);
      likedByMe = Boolean(await TierLike.findOne({ tierListId: tierList._id, voterKey }));
    }

    // 응답 객체에 likedByMe 플래그를 얹어서 프론트가 "추천됨" 버튼 상태를 바로 반영할 수 있게 함
    const payload = tierList.toObject();
    payload.likedByMe = likedByMe;

    res.json(payload);
  } catch (err) {
    console.error('티어 리스트 상세 조회 실패:', err);
    res.status(500).json({ error: '티어 리스트 조회 실패' });
  }
};

// ====== 게시글 작성 (로그인 필수 / 제목·티어데이터 필수 검증) ======
const createTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const {
      title,
      description = '',
      tierData,
      thumbnail = '',
      isPublic = true,
      tags = [],
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: '제목은 필수입니다.' });
    }

    if (!tierData || typeof tierData !== 'object') {
      return res.status(400).json({ error: '티어 데이터가 필요합니다.' });
    }

    const newTierList = new TierList({
      title: title.trim(),
      description: description.trim(),
      tierData,
      author: actor.nickname,
      authorEmail: actor.email || '',
      thumbnail,
      isPublic,
      tags,
    });

    const savedTierList = await newTierList.save();
    res.status(201).json({ success: true, tierList: savedTierList });
  } catch (err) {
    console.error('티어 리스트 저장 실패:', err);
    res.status(500).json({ error: '티어 리스트 저장 실패' });
  }
};

// ====== 게시글 추천(좋아요) — 1인 1회 제한, 취소 기능은 없음(추가만) ======
const likeTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const tierList = await TierList.findById(req.params.id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // voterKey(유저별 고유 식별자) + tierListId 조합으로 이미 추천했는지 조회
    const voterKey = getVoterKey(actor);
    const existingLike = await TierLike.findOne({ tierListId: tierList._id, voterKey });

    // 중복 추천 방지 — 이미 추천 기록이 있으면 400과 함께 현재 likeCount를 그대로 돌려줌
    if (existingLike) {
      return res.status(400).json({
        error: '이미 추천한 게시글입니다.',
        likeCount: tierList.likeCount,
        likedByMe: true,
      });
    }

    // TierLike 문서 생성(추천 기록) + TierList.likeCount 증가를 함께 처리
    await TierLike.create({ tierListId: tierList._id, voterKey });
    tierList.likeCount += 1;
    await tierList.save();

    res.json({ success: true, likeCount: tierList.likeCount, likedByMe: true });
  } catch (err) {
    console.error('티어 리스트 추천 실패:', err);
    res.status(500).json({ error: '추천 처리 실패' });
  }
};

/** 본인 게시글만 제목·설명·티어 배치·썸네일 수정 */
// ====== 게시글 수정 — 본인 소유 확인 + 필드별 부분 수정(undefined면 미변경) ======
const updateTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const tierList = await TierList.findById(req.params.id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 글쓴이 닉네임(tierList.author)과 요청자 닉네임(actor.nickname)이 다르면 수정 금지
    if (!isTierListOwner(tierList, actor)) {
      return res.status(403).json({ error: '본인 게시글만 수정할 수 있습니다.' });
    }

    // body 에 넘어온 필드만 골라서 개별적으로 undefined 체크 후 반영(부분 업데이트 패턴)
    const {
      title,
      description,
      tierData,
      thumbnail,
      isPublic,
      tags,
    } = req.body || {};

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) {
        return res.status(400).json({ error: '제목은 비울 수 없습니다.' });
      }
      tierList.title = t;
    }

    if (description !== undefined) {
      tierList.description = String(description).trim();
    }

    if (tierData !== undefined) {
      if (!tierData || typeof tierData !== 'object') {
        return res.status(400).json({ error: '티어 데이터가 필요합니다.' });
      }
      tierList.tierData = tierData;
    }

    if (thumbnail !== undefined) {
      tierList.thumbnail = String(thumbnail || '');
    }

    if (isPublic !== undefined) {
      tierList.isPublic = Boolean(isPublic);
    }

    if (tags !== undefined) {
      tierList.tags = Array.isArray(tags) ? tags : [];
    }

    // author / likeCount / viewCount / reported 는 유지
    const saved = await tierList.save();
    res.json({ success: true, tierList: saved });
  } catch (err) {
    console.error('티어 리스트 수정 실패:', err);
    res.status(500).json({ error: '게시글 수정 실패' });
  }
};

// ====== 게시글 삭제 — 본인 소유만 가능, 연관된 댓글/추천 기록도 함께 정리 ======
const deleteTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const tierList = await TierList.findById(req.params.id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (!isTierListOwner(tierList, actor)) {
      return res.status(403).json({ error: '본인 게시글만 삭제할 수 있습니다.' });
    }

    // 게시글 자체 + 그 글에 달린 모든 댓글(TierPostComment) + 추천 기록(TierLike)을
    // 병렬로 함께 삭제하여 고아 데이터가 남지 않도록 함
    await Promise.all([
      TierList.findByIdAndDelete(req.params.id),
      TierPostComment.deleteMany({ tierListId: req.params.id }),
      TierLike.deleteMany({ tierListId: req.params.id }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('티어 리스트 삭제 실패:', err);
    res.status(500).json({ error: '게시글 삭제 실패' });
  }
};

// ====== 게시글 신고 — 본인 글 신고 금지 + 중복 신고 방지, 관리자 처리 대기 상태로 표시 ======
const reportTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { reason = '', detail = '' } = req.body || {};
    const tierList = await TierList.findById(req.params.id);

    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 본인 게시글은 신고 불가 (owner 체크는 updateTierList/deleteTierList 와 동일한 헬퍼 사용)
    if (isTierListOwner(tierList, actor)) {
      return res.status(400).json({ error: '본인 게시글은 신고할 수 없습니다.' });
    }

    // 이미 reported=true 상태면 재신고를 막음(관리자가 신고 해제하기 전까지 1회만 접수)
    if (tierList.reported) {
      return res.status(400).json({ error: '이미 신고된 게시글입니다.' });
    }

    // reported 플래그 + 사유/상세를 저장 — 이후 admin의 adminTierReportController 가
    // 이 값을 읽어 관리자 페이지 신고 목록에 노출한다.
    tierList.reported = true;
    tierList.reportReason = (reason || '').trim();
    tierList.reportDetail = (detail || '').trim();
    await tierList.save();

    res.json({ success: true, message: '신고가 접수되었습니다.' });
  } catch (err) {
    console.error('티어 리스트 신고 실패:', err);
    res.status(500).json({ error: '게시글 신고 실패' });
  }
};

module.exports = {
  getAllTierLists,
  getTierListById,
  createTierList,
  updateTierList,
  likeTierList,
  deleteTierList,
  reportTierList,
};