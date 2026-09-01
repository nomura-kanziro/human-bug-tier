---
area: frontend
---

# 커밋 요약 — 알림 벨 ↔ 유저 프로필 드롭다운 동시 열림 버그 수정

## 개요

유저 프로필 드롭다운을 연 상태에서 알림 벨을 클릭하면 두 패널이 겹쳐서 안 닫히는 버그가 있었다. 프로필 드롭다운 쪽(`toggleUserProfileMenu`)은 알림 패널을 직접 닫아주고 있었지만, 알림 벨 쪽(`toggleNotificationPanel`)은 그 반대를 안 하고 있어서 한쪽 방향으로만 상호 배타가 걸려 있었다.

## 관련 커밋

- **commit**: `1fd8e84`

## 변경된 파일 목록

- Modified: `common.js` (`toggleNotificationPanel()`)

## 근본 원인 — `stopPropagation()` 이 바깥클릭 리스너를 막음

프로필 패널·알림 패널 둘 다 "바깥을 클릭하면 닫힌다"를 `document` 레벨 클릭 리스너(`closeUserProfileMenuOnOutsideClick`, `closeNotificationPanelOnOutsideClick`)로 구현했다. 그런데 벨 버튼과 프로필 버튼의 클릭 핸들러가 각각 `e.stopPropagation()` 을 호출한다 — 자기 버튼 클릭이 `document` 까지 버블링돼서 방금 연 패널이 스스로 닫히는 걸 막기 위한 것이었다.

문제는 이 `stopPropagation()` 때문에, **벨을 클릭한 이벤트가 `document` 까지 아예 전달되지 않아서** 프로필 패널의 바깥클릭 리스너가 실행될 기회조차 없었다는 것이다. 즉 "바깥클릭 감지"만으로는 서로 다른 헤더 버튼끼리의 상호 배제를 보장할 수 없다 — 명시적으로 상대방을 닫아주는 호출이 반드시 필요하다.

```js
// 기존 — 프로필 쪽만 알림 패널을 명시적으로 닫아줌
function toggleUserProfileMenu() {
  ...
  if (willOpen) {
    updateUserProfilePanelInfo();
    closeNotificationPanel(); // 있었음
  }
}

// 수정 — 알림 쪽도 대칭으로 프로필 패널을 닫아줌
function toggleNotificationPanel() {
  ...
  if (willOpen) {
    loadNotificationList();
    closeUserProfileMenu(); // 추가
  }
}
```

## 교훈 (향후 헤더에 패널/드롭다운을 새로 추가할 때)

헤더에 세 번째 드롭다운(예: 검색, 장바구니 등)을 추가한다면, "바깥클릭 닫기"만 믿지 말고 **다른 모든 패널의 `open` 시점에 나머지를 명시적으로 닫는 호출**을 서로 추가해야 한다. 버튼 클릭 핸들러들이 관례적으로 `e.stopPropagation()` 을 쓰기 때문에, document 레벨 리스너는 "패널 자기 자신 여닫기 버튼" 사이에서는 작동하지 않는다.

## 테스트 체크리스트

1. 프로필 드롭다운 연 상태 → 알림 벨 클릭 → 프로필 드롭다운 즉시 닫히고 알림 패널만 열림
2. 알림 패널 연 상태 → 프로필 아이콘 클릭 → 알림 패널 즉시 닫히고 프로필 드롭다운만 열림 (기존에도 되던 방향, 회귀 없음 확인)
3. 아무 패널도 없는 상태에서 각각 단독으로 열고/바깥 클릭으로 닫기 — 정상

## 향후 개선 제안

- 없음 — 이번 수정으로 상호 배타 완전히 대칭화됨

---
문서 생성일: 2026-09-01
