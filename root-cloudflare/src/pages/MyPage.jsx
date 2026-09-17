// 마이페이지 (my-page/my-page.html + .js 이식)
//  - 통계 카드 5개 (작성 글 / 받은 좋아요 / 뽑기 횟수 / 최고 등급 / 포인트)
//  - 내가 쓴 게시글 최근 6개, 최근 행운 뽑기 기록 5건
//  - 관리자도 완전히 같은 화면을 쓴다(관리자 전용 UI 없음 — 진입점은 헤더 드롭다운 "관리하기" 하나)
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, isStaticPreview } from '../lib/api';
import { tierImageUrl } from '../lib/paths';
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
  const { isLoggedIn, nickname, email, profileImage } = useAuth();

  const [posts, setPosts] = useState([]);
  const [draws, setDraws] = useState([]);
  const [luck, setLuck] = useState({ totalDraws: 0, bestTier: null, points: 0 });
  const [loading, setLoading] = useState(true);

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
      const [postList, stats, history] = await Promise.all([
        safeGet(`/api/tierlists?author=${encodeURIComponent(nickname)}&mine=true`, []),
        safeGet('/api/luck-draw/stats', { totalDraws: 0, bestTier: null, points: 0 }),
        safeGet('/api/luck-draw/history?page=1', { items: [] }),
      ]);
      if (cancelled) return;
      setPosts(Array.isArray(postList) ? postList : []);
      setLuck({ totalDraws: stats.totalDraws || 0, bestTier: stats.bestTier, points: stats.points || 0 });
      setDraws(history.items || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn, nickname, navigate]);

  if (!isLoggedIn) return null;

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
        <div className="my-page-avatar">
          <img src={profileImage} alt="프로필" />
        </div>
        <div className="my-page-identity">
          <h1>{nickname || '사용자'}</h1>
          <p>{email}</p>
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

      <section className="my-page-section">
        <div className="my-page-section-header">
          <h2>최근 행운 뽑기 기록</h2>
          <Link to="/luck-draw#daily">행운 뽑기 하러 가기 →</Link>
        </div>
        <div className="my-page-draw-list">
          {loading && <p className="my-page-empty">불러오는 중...</p>}
          {!loading && draws.length === 0 && <p className="my-page-empty">아직 뽑기 기록이 없어요.</p>}
          {!loading && draws.slice(0, 5).map((item, i) => (
            <div className="my-page-draw-item" key={`${item.drawDate}-${i}`}>
              {item.drawDate} · {tierLabel(item.tier)} · {item.characterName}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
