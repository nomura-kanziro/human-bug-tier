// 마이페이지 출석판 — 7일 한 주기. 서버(GET /api/luck-draw/attendance)가 계산한 상태를 그대로 그린다.
//  - 로그인할 때 하루 한 번 서버가 자동으로 지급하므로 여기에는 누르는 버튼이 없다.
//  - 지난 일차는 체크된 채 남고, 7일차를 받은 다음 날 로그인하면 판이 비어 1일차부터 다시 시작한다.
//  - 하루라도 빠지면 연속이 끊겨 판이 비고 1일차부터다(서버 규칙, backend/utils/attendance.js).
export default function AttendanceBoard({ data }) {
  const { rewards, checkedDays, todayDone, nextDay } = data;
  const lastIndex = rewards.length - 1;

  return (
    <section className="my-page-section attendance" aria-label="출석판">
      <div className="my-page-section-header">
        <h2>📅 출석판</h2>
        <span className="attendance-state">
          {todayDone ? '오늘 출석 완료' : `오늘 로그인하면 ${nextDay}일차`}
        </span>
      </div>

      <ol className="attendance-grid">
        {rewards.map((points, i) => {
          const day = i + 1;
          const checked = i < checkedDays;
          // 방금 체크된 칸 = 오늘 출석한 일차
          const isToday = todayDone && day === checkedDays;
          const isNext = !todayDone && day === nextDay;
          const cls = ['attendance-cell'];
          if (checked) cls.push('is-checked');
          if (isToday) cls.push('is-today');
          if (isNext) cls.push('is-next');
          if (i === lastIndex) cls.push('is-final');
          else if (points > rewards[0]) cls.push('is-bonus');
          return (
            <li className={cls.join(' ')} key={day} aria-label={`${day}일차 ${points}포인트${checked ? ' 출석 완료' : ''}`}>
              <span className="attendance-day">{day}일</span>
              <span className="attendance-mark" aria-hidden="true">{checked ? '✓' : '🎁'}</span>
              <span className="attendance-points">+{points}</span>
            </li>
          );
        })}
      </ol>
      <p className="attendance-hint">
        로그인하면 하루(한국 시간 자정 기준)에 한 번 자동으로 받아요. 하루라도 빠지면 1일차부터 다시 시작해요.
      </p>
    </section>
  );
}
