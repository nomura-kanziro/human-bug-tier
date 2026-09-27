---
area: frontend
feature: deploy-path
---

# Cloudflare Pages → Oracle 백엔드 연결 (`/api` 프록시 + 빌드 배포)

## 요청

> Cloudflare 에 배포된 프론트를 (Oracle 에 올린) 백엔드와 연결.

## 배경 — 연결 전 상태

`https://human-bug-tier.pages.dev/` 확인 결과 두 가지가 막혀 있었다.

1. **React 가 안 뜸** — 워크플로가 빌드 없이 `pages deploy root-cloudflare` 로 소스 폴더를 그대로 올려,
   배포된 `index.html` 이 `/src/main.jsx`(빌드 전 JSX)를 불렀다. `dist/` 는 `.gitignore` 라 CI 체크아웃에도 없다.
2. **API 없음** — `src/lib/api.js` `getApiBase()` 는 배포 호스트에서 `''`(동일 오리진)를 돌려주므로 요청이
   `<pages 주소>/api/...` 로 가는데, Pages 에는 백엔드가 없어 SPA 폴백 HTML 이 200 으로 돌아왔다.

## 구현 (커밋 `e901894`)

| 파일 | 내용 |
|---|---|
| `root-cloudflare/functions/api/[[path]].js` (신규) | Pages Function. `/api/*` 요청을 경로·쿼리 그대로 백엔드로 전달하고 응답을 돌려준다 |
| `.github/workflows/deploy-cloudflare-pages.yml` | Node 22 설정 → `root-cloudflare` 에서 `npm ci && npm run build` → `workingDirectory: root-cloudflare` 로 `pages deploy dist` |

프록시 함수:

- 백엔드 주소: Pages 환경변수 `API_ORIGIN`, 없으면 기본값 `https://hbt-tier.duckdns.org`.
- 방문자 IP: 클라이언트가 보낸 `X-Forwarded-For` 는 믿지 않고 `cf-connecting-ip` 로 `X-Forwarded-For`·`X-Real-IP` 를 덮어쓴다
  (`backend/utils/getClientIp.js` 가 `x-forwarded-for` 맨 앞 값을 차단 기능에 쓴다). `X-Forwarded-Host` 에 Pages 호스트를 넣는다.
- 본문: GET/HEAD 외에는 `request.arrayBuffer()` 로 읽어 넘긴다(스트림을 그대로 넘기면 Node 의 `fetch` 가 `duplex` 옵션을 요구해 실패했다. 서버 nginx 본문 한도 5 MB 라 부담 없음).
- `redirect: 'manual'` — 백엔드 리다이렉트를 그대로 브라우저에 돌려준다.

`wrangler pages deploy` 는 **명령을 실행한 폴더의 `functions/`** 를 함께 올리므로 `workingDirectory` 를 `root-cloudflare` 로 둔다
(배포 대상 폴더 `dist/` 안이 아니다).

바꾸지 않은 것: 프론트 `getApiBase()`(동일 오리진 → `''` 규칙 유지), `backend/server.js`(Express 를 Workers 로 이식하지 않음).
프론트가 부르는 백엔드 경로는 전부 `/api/*` 라(`/health` 는 프론트에서 쓰지 않음) 함수 하나로 충분하다.

## 확인

- 함수 파일을 Node 에서 불러 Cloudflare 요청을 흉내 냄:
  `GET /api/notices` → 200 `application/json`, `POST /api/auth/login`(없는 아이디) → 400 `{"error":"존재하지 않는 아이디입니다."}` — 본문 전달 확인.
- `npm run build` 성공.

## 배포 상태 — ⚠️ CI 실패 (시크릿 없음)

`e901894` 푸시로 돈 워크플로는 빌드 단계까지 성공하고 **Pages 업로드 단계에서 실패**했다. 로그:

```
✘ [ERROR] In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable for wrangler to work.
```

GitHub 저장소 시크릿 `CLOUDFLARE_API_TOKEN`(·`CLOUDFLARE_ACCOUNT_ID`)이 비어 있다. 이 워크플로는 지금까지 23번 실행돼
**한 번도 성공한 적이 없다**(2026-09-28 GitHub API 기준, 전부 `failure`) — 지금 `pages.dev` 에 떠 있는 것은 CI 가 아닌 경로(Wrangler·MCP 직접 업로드 — [02 기록](./02-cloudflare-pages-static-preview-record.md) 참고)로 예전에 올린 배포본이다.

해결: GitHub → Settings → Secrets and variables → Actions 에 두 시크릿을 등록하고 워크플로를 다시 돌린다
(토큰 권한: Account → Cloudflare Pages → Edit). 또는 로컬에서 `npx wrangler login` 후 `root-cloudflare` 에서
`npm run build && npx wrangler pages deploy dist --project-name=human-bug-tier --branch=master --commit-dirty=true`.

## 해결 — Pages GitHub 연동 빌드 Root directory (2026-09-28)

위 GitHub Actions 와 별개로 Pages 프로젝트 `human-bug-tier` 는 **GitHub 연동 빌드**(master push 시 Cloudflare 가 직접 빌드)도 켜져 있었고, 실제 운영 배포는 이쪽이다.
그런데 빌드 설정 Root directory 가 비어 있어 레포 루트에서 `npm run build` 를 실행 → `/opt/buildhome/repo/package.json` ENOENT 로 `5cb8d58`·`e901894` 빌드가 모두 Failure.
그래서 4일 전(프록시 없는) 배포본이 계속 서비스되며 `/api/*` 가 SPA `index.html` 을 돌려줬다.

조치: Cloudflare API 로 빌드 설정을 **Root directory `root-cloudflare` / Build `npm run build` / Output `dist`** 로 바꾸고 `e901894` 빌드 재시도.
확인: `GET https://human-bug-tier.pages.dev/api/notices` → 200 JSON(Oracle 공지), `POST /api/auth/login`(없는 아이디) → 백엔드 400 JSON, 메인 200.

남은 일: GitHub Actions 워크플로(`deploy-cloudflare-pages.yml`)는 여전히 시크릿 미등록으로 실패 — 연동 빌드와 중복이므로 시크릿 등록 또는 워크플로 비활성화 중 결정.

## 관련

- 백엔드 서버: [`../../backend/07-deploy/03-oracle-cloud-deploy-record.md`](../../backend/07-deploy/03-oracle-cloud-deploy-record.md)
- 이전 Pages 정적 미리보기: [`02-cloudflare-pages-static-preview-record.md`](./02-cloudflare-pages-static-preview-record.md)
- 배포 정본: [`../../../CLOUDFLARE.md`](../../../CLOUDFLARE.md)

## 날짜

2026-09-28
