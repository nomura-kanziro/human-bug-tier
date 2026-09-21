// ========================================================
// eventFormat — 이벤트 화면(이벤트 페이지 / 관리자 이벤트 관리)이 함께 쓰는 표시용 유틸
// ========================================================

// datetime-local 입력에 넣을 수 있는 "YYYY-MM-DDTHH:mm" 형태(로컬 시각)로 바꾼다.
export function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// datetime-local 값(로컬 시각)을 서버로 보낼 ISO(UTC) 문자열로. 비었으면 null.
export function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatWhen(value, empty = '미정') {
  if (!value) return empty;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? empty : d.toLocaleString('ko-KR');
}

// 기록(ms) → "12.34초" / "1분 5.2초"
export function formatMs(ms) {
  if (typeof ms !== 'number') return '-';
  const s = ms / 1000;
  return s >= 60 ? `${Math.floor(s / 60)}분 ${(s % 60).toFixed(1)}초` : `${s.toFixed(2)}초`;
}
