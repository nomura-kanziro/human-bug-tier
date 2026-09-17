// 신고 사유 선택 모달 (custom-maker_post.js / post_detail.js 의 openReportModal 이식).
// 신고는 "정지"가 아니라 접수이며, 실제 처리는 관리자 화면에서 한다.
import { useState } from 'react';
import { REPORT_REASONS } from '../lib/boardApi';

export default function ReportModal({ title, onClose, onSubmit }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [etc, setEtc] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const finalReason = reason === '기타' ? etc.trim() : reason;
    if (!finalReason) { window.alert('신고 사유를 입력해주세요.'); return; }
    setBusy(true);
    try {
      await onSubmit(finalReason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="report-reason-list">
          {REPORT_REASONS.map((r) => (
            <label className="report-reason-item" key={r}>
              <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              <span>{r}</span>
            </label>
          ))}
        </div>
        {reason === '기타' && (
          <textarea
            className="report-etc-input"
            placeholder="신고 사유를 입력해주세요"
            rows={3}
            value={etc}
            onChange={(e) => setEtc(e.target.value)}
          />
        )}
        <div className="report-modal-actions">
          <button type="button" className="report-cancel-btn" onClick={onClose} disabled={busy}>취소</button>
          <button type="button" className="report-submit-btn" onClick={submit} disabled={busy}>
            {busy ? '접수 중...' : '신고하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
