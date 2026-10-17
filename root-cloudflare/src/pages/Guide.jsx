// 가이드 전용 페이지 (/guide) — 설명서가 아니라 스테이지를 골라 "가이드 모드" 를 켜는 시작 화면.
// 켜면 GuideMode(main.jsx 에서 앱 최상위에 렌더)가 화면을 넘겨받아 한 줄씩 짚어 준다.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { guideResetCleared, guideStart, useGuideCleared } from '../lib/guide';
import { GUIDE_COURSES } from '../lib/guideCourses';

export default function Guide() {
  const cleared = useGuideCleared();
  const done = GUIDE_COURSES.filter((c) => cleared.includes(c.id)).length;
  const nextCourse = GUIDE_COURSES.find((c) => !cleared.includes(c.id)) || GUIDE_COURSES[0];

  useEffect(() => { document.title = '가이드 | 휴버대 티어표'; }, []);

  return (
    <main className="guide-page">
      {/* <header> 는 사이트 헤더 전역 스타일(Header_Footer.css)이 걸리므로 div 로 둔다 */}
      <div className="guide-hero">
        <span className="guide-hero-kicker">GUIDE MODE</span>
        <h1>직접 눌러 보며 익혀요</h1>
        <p>가이드 모드를 켜면 화면이 안내 모드로 바뀌어요. 왼쪽 아래 <b className="guide-hero-x">✕</b> 버튼으로 언제든 끌 수 있어요.</p>
        <button type="button" className="guide-start-btn" onClick={() => guideStart(nextCourse.id)}>
          ▶ {done === 0 ? '가이드 모드 켜기' : done === GUIDE_COURSES.length ? '처음부터 다시 하기' : '이어서 하기'}
        </button>
        <span className="guide-progress">클리어 {done} / {GUIDE_COURSES.length}</span>
      </div>

      <section className="guide-stages" aria-label="스테이지 목록">
        {GUIDE_COURSES.map((course, i) => {
          const isCleared = cleared.includes(course.id);
          return (
            <article className={`guide-stage-card${isCleared ? ' is-cleared' : ''}`} key={course.id}>
              <span className="guide-stage-no">STAGE {i + 1}</span>
              <span className="guide-stage-icon" aria-hidden="true">{course.icon}</span>
              <strong>{course.title}</strong>
              <p>{course.desc}</p>
              <span className="guide-stage-meta">{course.steps.length}단계{isCleared ? ' · CLEAR ✓' : ''}</span>
              <button type="button" className="guide-stage-btn" onClick={() => guideStart(course.id)}>
                {isCleared ? '다시 하기' : '시작'}
              </button>
            </article>
          );
        })}
      </section>

      <p className="guide-ai-link">
        더 궁금한 게 있으면 <Link to="/ai">🤖 AI 도우미</Link>에게 물어보세요.
      </p>

      {done > 0 && (
        <button type="button" className="guide-reset" onClick={guideResetCleared}>클리어 기록 지우기</button>
      )}
    </main>
  );
}
