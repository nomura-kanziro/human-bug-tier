/* ======================================================================
   휴버대 티어표 — Service Worker (셸 캐시, API는 네트워크 우선)
   pwa-register.js / common.js의 ensurePwaAssets가 이 파일을 등록하면 브라우저가 백그라운드에서
   실행하며, 앱의 뼈대(HTML/CSS/JS/아이콘)를 오프라인에서도 뜰 수 있게 캐시해 둔다.
   전략 요약:
     - 정적 셸 파일: install 시 미리 캐시 + 이후에도 네트워크 우선(최신본 우선, 실패 시 캐시로 대체)
     - API 요청(/api/...): 캐시하지 않고 항상 네트워크로만 시도 — 실패하면 오프라인 안내 JSON 반환
     - CACHE_VERSION을 올리면 activate 단계에서 이전 버전 캐시가 자동 삭제됨(캐시 무효화 방법)
   ====================================================================== */
const CACHE_VERSION = 'hbu-pwa-v1';
// 오프라인에서도 최소한 화면이 뜨도록 미리 캐시해 둘 "앱 셸" 파일 목록
const SHELL_URLS = [
  './',
  './index.html',
  './common.css',
  './common.js',
  './Header_Footer.css',
  './header.html',
  './footer.html',
  './manifest.webmanifest',
  './tier-media/tier-image/pwa/icon-192.png',
  './tier-media/tier-image/pwa/icon-512.png',
  './tier-media/tier-image/logo.webp'
];

// install: 서비스워커가 처음 설치될 때 셸 파일들을 한 번에 캐시에 채워 넣는다.
// 일부 파일이 실패해도(addAll 자체는 all-or-nothing이라 catch로 잡음) 설치 자체는 계속 진행되도록
// skipWaiting()으로 새 서비스워커가 대기 없이 즉시 활성화되게 한다.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(SHELL_URLS).catch((err) => {
        console.warn('[sw] precache partial fail', err);
      })
    ).then(() => self.skipWaiting())
  );
});

// activate: 새 버전이 활성화될 때 CACHE_VERSION과 이름이 다른(=이전 버전) 캐시를 모두 지워
// 오래된 셸 파일이 남아있지 않도록 정리하고, clients.claim()으로 열려있는 탭들도 즉시 새 SW가 제어하게 한다.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 요청 URL이 백엔드 API(/api/...)인지 판별 — API는 캐시 대상이 아니라 항상 최신 데이터가 필요하기 때문
function isApiRequest(url) {
  return url.pathname.includes('/api/');
}

// fetch: 모든 네트워크 요청을 가로채 아래 두 가지 전략 중 하나로 처리한다.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // GET이 아닌 요청(POST/PUT/DELETE 등, 로그인·글쓰기 등)은 캐시 대상이 아니므로 그대로 통과시킴
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 외부 도메인(CDN 등) 요청은 이 서비스워커의 캐시 전략 대상이 아니므로 건드리지 않음
  if (url.origin !== self.location.origin) return;

  // 전략 1) API 요청: network only — 절대 캐시된 옛 데이터를 보여주지 않고,
  // 네트워크 자체가 끊기면 오프라인 안내 메시지를 JSON 형태로 만들어 반환(프론트가 파싱 가능하도록)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ message: '오프라인 상태입니다. 네트워크를 확인해 주세요.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 전략 2) 페이지 이동·정적 자원(css/js/image 등): network-first, cache fallback.
  // 우선 네트워크로 최신 버전을 받아와 성공하면 캐시도 갱신해 두고, 네트워크가 실패하면
  // 캐시된 버전을 대신 보여주며, 그마저 없는 페이지 이동 요청이면 최소한 index.html이라도 보여준다.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && (req.mode === 'navigate' || req.destination === 'style' || req.destination === 'script' || req.destination === 'image' || req.destination === 'document')) {
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
      )
  );
});
