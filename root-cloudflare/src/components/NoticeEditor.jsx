// 관리자 공지 작성/수정 에디터 (comment-management.js 의 공지 에디터 섹션 이식)
//  - 내용은 순수 텍스트 textarea. 툴바는 마크다운 비슷한 기호를 넣어주는 "타이핑 도우미"일 뿐이고,
//    실제 렌더링은 노출 화면과 동일한 renderNoticeContent() 가 담당한다(미리보기도 같은 함수 재사용).
import { useRef, useState } from 'react';
import { renderNoticeContent } from '../lib/noticeFormat';

// 선택 영역 앞뒤를 감싸는 인라인 서식
const INLINE = {
  bold: { wrap: '**', placeholder: '굵은 텍스트' },
  italic: { wrap: '*', placeholder: '기울인 텍스트' },
  strike: { wrap: '~~', placeholder: '취소선 텍스트' },
  code: { wrap: '`', placeholder: '코드' },
};
// 줄 맨 앞에 접두어를 붙이는 줄 단위 서식
const LINE = {
  h2: { prefix: '# ', placeholder: '제목' },
  h3: { prefix: '## ', placeholder: '소제목' },
  ul: { prefix: '- ', placeholder: '항목' },
  ol: { prefix: '1. ', placeholder: '항목' },
  quote: { prefix: '> ', placeholder: '인용문' },
};

const TOOLS = [
  ['h2', '제목'], ['h3', '소제목'], ['bold', 'B'], ['italic', 'I'], ['strike', 'S'], ['code', '</>'],
  ['ul', '• 목록'], ['ol', '1. 목록'], ['quote', '❝ 인용'], ['link', '🔗 링크'], ['hr', '— 구분선'],
];

export default function NoticeEditor({ form, onChange, onSubmit, onCancelEdit, isEdit, busy }) {
  const textareaRef = useRef(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const set = (patch) => onChange({ ...form, ...patch });

  // setRangeText 는 실행취소(Ctrl+Z) 스택을 깨지 않으므로 value 직접 대입 대신 이걸 쓴다
  const replaceSelection = (newText, selStart, selEnd) => {
    const ta = textareaRef.current;
    ta.setRangeText(newText, ta.selectionStart, ta.selectionEnd, 'end');
    ta.focus();
    if (selStart !== undefined) ta.setSelectionRange(selStart, selEnd ?? selStart);
    set({ content: ta.value });
  };

  const applyFormat = (format) => {
    const ta = textareaRef.current;
    if (!ta) return;

    if (INLINE[format]) {
      const { wrap, placeholder } = INLINE[format];
      const start = ta.selectionStart;
      const body = ta.value.slice(start, ta.selectionEnd) || placeholder;
      replaceSelection(`${wrap}${body}${wrap}`, start + wrap.length, start + wrap.length + body.length);
      return;
    }

    if (LINE[format]) {
      const { prefix, placeholder } = LINE[format];
      const value = ta.value;
      const lineStart = value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
      const lineEndIndex = value.indexOf('\n', ta.selectionEnd);
      const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
      // 이미 붙어있던 다른 줄 서식 기호를 먼저 벗겨내 접두어가 중첩되지 않게 한다
      const formatted = value.slice(lineStart, lineEnd).split('\n').map((line, i) => {
        const stripped = line.replace(/^(#{1,3}\s+|[-*]\s+|\d+\.\s+|>\s?)/, '');
        return `${format === 'ol' ? `${i + 1}. ` : prefix}${stripped || placeholder}`;
      }).join('\n');
      ta.setSelectionRange(lineStart, lineEnd);
      replaceSelection(formatted, lineStart, lineStart + formatted.length);
      return;
    }

    if (format === 'link') {
      const start = ta.selectionStart;
      const label = ta.value.slice(start, ta.selectionEnd) || '링크 텍스트';
      const url = window.prompt('연결할 주소를 입력하세요 (https://로 시작)', 'https://');
      if (!url || !/^https?:\/\//i.test(url)) return;
      replaceSelection(`[${label}](${url})`, start + 1, start + 1 + label.length);
      return;
    }

    if (format === 'hr') {
      // 구분선은 앞뒤에 빈 줄이 있어야 파서가 인식한다
      const needsBreak = ta.selectionStart > 0 && ta.value[ta.selectionStart - 1] !== '\n';
      replaceSelection(`${needsBreak ? '\n' : ''}\n---\n\n`);
    }
  };

  const onKeyDown = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const shortcut = { b: 'bold', i: 'italic' }[e.key.toLowerCase()];
    if (!shortcut) return;
    e.preventDefault();
    applyFormat(shortcut);
  };

  return (
    <>
      <h2 className="page-title notice-section-title">{isEdit ? '✏️ 공지 수정' : '📢 공지 올리기'}</h2>

      <div className="filter-nav">
        <div className="filter-left">
          <span className="filter-title">{isEdit ? '공지 수정 중' : '공지 작성'}</span>
          <select className="filter-select" value={form.category} onChange={(e) => set({ category: e.target.value })}>
            <option value="notice">전체 공지</option>
            <option value="news">새 소식</option>
          </select>
        </div>
      </div>

      <div className={`notice-form-card${isEdit ? ' is-editing' : ''}`}>
        <input
          type="text"
          className="notice-form-input"
          placeholder="공지 제목을 입력하세요"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <input
          type="text"
          className="notice-form-input"
          placeholder="요약 (선택, 목록에 표시됩니다)"
          value={form.summary}
          onChange={(e) => set({ summary: e.target.value })}
        />

        <div className="notice-editor-toolbar">
          {TOOLS.map(([format, label]) => (
            <button type="button" className="notice-tool-btn" key={format} title={label} onClick={() => applyFormat(format)}>
              {format === 'bold' ? <strong>B</strong>
                : format === 'italic' ? <em>I</em>
                  : format === 'strike' ? <del>S</del> : label}
            </button>
          ))}
          <button
            type="button"
            className={`notice-tool-btn notice-preview-toggle${previewOpen ? ' is-active' : ''}`}
            aria-pressed={previewOpen}
            onClick={() => setPreviewOpen((v) => !v)}
          >
            {previewOpen ? '✏️ 편집만 보기' : '👁 미리보기'}
          </button>
        </div>

        <textarea
          ref={textareaRef}
          className="notice-form-textarea"
          placeholder="공지 내용을 입력하세요. 툴바 버튼으로 서식을 넣을 수 있습니다."
          value={form.content}
          onChange={(e) => set({ content: e.target.value })}
          onKeyDown={onKeyDown}
        />

        {previewOpen && (
          <div className="notice-preview-pane notice-detail-content">
            {form.content.trim()
              ? <div dangerouslySetInnerHTML={{ __html: renderNoticeContent(form.content) }} />
              : <p className="notice-preview-empty">내용을 입력하면 실제 공지 화면처럼 보입니다.</p>}
          </div>
        )}

        <div className="notice-form-actions">
          {isEdit && <button type="button" className="notice-cancel-btn" onClick={onCancelEdit}>수정 취소</button>}
          <button type="button" className="notice-post-btn" disabled={busy} onClick={onSubmit}>
            {isEdit ? '💾 수정 저장' : '📢 공지 등록'}
          </button>
        </div>
      </div>
    </>
  );
}
