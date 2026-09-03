/* ======================================================================
 * 알림(Notification) 컨트롤러 — 헤더 알림벨 + 알림 상세 페이지 백엔드
 * ----------------------------------------------------------------------
 * 여기서는 이미 생성되어 DB에 쌓인 알림을 "조회 / 읽음 처리 / 삭제 / 설정
 * 변경"만 담당한다. 알림을 실제로 만들어내는 로직(누구에게 어떤 문구로 보낼지,
 * 딥링크 payload를 어떻게 구성할지 등)은 utils/notificationService.js에 있고
 * (해당 파일은 이 작업 범위 밖 — 다른 에이전트가 별도로 주석 작업 중),
 * noticeController.js의 broadcastNoticeNotification() 같은 곳에서 호출된다.
 * 이 컨트롤러의 라우트는 모두 routes/notificationRoutes.js에서 requireAuth로
 * 보호되며, 아래 getRecipient()로 "로그인된 본인" 여부까지 다시 한번 확인한다
 * — 조회/수정 대상은 항상 recipientNickname === 본인 닉네임으로 한정해
 * 타인의 알림에 접근할 수 없게 막는다.
 * ====================================================================== */
const Notification = require('../models/Notification');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { DEFAULT_SETTINGS, getUserSettings } = require('../utils/notificationService');

// 요청자의 인증 정보(req.auth, 인증 미들웨어가 주입)에서 알림 조회에 필요한
// 최소 정보만 뽑아낸다. 닉네임이 없으면(=로그인 안 됨) null을 반환해 각 핸들러가
// 바로 401을 응답하도록 한다.
function getRecipient(req) {
  if (!req.auth?.nickname) return null;
  return {
    nickname: String(req.auth.nickname).trim(),
    email: String(req.auth.email || '').trim().toLowerCase(),
    isAdmin: Boolean(req.auth.isAdmin),
  };
}

// GET /api/notifications — 로그인한 유저 본인의 알림 목록(최신순)을 가져온다.
// limit 쿼리로 개수를 조절할 수 있지만 최대 100건으로 상한을 걸어 과도한 조회를 막는다
// (기본값 50). 상세 페이지의 탭 분류/정렬/필터는 이 응답 하나를 프론트(common.js의
// NOTIFICATION_GROUPS)에서 클라이언트 처리하며, 서버에 별도 필터 API는 없다.
const getNotifications = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const notifications = await Notification.find({ recipientNickname: recipient.nickname })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(notifications);
  } catch (err) {
    console.error('알림 목록 조회 실패:', err);
    res.status(500).json({ error: '알림 목록 조회 실패' });
  }
};

// GET /api/notifications/unread-count — 안 읽은 알림 개수만 반환.
// 헤더 알림벨의 빨간 배지(뱃지 숫자) 표시용으로 가벼운 count 쿼리만 수행한다.
const getUnreadCount = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const count = await Notification.countDocuments({
      recipientNickname: recipient.nickname,
      read: false,
    });

    res.json({ count });
  } catch (err) {
    console.error('미읽음 알림 수 조회 실패:', err);
    res.status(500).json({ error: '미읽음 알림 수 조회 실패' });
  }
};

// PATCH /api/notifications/:id/read — 알림 하나를 읽음 처리.
// (딥링크 클릭 시 common.js의 handleNotificationClick()이 이 API를 호출한 뒤
// 실제 이동을 수행하는 흐름 — 이 컨트롤러는 읽음 처리만 담당하고 이동 URL 계산은
// 프론트 책임이다.)
// 조회 조건에 recipientNickname을 함께 걸어, id만 안다고 타인의 알림을 읽음
// 처리할 수 없도록(권한 우회 방지) 막는다 — 없으면(다른 사람 것이거나 존재하지
// 않으면) 404.
const markAsRead = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipientNickname: recipient.nickname,
    });

    if (!notification) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (err) {
    console.error('알림 읽음 처리 실패:', err);
    res.status(500).json({ error: '알림 읽음 처리 실패' });
  }
};

// PATCH /api/notifications/read-all — 본인의 안 읽은 알림을 전부 읽음 처리.
// updateMany로 read:false인 것만 골라 한 번에 갱신(이미 읽은 건 건드리지 않음).
const markAllAsRead = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    await Notification.updateMany(
      { recipientNickname: recipient.nickname, read: false },
      { $set: { read: true } },
    );

    res.json({ success: true });
  } catch (err) {
    console.error('전체 읽음 처리 실패:', err);
    res.status(500).json({ error: '전체 읽음 처리 실패' });
  }
};

// GET /api/notifications/settings — 알림 수신 설정 조회(유형별 on/off).
// 실제 설정값 계산(계정에 저장된 값 + 기본값 병합)은 notificationService의
// getUserSettings()에 위임 — 이 컨트롤러는 로그인 여부만 확인하고 그대로 전달한다.
const getSettings = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const settings = await getUserSettings(recipient.nickname);
    res.json(settings);
  } catch (err) {
    console.error('알림 설정 조회 실패:', err);
    res.status(500).json({ error: '알림 설정 조회 실패' });
  }
};

// DELETE /api/notifications — 본인의 알림 기록을 전부 삭제("알림 지우기" 등).
// deleteMany의 결과(deletedCount)를 그대로 응답에 실어 몇 건 지워졌는지 알려준다.
const deleteAllNotifications = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const result = await Notification.deleteMany({
      recipientNickname: recipient.nickname,
    });

    res.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (err) {
    console.error('알림 기록 삭제 실패:', err);
    res.status(500).json({ error: '알림 기록 삭제 실패' });
  }
};

// PATCH /api/notifications/settings — 알림 수신 설정 변경.
// 계정 종류(관리자/일반 유저)에 따라 서로 다른 컬렉션(Admin/User)에 저장된
// notificationSettings 필드를 갱신한다 — 알림 설정 자체는 별도 모델 없이 각 계정
// 문서에 함께 저장되는 구조.
// 허용 키(allowedKeys)만 화이트리스트로 받아들이며, 각 값이 boolean일 때만 반영
// (그 외 타입이거나 목록에 없는 키는 무시) — 요청 바디로 임의 필드를 주입하는
// 것을 방지. 기존 설정(DEFAULT_SETTINGS + 계정에 저장된 값)에 덮어쓰는 방식이라
// body에 없는 키는 기존 값이 그대로 유지된다.
const updateSettings = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const allowedKeys = ['enabled', 'tierBoard', 'inquiry', 'noticeNews'];
    const account = recipient.isAdmin
      ? await Admin.findOne({ name: recipient.nickname })
      : await User.findOne({ nickname: recipient.nickname });

    if (!account) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const nextSettings = { ...DEFAULT_SETTINGS, ...(account.notificationSettings || {}) };

    allowedKeys.forEach((key) => {
      if (typeof req.body?.[key] === 'boolean') {
        nextSettings[key] = req.body[key];
      }
    });

    account.notificationSettings = nextSettings;
    await account.save();

    res.json({ success: true, settings: nextSettings });
  } catch (err) {
    console.error('알림 설정 저장 실패:', err);
    res.status(500).json({ error: '알림 설정 저장 실패' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  getSettings,
  updateSettings,
};