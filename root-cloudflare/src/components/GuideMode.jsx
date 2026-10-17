// 가이드 모드 — 켜면 화면이 어두워지고, 짚어 줄 곳만 밝게 뚫린 채 말풍선이 한 줄씩 안내한다(게임 튜토리얼 방식).
//  - 왼쪽 아래 동그란 ✕ 버튼(또는 Esc)으로 언제든 끝낸다.
//  - 켜진 동안은 뒤 화면 클릭을 막는다(실수로 눌러 흐름이 끊기지 않게). 스크롤은 그대로 된다.
//  - 단계의 route 가 지금 화면과 다르면 알아서 이동하고, 마지막 단계에서 스테이지 클리어 → /guide 로 돌아온다.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { guideGoto, guideMarkCleared, guideStop, useGuide } from '../lib/guide';
import { getGuideCourse, getStageNumber } from '../lib/guideCourses';
import { LOGO_URL } from '../lib/paths';

const PAD = 6;           // 강조 테두리와 요소 사이 여백
const FIND_MS = 3000;    // 요소가 나타나길 기다리는 최대 시간(데이터를 불러오는 화면 대비)

function findTarget(selectors) {
  for (const sel of selectors || []) {
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

export default function GuideMode() {
  const session = useGuide();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const course = session ? getGuideCourse(session.course) : null;
  const step = course ? course.steps[session.step] : null;

  const [el, setEl] = useState(null);
  const [rect, setRect] = useState(null);
  const [clearedCourse, setClearedCourse] = useState(null);
  const bubbleRef = useRef(null);
  const [bubbleH, setBubbleH] = useState(150);

  // 모르는 스테이지거나 단계가 범위를 벗어나면 조용히 끈다(옛 세션 값 대비)
  useEffect(() => { if (session && !step) guideStop(); }, [session, step]);

  // 단계 화면으로 이동
  useEffect(() => {
    if (!step) return;
    const [wantPath, wantHash = ''] = step.route.split('#');
    const nowHash = hash.replace(/^#/, '');
    if (pathname !== wantPath || (wantHash && nowHash !== wantHash)) navigate(step.route);
  }, [step, pathname, hash, navigate]);

  // 대상 요소 찾기(화면이 그려질 때까지 잠깐 기다림) → 화면 가운데로 스크롤
  useEffect(() => {
    setEl(null);
    setRect(null);
    if (!step) return undefined;
    const [wantPath] = step.route.split('#');
    if (pathname !== wantPath) return undefined;
    let cancelled = false;
    const started = Date.now();
    const timer = setInterval(() => {
      if (cancelled) return;
      const found = findTarget(step.target);
      if (found) {
        clearInterval(timer);
        if (!found.closest('header')) found.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setEl(found);
      } else if (Date.now() - started > FIND_MS) {
        clearInterval(timer);   // 못 찾으면 강조 없이 말풍선만
      }
    }, 120);
    return () => { cancelled = true; clearInterval(timer); };
  }, [step, pathname]);

  // 스크롤·리사이즈·로딩으로 위치가 바뀌어도 강조 틀이 따라가도록 매 프레임 비교
  useEffect(() => {
    if (!el) return undefined;
    let raf = 0;
    let last = '';
    const tick = () => {
      if (!el.isConnected) { setEl(null); setRect(null); return; }
      const r = el.getBoundingClientRect();
      const key = `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`;
      if (key !== last) {
        last = key;
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [el]);

  useLayoutEffect(() => {
    if (bubbleRef.current && bubbleRef.current.offsetHeight !== bubbleH) setBubbleH(bubbleRef.current.offsetHeight);
  });

  const total = course ? course.steps.length : 0;
  const index = session ? session.step : 0;

  function goPrev() {
    if (session && session.step > 0) guideGoto(session.step - 1);
  }
  function goNext() {
    if (!course || !session) return;
    if (session.step < total - 1) { guideGoto(session.step + 1); return; }
    guideMarkCleared(course.id);
    setClearedCourse(course);
    guideStop();
    navigate('/guide');
  }

  // 가이드가 켜진 동안 Esc 종료, ←/→ 로 단계 이동
  useEffect(() => {
    if (!course) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') guideStop();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // 스테이지 클리어 문구는 잠깐 보였다가 사라진다
  useEffect(() => {
    if (!clearedCourse) return undefined;
    const t = setTimeout(() => setClearedCourse(null), 2600);
    return () => clearTimeout(t);
  }, [clearedCourse]);

  if (!course && clearedCourse) {
    return (
      <div className="guide-clear" role="status">
        <div className="guide-clear-card">
          <span className="guide-clear-kicker">STAGE CLEAR</span>
          <strong>{clearedCourse.icon} {clearedCourse.title}</strong>
          <span>잘했어요! 다음 스테이지에 도전해 보세요.</span>
        </div>
      </div>
    );
  }
  if (!course || !step) return null;

  // 말풍선 위치 — 대상 아래 → 위 → (둘 다 자리가 없으면) 화면 아래 가운데 순으로
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const bw = Math.min(340, vw - 24);
  let bubbleStyle = { width: bw, left: Math.max(12, (vw - bw) / 2), bottom: 24 };
  let spot = null;
  if (rect) {
    const top = Math.max(0, rect.top - PAD);
    const left = Math.max(0, rect.left - PAD);
    const bottom = Math.min(vh, rect.top + rect.height + PAD);
    const right = Math.min(vw, rect.left + rect.width + PAD);
    spot = { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
    const gap = 14;
    const x = Math.min(Math.max(12, left + spot.width / 2 - bw / 2), vw - bw - 12);
    if (vh - bottom >= bubbleH + gap + 12) bubbleStyle = { width: bw, left: x, top: bottom + gap };
    else if (top >= bubbleH + gap + 12) bubbleStyle = { width: bw, left: x, top: top - gap - bubbleH };
  }

  const isLast = index === total - 1;
  return (
    <div className="guide-root" role="dialog" aria-label="가이드 모드">
      {/* 뒤 화면 클릭 막이 — 스크롤(휠·터치)은 막지 않는다 */}
      <div className="guide-block" />
      {spot ? <div className="guide-spot" style={spot} /> : <div className="guide-dim" />}

      <div className="guide-bubble" style={bubbleStyle} ref={bubbleRef}>
        <div className="guide-bubble-head">
          <img src={LOGO_URL} alt="" className="guide-mascot" width="28" height="28" />
          <span className="guide-stage">STAGE {getStageNumber(course.id)} · {course.title}</span>
          <span className="guide-count">{index + 1}/{total}</span>
        </div>
        <p className="guide-text">{step.text}</p>
        <div className="guide-dots" aria-hidden="true">
          {course.steps.map((_, i) => <span key={i} className={i === index ? 'is-now' : i < index ? 'is-done' : ''} />)}
        </div>
        <div className="guide-actions">
          <button type="button" className="guide-btn" onClick={goPrev} disabled={index === 0}>이전</button>
          <button type="button" className="guide-btn guide-btn-primary" onClick={goNext}>
            {isLast ? '클리어! 🎉' : '다음 ▶'}
          </button>
        </div>
      </div>

      <button type="button" className="guide-exit" onClick={guideStop} aria-label="가이드 모드 종료" title="가이드 모드 종료">✕</button>
    </div>
  );
}
