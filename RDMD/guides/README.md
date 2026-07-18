# 개발 가이드라인 (Guides)

휴버대 티어표 기여·유지보수 시 따라야 할 **규칙과 체크리스트**입니다.  
기능이 *무엇인지* 는 [`../features/`](../features/README.md), *무엇을 해왔는지* 는 [`../summary/`](../summary/work-history.md) 를 보세요.

## 문서 목록

| 문서 | 내용 |
|------|------|
| [development.md](./development.md) | 로컬 실행, 브랜치, 작업 흐름 |
| [coding-conventions.md](./coding-conventions.md) | 프론트·백엔드 코딩 규칙 |
| [path-and-api.md](./path-and-api.md) | getBasePath / getApiBase / 인증 헤더 |
| [security.md](./security.md) | JWT, Admin, 토큰, env |
| [deploy-checklist.md](./deploy-checklist.md) | Render · GH Pages 배포 전 확인 |
| [rdmd-writing.md](./rdmd-writing.md) | RDMD 기록 작성 방법 |
| [new-feature-checklist.md](./new-feature-checklist.md) | 새 기능 추가 체크리스트 |

## 5분 온보딩

1. 루트 [`README.md`](../../README.md) 시연 가이드  
2. `cd backend && npm install && npm start`  
3. [path-and-api.md](./path-and-api.md) 읽기  
4. [features/overview.md](../features/overview.md)  
5. 담당 모듈 README + 이 guides  

## 절대 원칙 (요약)

1. **풀스택 테스트는 항상** `backend` 포트 5000 통합 실행  
2. **내부 링크**는 서브패스·하위 폴더를 깨지 않게 (getBasePath)  
3. **API 호출**은 get*ApiBase + 올바른 Auth 헤더  
4. **관리 API**는 반드시 `requireAdmin`  
5. **`.env` 커밋 금지**  
6. **의미 있는 작업은 RDMD에 기록**  
