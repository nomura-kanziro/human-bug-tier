// ========================================================
// EventPage — 이벤트 (/event)
// ========================================================
// 탭 3개를 URL 해시로 오간다(행운 뽑기 페이지와 같은 방식 — 링크로 특정 탭을 바로 열 수 있다).
//   #quiz     매일 간단 퀴즈
//   #showcase 제작한 티어표 공개 (뼈대 · 관리자 전용)
//   #memory   메모리 게임
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EventMemoryPanel from '../components/EventMemoryPanel';
import EventQuizPanel from '../components/EventQuizPanel';
import EventShowcasePanel from '../components/EventShowcasePanel';
import { useAuth } from '../context/AuthContext';
import '../styles/event.css';

const TABS = [
  { key: 'quiz', label: '매일 간단 퀴즈' },
  { key: 'showcase', label: '티어표 공개' },
  { key: 'memory', label: '메모리 게임' },
];

export default function EventPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { isLoggedIn, isAdmin } = useAuth();

  useEffect(() => { document.title = '이벤트 | 휴버대 티어표'; }, []);

  const current = TABS.some((t) => `#${t.key}` === hash) ? hash.slice(1) : 'quiz';

  return (
    <div className="event-page">
      <div className="event-tabs" role="tablist" aria-label="이벤트 종류">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={current === t.key}
            className={`event-tab${current === t.key ? ' active' : ''}`}
            onClick={() => navigate(`/event#${t.key}`, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className={`event-panel${current === 'quiz' ? ' active' : ''}`} role="tabpanel">
        <EventQuizPanel isLoggedIn={isLoggedIn} />
      </section>
      <section className={`event-panel${current === 'showcase' ? ' active' : ''}`} role="tabpanel">
        <EventShowcasePanel isAdmin={isAdmin} />
      </section>
      <section className={`event-panel${current === 'memory' ? ' active' : ''}`} role="tabpanel">
        <EventMemoryPanel isLoggedIn={isLoggedIn} />
      </section>
    </div>
  );
}
