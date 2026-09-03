/* ======================================================================
 * 공지사항(Notice) 컨트롤러
 * ----------------------------------------------------------------------
 * "전체 공지(notice)"와 "새 소식(news)" 두 카테고리를 다루는 게시물 CRUD.
 * 목록/상세 조회는 누구나 가능하지만, 작성·수정·고정·삭제는 라우터
 * (routes/noticeRoutes.js)에서 requireAdmin 미들웨어로 관리자만 허용한다
 * (이 파일 자체에는 권한 검사 코드가 없음 — 라우터 계층에서 이미 막힘).
 * 유튜브 커뮤니티 게시물을 자동으로 "새 소식"에 동기화하는 기능도 포함한다.
 * ====================================================================== */
const Notice = require('../models/Notice');
const { broadcastNoticeNotification } = require('../utils/notificationService');
const {
  syncYoutubeCommunityPosts,
  getYoutubeSyncStatus,
} = require('../utils/youtubeCommunitySync');

// 홈/목록 화면 상단에 동시에 고정할 수 있는 공지 최대 개수.
const MAX_PINNED = 5;

// 목록 정렬 규칙: 고정글이 먼저(isPinned desc) → 고정된 시각이 최신인 순(pinnedAt desc)
// → 나머지는 작성일이 최신인 순(createdAt desc).
const sortNotices = { isPinned: -1, pinnedAt: -1, createdAt: -1 };

// GET /api/notices — 공지 목록 조회(공개 API, 로그인 불필요).
// category 쿼리로 'notice'|'news'만 필터링 가능(그 외 값은 무시하고 전체 반환),
// limit 쿼리로 개수 제한(메인 페이지 미리보기 등에서 상위 N개만 가져올 때 사용).
const getNotices = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: '데이터베이스에 연결되지 않았습니다. MONGO_URI 설정을 확인하세요.',
        db: 'disconnected',
      });
    }

    const { category, limit } = req.query;
    const filter = {};

    if (category === 'notice' || category === 'news') {
      filter.category = category;
    }

    let query = Notice.find(filter).sort(sortNotices);

    if (limit) {
      const num = parseInt(limit, 10);
      if (Number.isFinite(num) && num > 0) {
        query = query.limit(num);
      }
    }

    const notices = await query;
    res.json(notices);
  } catch (err) {
    console.error('공지 목록 조회 에러:', err);
    res.status(500).json({ error: '공지 목록 조회 실패' });
  }
};

// GET /api/notices/:id — 공지 상세 조회(공개 API).
const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
    }
    res.json(notice);
  } catch (err) {
    res.status(500).json({ error: '공지 조회 실패' });
  }
};

// POST /api/notices — 새 공지 작성(관리자 전용, 라우터에서 requireAdmin으로 보호).
// 제목/내용은 필수, category는 'notice'|'news' 둘 중 하나만 허용.
// summary(요약)를 안 주면 본문(content)에서 앞 200자를 잘라 자동 생성.
// 저장 성공 후에는 broadcastNoticeNotification()으로 전체 유저에게 알림을 비동기
// 발송한다 — 알림 발송 실패가 공지 등록 자체를 실패시키지 않도록 await 없이
// .catch()로 에러만 로그로 남기고 응답은 그대로 진행한다.
const createNotice = async (req, res) => {
  try {
    const { title, content, summary, category, author } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
    }

    if (!['notice', 'news'].includes(category)) {
      return res.status(400).json({ error: '분류는 notice(전체 공지) 또는 news(새소식)여야 합니다.' });
    }

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      summary: (summary || content).trim().slice(0, 200),
      category,
      author: author || '관리자',
    });

    broadcastNoticeNotification(notice).catch((err) => {
      console.error('공지 알림 발송 실패:', err.message);
    });

    res.status(201).json({ success: true, notice });
  } catch (err) {
    console.error('공지 등록 에러:', err);
    res.status(500).json({ error: '공지 등록 실패' });
  }
};

// PUT/PATCH /api/notices/:id — 기존 공지 수정(관리자 전용).
// 각 필드는 req.body에 값이 있을 때만(undefined가 아닐 때만) 갱신하는 "부분 수정"
// 방식 — title/content는 채워져 있으면 그대로 덮어쓰되 빈 문자열은 거부(400).
// summary(요약) 처리 규칙:
//  - summary가 명시적으로 왔고 값이 있으면 그 값을 사용(최대 200자).
//  - summary가 왔지만 빈 문자열이면 "비워서 자동 재생성" 의도로 보고 본문 앞
//    200자로 대체.
//  - summary는 안 왔는데 content만 바뀌었고 기존 summary도 비어있었다면
//    새 본문 앞 200자로 채워준다(요약이 계속 빈 채로 남지 않도록).
// 알림(broadcastNoticeNotification)은 createNotice와 달리 수정 시에는 재발송하지 않는다.
const updateNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
    }

    const { title, content, summary, category } = req.body;

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) {
        return res.status(400).json({ error: '제목은 비울 수 없습니다.' });
      }
      notice.title = t;
    }

    if (content !== undefined) {
      const c = String(content).trim();
      if (!c) {
        return res.status(400).json({ error: '내용은 비울 수 없습니다.' });
      }
      notice.content = c;
    }

    if (category !== undefined) {
      if (!['notice', 'news'].includes(category)) {
        return res.status(400).json({ error: '분류는 notice(전체 공지) 또는 news(새소식)여야 합니다.' });
      }
      notice.category = category;
    }

    if (summary !== undefined) {
      const s = String(summary).trim();
      if (s) {
        notice.summary = s.slice(0, 200);
      } else {
        // 요약 비우면 본문 앞부분으로 대체
        notice.summary = (notice.content || '').trim().slice(0, 200);
      }
    } else if (content !== undefined && !(notice.summary || '').trim()) {
      notice.summary = notice.content.trim().slice(0, 200);
    }

    await notice.save();
    res.json({ success: true, notice });
  } catch (err) {
    console.error('공지 수정 에러:', err);
    res.status(500).json({ error: '공지 수정 실패' });
  }
};

// PATCH /api/notices/:id/pin — 공지 상단 고정 토글(관리자 전용).
// 이미 고정된 글이면 고정 해제, 아니면 고정 시도 — 단, 동시에 고정 가능한 개수는
// MAX_PINNED(5)개로 제한되어 있어 이미 5개가 고정된 상태에서 새로 고정하려 하면 400.
// 고정 시 pinnedAt에 현재 시각을 기록해 sortNotices의 2차 정렬 기준(최근 고정 우선)에 사용.
const togglePin = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
    }

    if (notice.isPinned) {
      notice.isPinned = false;
      notice.pinnedAt = undefined;
    } else {
      const pinnedCount = await Notice.countDocuments({ isPinned: true });
      if (pinnedCount >= MAX_PINNED) {
        return res.status(400).json({ error: `고정은 최대 ${MAX_PINNED}개까지 가능합니다.` });
      }
      notice.isPinned = true;
      notice.pinnedAt = new Date();
    }

    await notice.save();
    res.json({ success: true, notice });
  } catch (err) {
    console.error('공지 고정 에러:', err);
    res.status(500).json({ error: '공지 고정 처리 실패' });
  }
};

// DELETE /api/notices/:id — 공지 삭제(관리자 전용). 되돌릴 수 없는 하드 삭제.
const deleteNotice = async (req, res) => {
  try {
    const deleted = await Notice.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '공지 삭제 실패' });
  }
};

// POST /api/notices/youtube-sync — 유튜브 커뮤니티 게시물을 가져와 "새 소식"으로
// 자동 등록하는 동기화를 수동으로 트리거(관리자 전용). 실제 크롤링/파싱/저장 로직은
// utils/youtubeCommunitySync.js의 syncYoutubeCommunityPosts()가 담당하고, 이 컨트롤러는
// 그 결과를 HTTP 상태 코드로 변환하는 얇은 래퍼 역할만 한다:
//  - 이미 동기화가 진행 중이면 409(중복 실행 방지)
//  - DB 미연결이면 503, 그 외 실패는 502(외부 서비스 연동 실패로 간주)
const syncYoutubePosts = async (req, res) => {
  try {
    const result = await syncYoutubeCommunityPosts();
    if (result && result.reason === 'already-running') {
      return res.status(409).json({ error: '이미 동기화가 진행 중입니다.', result });
    }
    if (!result?.ok) {
      const status = result?.error === 'database-disconnected' ? 503 : 502;
      return res.status(status).json({ error: result?.error || '유튜브 동기화 실패', result });
    }
    res.json({ success: true, result });
  } catch (err) {
    console.error('유튜브 동기화 API 에러:', err);
    res.status(500).json({ error: '유튜브 동기화 실패' });
  }
};

// GET /api/notices/youtube-sync/status — 마지막/현재 유튜브 동기화 진행 상태 조회
// (관리자 전용, 폴링용). 실제 상태 값은 youtubeCommunitySync.js가 메모리에 들고 있는
// 것을 그대로 내려준다.
const getYoutubeSyncState = async (_req, res) => {
  try {
    res.json({ success: true, status: getYoutubeSyncStatus() });
  } catch (err) {
    res.status(500).json({ error: '유튜브 동기화 상태 조회 실패' });
  }
};

module.exports = {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  togglePin,
  deleteNotice,
  syncYoutubePosts,
  getYoutubeSyncState,
  MAX_PINNED,
};