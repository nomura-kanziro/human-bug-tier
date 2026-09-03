/* ======================================================================
 * inquiryController.js — 문의하기(Contact Us) 컨트롤러
 * ----------------------------------------------------------------------
 * 프론트 Contact_us/contact_us.js(이미 주석 완료)가 호출하는 문의 등록/조회/
 * 수정/삭제 + 답변(댓글) 등록/수정/삭제 + 신고 API 모음이다.
 *
 * 주의: 이 컨트롤러에는 getActor(JWT) 기반 로그인 검증이나 소유권(owner) 체크가
 * 없다 — updateInquiry/deleteInquiry/updateAnswer/deleteAnswer 등이 본인 글/
 * 답변인지 확인하지 않고 req.params.id 만으로 즉시 처리한다. 아래 createInquiry
 * 의 "테스트용 임시 버전"이라는 기존 주석과 userId 기본값 "테스트유저",
 * 그리고 파일 중간의 주석 처리된 "정식 버전"(로그인 미들웨어의 req.user 사용
 * 예정) 구현을 보면, 이 파일 전체가 아직 로그인 연동 이전의 임시/개발 단계
 * 코드로 남아있는 것으로 보인다. 프론트 쪽 권한 UI(본인 글만 수정 버튼 노출 등)에
 * 의존하고 있을 가능성이 높으므로 이 부분은 실제 배포 시 강화가 필요할 수 있다.
 * 답변 등록 시 notificationService 를 통해 문의 작성자 또는 멘션 대상에게
 * 알림을 비동기로 발송한다(다른 컨트롤러와 동일하게 실패는 무시).
 * ====================================================================== */
const Inquiry = require('../models/Inquiry');
const getClientIp = require('../utils/getClientIp');
const { isUserBlocked } = require('../utils/checkBlocked');
const {
  notifyInquiryAnswer,
  notifyInquiryMention,
} = require('../utils/notificationService');

// ====== 문의 등록 (테스트용 임시 버전) ======
// userId 를 body 로 그대로 받아 신뢰하는 구조 — 기본값 "테스트유저"는 값이
// 없을 때 폴백. 아래쪽에 주석 처리된 "정식 버전"(req.user 사용)이 남아있어
// 향후 로그인 미들웨어 연동 시 이 함수를 교체할 예정이었던 것으로 보인다.
exports.createInquiry = async (req, res) => {
  try {
    const { title, message, userId = "테스트유저" } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "제목과 내용은 필수입니다." });
    }

    // 관리자가 차단한 유저(닉네임 또는 IP)는 문의 등록 불가
    const clientIp = getClientIp(req);
    const block = await isUserBlocked(userId, clientIp);
    if (block) {
      return res.status(403).json({
        error: '관리자로 인해 차단당했습니다.',
        blocked: true,
      });
    }

    // isAdmin: false 로 고정 — 사용자가 등록하는 문의는 항상 일반 문의
    const newInquiry = new Inquiry({
      userId: userId,
      ip: clientIp,
      isAdmin: false,
      title,
      message,
    });

    await newInquiry.save();
    res.status(201).json({ success: true, inquiry: newInquiry });
  } catch (err) {
    console.error("문의 등록 에러:", err);   // ← 중요! 실제 에러를 터미널에서 확인할 수 있게 함
    res.status(500).json({ error: '문의 등록 실패' });
  }
};

// 문의 등록
// (미사용 — 로그인 미들웨어가 req.user 를 채워주는 정식 흐름을 가정한 초안.
//  현재는 위쪽의 "테스트용 임시 버전"이 실제로 export 되어 사용 중이다.)
// exports.createInquiry = async (req, res) => {
//   try {
//     const { title, message } = req.body;
//     const user = req.user; // 로그인 미들웨어에서 넘어올 예정

//     const newInquiry = new Inquiry({
//       userId: user.nickname,
//       isAdmin: user.isAdmin || false,
//       title,
//       message,
//     });

//     await newInquiry.save();
//     res.status(201).json({ success: true, inquiry: newInquiry });
//   } catch (err) {
//     res.status(500).json({ error: '문의 등록 실패' });
//   }
// };

// ====== 단일 문의 상세 조회 (id 로 조회, 답변 목록 포함한 문서 전체 반환) ======
exports.getInquiryById = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
    }
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ error: '문의 조회 실패' });
  }
};

// ====== 전체 문의 목록 조회 (최신 작성순, 문의 게시판/관리자 페이지 공용) ======
exports.getInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: '목록 조회 실패' });
  }
};

// ====== 문의 수정 — 제목/내용만 교체 (소유권 검사 없음, id만으로 처리) ======
exports.updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message } = req.body;

    const updated = await Inquiry.findByIdAndUpdate(
      id,
      { title, message },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });

    res.json({ success: true, inquiry: updated });
  } catch (err) {
    res.status(500).json({ error: '수정 실패' });
  }
};

// ====== 문의 삭제 — 문의 문서 자체를 삭제(하위 답변은 Inquiry 스키마 내 서브도큐먼트라 함께 사라짐) ======
exports.deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    await Inquiry.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '삭제 실패' });
  }
};

// ====== 전체 문의 삭제 (관리자용) — Inquiry 컬렉션을 통째로 비움 ======
exports.deleteAllInquiries = async (req, res) => {
  try {
    await Inquiry.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '전체 삭제 실패' });
  }
};

// ====== 답변 수정 — 문의(Inquiry) 문서 내 answers 서브도큐먼트 배열에서 하나를 찾아 내용만 교체 ======
// answers 는 Inquiry 스키마에 내장된 서브도큐먼트 배열이며, .id(answerId) 는
// mongoose 서브도큐먼트 배열이 제공하는 헬퍼로 _id 매칭 요소를 찾아준다.
// 여기서도 소유권(답변 작성자 본인 여부) 검사는 없다.
exports.updateAnswer = async (req, res) => {
  try {
    const { id, answerId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: '내용은 필수입니다.' });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });

    const answer = inquiry.answers.id(answerId);
    if (!answer) return res.status(404).json({ error: '답변을 찾을 수 없습니다.' });

    answer.message = message;
    await inquiry.save();

    res.json({ success: true, inquiry });
  } catch (err) {
    console.error('답변 수정 에러:', err);
    res.status(500).json({ error: '답변 수정 실패' });
  }
};

// ====== 답변 등록 — 문의에 대한 답글 추가 (일반 유저 답글 + 관리자 답변 공용, 인용/멘션 알림 포함) ======
// isAdmin 플래그를 body 로 받아 서버가 그대로 신뢰하는 구조(관리자 여부를
// 서버에서 별도 검증하지 않음 — 프론트에서 관리자 로그인 시에만 true 로 보내는
// 것으로 추정, 위 파일 헤더 주석 참고).
exports.addAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      message,
      userId = '익명',
      isAdmin = false,
      quotedUser,
      quotedMessage,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: '답변 내용은 필수입니다.' });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });

    const answer = {
      userId,
      isAdmin: Boolean(isAdmin),
      message,
    };

    // 인용 답글(특정 유저 멘션)일 때만 quotedUser/quotedMessage 필드를 추가
    if (quotedUser) answer.quotedUser = quotedUser;
    if (quotedMessage) answer.quotedMessage = quotedMessage;

    inquiry.answers.push(answer);

    await inquiry.save();

    // 방금 push 한 답변은 배열의 마지막 요소 — save() 이후에야 mongoose가
    // 서브도큐먼트에 _id 를 부여하므로 이 시점에 꺼내서 알림에 사용한다.
    const savedAnswer = inquiry.answers[inquiry.answers.length - 1];
    const answerId = savedAnswer?._id || null;
    const actor = { nickname: (userId || '').trim(), email: '' };
    const quoted = (quotedUser || '').trim();

    // 인용 대상이 있으면 그 유저에게 멘션 알림, 없으면 문의 작성자에게 답변 알림
    // (tierCommentController 와 달리 "부모 답변 작성자" 알림 개념은 없음 — 이진 분기)
    if (quoted) {
      notifyInquiryMention(quoted, actor, message, inquiry._id, answerId).catch(() => {});
    } else {
      notifyInquiryAnswer(inquiry, actor, message, answerId).catch(() => {});
    }

    res.json({ success: true, inquiry });
  } catch (err) {
    console.error('답변 등록 에러:', err);
    res.status(500).json({ error: '답변 등록 실패' });
  }
};

// ====== 답변 삭제 — answers 서브도큐먼트 배열에서 해당 답변만 제거 (소유권 검사 없음) ======
exports.deleteAnswer = async (req, res) => {
  try {
    const { id, answerId } = req.params;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });

    const answer = inquiry.answers.id(answerId);
    if (!answer) return res.status(404).json({ error: '답변을 찾을 수 없습니다.' });

    // .pull(answerId) 는 mongoose 서브도큐먼트 배열에서 해당 _id 요소를 제거하는 헬퍼
    inquiry.answers.pull(answerId);
    await inquiry.save();

    res.json({ success: true, inquiry });
  } catch (err) {
    console.error('답변 삭제 에러:', err);
    res.status(500).json({ error: '답변 삭제 실패' });
  }
};

// ====== 답변 신고 — 특정 답변에 reported 플래그와 사유를 기록 (중복 신고 방지 로직은 없음) ======
exports.reportAnswer = async (req, res) => {
  try {
    const { id, answerId } = req.params;
    const { reason, detail } = req.body;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });

    const answer = inquiry.answers.id(answerId);
    if (!answer) return res.status(404).json({ error: '답변을 찾을 수 없습니다.' });

    answer.reported = true;
    answer.reportReason = reason || '';
    answer.reportDetail = detail || '';
    await inquiry.save();

    res.json({ success: true, message: '신고가 접수되었습니다.' });
  } catch (err) {
    console.error('답변 신고 에러:', err);
    res.status(500).json({ error: '신고 처리 실패' });
  }
};

// ====== 문의 글 자체 신고 — 문의 문서에 reported 플래그와 사유를 기록 (중복 신고 방지 로직은 없음) ======
// tierController.reportTierList 와 달리 본인 글 신고 금지 검사도 없다.
exports.reportInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, detail } = req.body;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
    }

    inquiry.reported = true;
    inquiry.reportReason = reason || '';
    inquiry.reportDetail = detail || '';
    await inquiry.save();

    res.json({ success: true, message: '신고가 접수되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '신고 처리 실패' });
  }
};

module.exports = {
  createInquiry: exports.createInquiry,
  getInquiryById: exports.getInquiryById,
  getInquiries: exports.getInquiries,
  updateInquiry: exports.updateInquiry,
  deleteInquiry: exports.deleteInquiry,
  deleteAllInquiries: exports.deleteAllInquiries,
  updateAnswer: exports.updateAnswer,
  addAnswer: exports.addAnswer,
  deleteAnswer: exports.deleteAnswer,
  reportAnswer: exports.reportAnswer,
  reportInquiry: exports.reportInquiry,
};