const Inquiry = require('../models/Inquiry');

// 문의 등록 (테스트용 임시 버전)
exports.createInquiry = async (req, res) => {
  try {
    const { title, message, userId = "테스트유저" } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "제목과 내용은 필수입니다." });
    }

    const newInquiry = new Inquiry({
      userId: userId,
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
    const { message } = req.body;
    const user = req.user;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });

    inquiry.answers.push({
      userId: user.nickname,
      isAdmin: user.isAdmin || false,
      message,
    });

    await inquiry.save();
    res.json({ success: true, inquiry });
  } catch (err) {
    res.status(500).json({ error: '답변 등록 실패' });
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
  getInquiries: exports.getInquiries,
  updateInquiry: exports.updateInquiry,
  deleteInquiry: exports.deleteInquiry,
  updateAnswer: exports.updateAnswer,
  addAnswer: exports.addAnswer,
  reportInquiry: exports.reportInquiry,
};