// 마이페이지 (my-page/my-page.html + .js 이식)
//  - 통계 카드 5개 (작성 글 / 받은 좋아요 / 뽑기 횟수 / 최고 등급 / 포인트)
//  - 내가 쓴 게시글 최근 6개 (최근 행운 뽑기 기록 목록은 창시자 지시로 제거 — 뽑기 이력은 행운 뽑기 페이지에서 본다)
//  - 프로필 관리: 사진 변경/기본 이미지 복원(이 브라우저에만 저장), 닉네임 변경(서버 POST /api/profile/nickname)
//  - 관리자도 완전히 같은 화면을 쓴다(관리자 전용 UI 없음 — 진입점은 헤더 드롭다운 "관리하기" 하나).
//    다만 관리자 이름은 Admin 체계라 여기서 바꿀 수 없어 관리자에게는 닉네임 변경 버튼만 숨긴다.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, isStaticPreview } from '../lib/api';
import { LOGO_URL, tierImageUrl } from '../lib/paths';
import '../styles/my-page.css';

const TIER_LABELS = {
  1: '1티어', 2: '2티어', 3: '3티어', 4: '4티어', 5: '5티어',
  6: '6티어', 7: '7티어', 8: '8티어', 9: '9티어',
};
const tierLabel = (t) => (t ? TIER_LABELS[t] || `${t}티어` : '-');

const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '.').replace(/\.$/, '');
};

// 마이페이지는 부가 정보 화면이므로 API 가 실패해도 화면이 깨지지 않게 기본값을 돌려준다
const safeGet = async (path, fallback) => {
  try {
    const res = await apiRequest(path);
    return res.ok ? res.data : fallback;
  } catch (err) {
    console.error(`${path} 조회 실패:`, err);
    return fallback;
  }
};

export default function MyPage() {
  const navigate = useNavigate();
  const {
    isLoggedIn, isAdmin, nickname, email, profileImage,
    changeProfileImage, resetProfileImage, applyIdentity,
  } = useAuth();

  const [posts, setPosts] = useState([]);
  const [luck, setLuck] = useState({ totalDraws: 0, bestTier: null, points: 0 });
  const [loading, setLoading] = useState(true);

  // 프로필 관리(사진·닉네임) 상태
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const [nickBusy, setNickBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { type: 'ok' | 'error', text }

  useEffect(() => { document.title = '마이페이지 | 휴버대 티어표'; }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      if (window.confirm('로그인이 필요한 페이지입니다.\n로그인 페이지로 이동할까요?')) navigate('/login');
      else navigate('/');
      return;
    }
    if (isStaticPreview()) { setLoading(false); return; }

    let cancelled = false;
    (async () => {
      const [postList, stats] = await Promise.all([
        safeGet(`/api/tierlists?author=${encodeURIComponent(nickname)}&mine=true`, []),
        safeGet('/api/luck-draw/stats', { totalDraws: 0, bestTier: null, points: 0 }),
      ]);
      if (cancelled) return;
      setPosts(Array.isArray(postList) ? postList : []);
      setLuck({ totalDraws: stats.totalDraws || 0, bestTier: stats.bestTier, points: stats.points || 0 });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn, nickname, navigate]);

  if (!isLoggedIn) return null;

  const hasCustomPhoto = profileImage !== LOGO_URL;

  const onChangePhoto = async () => {
    const result = await changeProfileImage();
    if (!result) return; // 파일 선택 취소
    setProfileMsg(result.ok
      ? { type: 'ok', text: '프로필 사진을 바꿨어요. 사진은 이 브라우저에만 저장돼요.' }
      : { type: 'error', text: result.error });
  };

  const onResetPhoto = () => {
    resetProfileImage();
    setProfileMsg({ type: 'ok', text: '기본 이미지로 되돌렸어요.' });
  };

  const openNickEditor = () => {
    setNickInput(nickname);
    setProfileMsg(null);
    setEditingNick(true);
  };

  const onSubmitNickname = async (e) => {
    e.preventDefault();
    const next = nickInput.trim();
    if (!next || nickBusy) return;
    if (next === nickname) {
      setProfileMsg({ type: 'error', text: '현재 닉네임과 같아요.' });
      return;
    }
    if (!window.confirm(`닉네임을 "${next}"(으)로 바꿀까요?\n닉네임은 로그인 아이디로도 쓰이고, 7일에 한 번만 바꿀 수 있어요.`)) return;

    setNickBusy(true);
    setProfileMsg(null);
    const res = await apiRequest('/api/profile/nickname', {
      method: 'POST',
      body: JSON.stringify({ nickname: next }),
    }).catch(() => null);
    setNickBusy(false);

    if (!res) {
      setProfileMsg({ type: 'error', text: '서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.' });
      return;
    }
    if (!res.ok) {
      setProfileMsg({ type: 'error', text: res.data?.error || '닉네임을 바꾸지 못했어요.' });
      return;
    }

    // 새 닉네임·새 토큰을 반영 — 아래 게시글 조회 effect 가 닉네임을 의존성으로 갖고 있어 자동으로 다시 불러온다
    applyIdentity(res.data);
    setEditingNick(false);
    const nextDate = res.data.nextChangeAt ? formatDate(res.data.nextChangeAt) : '';
    setProfileMsg({
      type: 'ok',
      text: `닉네임을 "${res.data.user.nickname}"(으)로 바꿨어요.`
        + (nextDate ? ` 다음 변경은 ${nextDate} 이후에 할 수 있어요.` : '')
        + (res.data.propagated === false ? ' 일부 기록의 이름은 반영이 늦어질 수 있어요.' : ''),
    });
  };

  const likeTotal = posts.reduce((sum, p) => sum + (p.likeCount || 0), 0);
  const stats = [
    { value: loading ? '-' : posts.length, label: '작성한 게시글' },
    { value: loading ? '-' : likeTotal, label: '받은 좋아요' },
    { value: loading ? '-' : luck.totalDraws, label: '행운 뽑기 횟수' },
    { value: loading ? '-' : tierLabel(luck.bestTier), label: '최고 등급 당첨' },
    // 포인트는 음수도 가능하므로 부호를 명시한다
    { value: loading ? '-' : `${luck.points >= 0 ? '+' : ''}${luck.points}P`, label: '행운 포인트' },
  ];

  return (
    <div className="my-page">
      <div className="my-page-header">
        <button type="button" className="my-page-avatar my-page-avatar-btn" onClick={onChangePhoto} aria-label="프로필 사진 변경" title="프로필 사진 변경">
          <img src={profileImage} alt="프로필" />
          <span className="my-page-avatar-badge" aria-hidden="true">📷</span>
        </button>
        <div className="my-page-identity">
          <h1>{nickname || '사용자'}</h1>
          <p>{email}</p>

          <div className="my-page-profile-actions">
            <button type="button" className="my-page-profile-btn" onClick={onChangePhoto}>사진 변경</button>
            {hasCustomPhoto && (
              <button type="button" className="my-page-profile-btn" onClick={onResetPhoto}>기본 이미지로</button>
            )}
            {!isAdmin && !editingNick && (
              <button type="button" className="my-page-profile-btn" onClick={openNickEditor}>닉네임 변경</button>
            )}
          </div>

          {editingNick && (
            <form className="my-page-nick-form" onSubmit={onSubmitNickname}>
              <div className="my-page-nick-row">
                <input
                  type="text"
                  value={nickInput}
                  maxLength={20}
                  autoFocus
                  disabled={nickBusy}
                  aria-label="새 닉네임"
                  onChange={(e) => setNickInput(e.target.value)}
                />
                <button type="submit" className="my-page-profile-btn is-primary" disabled={nickBusy || !nickInput.trim()}>
                  {nickBusy ? '변경 중...' : '저장'}
                </button>
                <button type="button" className="my-page-profile-btn" disabled={nickBusy} onClick={() => setEditingNick(false)}>취소</button>
              </div>
              <p className="my-page-nick-hint">
                2~20자 · 한글/영문/숫자/_ - . 만 가능(공백·@ 불가) · 7일에 한 번만 변경 ·
                닉네임은 로그인 아이디로도 쓰이니 바꾼 뒤에는 새 닉네임으로 로그인하세요.
              </p>
            </form>
          )}

          {profileMsg && (
            <p className={`my-page-profile-msg${profileMsg.type === 'error' ? ' is-error' : ''}`} role="status">{profileMsg.text}</p>
          )}
        </div>
      </div>

      <div className="my-page-stats">
        {stats.map((s) => (
          <div className="my-page-stat-card" key={s.label}>
            <span className="my-page-stat-value">{s.value}</span>
            <span className="my-page-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <section className="my-page-section">
        <div className="my-page-section-header">
          <h2>내가 쓴 게시글</h2>
          {/* 게시판 검색("@닉네임")을 재사용해 내 글만 필터링한다 */}
          <Link to={`/board?search=${encodeURIComponent(`@${nickname}`)}`}>전체 보기 →</Link>
        </div>
        <div className="my-page-post-list">
          {loading && <p className="my-page-empty">불러오는 중...</p>}
          {!loading && posts.length === 0 && <p className="my-page-empty">아직 작성한 게시글이 없어요.</p>}
          {!loading && posts.slice(0, 6).map((post) => (
            <Link className="my-page-post-item" to={`/board/post?id=${encodeURIComponent(post._id)}`} key={post._id}>
              <img className="my-page-post-thumb" src={tierImageUrl(post.thumbnail)} alt="" loading="lazy" />
              <div className="my-page-post-info">
                <span className="my-page-post-title">{post.isPublic === false ? '🔒 ' : ''}{post.title}</span>
                <span className="my-page-post-meta">{formatDate(post.createdAt)} · 추천 {post.likeCount || 0}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
