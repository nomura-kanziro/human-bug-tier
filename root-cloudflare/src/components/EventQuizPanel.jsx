// ========================================================
// EventQuizPanel — 이벤트 "매일 간단 퀴즈"
// ========================================================
// "{캐릭터}는 어느 티어인가요?" 3지선다. 하루 1번만 풀 수 있다.
// 문제 출제·정답·상금은 전부 서버(/api/events/quiz)가 정하고, 이 컴포넌트는
// 고른 보기 번호만 보낸다 — 아직 안 푼 문제의 정답은 응답에 아예 들어오지 않는다.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, isStaticPreview } from '../lib/api';
import { tierImageUrl } from '../lib/paths';

export default function EventQuizPanel({ isLoggedIn }) {
  const isStatic = isStaticPreview();
  const [quiz, setQuiz] = useState(null);
  const [prizeTable, setPrizeTable] = useState([]);
  const [points, setPoints] = useState(null);
  const [picked, setPicked] = useState(null); // 제출 전 고른 보기
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  useEffect(() => {
    if (isStatic || !isLoggedIn) return;
    apiRequest('/api/events/quiz/today')
      .then((res) => {
        if (!res.ok || !aliveRef.current) return;
        setQuiz(res.data.quiz);
        setPrizeTable(res.data.prizeTable || []);
        setPoints(res.data.points);
      })
      .catch(() => {});
  }, [isStatic, isLoggedIn]);

  const answered = Boolean(quiz?.answered);

  const submit = async () => {
    if (picked === null || busy || answered) return;
    setBusy(true);
    setMessage('');
    const res = await apiRequest('/api/events/quiz/answer', {
      method: 'POST',
      body: JSON.stringify({ choiceIndex: picked }),
    }).catch(() => ({ ok: false, data: { error: '채점에 실패했습니다.' } }));
    if (!aliveRef.current) return;
    setBusy(false);

    if (!res.ok) {
      // 이미 풀었다는 응답(409)에는 그 문제 상태가 함께 오므로 화면을 맞춰 준다.
      if (res.data?.quiz) setQuiz(res.data.quiz);
      setMessage(res.data?.error || '채점에 실패했습니다.');
      return;
    }
    setQuiz(res.data.quiz);
    setPoints(res.data.points);
  };

  const choiceLabel = (c) => `${c.tier}티어 ${c.subTier}`;

  return (
    <>
      <h1>매일 간단 퀴즈</h1>
      <p className="event-desc">
        공식 티어표에 있는 캐릭터가 <strong>몇 티어 몇 급</strong>인지 맞히는 3지선다 퀴즈입니다.
        하루에 한 문제만 풀 수 있고, 맞히면 <strong>1~1000P</strong>를 복권처럼 뽑아 드려요.
      </p>

      {isStatic && (
        <div className="event-guard">이 기능은 서버가 필요합니다. 로컬(:5000) 또는 배포된 사이트에서 이용해주세요.</div>
      )}
      {!isStatic && !isLoggedIn && (
        <div className="event-guard">
          포인트가 걸린 퀴즈라 로그인이 필요합니다. <Link to="/login">로그인하러 가기 →</Link>
        </div>
      )}

      {quiz && (
        <div className="event-quiz">
          <div className="event-points">
            보유 포인트 <strong>{typeof points === 'number' ? `${points}P` : '-'}</strong>
            <span className="event-quiz-date">{quiz.quizDate} 문제</span>
          </div>

          <div className="event-quiz-card">
            {quiz.characterImg && (
              <img className="event-quiz-img" src={tierImageUrl(quiz.characterImg)} alt="" />
            )}
            <p className="event-quiz-question">
              <strong>{quiz.characterName}</strong> 는(은) 어느 티어인가요?
            </p>

            <div className="event-quiz-choices">
              {quiz.choices.map((c, i) => {
                // 채점 후에는 정답/내가 고른 오답을 색으로 구분해 보여준다.
                const isAnswer = answered && i === quiz.correctIndex;
                const isMyWrong = answered && i === quiz.answeredIndex && !quiz.correct;
                const isPicked = !answered && picked === i;
                return (
                  <button
                    key={`${c.tier}-${c.subTier}`}
                    type="button"
                    className={`event-quiz-choice${isPicked ? ' is-picked' : ''}${isAnswer ? ' is-answer' : ''}${isMyWrong ? ' is-wrong' : ''}`}
                    disabled={answered || busy}
                    onClick={() => setPicked(i)}
                  >
                    <span className="event-quiz-choice-no">{i + 1}</span>
                    {choiceLabel(c)}
                    {isAnswer && <span className="event-quiz-mark">정답</span>}
                    {isMyWrong && <span className="event-quiz-mark">내 답</span>}
                  </button>
                );
              })}
            </div>

            {!answered && (
              <button type="button" className="event-btn" disabled={picked === null || busy} onClick={submit}>
                {busy ? '채점 중...' : (picked === null ? '보기를 골라주세요' : '정답 제출하기')}
              </button>
            )}

            {answered && (
              <div className={`event-quiz-result${quiz.correct ? ' is-correct' : ''}`}>
                {quiz.correct
                  ? <>정답입니다! <strong>+{quiz.points}P</strong> 를 받았어요.</>
                  : <>아쉽게 틀렸어요. 정답은 <strong>{choiceLabel(quiz.choices[quiz.correctIndex])}</strong> 입니다.</>}
                <span className="event-quiz-next">다음 문제는 내일 0시(한국 시간)에 나와요.</span>
              </div>
            )}
            {message && <p className="event-status">{message}</p>}
          </div>

          {prizeTable.length > 0 && (
            <table className="event-table">
              <caption>맞혔을 때 상금 확률</caption>
              <thead>
                <tr><th>포인트</th><th>확률</th></tr>
              </thead>
              <tbody>
                {prizeTable.map((row) => (
                  <tr key={row.min}>
                    <td>{row.min === row.max ? `${row.min}P` : `${row.min}~${row.max}P`}</td>
                    <td>{row.percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
