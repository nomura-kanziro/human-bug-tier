// ========================================================
// CustomMaker — 커스텀 티어 메이커 (React 내부 구현)
// ========================================================
// 바닐라(root-render/custom-maker)와 같은 데이터 모델·저장 형식을 유지하되,
// 캐릭터 풀은 tier-class HTML 을 fetch/파싱하지 않고 src/data/tiers.js 에서 바로 가져온다.
//   - PC: HTML5 드래그로 풀 ↔ 등급 칸 이동, 카드 위에 놓으면 그 앞에 끼워넣기
//   - 모바일: 카드를 탭해 선택 → 등급 칸을 탭하면 배치 (DnD 가 불안정해서 별도 경로)
//   - 다운로드: PNG(등급별 9장) · PDF(1파일) · JSON. 캡처는 화면을 바꾸지 않고
//     화면 밖 export 컨테이너를 따로 렌더해서 찍으므로 편집 중 화면이 흔들리지 않는다.
//   - 꾸미기: 등급마다 테두리 색·배경 이펙트. 미리보기·캐처·게시글에 모두 반영된다.
//   - 풀에서 여러 명 고르기: Ctrl(⌘)+클릭으로 하나씩 더하고, Shift+클릭으로 앞서 고른 카드부터
//     방금 누른 카드까지(왼쪽 위 → 오른쪽 아래 순서) 한 번에 고른다. 고른 뒤 티어 칸을 누르면 전부 배치된다.
//   - 드래그로 화면 위/아래 끝에 가져가면 페이지가 자동으로 스크롤된다(화면 밖 티어 칸까지 옮기기).
//   - 풀이 보이는 동안 화면 위/아래에 ▲▼ 버튼 — ▲는 티어표로, ▼는 풀 맨 아래로 이동.
//   - 풀 안 검색창: 이름을 입력하면 비슷한 캐릭터를 최대 5명 추천하고, 검색하면 이름이 똑같은 카드로 스크롤한다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DecoratePanel from '../components/DecoratePanel';
import { useAuth } from '../context/AuthContext';
import { ALL_CHARACTERS, TIERS } from '../data/tiers';
import { apiRequest, isStaticPreview } from '../lib/api';
import { fetchPostById, isSameAuthor, isValidPostId, updatePost } from '../lib/boardApi';
import { loadHtml2Canvas, loadJsPdf } from '../lib/loadScript';
import {
  buildJsonExport, buildUploadPayload, compressImageFile, getPlacedKeys, getThumbnailFromState,
  hasPlacedCharacters, loadMakerState, placeChar, rematchToCatalog, removeChar, saveMakerState, zoneKey,
} from '../lib/makerState';
import { LOGO_URL, tierImageUrl } from '../lib/paths';
import { loadTierStyle, normalizeStyleMap, saveTierStyle, tierStyleProps } from '../lib/tierStyle';
import '../styles/custom-maker.css';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 컨테이너 안의 <img> 가 전부 로드될 때까지 기다린다 (캡처 전에 빈 칸이 찍히지 않도록)
function waitForImages(el) {
  if (!el) return Promise.resolve();
  const imgs = [...el.querySelectorAll('img')];
  return Promise.all(imgs.map((img) => (
    img.complete ? Promise.resolve() : new Promise((res) => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
    })
  )));
}

function CharCard({ char, selected, found, onDragStart, onDragEnd, onClick, onDragOver, onDrop }) {
  return (
    <div
      className={`char${selected ? ' selected' : ''}${found ? ' is-found' : ''}`}
      draggable
      data-id={char.id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
    >
      <img src={tierImageUrl(char.img)} alt={char.name} loading="lazy" />
      <p>{char.name}</p>
    </div>
  );
}

// editId 가 있으면 "본인 글 수정" 모드 (바닐라 post_edit.html 에 해당).
// 저장된 게시글의 배치·꾸미기를 불러와 편집하고, 업로드 버튼이 "수정완료"(PUT)로 바뀐다.
export default function CustomMaker({ editId = null }) {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, nickname, email } = useAuth();
  const isEdit = Boolean(editId);

  // 이벤트 페이지("제작한 티어표 공개")에서 "새로 만들어서 참가"로 넘어온 경우 /custom-maker?event=<회차id>.
  // 업로드하면 게시판에 올라가는 동시에 그 이벤트에 자동으로 출품된다.
  // (링크 없이 그냥 들어와도 진행 중인 회차가 있으면 "이벤트 참여" 버튼으로 바로 낼 수 있다)
  const [searchParams] = useSearchParams();
  const eventId = isEdit ? null : searchParams.get('event');
  const [eventInfo, setEventInfo] = useState(null); // { id, title, canEnter, entered, status } | { missing: true }

  const [index, setIndex] = useState(0);            // 지금 편집 중인 등급 (0-based)
  const [state, setState] = useState(isEdit ? {} : loadMakerState);
  const [styleMap, setStyleMap] = useState(isEdit ? {} : loadTierStyle);  // 등급별 꾸미기
  const [editPost, setEditPost] = useState(null);   // 수정 모드에서 불러온 원본 게시글
  const [editError, setEditError] = useState('');
  const [decorateOpen, setDecorateOpen] = useState(false);
  const [decorateScope, setDecorateScope] = useState('current'); // 'current' | 'all'
  // 풀에서 고른 캐릭터들. 평소엔 1명(모바일 탭 배치)이고 Ctrl/Shift 로 여러 명이 될 수 있다.
  const [selectedIds, setSelectedIds] = useState([]);
  const [poolVisible, setPoolVisible] = useState(false); // 풀이 화면에 보이는 동안만 ▲▼ 표시
  const [search, setSearch] = useState('');
  const [searchMsg, setSearchMsg] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [foundId, setFoundId] = useState(null);          // 검색으로 찾아간 카드(잠깐 강조)
  const [joinIntent, setJoinIntent] = useState(false);   // 업로드하면서 이벤트에 참가할지
  const [exporting, setExporting] = useState(null);   // null | 'png' | 'pdf'
  const [busyText, setBusyText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const exportRef = useRef(null);
  const dragRef = useRef(null);      // { ids: [...] } — 여러 명을 한 번에 끌 수 있다
  const anchorRef = useRef(null);    // Shift 범위 선택의 시작점(마지막으로 그냥 누른 카드)
  const poolWrapRef = useRef(null);
  const tierAreaRef = useRef(null);

  const tier = TIERS[index];

  useEffect(() => {
    document.title = isEdit ? '게시글 수정 | 휴버대 티어표' : '커스텀 티어 메이커 | 휴버대 티어표';
  }, [isEdit]);

  // 이벤트로 넘어온 경우 회차 정보를 확인한다 — 접수 중이 아니거나 이미 참가했으면 배너만 안내하고 자동 출품은 하지 않는다.
  useEffect(() => {
    if (isEdit || isStaticPreview()) { setEventInfo(null); return undefined; }
    let cancelled = false;
    apiRequest('/api/events/showcase')
      .then((res) => {
        const sc = res.ok ? res.data.showcase : null;
        if (cancelled) return;
        // 링크로 들어왔는데 그 회차가 아니면(끝났거나 다른 회차) 안내만 한다.
        if (!sc || (eventId && sc.id !== eventId)) { setEventInfo(eventId ? { id: eventId, missing: true } : null); return; }
        setEventInfo({
          id: sc.id,
          title: sc.title,
          status: sc.status,
          deadlineAt: sc.deadlineAt,
          canEnter: Boolean(sc.viewer?.canEnter),
          entered: Boolean(sc.viewer?.myEntryId),
        });
      })
      .catch(() => { if (!cancelled) setEventInfo(eventId ? { id: eventId, missing: true } : null); });
    return () => { cancelled = true; };
  }, [eventId, isEdit, isLoggedIn]);

  // 이벤트 링크로 들어왔으면 업로드 창의 "이벤트에 참가하기"를 기본으로 켜 둔다.
  useEffect(() => { if (eventId) setJoinIntent(true); }, [eventId]);

  // 신규 제작만 localStorage 에 저장한다. 수정 모드까지 저장하면 작업 중이던 내 티어표가 덮어써진다.
  useEffect(() => { if (!isEdit) saveMakerState(state); }, [state, isEdit]);
  useEffect(() => { if (!isEdit) saveTierStyle(styleMap); }, [styleMap, isEdit]);

  // 수정 모드: 서버에서 게시글을 받아 배치·꾸미기를 복원하고 소유자인지 확인한다(서버도 다시 검증).
  useEffect(() => {
    if (!isEdit) return;
    if (!isValidPostId(editId)) { setEditError('수정할 게시글이 지정되지 않았습니다.'); return; }
    fetchPostById(editId)
      .then((post) => {
        if (!isSameAuthor(post, { nickname, email })) {
          setEditError('본인이 작성한 게시글만 수정할 수 있습니다.');
          return;
        }
        setEditPost(post);
        setState(rematchToCatalog(post.tierData?.tierState || {}));
        setStyleMap(normalizeStyleMap(post.tierData?.style));
      })
      .catch((err) => {
        console.error(err);
        setEditError('게시글을 불러올 수 없습니다.');
      });
  }, [isEdit, editId, nickname, email]);

  const selectedKeys = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  // 접수 기간(status:'open')인지는 로그인 여부와 무관하게 서버가 그대로 알려준다 — 로그인 안 한 방문자도
  // "이벤트 참여" 버튼 자체는 보고, 누르면 업로드 버튼과 같은 규칙(onUploadClick)으로 로그인부터 안내받는다.
  // 관리자 계정은 애초에 참가할 수 없는 역할이라 버튼을 보이지 않는다(그래도 억지로 시도하면 서버가 막는다).
  const entryOpen = !isAdmin && Boolean(eventInfo) && !eventInfo.missing && eventInfo.status === 'open' && !eventInfo.entered;

  const placed = useMemo(() => getPlacedKeys(state), [state]);
  const pool = useMemo(
    () => ALL_CHARACTERS.filter((c) => !placed.ids.has(String(c.id)) && !placed.names.has(c.name)),
    [placed],
  );
  const charById = useCallback(
    (id) => ALL_CHARACTERS.find((c) => String(c.id) === String(id))
      || Object.values(state).flat().find((c) => String(c.id) === String(id)),
    [state],
  );

  // ── 배치 / 제거 ────────────────────────────────────────────
  // 여러 명을 한 번에 배치한다(고른 순서 그대로). 끼워넣기 위치를 준 경우 그 자리부터 차례로 들어간다.
  const placeMany = useCallback((idsOrChars, key, insertIndex = null) => {
    const chars = idsOrChars
      .map((v) => (typeof v === 'object' ? v : charById(v)))
      .filter(Boolean);
    if (!chars.length) return;
    setState((cur) => chars.reduce(
      (acc, char, i) => placeChar(acc, char, key, insertIndex == null ? null : insertIndex + i),
      cur,
    ));
    setSelectedIds([]);
    anchorRef.current = null;
  }, [charById]);

  const place = useCallback((charOrId, key, insertIndex = null) => {
    placeMany([charOrId], key, insertIndex);
  }, [placeMany]);

  const backToPool = useCallback((charIds) => {
    const ids = Array.isArray(charIds) ? charIds : [charIds];
    setState((cur) => ids.reduce((acc, id) => removeChar(acc, id), cur));
    setSelectedIds([]);
    anchorRef.current = null;
  }, []);

  // ── 드래그(PC) ─────────────────────────────────────────────
  // 여러 명을 골라 둔 상태에서 그중 하나를 끌면 고른 전부를 함께 옮긴다.
  const onDragStart = (id) => (e) => {
    const ids = selectedKeys.has(String(id)) && selectedIds.length > 1 ? [...selectedIds] : [id];
    dragRef.current = { ids };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
    e.currentTarget.classList.add('dragging');
  };
  const onDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    dragRef.current = null;
  };
  const allowDrop = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const draggedIds = (e) => {
    if (dragRef.current?.ids?.length) return dragRef.current.ids;
    const raw = e.dataTransfer.getData('text/plain');
    return raw ? [raw] : [];
  };

  const dropOnZone = (key) => (e) => {
    e.preventDefault();
    placeMany(draggedIds(e), key);
  };
  const dropOnCard = (key, cardIndex) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    placeMany(draggedIds(e), key, cardIndex);
  };
  const dropOnPool = (e) => {
    e.preventDefault();
    const ids = draggedIds(e);
    if (ids.length) backToPool(ids);
  };

  // ── 드래그 중 화면 끝 자동 스크롤 ──────────────────────────
  // 포인터가 화면 위/아래 80px 안으로 들어오면 페이지를 자동으로 굴려, 화면 밖에 있는
  // 티어 칸이나 풀까지 드래그 한 번으로 옮길 수 있게 한다(바닐라 initAutoScroll 이식).
  useEffect(() => {
    let timer = null;
    let dir = 0;
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } dir = 0; };
    const onDragOver = (e) => {
      const edge = 80;
      const next = e.clientY < edge ? -15 : (e.clientY > window.innerHeight - edge ? 15 : 0);
      if (next === dir) return;
      stop();
      dir = next;
      if (dir) timer = setInterval(() => window.scrollBy(0, dir), 16);
    };
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragend', stop);
    document.addEventListener('drop', stop);
    return () => {
      stop();
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragend', stop);
      document.removeEventListener('drop', stop);
    };
  }, []);

  // 고른 캐릭터가 있는 동안에는 드롭존 테두리를 강조한다(custom-maker.css 의 body.char-selected-mode).
  useEffect(() => {
    document.body.classList.toggle('char-selected-mode', selectedIds.length > 0);
    return () => document.body.classList.remove('char-selected-mode');
  }, [selectedIds.length]);

  // ── 풀이 화면에 보이는 동안만 ▲▼ 버튼 표시 ────────────────
  useEffect(() => {
    const el = poolWrapRef.current;
    if (!el || typeof IntersectionObserver !== 'function') { setPoolVisible(true); return undefined; }
    const io = new IntersectionObserver(
      (entries) => setPoolVisible(entries.some((en) => en.isIntersecting)),
      { threshold: 0, rootMargin: '120px 0px 80px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scrollToTierBoard = () => tierAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToPoolBottom = () => {
    poolWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // 모바일처럼 풀 자체가 스크롤되는 경우에는 그 안쪽도 맨 아래로 내린다.
    const grid = poolWrapRef.current?.querySelector('.characters-pool');
    if (grid) grid.scrollTop = grid.scrollHeight;
  };

  // ── 선택(탭 배치 / Ctrl·Shift 다중 선택) ───────────────────
  const selectedChars = useMemo(
    () => selectedIds.map((id) => charById(id)).filter(Boolean),
    [selectedIds, charById],
  );
  const selectedChar = selectedChars[0] || null;

  // 풀 카드 클릭 — 그냥 누르면 한 명(다시 누르면 해제), Ctrl(⌘)은 하나씩 더하기/빼기,
  // Shift 는 기준점부터 지금 누른 카드까지(풀에 놓인 순서 = 왼쪽 위 → 오른쪽 아래) 한 번에.
  const onPoolCardClick = (char, poolIndex) => (e) => {
    const id = char.id;
    if (e.shiftKey && anchorRef.current != null) {
      const from = pool.findIndex((c) => String(c.id) === String(anchorRef.current));
      if (from !== -1) {
        const [a, b] = from <= poolIndex ? [from, poolIndex] : [poolIndex, from];
        setSelectedIds(pool.slice(a, b + 1).map((c) => c.id));
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds((cur) => (cur.some((v) => String(v) === String(id))
        ? cur.filter((v) => String(v) !== String(id))
        : [...cur, id]));
      anchorRef.current = id;
      return;
    }
    setSelectedIds((cur) => (cur.length === 1 && String(cur[0]) === String(id) ? [] : [id]));
    anchorRef.current = id;
  };

  // 배치된 카드를 누르면 풀로 되돌린다(예전과 동일).
  const onPlacedCardClick = (char) => () => backToPool(char.id);
  const onZoneClick = (key) => () => { if (selectedIds.length) placeMany(selectedIds, key); };

  // ── 풀 검색 ────────────────────────────────────────────────
  // 입력 중에는 비슷한 이름을 최대 5명까지 추천하고(이름이 검색어로 시작하는 쪽을 먼저),
  // [검색하기]를 누르면 이름이 **똑같은** 캐릭터 카드로 스크롤해 잠깐 강조한다.
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const starts = [];
    const contains = [];
    ALL_CHARACTERS.forEach((c) => {
      const name = c.name.toLowerCase();
      if (name.startsWith(q)) starts.push(c);
      else if (name.includes(q)) contains.push(c);
    });
    return [...starts, ...contains].slice(0, 5);
  }, [search]);

  const runSearch = (raw) => {
    const q = String(raw ?? search).trim();
    if (!q) { setSearchMsg('찾을 캐릭터 이름을 입력해주세요.'); return; }
    const exact = ALL_CHARACTERS.find((c) => c.name.trim().toLowerCase() === q.toLowerCase());
    if (!exact) {
      setSearchMsg(`"${q}" 와(과) 이름이 똑같은 캐릭터가 없어요. 아래 추천에서 골라보세요.`);
      setSuggestOpen(true);
      return;
    }
    setSearchMsg('');
    setSuggestOpen(false);
    setFoundId(exact.id);
    // 이미 티어에 배치된 캐릭터면 티어표 쪽 카드로, 아니면 풀 카드로 간다.
    window.requestAnimationFrame(() => {
      const sel = `[data-id="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(exact.id)) : String(exact.id)}"]`;
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else setSearchMsg(`${exact.name} 은(는) 지금 화면에 없어요(다른 등급에 배치돼 있을 수 있어요).`);
    });
  };

  // 강조는 잠깐만 — 2.6초 뒤에 스스로 풀린다.
  useEffect(() => {
    if (!foundId) return undefined;
    const timer = setTimeout(() => setFoundId(null), 2600);
    return () => clearTimeout(timer);
  }, [foundId]);

  // ── 초기화 ─────────────────────────────────────────────────
  const resetAll = () => {
    if (!window.confirm('모든 배치를 초기화할까요?')) return;
    setState({});
    setSelectedIds([]);
    anchorRef.current = null;
  };

  // ── 다운로드 ───────────────────────────────────────────────
  // exporting 상태가 켜지면 화면 밖 컨테이너에 9개 등급이 한꺼번에 렌더되고,
  // 아래 effect 가 그걸 순서대로 캡처한다(편집 화면은 그대로 유지).
  useEffect(() => {
    if (!exporting) return undefined;
    let cancelled = false;

    (async () => {
      try {
        setBusyText('이미지 준비 중...');
        const html2canvas = await loadHtml2Canvas();
        const root = exportRef.current;
        await waitForImages(root);
        await sleep(150);
        const allBoards = [...(root?.querySelectorAll('[data-export-tier]') || [])];

        if (exporting === 'png') {
          // PNG는 등급별로 파일이 따로 나뉘므로, 캐릭터가 하나도 없는 등급은 빈 파일을 만들 이유가 없어 건너뛴다.
          // (PDF는 한 파일 안에 전 등급이 순서대로 이어지는 문서라 건너뛰지 않고 그대로 둔다 — 빈 등급도 몇 등급인지 알 수 있게)
          const boards = allBoards.filter((b) => b.dataset.exportEmpty !== 'true');
          if (!boards.length) {
            window.alert('배치된 캐릭터가 없어 저장할 등급이 없습니다.');
            return;
          }
          for (let i = 0; i < boards.length; i += 1) {
            if (cancelled) return;
            setBusyText(`PNG 저장 중 (${i + 1}/${boards.length})`);
            const canvas = await html2canvas(boards[i], { scale: 2, backgroundColor: '#111111', logging: false });
            const link = document.createElement('a');
            link.download = `tier-${boards[i].dataset.exportTier}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            await sleep(500);
          }
        } else {
          const boards = allBoards;
          const JsPDF = await loadJsPdf();
          const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          for (let i = 0; i < boards.length; i += 1) {
            if (cancelled) return;
            setBusyText(`PDF 만드는 중 (${i + 1}/${boards.length})`);
            const canvas = await html2canvas(boards[i], { scale: 2, backgroundColor: '#111111', logging: false });
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            if (i > 0) pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
          }
          pdf.save('all-tiers.pdf');
        }
      } catch (err) {
        console.error(err);
        window.alert('❌ 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        if (!cancelled) { setExporting(null); setBusyText(''); }
      }
    })();

    return () => { cancelled = true; };
  }, [exporting]);

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(buildJsonExport(state), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'human-bug-tier-custom.json';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const onDownload = (type) => {
    setMenuOpen(false);
    if (type === 'json') { downloadJson(); return; }
    if (exporting) return;
    setExporting(type);
  };

  // ── 업로드 / 수정완료 ──────────────────────────────────────
  const onUploadClick = () => {
    if (isStaticPreview()) { window.alert('서버가 있는 환경에서만 업로드할 수 있습니다.'); return; }
    if (!isLoggedIn) {
      if (window.confirm('업로드하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) navigate('/login');
      return;
    }
    if (!hasPlacedCharacters(state)) {
      window.alert(isEdit
        ? '티어에 배치된 캐릭터가 없습니다.\n캐릭터를 배치한 후 저장해주세요.'
        : '티어에 배치된 캐릭터가 없습니다.\n캐릭터를 배치한 후 업로드해주세요.');
      return;
    }
    setModalOpen(true);
  };

  if (isEdit && editError) {
    return (
      <div className="maker-container">
        <p className="react-state-msg">{editError}</p>
        <p style={{ textAlign: 'center' }}><Link to="/board">← 게시판으로</Link></p>
      </div>
    );
  }
  if (isEdit && !editPost) {
    return <div className="maker-container"><p className="react-state-msg">게시글을 불러오는 중...</p></div>;
  }

  return (
    <div className={`maker-container${isEdit ? ' maker-container--edit' : ''}`}>
      <h1>
        <img src={`${LOGO_URL.replace('logo.webp', 'human_bug_eyes_icon.gif')}`} className="eyes_icon" alt="" />
        {' '}{isEdit ? '게시글 수정' : '커스텀 티어 메이커'}
      </h1>
      {/* 안내 배너는 이벤트 링크로 들어왔을 때만 — 그냥 제작하러 온 사람에게는 [이벤트 참여] 버튼만 보인다 */}
      {eventId && eventInfo && (
        <div className={`edit-mode-banner event-mode-banner${eventInfo.canEnter ? '' : ' is-inactive'}`}>
          {eventInfo.missing && '이벤트 정보를 불러오지 못했어요. 티어표는 그대로 만들어 게시판에 올릴 수 있습니다.'}
          {!eventInfo.missing && eventInfo.canEnter && (
            <>🏆 「<strong>{eventInfo.title}</strong>」 이벤트에 낼 티어표를 만드는 중이에요. 완성한 뒤 <strong>업로드</strong>하면 자동으로 참가됩니다.</>
          )}
          {!eventInfo.missing && !eventInfo.canEnter && (
            <>「<strong>{eventInfo.title}</strong>」 이벤트는 {eventInfo.entered ? '이미 참가하셨어요.' : !isLoggedIn ? '로그인 후 참가할 수 있어요.' : '지금 참가할 수 없어요(접수 종료).'} 티어표는 그대로 만들어 게시판에 올릴 수 있습니다.</>
          )}
          {' '}<Link to="/event#showcase">이벤트 페이지로</Link>
        </div>
      )}
      {isEdit && (
        <div className="edit-mode-banner">
          「<strong>{editPost.title}</strong>」 게시 티어표를 불러왔습니다. 수정 후 <strong>수정완료</strong>를 누르세요.
          {' '}<Link to={`/board/post?id=${encodeURIComponent(editId)}`}>상세로 돌아가기</Link>
        </div>
      )}
      <p className="mobile-maker-help">
        모바일: 캐릭터를 <strong>탭</strong>해 선택한 뒤, 위 티어 칸을 <strong>탭</strong>하면 배치됩니다. (PC는 드래그도 가능)
      </p>
      {selectedChar && (
        <div className="mobile-place-hint">
          {selectedChars.length > 1
            ? <><strong>{selectedChars.length}명</strong> 선택됨 → 배치할 티어 칸을 누르면 한 번에 들어갑니다</>
            : <><strong>{selectedChar.name}</strong> 선택됨 → 배치할 티어 칸을 탭하세요</>}
        </div>
      )}
      <p className="pool-multi-help">
        PC: <strong>Ctrl</strong>(⌘)+클릭으로 여러 명, <strong>Shift</strong>+클릭으로 사이 전부 선택 — 티어 칸을 누르면 한 번에 배치됩니다.
      </p>

      {/* 등급 이동 — 화살표 + 번호 버튼(페이지네이션)을 한 줄에 두어 원하는 등급으로 바로 이동할 수 있다.
          TIERS 길이만 보고 동작하므로 등급이 늘어도 그대로 작동한다. */}
      <div className="tier-nav">
        <h2 id="tier-title">{tier.title}</h2>
        <nav className="tier-switch-nav" aria-label="등급 이동">
          <button
            type="button"
            className="tier-switch-btn tier-switch-arrow"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="이전 티어"
          >
            ←
          </button>
          <div className="tier-switch-pages">
            {TIERS.map((t, i) => (
              <button
                type="button"
                key={t.tier}
                className={`tier-switch-btn${i === index ? ' is-active' : ''}`}
                onClick={() => setIndex(i)}
              >
                {t.tier}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tier-switch-btn tier-switch-arrow"
            onClick={() => setIndex((i) => Math.min(TIERS.length - 1, i + 1))}
            disabled={index === TIERS.length - 1}
            aria-label="다음 티어"
          >
            →
          </button>
        </nav>
      </div>

      <div id="tier-capture-area" ref={tierAreaRef} {...tierStyleProps(styleMap, index)}>
        <div id="tier-list" className="tier-list">
          {tier.subTiers.map((sub) => {
            const key = zoneKey(index, sub);
            const chars = state[key] || [];
            return (
              <div className="tier" key={key}>
                <div className="tier-name">{sub}</div>
                <div
                  className="characters drop-zone"
                  data-tier={sub}
                  onDragOver={allowDrop}
                  onDrop={dropOnZone(key)}
                  onClick={onZoneClick(key)}
                >
                  {chars.map((char, ci) => (
                    <CharCard
                      key={char.id}
                      char={char}
                      onDragStart={onDragStart(char.id)}
                      onDragEnd={onDragEnd}
                      onDragOver={allowDrop}
                      onDrop={dropOnCard(key, ci)}
                      onClick={onPlacedCardClick(char)}
                      found={String(foundId) === String(char.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DecoratePanel
        hidden={!decorateOpen}
        styleMap={styleMap}
        index={index}
        scope={decorateScope}
        onScopeChange={setDecorateScope}
        onChange={setStyleMap}
      />

      <div className="action-bar">
        <button
          type="button"
          className="btn btn-decorate"
          aria-expanded={decorateOpen}
          aria-controls="decorate-panel"
          onClick={() => setDecorateOpen((v) => !v)}
        >
          <span className="btn-text">꾸미기</span>
          <span className="btn-icon">✨</span>
        </button>
        <button type="button" className="btn btn-reset" onClick={resetAll}>
          <span className="btn-text">초기화</span>
          <span className="btn-icon">🗑️</span>
        </button>

        <div className="btn-dropdown">
          <button type="button" className="btn btn-download" onClick={() => setMenuOpen((v) => !v)} disabled={Boolean(exporting)}>
            <span className="btn-text">{busyText || '다운로드'}</span>
            <span className="btn-icon">⬇️</span>
          </button>
          <div className={`dropdown-menu${menuOpen ? ' show' : ''}`}>
            <button type="button" className="dropdown-item" onClick={() => onDownload('png')}>PNG로 저장</button>
            <button type="button" className="dropdown-item" onClick={() => onDownload('pdf')}>PDF로 저장</button>
            <button type="button" className="dropdown-item" onClick={() => onDownload('json')}>JSON으로 저장</button>
          </div>
        </div>

        <button type="button" className="btn btn-upload" onClick={onUploadClick}>
          <span className="btn-text">{isEdit ? '수정완료' : '업로드'}</span>
          <span className="btn-icon">{isEdit ? '✅' : '🔗'}</span>
        </button>

        {/* 업로드 버튼 오른쪽 — 접수 기간이면 비로그인 방문자에게도 보이고, 누르면 onUploadClick 이
            로그인부터 안내한 뒤(필요 시) 업로드 창을 "이벤트 참여" 기본 체크로 연다. */}
        {!isEdit && entryOpen && (
          <button
            type="button"
            className="btn btn-event"
            title={`「${eventInfo.title}」 이벤트에 이 티어표를 냅니다`}
            onClick={() => { setJoinIntent(true); onUploadClick(); }}
          >
            <span className="btn-text">이벤트 참여</span>
            <span className="btn-icon">🏆</span>
          </button>
        )}
      </div>

      <div className="character-pool" ref={poolWrapRef} onDragOver={allowDrop} onDrop={dropOnPool}>
        <h3>
          📦 전체 캐릭터 풀 <span className="pool-hint-pc">(드래그해서 위로)</span>
          <span className="pool-hint-mobile">(탭으로 선택)</span>
          {' '}<small>{pool.length}명</small>
        </h3>

        {/* 이름으로 찾기 — 입력 중에는 비슷한 이름 최대 5명, [검색하기]는 이름이 똑같은 카드로 이동 */}
        <div className="pool-search">
          <div className="pool-search-row">
            <input
              id="pool-search-input"
              type="text"
              className="pool-search-input"
              value={search}
              placeholder="캐릭터 이름으로 찾기"
              autoComplete="off"
              aria-label="캐릭터 이름 검색"
              onChange={(e) => { setSearch(e.target.value); setSearchMsg(''); setSuggestOpen(true); }}
              onFocus={() => setSuggestOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
                if (e.key === 'Escape') setSuggestOpen(false);
              }}
            />
            {search && (
              <button type="button" className="pool-search-clear" aria-label="검색어 지우기"
                onClick={() => { setSearch(''); setSearchMsg(''); setSuggestOpen(false); }}
              >✕</button>
            )}
            <button type="button" className="pool-search-btn" onClick={() => runSearch()}>검색하기</button>
          </div>
          {suggestOpen && suggestions.length > 0 && (
            <ul className="pool-suggest">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => { setSearch(c.name); runSearch(c.name); }}>
                    <img src={tierImageUrl(c.img)} alt="" loading="lazy" />
                    <span className="pool-suggest-name">{c.name}</span>
                    <em className="pool-suggest-tier">{c.tier}티어</em>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchMsg && <p className="pool-search-msg">{searchMsg}</p>}
        </div>

        <div id="character-pool" className="characters-pool">
          {pool.map((char, pi) => (
            <CharCard
              key={char.id}
              char={char}
              selected={selectedKeys.has(String(char.id))}
              found={String(foundId) === String(char.id)}
              onDragStart={onDragStart(char.id)}
              onDragEnd={onDragEnd}
              onClick={onPoolCardClick(char, pi)}
            />
          ))}
        </div>
      </div>

      {/* 풀이 화면에 보이는 동안만 뜨는 이동 버튼 — ▲ 티어표로, ▼ 풀 맨 아래로.
          PNG 캡처 영역(#tier-capture-area) 밖이라 캡처에는 찍히지 않는다. */}
      {poolVisible && (
        <div className="pool-viewport-arrows is-on">
          <button type="button" className="pool-arrow pool-arrow--up" aria-label="티어표로 이동" onClick={scrollToTierBoard}>▲</button>
          <button type="button" className="pool-arrow pool-arrow--down" aria-label="캐릭터 풀 맨 아래로 이동" onClick={scrollToPoolBottom}>▼</button>
        </div>
      )}

      {/* 캡처 전용 — 화면 밖에 전 등급을 한 번에 렌더해 두고 순서대로 찍는다.
          꾸미기 변수는 캡처 대상(#tier-capture-area 와 같은 역할)에 그대로 얹어 PNG/PDF 에도 반영한다 */}
      {exporting && (
        <div ref={exportRef} style={{ position: 'fixed', left: -99999, top: 0, width: 900 }} aria-hidden="true">
          {TIERS.map((t, i) => {
            const decorated = tierStyleProps(styleMap, i);
            // 이 등급에 캐릭터가 하나도 없으면 PNG 저장 때 건너뛴다(등급 자체는 항상 그려서 PDF/화면은 그대로 유지).
            const isEmptyTier = t.subTiers.every((sub) => !(state[zoneKey(i, sub)] || []).length);
            return (
              <div
                className="tier-capture-area"
                data-export-tier={t.tier}
                data-export-empty={isEmptyTier ? 'true' : undefined}
                key={t.tier}
                {...decorated}
                style={{ ...decorated.style, width: 900 }}
              >
                <h2 style={{ color: 'var(--tier-accent, #ffcc00)', textAlign: 'center', margin: '0 0 10px', fontSize: '1.1rem', padding: '10px 0' }}>
                  {t.title}
                </h2>
                <div className="tier-list">
                  {t.subTiers.map((sub) => (
                    <div className="tier" key={sub}>
                      <div className="tier-name">{sub}</div>
                      <div className="characters">
                        {(state[zoneKey(i, sub)] || []).map((char) => (
                          <div className="char" key={char.id}>
                            <img src={tierImageUrl(char.img)} alt={char.name} />
                            <p>{char.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <UploadModal
          state={state}
          styleMap={styleMap}
          user={{ nickname, email }}
          editId={editId}
          editPost={editPost}
          eventInfo={entryOpen ? eventInfo : null}
          eventDefaultOn={joinIntent}
          onEventJoined={() => { setModalOpen(false); navigate('/event#showcase'); }}
          onClose={() => setModalOpen(false)}
          onDone={(postId) => {
            setModalOpen(false);
            navigate(postId ? `/board/post?id=${encodeURIComponent(postId)}` : '/board');
          }}
        />
      )}
    </div>
  );
}

// ── 업로드/수정 모달 (제목·내용·썸네일 → POST 또는 PUT /api/tierlists) ────────
function UploadModal({ state, styleMap, user, editId, editPost, eventInfo, eventDefaultOn, onEventJoined, onClose, onDone }) {
  const isEdit = Boolean(editId);
  // 이벤트 링크로 왔거나 [이벤트 참여]로 열었으면 기본으로 켜 두고, 그냥 업로드면 꺼 둔다
  // (진행 중인 이벤트가 있다고 해서 올리는 글이 자동으로 출품되면 안 되므로).
  const [joinEvent, setJoinEvent] = useState(Boolean(eventDefaultOn));
  const [title, setTitle] = useState(editPost?.title || '');
  const [description, setDescription] = useState(editPost?.description || '');
  // null = 원래 썸네일(수정) 또는 자동 대표 이미지(신규) 유지
  const [thumb, setThumb] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const fallbackThumb = editPost?.thumbnail || getThumbnailFromState(state);
  const preview = thumb || (fallbackThumb.startsWith('data:') ? fallbackThumb : tierImageUrl(fallbackThumb));

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setThumb(await compressImageFile(file));
    } catch (err) {
      window.alert(`❌ ${err.message}`);
    }
  };

  const submit = async () => {
    if (!title.trim()) { window.alert('제목을 입력해주세요.'); return; }
    setBusy(true);
    try {
      const payload = buildUploadPayload(state, {
        title,
        description,
        user,
        thumbnail: thumb || fallbackThumb,
        styleMap,
      });
      const res = isEdit
        ? await updatePost(editId, payload)
        : await apiRequest('/api/tierlists', { method: 'POST', body: JSON.stringify(payload) });

      if (!res.ok) {
        window.alert(`❌ ${res.data.error || (isEdit ? '수정에 실패했습니다.' : '업로드에 실패했습니다.')}`);
        return;
      }
      if (isEdit) {
        window.alert('✅ 게시글 수정이 완료되었습니다.');
        onDone(editId);
        return;
      }
      // 이벤트 참가: 방금 올린 게시글로 출품한다. 실패해도 게시글은 이미 올라가 있으므로 이유를 알려주고 게시판으로 안내한다.
      if (eventInfo && joinEvent) {
        const created = res.data?.tierList;
        const entry = created?._id
          ? await apiRequest('/api/events/showcase/entry', { method: 'POST', body: JSON.stringify({ tierListId: created._id }) })
          : { ok: false, data: { error: '올린 게시글을 확인하지 못했습니다.' } };
        if (entry.ok) {
          window.alert(`✅ 업로드하고 「${eventInfo.title}」 이벤트에 참가했어요!\n이벤트 페이지로 이동합니다.`);
          onEventJoined();
          return;
        }
        window.alert(`✅ 게시판에는 업로드되었어요.\n다만 이벤트 참가는 하지 못했습니다: ${entry.data?.error || '알 수 없는 오류'}\n(이벤트 페이지에서 올린 글로 다시 참가할 수 있어요.)`);
        onClose();
        return;
      }
      if (window.confirm('✅ 게시판에 업로드되었습니다!\n게시판으로 이동할까요?')) onDone();
      else onClose();
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버에 연결할 수 없습니다. backend에서 npm start를 실행해주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="upload-modal-overlay" onClick={onClose}>
      <div className="upload-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? '게시글 수정' : '게시판에 업로드'}</h3>
        <label className="upload-modal-field">
          <span>제목</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="티어표 제목" maxLength={80} />
        </label>
        <label className="upload-modal-field">
          <span>내용</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)" rows={4} />
        </label>
        <div className="upload-modal-field">
          <span>썸네일</span>
          <img className="upload-modal-thumb-preview" src={preview} alt="썸네일 미리보기" />
          <div className="upload-modal-thumb-actions">
            <button type="button" className="upload-modal-file-btn" onClick={() => fileRef.current?.click()}>이미지 선택</button>
            {thumb && <button type="button" className="upload-modal-cancel" onClick={() => setThumb(null)}>기본값으로</button>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
          </div>
          <p className="upload-modal-hint">
            {isEdit
              ? '선택하지 않으면 기존 대표 이미지가 그대로 유지됩니다.'
              : '선택하지 않으면 배치된 첫 캐릭터 이미지가 대표 이미지로 쓰입니다.'}
          </p>
        </div>
        {eventInfo && !isEdit && (
          <label className="upload-modal-event">
            <input type="checkbox" checked={joinEvent} onChange={(e) => setJoinEvent(e.target.checked)} />
            <span>🏆 이 티어표로 「<strong>{eventInfo.title}</strong>」 이벤트에 참가하기</span>
          </label>
        )}
        <div className="upload-modal-actions">
          <button type="button" className="upload-modal-cancel" onClick={onClose} disabled={busy}>취소</button>
          <button type="button" className="upload-modal-submit" onClick={submit} disabled={busy}>
            {busy ? (isEdit ? '저장 중...' : '업로드 중...') : (isEdit ? '수정완료' : '업로드')}
          </button>
        </div>
      </div>
    </div>
  );
}
