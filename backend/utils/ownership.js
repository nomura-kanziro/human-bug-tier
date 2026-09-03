/* ====================================================================
 * "이 레코드의 작성자가 곧 이 사람인가?"를 판단하는 공통 유틸
 * ------------------------------------------------------------------
 * 게시글/댓글/문의 등 여러 모델이 author(닉네임)와 authorEmail을 함께 저장하는데,
 * 닉네임은 회원이 변경할 수 있어 시간이 지나면 더 이상 유일하지 않을 수 있다.
 * 반면 이메일은 계정과 1:1로 고정되므로, 이메일 정보가 둘 다 있으면 이메일을
 * 우선 비교하고, 없을 때만 닉네임 문자열 비교로 폴백한다.
 * 본인 확인이 필요한 모든 곳(수정/삭제 권한, 알림에서 "내가 나에게 알림 보내는 것" 방지 등)
 * 에서 이 함수를 공유해 판정 기준을 통일한다.
 * ==================================================================== */
function isSameAuthor(record, actor) {
  if (!record || !actor?.nickname) return false;

  // 모델마다 필드명이 author/participant로 다를 수 있어 둘 다 체크
  const recordEmail = (record.authorEmail || record.participantEmail || '').trim().toLowerCase();
  const actorEmail = (actor.email || '').trim().toLowerCase();

  // 양쪽 다 이메일이 있으면 이메일 일치 여부만으로 판정(닉네임이 달라도 동일인일 수 있음).
  if (recordEmail && actorEmail) {
    return recordEmail === actorEmail;
  }

  // 이메일 정보가 부족한 경우(예: 비회원 작성물)에는 닉네임/작성자명 문자열 비교로 대체.
  const recordAuthor = (record.author || record.participant || record.userId || '').trim();
  return recordAuthor === actor.nickname.trim();
}

// 커스텀 티어 게시글 본인 여부 — isSameAuthor의 의미를 명확히 하는 이름만 다른 래퍼.
function isTierListOwner(tierList, actor) {
  return isSameAuthor(tierList, actor);
}

// 댓글 본인 여부 — 위와 동일한 이유의 래퍼.
function isCommentOwner(comment, actor) {
  return isSameAuthor(comment, actor);
}

// 투표(좋아요/신고 등) 중복 방지를 위한 "행위자 식별 키" 생성.
// 이메일이 있으면 이메일 기반, 관리자면 관리자 전용 네임스페이스, 그 외에는
// 닉네임 기반으로 키를 만들어 서로 다른 유형의 사용자가 같은 문자열로 충돌하지 않게 한다
// (예: 일반 회원 닉네임 "admin"과 실제 관리자 계정이 같은 키로 섞이는 것을 방지).
function getVoterKey(actor) {
  if (!actor?.nickname) return '';
  const email = (actor.email || '').trim().toLowerCase();
  if (email) return `email:${email}`;
  if (actor.isAdmin) return `admin:${actor.nickname}`;
  return `nick:${actor.nickname}`;
}

module.exports = {
  isSameAuthor,
  isTierListOwner,
  isCommentOwner,
  getVoterKey,
};