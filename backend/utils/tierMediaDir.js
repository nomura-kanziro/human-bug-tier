/* ======================================================================
 * 캐릭터 이미지 폴더 경로 대응 유틸 (tier-image → tier-media → tier-media/tier-image)
 * ----------------------------------------------------------------------
 * root-render 프론트의 캐릭터 이미지 폴더 경로가 2026-09에 두 번 바뀌었다:
 *   ① tier-image                (최초)
 *   ② tier-media                (이미지 외 다른 미디어도 담을 폴더로 이름만 확장)
 *   ③ tier-media/tier-image     (tier-media 안을 미디어 종류별로 다시 나눔 — 지금 이미지는 여기)
 * 하지만 이 백엔드 서버 하나가 root-cloudflare(로컬 기본, 폴더 구조 그대로 ①번 tier-image
 * 유지)와 root-render(Render 배포, 지금은 ③번 tier-media/tier-image) 두 프론트를
 * STATIC_ROOT/RENDER 환경변수로 전환해가며 공용으로 서빙하기 때문에, "지금 서빙 중인
 * 프론트가 어느 쪽이냐"에 따라 실제 폴더 경로가 달라야 정적 파일 404가 나지 않는다.
 *
 * getTierMediaDir()   : 현재 활성 정적 루트에 맞는 폴더 경로 접두사
 *                        ('tier-media/tier-image' | 'tier-image')를 server.js의
 *                        resolveStaticRoot()와 동일한 우선순위(STATIC_ROOT > RENDER=true
 *                        여부 > 기본값)로 판단해서 반환한다.
 * resolveTierMediaPath(rawPath) : DB에 저장돼 있거나 데이터 파일(luckPool.js)에 하드코딩된
 *                        문자열이 위 ①②③ 접두사 중 어떤 걸 갖고 있든(작성 시점마다 다를 수 있음)
 *                        그 접두사만 떼어내고 지금 활성화된 접두사로 다시 붙여서 반환한다.
 *                        과거 어느 시점에 저장된 데이터든 이 함수를 거치면 항상 지금 서빙
 *                        중인 프론트에 실제로 존재하는 경로를 가리키게 되므로, 별도의
 *                        DB 마이그레이션 없이도 모든 시점의 데이터가 정상 표시된다.
 * ====================================================================== */

// server.js의 resolveStaticRoot()와 같은 순서로 "지금 어느 프론트를 서빙 중인지" 판단한다.
// STATIC_ROOT가 root-render를 가리키거나, STATIC_ROOT 지정이 없고 RENDER=true이면
// root-render 쪽 경로(tier-media/tier-image)를, 그 외(로컬 기본 root-cloudflare, 또는
// 이름을 알 수 없는 커스텀 STATIC_ROOT)는 root-cloudflare 쪽 경로(tier-image)를 반환한다.
function getTierMediaDir() {
  const fromEnv = (process.env.STATIC_ROOT || '').trim();
  const isRenderRoot = fromEnv ? /root-render/i.test(fromEnv) : process.env.RENDER === 'true';
  return isRenderRoot ? 'tier-media/tier-image' : 'tier-image';
}

// 문자열 맨 앞의 세 접두사(tier-media/tier-image/ | tier-image/ | tier-media/) 중 하나만
// 제거하고 현재 활성 접두사로 다시 붙인다. 셋 중 하나가 여러 글자를 공유하므로(tier-media가
// tier-media/tier-image의 앞부분) 반드시 가장 긴 것부터 먼저 시도해야 정확히 매치된다.
// 문자열이 아니거나(falsy 등) 셋 중 어느 것도 아니면(예: data:/http(s) URL) 손대지 않는다.
function resolveTierMediaPath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath) return rawPath;
  const stripped = rawPath.replace(/^tier-media\/tier-image\/|^tier-image\/|^tier-media\//, '');
  if (stripped === rawPath) return rawPath; // 세 접두사 중 아무것도 매치 안 됨 → 그대로 반환
  return `${getTierMediaDir()}/${stripped}`;
}

module.exports = { getTierMediaDir, resolveTierMediaPath };
