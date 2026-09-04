// 헤더 우측 프로필 아바타 + 드롭다운(마이페이지/게시판/사진변경/(관리자면 관리하기)/로그아웃).
// 일반 유저와 관리자가 같은 메뉴를 쓰고 "🛠 관리하기" 만 관리자에게 추가된다(관리자 티 안 내기).
// (common.js renderUserProfile/bindUserProfileMenuActions 이식)
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL } from '../lib/paths';

export default function UserProfileMenu({ open, onToggle, onClose, containerRef }) {
  const navigate = useNavigate();
  const { nickname, email, isAdmin, profileImage, logout, changeProfileImage } = useAuth();

  const onImgError = (e) => {
    if (e.currentTarget.src !== window.location.origin + LOGO_URL) e.currentTarget.src = LOGO_URL;
  };

  const act = (action) => {
    onClose();
    switch (action) {
      case 'mypage':
        navigate('/my-page');
        break;
      case 'board':
        // 내 닉네임으로 검색된 게시판 목록 (goToCustomBoard 이식)
        navigate(`/board?search=${encodeURIComponent(`@${nickname}`)}`);
        break;
      case 'photo':
        changeProfileImage();
        break;
      case 'logout':
        logout();
        break;
      case 'admin-manage':
        navigate('/admin');
        break;
      default:
        break;
    }
  };

  return (
    <div
      id="user-profile"
      className="user-profile-btn"
      ref={containerRef}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      <div className="user-profile-avatar">
        <img id="profile-img" src={profileImage} alt="프로필" onError={onImgError} />
      </div>
      <div id="user-profile-panel" className={`user-profile-panel${open ? ' is-open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="user-profile-panel-header">
          <div className="user-profile-panel-avatar">
            <img id="user-profile-panel-img" src={profileImage} alt="프로필" onError={onImgError} />
          </div>
          <div className="user-profile-panel-info">
            <strong id="user-profile-panel-name">{nickname || '사용자'}</strong>
            <span id="user-profile-panel-email">{email}</span>
          </div>
        </div>
        <div className="user-profile-panel-menu">
          <button type="button" className="user-profile-panel-item" onClick={() => act('mypage')}>👤 마이페이지</button>
          <button type="button" className="user-profile-panel-item" onClick={() => act('board')}>📋 커스텀 게시판 보기</button>
          <button type="button" className="user-profile-panel-item" onClick={() => act('photo')}>📷 프로필 사진 변경</button>
          {isAdmin && (
            <button type="button" className="user-profile-panel-item" onClick={() => act('admin-manage')}>🛠 관리하기</button>
          )}
          <button type="button" className="user-profile-panel-item user-profile-panel-item-danger" onClick={() => act('logout')}>로그아웃</button>
        </div>
      </div>
    </div>
  );
}
