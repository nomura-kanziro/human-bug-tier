const Inquiry = require('../models/Inquiry');
const getClientIp = require('../utils/getClientIp');
const { isUserBlocked } = require('../utils/checkBlocked');
const {
  notifyInquiryAnswer,
  notifyInquiryMention,
} = require('../utils/notificationService');

// 문의 등록 (테스트용 임시 버전)
exports.createInquiry = async (req, res) => {
  try {
    const { title, message, userId = "테스트유저" } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "제목과 내용은 필수입니다." });
    }

    const clientIp = getClientIp(req);
    const block = await isUserBlocked(userId, clientIp);
    if (block) {
      return res.status(403).json({
        error: '관리자로 인해 차단당했습니다.',
        blocked: true,
      });
    }

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

// 단일 문의 조회
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

// 전체 문의 목록 조회
exports.getInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: '목록 조회 실패' });
  }
};

// 문의 수정
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

// 문의 삭제
exports.deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    await Inquiry.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '삭제 실패' });
  }
};

// 전체 문의 삭제 (관리자용)
exports.deleteAllInquiries = async (req, res) => {
  try {
    await Inquiry.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '전체 삭제 실패' });
  }
};

// 답변 수정
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

// 답변 등록
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

    if (quotedUser) answer.quotedUser = quotedUser;
    if (quotedMessage) answer.quotedMessage = quotedMessage;

    inquiry.answers.push(answer);

    await inquiry.save();

    const savedAnswer = inquiry.answers[inquiry.answers.length - 1];
    const answerId = savedAnswer?._id || null;
    const actor = { nickname: (userId || '').trim(), email: '' };
    const quoted = (quotedUser || '').trim();

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

// 답변 삭제
exports.deleteAnswer = async (req, res) => {
  try {
    const { id, answerId } = req.params;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });

    const answer = inquiry.answers.id(answerId);
    if (!answer) return res.status(404).json({ error: '답변을 찾을 수 없습니다.' });

    inquiry.answers.pull(answerId);
    await inquiry.save();

    res.json({ success: true, inquiry });
  } catch (err) {
    console.error('답변 삭제 에러:', err);
    res.status(500).json({ error: '답변 삭제 실패' });
  }
};

// 답변 신고
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

// 신고하기
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