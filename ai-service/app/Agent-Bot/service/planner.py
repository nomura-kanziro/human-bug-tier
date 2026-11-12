"""작업 판별(계획) — 사용자의 말을 "어떤 작업을, 어떤 조건으로" 할지로 바꾼다.

빠르게 답하려고 **규칙이 먼저**다. 뻔한 요청("1~3티어로 티어표 만들어줘", "내 포인트 알려줘")은 LLM 을 부르지 않고 바로 정한다(0초).
규칙으로 못 정한 애매한 말만 LLM 에게 JSON 으로 물어본다(`service/agent_service.py` 가 부른다). LLM 이 꺼져 있으면 이용 안내로 보낸다.

작업 강도(level)가 곧 요금 단계다 — 실제 포인트 값은 사이트 백엔드(`backend/routes/aiRoutes.js` AGENT_COSTS)가 갖고 있다.
  heavy  티어표 초안 만들기        normal  분석 · 요약 · 브리핑        light  통합 검색        free  이용 안내 · 거절
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from ...guidans_Chat.service.knowledge import strip_question_words
from .catalog import Catalog

# task → (강도, 화면에 보이는 이름, 설명, 예시 요청)
TASKS: dict[str, tuple[str, str, str, str]] = {
    "tier_build": ("heavy", "티어표 초안 만들기", "말로 조건을 주면 커스텀 메이커에 바로 올릴 수 있는 티어표 초안을 만들어요.",
                   "1~3티어 캐릭터로 티어표 만들어줘. 츠루기 시노부는 2티어로 옮기고"),
    "review": ("normal", "내 티어표 분석", "지금 커스텀 메이커에 만들고 있는 티어표를 공식 티어표와 비교해 분석해요.",
               "지금 만들고 있는 티어표 공식이랑 비교해줘"),
    "digest": ("normal", "게시판 · 공지 요약", "인기·최신 티어표와 최근 공지를 모아 요약해요.",
               "요즘 인기 있는 티어표 정리해줘"),
    "briefing": ("normal", "내 활동 브리핑", "내 포인트·출석·뽑기·게시글 현황을 정리하고 오늘 할 일을 짚어줘요.",
                 "내 포인트랑 출석 현황 브리핑해줘"),
    "search": ("light", "사이트 통합 검색", "캐릭터·게시판·공지를 한 번에 찾아요.",
               "이름에 '류'가 들어가는 캐릭터 찾아줘"),
}
FREE_TASKS = ("guide", "refuse", "empty_maker", "unknown")

GRADES = ("갑급", "을급", "병급", "정급", "무급")
_NUM_WORDS = {"한": 1, "하나": 1, "일": 1, "두": 2, "둘": 2, "이": 2, "세": 3, "셋": 3, "삼": 3, "네": 4, "넷": 4, "사": 4}

# 지시 무시·프롬프트 공개 요구(가이드 챗봇과 같은 종류) — LLM 에 보내지 않고 바로 거절한다
_INJECTION = re.compile(
    r"(시스템\s*프롬프트|프롬프트\s*(를|좀)?\s*(보여|알려|공개|출력)|이전\s*(의\s*)?(지시|명령|규칙)|(지시|명령|규칙)(을|를)?\s*(모두\s*)?(무시|잊)"
    r"|역할\s*(을|를)?\s*바꿔|ignore\s+(all\s+|the\s+)?(previous|above|prior)|system\s*prompt|jailbreak|너는\s*이제)",
    re.IGNORECASE,
)
_HOWTO = re.compile(r"(어떻게|하는\s*법|방법|사용법|이용법|뭐야|뭔가요|무엇|규칙|확률|몇\s*번|왜\s)")
_BUILD = re.compile(r"(티어\s*표|티어\s*리스트|티어리스트|초안|배치).{0,40}(만들|제작|짜\s*줘|짜줘|짜\s*봐|생성|작성|구성|세워|뽑아\s*줘|채워)"
                    r"|(만들어|짜줘|짜\s*줘|생성해|구성해|채워).{0,20}(티어\s*표|티어\s*리스트|초안)")
_REVIEW = re.compile(r"(내|나의|제|지금|현재|만들던|만든|만들고\s*있는|작업\s*중).{0,24}(티어\s*표|배치|초안).{0,24}(분석|평가|비교|차이|어때|리뷰|점검|봐\s*줘|봐줘|진단)"
                     r"|공식\s*(이랑|과|하고|티어표와|티어표랑).{0,16}(비교|차이)")
_BRIEF = re.compile(r"(내|나의|제|나)\s*(포인트|출석|활동|정보|현황|기록|상태|통계|뽑기)|브리핑|오늘\s*뭐\s*(하|할|해)|포인트\s*(얼마|몇|잔액|남았)|출석\s*(했|현황|상태|몇)")
_DIGEST = re.compile(r"(인기|최신|요즘|최근|핫한|뜨는|추천할\s*만한|볼\s*만한).{0,16}(티어\s*표|게시글|게시판|글)"
                     r"|(게시판|공지|새\s*소식|소식|업데이트).{0,16}(요약|정리|브리핑|뭐\s*있|뭐가\s*있|훑어|모아)"
                     r"|(요약|정리).{0,12}(게시판|공지|새\s*소식)")
_SEARCH = re.compile(r"(검색|찾아|찾아줘|찾아\s*봐|search|어디\s*있|목록|리스트|누가\s*있|누구누구|보여\s*줘|보여줘|알려\s*줘|알려줘)")
_NOTICE_WORD = re.compile(r"(공지|새\s*소식|소식|업데이트|패치)")
_BOARD_WORD = re.compile(r"(게시판|게시글|티어\s*표|글)")

_TIER_RANGE = re.compile(r"([1-9])\s*(?:티어|등급)?\s*(?:~|∼|-|–|부터|에서)\s*([1-9])\s*(?:티어|등급)")
_TIER_ONE = re.compile(r"([1-9])\s*(?:티어|등급)")
_RANDOM = re.compile(r"(랜덤|무작위|아무렇게|마구|섞어|셔플|shuffle|random)", re.IGNORECASE)
_TITLE = re.compile(r"[\"“'‘「『]([^\"”'’」』]{1,40})[\"”'’」』]|제목(?:은|을|:)?\s*([^\s,.!?]{1,30}(?:\s[^\s,.!?]{1,30}){0,3}?)\s*(?:으로|로|라고)")
# 캐릭터 이름 뒤에 붙는 지시
_OP_MOVE = re.compile(r"([1-9])\s*(?:티어|등급)\s*(갑급|을급|병급|정급|무급)?\s*(?:으로|로|에|으로다가)")
_OP_TOP = re.compile(r"(맨\s*위|최상위|제일\s*위|1등|일등|최강)")
_OP_UP = re.compile(r"(?:(\d|한|하나|두|둘|세|셋|네|넷)\s*(?:단계|티어|칸|등급)\s*)?(올려|올리|위로|상향|승급)")
_OP_DOWN = re.compile(r"(?:(\d|한|하나|두|둘|세|셋|네|넷)\s*(?:단계|티어|칸|등급)\s*)?(내려|내리|아래로|하향|강등)")
_OP_REMOVE = re.compile(r"(빼\s*줘|빼줘|빼고|빼\s*고|제외|삭제|없애|지워)")
_CONNECT = re.compile(r"^[\s,·/&+]*(랑|이랑|와|과|하고|및|그리고|,)?[\s,·/&+]*$")
_ONLY = re.compile(r"(만으로|들로만|로만|만\s*넣|만\s*가지고|만\s*갖고|들만)")
# 검색어에서 빼는 말(작업을 가리키는 말이지 찾을 대상이 아니다)
_SEARCH_NOISE = re.compile(r"(검색|찾아줘|찾아\s*봐|찾아|보여줘|보여\s*줘|알려줘|알려\s*줘|목록|리스트|캐릭터|캐릭|인물|게시판|게시글|공지|새\s*소식|에서|관련|들어가는|들어간|포함된|포함|이름에|이름이|티어표|전부|모두|다\s|좀\s)")


@dataclass
class Plan:
    task: str
    level: str
    label: str
    args: dict = field(default_factory=dict)
    via: str = "rule"            # rule(규칙으로 정함) | llm(LLM 이 정함)
    message: str = ""            # free 작업의 정해진 답

    @property
    def is_free(self) -> bool:
        return self.level == "free"


def _plan(task: str, args: dict | None = None, via: str = "rule") -> Plan:
    level, label, _desc, _example = TASKS[task]
    return Plan(task=task, level=level, label=label, args=args or {}, via=via)


def free_plan(task: str, message: str, label: str = "안내") -> Plan:
    return Plan(task=task, level="free", label=label, message=message)


GUIDE_MESSAGE = (
    "그건 사이트 이용법 질문이라 에이전트 봇 대신 AI 도우미(휴버봇)가 더 잘 답해요. 포인트도 들지 않아요.\n"
    "아래 버튼으로 AI 도우미에서 물어봐 주세요.\n\n"
    "에이전트 봇은 이런 \"일\"을 해요: 티어표 초안 만들기 · 내 티어표 분석 · 게시판/공지 요약 · 내 활동 브리핑 · 통합 검색."
)
REFUSE_MESSAGE = "그 요청은 도와드릴 수 없어요. 에이전트 봇은 휴버대 티어표 사이트 안의 작업(티어표 초안·분석·요약·브리핑·검색)만 해요."
UNKNOWN_MESSAGE = (
    "어떤 작업인지 알아듣지 못했어요. 이렇게 말해 보세요.\n"
    "· \"1~3티어 캐릭터로 티어표 만들어줘\"\n· \"지금 만들고 있는 티어표 분석해줘\"\n· \"요즘 인기 티어표 정리해줘\"\n"
    "· \"내 포인트랑 출석 브리핑해줘\"\n· \"츠루기 시노부 찾아줘\"\n\n사이트 이용법이 궁금하면 AI 도우미(휴버봇)에게 물어봐 주세요."
)
EMPTY_MAKER_MESSAGE = (
    "분석할 티어표가 아직 없어요. 커스텀 메이커에 캐릭터를 하나 이상 배치한 뒤 다시 불러 주세요.\n"
    "처음부터 만들기 귀찮다면 \"1~3티어 캐릭터로 티어표 만들어줘\"처럼 초안을 맡겨 보세요."
)


# ---------------------------------------------------------------------------
# 티어표 만들기 조건 읽기
# ---------------------------------------------------------------------------
def _count(word: str | None) -> int:
    if not word:
        return 1
    return int(word) if word.isdigit() else _NUM_WORDS.get(word, 1)


def _read_op(clause: str) -> dict | None:
    """이름 뒤에 붙은 말에서 지시 하나를 읽는다."""
    m = _OP_MOVE.search(clause)
    if m:
        return {"op": "move", "tier": int(m.group(1)), "grade": m.group(2)}
    if _OP_REMOVE.search(clause):
        return {"op": "remove"}
    m = _OP_UP.search(clause)
    if m:
        return {"op": "shift", "by": -_count(m.group(1))}       # 티어 번호가 작을수록 높다
    m = _OP_DOWN.search(clause)
    if m:
        return {"op": "shift", "by": _count(m.group(1))}
    if _OP_TOP.search(clause):
        return {"op": "move", "tier": 1, "grade": "갑급"}
    return None


def parse_build_args(text: str, catalog: Catalog) -> dict:
    """ "1~3티어로 만들어줘. A랑 B는 1티어로, C는 빼줘" → 범위·이동·제외·랜덤·제목."""
    args: dict = {"tiers": [], "random": False, "ops": [], "only_names": [], "title": ""}

    m = _TITLE.search(text)
    if m:
        args["title"] = (m.group(1) or m.group(2) or "").strip()[:40]

    # 캐릭터 이름과 그 뒤 지시 — 이름이 나온 자리 순서대로 끊어 읽는다
    found = []
    for c in catalog.find_in_text(text):
        pos = catalog.position(text, c)
        if pos:
            found.append((pos[0], pos[1], c))
    found.sort(key=lambda x: x[0])
    op_spans: list[tuple[int, int]] = []        # 이동 지시에 쓰인 "N티어" 자리(범위로 다시 읽지 않게)
    pending = None
    named_ops: list[dict] = []
    for i in range(len(found) - 1, -1, -1):
        start, end, c = found[i]
        clause_end = found[i + 1][0] if i + 1 < len(found) else len(text)
        clause = text[end:clause_end]
        # 한 문장 안에서만 지시를 찾는다(다음 문장의 "3티어로"가 앞 이름에 붙지 않게)
        sentence = re.split(r"[.!?\n]", clause, maxsplit=1)[0]
        op = _read_op(sentence)
        if op:
            pending = op
            mm = _OP_MOVE.search(sentence)
            if mm:
                op_spans.append((end + mm.start(), end + mm.end()))
        elif not _CONNECT.match(clause):
            pending = None                     # "A랑 B를 1티어로"처럼 바로 이어진 이름만 뒤 지시를 물려받는다
        if pending:
            named_ops.append({**pending, "name": c.name})
    named_ops.reverse()
    args["ops"] = named_ops

    # 범위("1~3티어", "2티어 5티어") — 이동 지시에 쓰인 숫자는 뺀다
    masked = list(text)
    for s, e in op_spans:
        for i in range(s, min(e, len(masked))):
            masked[i] = " "
    rest = "".join(masked)
    tiers: set[int] = set()
    for a, b in _TIER_RANGE.findall(rest):
        lo, hi = sorted((int(a), int(b)))
        tiers.update(range(lo, hi + 1))
    if not tiers:
        tiers.update(int(n) for n in _TIER_ONE.findall(rest))
    if re.search(r"상위권", rest):
        tiers.update((1, 2, 3))
    if re.search(r"중위권", rest):
        tiers.update((4, 5, 6))
    if re.search(r"하위권", rest):
        tiers.update((7, 8, 9))
    args["tiers"] = sorted(t for t in tiers if t in catalog.tiers)

    args["random"] = bool(_RANDOM.search(text))

    # 지시가 안 붙은 이름들 — "A, B, C 만으로 만들어줘"면 그 캐릭터만 넣는다
    op_names = {o["name"] for o in named_ops}
    plain = [c.name for _, _, c in found if c.name not in op_names]
    if plain and (_ONLY.search(text) or (not args["tiers"] and not named_ops and len(plain) >= 2)):
        args["only_names"] = plain
    return args


def build_needs_llm(args: dict, text: str) -> bool:
    """규칙으로 읽은 조건이 하나도 없는데 말은 긴 경우 — LLM 에게 조건을 한 번 더 물어볼 만하다."""
    empty = not (args["tiers"] or args["random"] or args["ops"] or args["only_names"])
    return empty and len(strip_question_words(text)) >= 14


# ---------------------------------------------------------------------------
# 검색 조건 읽기
# ---------------------------------------------------------------------------
def parse_search_args(text: str, catalog: Catalog) -> dict:
    names = [c.name for c in catalog.find_in_text(text, limit=8)]
    tiers = sorted({int(n) for n in _TIER_ONE.findall(text) if int(n) in catalog.tiers})
    grade = next((g for g in GRADES if g in text), "")
    quoted = re.search(r"[\"“'‘「『]([^\"”'’」』]{1,30})[\"”'’」』]", text)
    if quoted:
        keyword = quoted.group(1).strip()
    else:
        # 작업을 가리키는 말("검색해줘")을 먼저 떼고, 남은 군말("해줘")을 뺀다
        keyword = strip_question_words(_SEARCH_NOISE.sub(" ", text))
        keyword = _TIER_ONE.sub(" ", keyword)
        for g in GRADES:
            keyword = keyword.replace(g, " ")
        keyword = re.sub(r"\s+", " ", keyword).strip(" ,.!?~")
        keyword = re.sub(r"(을|를|이|가|은|는|의)$", "", keyword).strip()   # 끝에 남은 조사("류가" → "류")
    wants_notice = bool(_NOTICE_WORD.search(text))
    wants_board = bool(re.search(r"(게시판|게시글)", text))
    targets = [t for t, on in (("board", wants_board), ("notice", wants_notice)) if on]
    if not targets:
        targets = ["character", "board", "notice"]
    elif names or tiers or grade:
        targets.insert(0, "character")
    return {"keyword": keyword[:40], "names": names, "tiers": tiers, "grade": grade, "targets": targets}


def parse_digest_args(text: str) -> dict:
    notice, board = bool(_NOTICE_WORD.search(text)), bool(_BOARD_WORD.search(text))
    if notice and not board:
        return {"targets": ["notice"]}
    if board and not notice:
        return {"targets": ["board"]}
    return {"targets": ["board", "notice"]}


# ---------------------------------------------------------------------------
# 규칙 판별
# ---------------------------------------------------------------------------
def plan_by_rules(text: str, catalog: Catalog, *, maker_count: int = 0) -> Plan | None:
    """규칙으로 정할 수 있으면 Plan, 애매하면 None(→ LLM 에게 묻는다)."""
    q = text.strip()
    if _INJECTION.search(q):
        return free_plan("refuse", REFUSE_MESSAGE, "거절")

    howto = bool(_HOWTO.search(q))
    if _BUILD.search(q) and not howto:
        return _plan("tier_build", parse_build_args(q, catalog))
    if _REVIEW.search(q):
        if maker_count <= 0:
            return free_plan("empty_maker", EMPTY_MAKER_MESSAGE)
        return _plan("review")
    if _DIGEST.search(q):
        return _plan("digest", parse_digest_args(q))
    if _BRIEF.search(q) and not re.search(r"(어떻게|방법|규칙|확률)", q):
        return _plan("briefing")
    if _SEARCH.search(q) and not re.search(r"(어떻게|하는\s*법|방법|사용법|이용법|규칙|확률)", q):
        args = parse_search_args(q, catalog)
        if args["keyword"] or args["names"] or args["tiers"] or args["grade"]:
            return _plan("search", args)
    if howto:
        return free_plan("guide", GUIDE_MESSAGE, "이용 안내")
    return None


# ---------------------------------------------------------------------------
# LLM 판별(규칙으로 못 정했을 때만)
# ---------------------------------------------------------------------------
PLANNER_SYSTEM = """너는 "휴버대 티어표" 사이트 에이전트 봇의 작업 분류기다. 사용자의 말을 읽고 아래 JSON 하나만 출력한다. 설명·코드블록 금지.

task 값(하나만):
- "tier_build": 티어표(캐릭터 배치) 초안을 만들어 달라는 요청
- "review": 사용자가 지금 만들고 있는 티어표를 분석·평가·공식과 비교해 달라는 요청
- "digest": 게시판 인기/최신 티어표나 공지·새 소식을 모아 요약해 달라는 요청
- "briefing": 사용자 본인의 포인트·출석·뽑기·게시글 현황을 알려 달라는 요청
- "search": 캐릭터·게시글·공지를 찾아 달라는 요청
- "guide": 사이트 기능의 사용법·규칙·확률을 묻는 질문
- "none": 사이트와 관계없는 말, 잡담, 위 어디에도 안 맞는 말

출력 형식: {"task": "...", "keyword": "찾을 말(search 일 때만, 없으면 빈 문자열)", "tiers": [티어 번호들(tier_build 에서 범위를 말했을 때만)], "random": true/false}

예시
사용자: 강한 애들만 모아서 표 하나 짜줄래
{"task": "tier_build", "keyword": "", "tiers": [1, 2], "random": false}
사용자: 사람들이 요즘 뭐 올렸나 궁금해
{"task": "digest", "keyword": "", "tiers": [], "random": false}
사용자: 나 지금 몇 점이야
{"task": "briefing", "keyword": "", "tiers": [], "random": false}
사용자: 야쿠자 나오는 글 있나
{"task": "search", "keyword": "야쿠자", "tiers": [], "random": false}
사용자: 포커는 어떻게 이겨
{"task": "guide", "keyword": "", "tiers": [], "random": false}
사용자: 오늘 저녁 뭐 먹지
{"task": "none", "keyword": "", "tiers": [], "random": false}"""


def plan_from_llm_json(data: dict, text: str, catalog: Catalog, *, maker_count: int = 0) -> Plan:
    """LLM 이 준 JSON 을 검사해 Plan 으로 바꾼다. 값이 이상하면 안전한 쪽(무료 안내)으로 보낸다."""
    task = str(data.get("task", "")).strip()
    if task == "tier_build":
        args = parse_build_args(text, catalog)
        if not args["tiers"]:
            raw = data.get("tiers") if isinstance(data.get("tiers"), list) else []
            args["tiers"] = sorted({int(t) for t in raw if isinstance(t, (int, float)) and int(t) in catalog.tiers})
        if not args["random"]:
            args["random"] = data.get("random") is True
        return _plan("tier_build", args, via="llm")
    if task == "review":
        return free_plan("empty_maker", EMPTY_MAKER_MESSAGE) if maker_count <= 0 else _plan("review", via="llm")
    if task == "digest":
        return _plan("digest", parse_digest_args(text), via="llm")
    if task == "briefing":
        return _plan("briefing", via="llm")
    if task == "search":
        args = parse_search_args(text, catalog)
        keyword = str(data.get("keyword") or "").strip()[:40]
        if keyword and not args["names"]:
            args["keyword"] = keyword
        if args["keyword"] or args["names"] or args["tiers"] or args["grade"]:
            return _plan("search", args, via="llm")
        return free_plan("unknown", UNKNOWN_MESSAGE)
    if task == "guide":
        return free_plan("guide", GUIDE_MESSAGE, "이용 안내")
    return free_plan("unknown", UNKNOWN_MESSAGE)
