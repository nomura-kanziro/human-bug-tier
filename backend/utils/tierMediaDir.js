/* ======================================================================
 * tier-image → tier-media 폴더 개명 대응 유틸
 * ----------------------------------------------------------------------
 * 2026-09, root-render 프론트에서 캐릭터 이미지 폴더명을 tier-image → tier-media로
 * 바꿨다(영상 등 다른 미디어도 함께 담을 수 있도록). 하지만 이 백엔드 서버 하나가
 * root-cloudflare(로컬 기본, 폴더명 여전히 tier-image)와 root-render(Render 배포,
 * 폴더명 tier-media) 두 프론트를 STATIC_ROOT/RENDER 환경변수로 전환해가며 공용으로
 * 서빙하기 때문에, "지금 서빙 중인 프론트가 어느 쪽이냐"에 따라 실제 폴더명이 달라야
 * 정적 파일 404가 나지 않는다.
 *
 * getTierMediaDir()   : 현재 활성 정적 루트에 맞는 폴더명('tier-media' | 'tier-image')을
 *                        server.js의 resolveStaticRoot()와 동일한 우선순위(STATIC_ROOT >
 *                        RENDER=true 여부 > 기본값)로 판단해서 반환한다.
 * resolveTierMediaPath(rawPath) : DB에 저장돼 있거나 데이터 파일(luckPool.js)에 하드코딩된
 *                        "tier-image/..." 또는 "tier-media/..." 문자열의 폴더명 부분만
 *                        떼어내고, 지금 활성화된 쪽 폴더명으로 다시 붙여서 반환한다.
 *                        개명 이전에 저장된 옛 데이터도 이 함수를 거치면 항상 지금 서빙
 *                        중인 프론트에 실제로 존재하는 폴더를 가리키게 되므로, 별도의
 *                        DB 마이그레이션 없이도 신규/기존 데이터가 모두 정상 표시된다.
 * ====================================================================== */

// server.js의 resolveStaticRoot()와 같은 순서로 "지금 어느 프론트를 서빙 중인지" 판단한다.
// STATIC_ROOT가 root-render를 가리키거나, STATIC_ROOT 지정이 없고 RENDER=true이면 tier-media.
// 그 외(로컬 기본 root-cloudflare, 또는 이름을 알 수 없는 커스텀 STATIC_ROOT)는 tier-image.
function getTierMediaDir() {
  const fromEnv = (process.env.STATIC_ROOT || '').trim();
  if (fromEnv) {
    return /root-render/i.test(fromEnv) ? 'tier-media' : 'tier-image';
  }
  return process.env.RENDER === 'true' ? 'tier-media' : 'tier-image';
}

// 문자열 맨 앞의 "tier-image/" 또는 "tier-media/"만 제거하고 현재 활성 폴더명으로 다시 붙인다.
// 문자열이 아니거나(falsy 등) 두 접두사 중 어느 것도 아니면(예: data:/http(s) URL) 손대지 않는다.
function resolveTierMediaPath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath) return rawPath;
  const stripped = rawPath.replace(/^tier-(image|media)\//, '');
  if (stripped === rawPath) return rawPath; // 두 접두사 중 아무것도 매치 안 됨 → 그대로 반환
  return `${getTierMediaDir()}/${stripped}`;
}

module.exports = { getTierMediaDir, resolveTierMediaPath };
