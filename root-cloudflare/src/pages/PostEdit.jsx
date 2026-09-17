// 본인 글 수정 (custom-maker/post_edit.html 이식)
// 커스텀 메이커 화면을 그대로 재사용하고 editId 만 넘겨 "수정 모드"로 동작시킨다.
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isValidPostId } from '../lib/boardApi';
import CustomMaker from './CustomMaker';

export default function PostEdit() {
  const [params] = useSearchParams();
  const { isLoggedIn } = useAuth();
  const id = params.get('id') || '';

  if (!isLoggedIn) {
    return (
      <div className="maker-container">
        <p className="react-state-msg">게시글을 수정하려면 로그인이 필요합니다.</p>
        <p style={{ textAlign: 'center' }}><Link to="/login">로그인하러 가기 →</Link></p>
      </div>
    );
  }

  if (!isValidPostId(id)) {
    return (
      <div className="maker-container">
        <p className="react-state-msg">수정할 게시글이 지정되지 않았습니다.</p>
        <p style={{ textAlign: 'center' }}><Link to="/board">← 게시판으로</Link></p>
      </div>
    );
  }

  // key 를 줘서 다른 글로 이동하면 메이커 상태가 새로 초기화되게 한다
  return <CustomMaker key={id} editId={id} />;
}
