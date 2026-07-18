---
name: handoff
description: >
  팀 인수인계, 온보딩, Codex 가이드, 프로젝트 설명, handoff, onboarding.
  Codex: team handoff.
---

# Codex 스킬 — 팀 인수인계 · 온보딩

## When

- 새 팀원 / Codex로 프로젝트 처음 다룰 때
- “인수인계”, “온보딩”, “프로젝트 설명해”
- 전체 구조·실행·문서 위치를 한 번에 안내

## Do

1. 루트 **`AGENTS.md`** (+ 필요 시 `CLAUDE.md`) 실행·규칙 요약
2. 아래 Day-0 체크리스트 순서 안내 (코드 수정 전)
3. 담당 기능 → `codex/<기능>/skill.md` 경로 안내
4. 시크릿 실값은 묻지 말고 `.env.example` 키만
5. Claude → `.claude/`, Grok → `groks/` 도 짧게 언급

## Do not

- RDMD 전체 일지 한꺼번에 덤프
- 시크릿 예시 날조
- “GH Pages만 켜면 전부 된다”

---

## Day-0 체크리스트

### 1) 환경

```bash
cd backend
npm install
copy .env.example .env    # mac/linux: cp .env.example .env
# MONGO_URI, ADMIN_INPUT_ID, ADMIN_INPUT_PW
npm start
```

→ http://localhost:5000/

### 2) 읽기 순서

| 순서 | 문서 |
|:----:|------|
| 1 | `README.md` |
| 2 | `AGENTS.md` (Codex) / `CLAUDE.md` (Claude) |
| 3 | `RDMD/summary/work-history.md` |
| 4 | `RDMD/features/overview.md` |
| 5 | `RDMD/guides/path-and-api.md` |
| 6 | `DEPLOY.md` (필요 시) |

### 3) 기능 ↔ Codex 스킬

| 기능 | 코드 | skill |
|------|------|-------|
| 공통 | common.js, header | `common` |
| 티어 | tier-class/ | `tier-class` |
| 커스텀 | custom-maker/ | `custom-maker` |
| 로그인 | user_login/ | `auth` |
| 공지 | notice/ | `notice` |
| 문의 | Contact_us/ | `inquiry` |
| 관리자 | admin/ | `admin` |
| API | backend/ | `backend` |

### 4) 함정 5가지

1. 항상 `backend` :5000 통합 실행  
2. 링크 깨짐 → getBasePath  
3. 관리 API → requireAdmin + getAdminAuthHeaders  
4. 재설정 토큰은 DB에 해시만  
5. `.env` 미커밋  

### 5) 첫 실습

가입/로그인 → 커스텀 업로드 → admin 공지 → 문의·답변

## Checklist

- [ ] 실행·읽기 순서·스킬 경로
- [ ] 함정 5가지
- [ ] 시크릿 미노출
