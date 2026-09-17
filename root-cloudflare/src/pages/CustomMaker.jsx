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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

function CharCard({ char, selected, onDragStart, onDragEnd, onClick, onDragOver, onDrop }) {
  return (
    <div
      className={`char${selected ? ' selected' : ''}`}
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
  const { isLoggedIn, nickname, email } = useAuth();
  const isEdit = Boolean(editId);

  const [index, setIndex] = useState(0);            // 지금 편집 중인 등급 (0-based)
  const [state, setState] = useState(isEdit ? {} : loadMakerState);
  const [styleMap, setStyleMap] = useState(isEdit ? {} : loadTierStyle);  // 등급별 꾸미기
  const [editPost, setEditPost] = useState(null);   // 수정 모드에서 불러온 원본 게시글
  const [editError, setEditError] = useState('');
  const [decorateOpen, setDecorateOpen] = useState(false);
  const [decorateScope, setDecorateScope] = useState('current'); // 'current' | 'all'
  const [selectedId, setSelectedId] = useState(null); // 모바일 탭 선택
  const [exporting, setExporting] = useState(null);   // null | 'png' | 'pdf'
  const [busyText, setBusyText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const exportRef = useRef(null);
  const dragRef = useRef(null); // { id }

  const tier = TIERS[index];

  useEffect(() => {
    document.title = isEdit ? '게시글 수정 | 휴버대 티어표' : '커스텀 티어 메이커 | 휴버대 티어표';
  }, [isEdit]);

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
  const place = useCallback((charOrId, key, insertIndex = null) => {
    const char = typeof charOrId === 'object' ? charOrId : charById(charOrId);
    if (!char) return;
    setState((cur) => placeChar(cur, char, key, insertIndex));
    setSelectedId(null);
  }, [charById]);

  const backToPool = useCallback((charId) => {
    setState((cur) => removeChar(cur, charId));
    setSelectedId(null);
  }, []);

  // ── 드래그(PC) ─────────────────────────────────────────────
  const onDragStart = (id) => (e) => {
    dragRef.current = { id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
    e.currentTarget.classList.add('dragging');
  };
  const onDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    dragRef.current = null;
  };
  const allowDrop = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const draggedId = (e) => dragRef.current?.id ?? e.dataTransfer.getData('text/plain');

  const dropOnZone = (key) => (e) => {
    e.preventDefault();
    const id = draggedId(e);
    if (id) place(id, key);
  };
  const dropOnCard = (key, cardIndex) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const id = draggedId(e);
    if (id) place(id, key, cardIndex);
  };
  const dropOnPool = (e) => {
    e.preventDefault();
    const id = draggedId(e);
    if (id) backToPool(id);
  };

  // ── 탭 배치(모바일) ────────────────────────────────────────
  const selectedChar = selectedId ? charById(selectedId) : null;
  const onCardClick = (char, fromKey) => () => {
    if (fromKey) { backToPool(char.id); return; }   // 배치된 카드를 탭하면 풀로 되돌림
    setSelectedId((cur) => (String(cur) === String(char.id) ? null : char.id));
  };
  const onZoneClick = (key) => () => { if (selectedId) place(selectedId, key); };

  // ── 초기화 ─────────────────────────────────────────────────
  const resetAll = () => {
    if (!window.confirm('모든 배치를 초기화할까요?')) return;
    setState({});
    setSelectedId(null);
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
        const boards = [...(root?.querySelectorAll('[data-export-tier]') || [])];

        if (exporting === 'png') {
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
          <strong>{selectedChar.name}</strong> 선택됨 → 배치할 티어 칸을 탭하세요
        </div>
      )}

      {/* 등급 이동 — 화살표 + 직접 선택. TIERS 길이만 보고 동작하므로 등급이 늘어도 그대로 작동 */}
      <div className="tier-nav">
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>← 이전 티어</button>
        <h2>{tier.title}</h2>
        <button type="button" onClick={() => setIndex((i) => Math.min(TIERS.length - 1, i + 1))} disabled={index === TIERS.length - 1}>다음 티어 →</button>
      </div>
      <div className="tier-switch-nav">
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

      <div id="tier-capture-area" {...tierStyleProps(styleMap, index)}>
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
                      onClick={onCardClick(char, key)}
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
      </div>

      <div className="character-pool" onDragOver={allowDrop} onDrop={dropOnPool}>
        <h3>
          📦 전체 캐릭터 풀 <span className="pool-hint-pc">(드래그해서 위로)</span>
          <span className="pool-hint-mobile">(탭으로 선택)</span>
          {' '}<small>{pool.length}명</small>
        </h3>
        <div id="character-pool" className="characters-pool">
          {pool.map((char) => (
            <CharCard
              key={char.id}
              char={char}
              selected={String(selectedId) === String(char.id)}
              onDragStart={onDragStart(char.id)}
              onDragEnd={onDragEnd}
              onClick={onCardClick(char, null)}
            />
          ))}
        </div>
      </div>

      {/* 캡처 전용 — 화면 밖에 전 등급을 한 번에 렌더해 두고 순서대로 찍는다.
          꾸미기 변수는 캡처 대상(#tier-capture-area 와 같은 역할)에 그대로 얹어 PNG/PDF 에도 반영한다 */}
      {exporting && (
        <div ref={exportRef} style={{ position: 'fixed', left: -99999, top: 0, width: 900 }} aria-hidden="true">
          {TIERS.map((t, i) => {
            const decorated = tierStyleProps(styleMap, i);
            return (
              <div
                className="tier-capture-area"
                data-export-tier={t.tier}
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
function UploadModal({ state, styleMap, user, editId, editPost, onClose, onDone }) {
  const isEdit = Boolean(editId);
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
