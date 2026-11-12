"""에이전트 봇 API 스키마. 길이 제한은 Express(`backend/routes/aiRoutes.js`)와 같은 값이다 — 한쪽을 바꾸면 같이 바꾼다.

응답은 한 번에 오지 않고 **줄 단위 JSON(NDJSON) 스트림**으로 나간다. 한 줄이 이벤트 하나다:
  {"type":"plan",   "task", "label", "level", "steps":[...], "via"}   어떤 작업을 할지(이때 Express 가 포인트를 차감한다)
  {"type":"step",   "index", "label", "status":"running"|"done"}      진행 상황
  {"type":"result", "kind", "data"}                                   결과물(티어표 초안·검색 결과·브리핑 카드 등)
  {"type":"token",  "text"}                                           해설 글자(나오는 대로)
  {"type":"reset"}                                                    쓰다 만 해설을 지운다(LLM 이 중간에 끊겨 정해진 해설로 바꿀 때)
  {"type":"done",   "ok", "answer", "mode", "ai"}                     끝
  {"type":"error",  "message"}                                        실패(Express 가 포인트를 돌려준다)
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

MAX_MESSAGE = 500          # 요청 최대 글자 수
MAX_HISTORY_ITEMS = 8      # 같이 받는 이전 대화 최대 개수
MAX_HISTORY_CHARS = 1200   # 이전 대화 한 개의 최대 글자 수
MAX_MAKER_ZONES = 60       # 커스텀 메이커 칸(등급×세부등급) 최대 개수
MAX_ZONE_NAMES = 400       # 한 칸에 담을 수 있는 캐릭터 이름 최대 개수
MAX_NAME_CHARS = 80

Level = Literal["free", "light", "normal", "heavy"]


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_HISTORY_CHARS)


class Attendance(BaseModel):
    """출석체크 상태(Express 가 채워 보낸다)."""
    checked_days: int = Field(default=0, ge=0, le=7)
    today_done: bool = False
    next_day: int = Field(default=1, ge=1, le=7)
    next_reward: int = Field(default=0, ge=0)


class UserContext(BaseModel):
    """요청한 회원의 현재 상태 — 토큰은 오지 않고, Express 가 DB 에서 읽은 값만 온다."""
    nickname: str = Field(default="", max_length=60)
    points: int | None = None
    total_draws: int = Field(default=0, ge=0)
    best_tier: int | None = None
    today_draws: int = Field(default=0, ge=0)
    daily_limit: int = Field(default=0, ge=0)
    attendance: Attendance | None = None
    post_count: int = Field(default=0, ge=0)
    post_likes: int = Field(default=0, ge=0)
    post_views: int = Field(default=0, ge=0)


class AgentRunRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE)
    history: list[Turn] = Field(default_factory=list, max_length=MAX_HISTORY_ITEMS)
    user: UserContext = Field(default_factory=UserContext)
    # 지금 커스텀 메이커에 배치된 상태 — { "<0부터 시작하는 등급 번호>_<세부등급>": [캐릭터 이름, ...] }. 분석(review) 때만 쓴다
    maker: dict[str, list[str]] = Field(default_factory=dict)


class TaskInfo(BaseModel):
    task: str
    label: str
    level: Level
    description: str
    example: str


class AgentInfoResponse(BaseModel):
    ai: Literal["on", "off"]
    reason: str = ""
    model: str | None = None
    tasks: list[TaskInfo]
