// ========================================================
// CustomMaker — 커스텀 티어 메이커 (React 내부 구현)
// ========================================================
// 바닐라(root-render/custom-maker)와 같은 데이터 모델·저장 형식을 유지하되,
// 캐릭터 풀은 tier-class HTML 을 fetch/파싱하지 않고 src/data/tiers.js 에서 바로 가져온다.
//   - PC: HTML5 드래그로 풀 ↔ 등급 칸 이동, 카드 위에 놓으면 그 앞에 끼워넣기
//   - 모바일: 카드를 탭해 선택 → 등급 칸을 탭하면 배치 (DnD 가 불안정해서 별도 경로)
//   - 다운로드: PNG(등급별 9장) · PDF(1파일) · JSON. 캡처는 화면을 바꾸지 않고
//     화면 밖 export 컨테이너를 따로 렌더해서 찍으므로 편집 중 화면이 흔들리지 않는다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ALL_CHARACTERS, TIERS } from '../data/tiers';
import { apiRequest, isStaticPreview } from '../lib/api';
import { loadHtml2Canvas, loadJsPdf } from '../lib/loadScript';
import {
  buildJsonExport, buildUploadPayload, compressImageFile, getPlacedKeys, getThumbnailFromState,
  hasPlacedCharacters, loadMakerState, placeChar, removeChar, saveMakerState, zoneKey,
} from '../lib/makerState';
import { LOGO_URL, tierImageUrl } from '../lib/paths';
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

export default function CustomMaker() {
  const navigate = useNavigate();
  const { isLoggedIn, nickname, email } = useAuth();

  const [index, setIndex] = useState(0);            // 지금 편집 중인 등급 (0-based)
  const [state, setState] = useState(loadMakerState);
  const [selectedId, setSelectedId] = useState(null); // 모바일 탭 선택
  const [exporting, setExporting] = useState(null);   // null | 'png' | 'pdf'
  const [busyText, setBusyText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const exportRef = useRef(null);
  const dragRef = useRef(null); // { id }

  const tier = TIERS[index];

  useEffect(() => { document.title = '커스텀 티어 메이커 | 휴버대 티어표'; }, []);
  useEffect(() => { saveMakerState(state); }, [state]);

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

  // ── 업로드 ─────────────────────────────────────────────────
  const onUploadClick = () => {
    if (isStaticPreview()) { window.alert('서버가 있는 환경에서만 업로드할 수 있습니다.'); return; }
    if (!isLoggedIn) {
      if (window.confirm('업로드하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) navigate('/login');
      return;
    }
    if (!hasPlacedCharacters(state)) {
      window.alert('티어에 배치된 캐릭터가 없습니다.\n캐릭터를 배치한 후 업로드해주세요.');
      return;
    }
    setModalOpen(true);
  };

  return (
    <div className="maker-container">
      <h1>
        <img src={`${LOGO_URL.replace('logo.webp', 'human_bug_eyes_icon.gif')}`} className="eyes_icon" alt="" />
        {' '}커스텀 티어 메이커
      </h1>
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

      <div id="tier-capture-area">
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

      <div className="action-bar">
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
          <span className="btn-text">업로드</span>
          <span className="btn-icon">🔗</span>
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

      {/* 캡처 전용 — 화면 밖에 전 등급을 한 번에 렌더해 두고 순서대로 찍는다 */}
      {exporting && (
        <div ref={exportRef} style={{ position: 'fixed', left: -99999, top: 0, width: 900 }} aria-hidden="true">
          {TIERS.map((t, i) => (
            <div className="tier-list" data-export-tier={t.tier} key={t.tier} style={{ width: 900 }}>
              <h2 style={{ color: '#ffcc00', textAlign: 'center', margin: '0 0 10px', fontSize: '1.1rem', padding: '10px 0' }}>
                {t.title}
              </h2>
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
          ))}
        </div>
      )}

      {modalOpen && (
        <UploadModal
          state={state}
          user={{ nickname, email }}
          onClose={() => setModalOpen(false)}
          onDone={() => { setModalOpen(false); navigate('/board'); }}
        />
      )}
    </div>
  );
}

// ── 업로드 모달 (제목·내용·썸네일 → POST /api/tierlists) ────────
function UploadModal({ state, user, onClose, onDone }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumb, setThumb] = useState(null); // 사용자가 고른 파일(base64). null 이면 자동 대표 이미지
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const preview = thumb || tierImageUrl(getThumbnailFromState(state));

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
        thumbnail: thumb || getThumbnailFromState(state),
      });
      const res = await apiRequest('/api/tierlists', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) {
        window.alert(`❌ ${res.data.error || '업로드에 실패했습니다.'}`);
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
        <h3>게시판에 업로드</h3>
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
          <p className="upload-modal-hint">선택하지 않으면 배치된 첫 캐릭터 이미지가 대표 이미지로 쓰입니다.</p>
        </div>
        <div className="upload-modal-actions">
          <button type="button" className="upload-modal-cancel" onClick={onClose} disabled={busy}>취소</button>
          <button type="button" className="upload-modal-submit" onClick={submit} disabled={busy}>
            {busy ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>
    </div>
  );
}
