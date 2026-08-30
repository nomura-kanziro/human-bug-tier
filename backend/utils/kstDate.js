// Render 등 UTC 서버 환경에서 한국 시간 기준 날짜 문자열을 만들기 위한 유틸.
// new Date().toISOString() 을 그대로 쓰면 KST 오전 9시 이전에 날짜가 하루 밀린다.
function getKstDateString(date = new Date()) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

module.exports = { getKstDateString };
