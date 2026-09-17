// 관리자 테이블 공용 페이지네이션 (comment-management.js buildPaginationHtml 이식)
// 현재 페이지 기준 앞뒤 3페이지만 번호로 노출한다.
export default function AdminPagination({ page, totalPages, onChange }) {
  const start = Math.max(1, page - 3);
  const end = Math.min(totalPages, page + 3);
  const numbers = [];
  for (let i = start; i <= end; i += 1) numbers.push(i);

  return (
    <div className="pagination">
      <span className="pagination-total">총 {totalPages}페이지</span>
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>◀ 이전</button>
      {numbers.map((n) => (
        <button type="button" key={n} className={n === page ? 'is-current' : ''} onClick={() => onChange(n)}>{n}</button>
      ))}
      <button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)}>다음 ▶</button>
    </div>
  );
}
