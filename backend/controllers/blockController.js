// ========================================================
// blockController.js - 관리자 차단(Block) 관리 컨트롤러
// ========================================================
// 관리자 패널의 "차단" 기능(닉네임 또는 IP 단위)을 담당한다. Block 컬렉션에
// { value, type('userId'|'ip'), durationDays, blockedAt, expiresAt } 형태로 저장하며,
// expiresAt이 지나면 만료된 것으로 간주한다(별도 배치/크론 없이, 조회 시점에 청소함).
//
// 이 컬렉션은 utils/checkBlocked.js의 isUserBlocked()/findActiveBlock()이 그대로 읽어서
// 로그인 시(authController.login) 차단 여부를 판단하는 데 쓰인다. 즉:
//   - 여기(blockController.js)는 관리자가 차단을 "추가/조회/해제"하는 쓰기·조회 API이고,
//   - checkBlocked.js는 그렇게 쌓인 Block 데이터를 로그인 등 다른 곳에서 "읽기 전용"으로
//     참조해 차단 여부만 판정하는 헬퍼다.
// ========================================================
const Block = require('../models/Block');

// 관리자 화면에서 미리 제공하는 차단 기간(일) 선택지. addBlock()의 유효성 검사(1~9999일)와
// 별개로, 프론트에 "자주 쓰는 기간" 버튼을 보여주기 위한 상수 목록일 뿐이다.
const PRESET_DURATIONS = [1, 3, 7, 14, 30, 90];

// 차단 기간(일) 입력값 검증. 정수로 변환 가능하고 1~9999 범위여야 유효.
// 범위를 벗어나거나 숫자가 아니면 null을 반환해 addBlock()에서 400 처리하도록 한다.
function validateDurationDays(days) {
  const num = parseInt(days, 10);
  if (!Number.isFinite(num) || num < 1 || num > 9999) {
    return null;
  }
  return num;
}

// ========================================================
// 차단 목록 조회 (GET /api/admin/blocks)
// ========================================================
// 조회 전에 먼저 만료된 차단(expiresAt이 현재 시각 이하) 또는 expiresAt 필드 자체가 없는
// 비정상 문서를 모두 삭제해 컬렉션을 정리(lazy cleanup)한 뒤, 아직 유효한(expiresAt이 미래인)
// 차단만 최신순(createdAt 내림차순)으로 조회해 응답한다.
const getBlocks = async (req, res) => {
  try {
    const now = new Date();
    await Block.deleteMany({
      $or: [
        { expiresAt: { $lte: now } },
        { expiresAt: { $exists: false } },
      ],
    });

    const blocks = await Block.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 });
    res.json(blocks);
  } catch (err) {
    console.error('차단 목록 조회 에러:', err);
    res.status(500).json({ error: '차단 목록 조회 실패' });
  }
};

// ========================================================
// 차단 추가 (POST /api/admin/blocks)
// ========================================================
// value(닉네임 또는 IP 문자열)와 durationDays(차단 기간)를 받아 검증 후 Block 문서를 생성한다.
//   - 이미 같은 value로 "현재 유효한" 차단이 존재하면(existing.expiresAt > now) 400으로 거부
//     (중복 차단 방지)
//   - 이미 "만료된" 차단 기록이 남아있으면 새로 만들기 전에 기존 문서를 삭제하고 새로 생성
//     (재차단 시 예전 durationDays/blockedAt이 아니라 새 값으로 깨끗하게 갱신하기 위함)
//   - type: 요청에 명시적으로 'ip'가 오거나, 값 자체가 IPv4 형식(숫자.숫자.숫자.숫자)이면
//     자동으로 'ip'로 판정하고, 그 외에는 'userId'(닉네임 차단)로 저장한다.
//   - expiresAt은 현재 시각 + durationDays일로 계산해 저장한다.
const addBlock = async (req, res) => {
  try {
    const { value, type, durationDays } = req.body;
    const trimmed = (value || '').trim();
    const days = validateDurationDays(durationDays);

    if (!trimmed) {
      return res.status(400).json({ error: '차단할 ID 또는 IP를 입력해주세요.' });
    }

    if (!days) {
      return res.status(400).json({ error: '차단 기간은 1일 이상 9999일 이하로 설정해주세요.' });
    }

    const now = new Date();
    const existing = await Block.findOne({ value: trimmed });

    if (existing && existing.expiresAt > now) {
      return res.status(400).json({ error: '이미 차단된 항목입니다.' });
    }

    if (existing) {
      await Block.findByIdAndDelete(existing._id);
    }

    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const isIp = type === 'ip' || /^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed);

    const block = await Block.create({
      value: trimmed,
      type: isIp ? 'ip' : 'userId',
      durationDays: days,
      blockedAt: now,
      expiresAt,
    });

    res.status(201).json({ success: true, block });
  } catch (err) {
    console.error('차단 추가 에러:', err);
    res.status(500).json({ error: '차단 추가 실패' });
  }
};

// ========================================================
// 차단 해제 (DELETE /api/admin/blocks/:id)
// ========================================================
// Block 문서 id로 바로 삭제를 시도하고, 삭제된 문서가 없으면(이미 없거나 잘못된 id) 404.
// 만료 여부와 무관하게 관리자가 명시적으로 특정 차단 항목을 즉시 제거할 때 쓰인다.
const removeBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Block.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: '차단 항목을 찾을 수 없습니다.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('차단 해제 에러:', err);
    res.status(500).json({ error: '차단 해제 실패' });
  }
};

module.exports = { getBlocks, addBlock, removeBlock, PRESET_DURATIONS };