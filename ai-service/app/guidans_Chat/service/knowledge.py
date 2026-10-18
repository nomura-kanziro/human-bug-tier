"""사이트 지식 베이스 — RAG 의 "R" 쪽.

두 가지 원천을 LangChain Document 로 만든다.
  1) knowledge/*.md  : 사이트 이용 안내(사람이 쓴 문서). LangChain MarkdownHeaderTextSplitter 로 제목(#, ##) 단위로 자른다.
  2) tiers.json      : 공식 티어표 정본. 티어별 문서 + 캐릭터별 문서를 자동 생성하고,
                       질문 속 캐릭터 이름을 찾아 "정확한 티어 정보"로 붙이는 색인(CharacterIndex)도 만든다.

검색은 한국어 문자 2-gram + 단어 토큰 BM25(rank_bm25)로 한다. 임베딩 API 가 필요 없어
가볍고(1GB VM), 사이트 문서처럼 고유명사(캐릭터 이름·메뉴 이름)가 많은 질의에 잘 맞는다.
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_text_splitters import MarkdownHeaderTextSplitter
from rank_bm25 import BM25Okapi

SHORT_NAME = 3   # 이 글자 수 이하의 캐릭터 이름은 단어 단위로만 찾는다(CharacterIndex.find)
GRADE_ORDER_NOTE = "갑급이 가장 높고 을급, 병급, 정급 순서"

# ---------------------------------------------------------------------------
# 토큰화
# ---------------------------------------------------------------------------
_PUNCT = re.compile(r"[^\w\s]", re.UNICODE)
# 조사·어미 몇 개만 떼서 "츠루기는" → "츠루기" 처럼 맞춘다(형태소 분석기 없이 가볍게)
_JOSA = ("은", "는", "이", "가", "을", "를", "의", "에", "에서", "로", "으로", "와", "과", "도", "만", "야", "이야", "요")


def normalize(text: str) -> str:
    return unicodedata.normalize("NFC", str(text or "")).lower()


def compact(text: str) -> str:
    """공백·기호를 모두 뺀 비교용 문자열(이름 찾기용). '*노무라 칸지로' → '노무라칸지로'."""
    return re.sub(r"[\s\W_]+", "", normalize(text))


# 질문 끝말·군말 — BM25 가 "어때·알려줘" 같은 흔한 말에도 점수를 주어 범위 밖 질문을 못 거르므로, 관련성 판단용 검색에서는 뺀다
_QUESTION_WORDS = frozenset((
    "알려줘", "알려", "알려주세요", "알려줄래", "어때", "어떻게", "어떤", "뭐야", "뭔가요", "뭐에요", "무엇", "해줘", "해주세요", "줘", "좀",
    "있어", "있나요", "있어요", "가능", "방법", "하는", "하려면", "되나요", "돼요", "인가요", "이야", "야", "어디", "언제", "몇", "얼마", "얼마야",
    "오늘", "지금", "그냥", "혹시", "제발", "나", "내", "저", "우리", "이거", "저거", "그거", "뭐", "왜", "누가", "누구", "맞아", "맞나요",
    "싶어", "싶어요", "하고", "해요", "할까", "할래", "해", "봐", "보여줘", "보여", "추천해줘", "추천",
    "하면", "하면은", "되면", "할때", "때", "법", "줘요", "주나요", "주나", "받나요", "되요", "되나",
))


def strip_question_words(text: str) -> str:
    """질문에서 군더더기 말을 뺀 문자열 — 남는 단어가 실제 주제어다(없으면 빈 문자열)."""
    words = _PUNCT.sub(" ", normalize(text)).split()
    keep = []
    for w in words:
        base = w
        for j in _JOSA:
            if len(w) > len(j) + 1 and w.endswith(j):
                base = w[: -len(j)]
                break
        if w in _QUESTION_WORDS or base in _QUESTION_WORDS:
            continue
        keep.append(w)
    return " ".join(keep)


def tokenize(text: str) -> list[str]:
    words = _PUNCT.sub(" ", normalize(text)).split()
    tokens: list[str] = []
    for w in words:
        tokens.append(w)
        for j in _JOSA:
            if len(w) > len(j) + 1 and w.endswith(j):
                tokens.append(w[: -len(j)])
                break
        # 한국어는 띄어쓰기가 흔들리므로 문자 2-gram 을 같이 넣는다
        if len(w) >= 2:
            tokens.extend(w[i : i + 2] for i in range(len(w) - 1))
    return tokens


# ---------------------------------------------------------------------------
# 티어 데이터
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Character:
    name: str          # 티어표 표기 그대로(예: '*노무라 칸지로')
    tier: int
    grade: str         # '갑급' 등 (9티어는 '미묘사 인원들')
    order: int         # 세부등급 안에서의 순서(1부터)
    tier_title: str    # '신계 / 슈퍼 그랜드 마스터'

    @property
    def plain_name(self) -> str:
        return self.name.lstrip("*").strip()

    def fact(self) -> str:
        return (
            f"{self.plain_name}: 공식 티어표 {self.tier}티어({self.tier_title}) {self.grade}"
            f"{'' if self.grade.startswith('미묘사') else f' {self.order}번째'}."
        )


def _tier_title(raw_title: str, tier: int) -> str:
    # "1등급 - 신계 / 슈퍼 그랜드 마스터" → "신계 / 슈퍼 그랜드 마스터"
    title = str(raw_title or "")
    return title.split(" - ", 1)[1].strip() if " - " in title else (title or f"{tier}티어")


def load_tiers(path: Path) -> tuple[list[Character], dict[int, dict]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    characters: list[Character] = []
    tiers: dict[int, dict] = {}
    for key in sorted(data, key=lambda k: int(k) if str(k).isdigit() else 99):
        if not str(key).isdigit():
            continue
        tier = int(key)
        info = data[key]
        title = _tier_title(info.get("title"), tier)
        rows = []
        for row in info.get("rows", []):
            grade = re.sub(r"\s*\n\s*", " ", str(row.get("label", ""))).strip()
            names = [str(item.get("name", "")).strip() for item in row.get("items", []) if item.get("name")]
            rows.append((grade, names))
            for i, name in enumerate(names, start=1):
                characters.append(Character(name=name, tier=tier, grade=grade, order=i, tier_title=title))
        tiers[tier] = {"title": title, "rows": rows}
    return characters, tiers


def tier_documents(tiers: dict[int, dict]) -> list[Document]:
    docs = []
    for tier, info in tiers.items():
        lines = [f"{tier}티어 ({info['title']}) 캐릭터 목록. 세부등급은 {GRADE_ORDER_NOTE}이다."]
        total = 0
        for grade, names in info["rows"]:
            total += len(names)
            lines.append(f"- {grade} ({len(names)}명): {', '.join(n.lstrip('*') for n in names)}")
        lines.insert(1, f"총 {total}명.")
        docs.append(Document(
            page_content="\n".join(lines),
            metadata={"source": "tiers.json", "title": f"공식 티어표 › {tier}티어", "kind": "tier", "tier": tier},
        ))
    return docs


def character_documents(characters: list[Character]) -> list[Document]:
    return [
        Document(
            page_content=f"{c.plain_name}는(은) 몇 티어? {c.fact()}",
            metadata={"source": "tiers.json", "title": f"공식 티어표 › {c.tier}티어 › {c.plain_name}", "kind": "character", "tier": c.tier},
        )
        for c in characters
    ]


@dataclass
class CharacterIndex:
    """질문 속 캐릭터 이름 찾기. 전체 이름이 먼저, 없으면 이름의 한 부분(2글자 이상, 한 명에게만 해당)으로 찾는다."""

    characters: list[Character]
    _full: dict[str, list[Character]] = field(default_factory=dict)
    _part: dict[str, list[Character]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        for c in self.characters:
            self._full.setdefault(compact(c.plain_name), []).append(c)
            parts = normalize(c.plain_name).split()
            if len(parts) > 1:
                for part in parts:
                    if len(part) >= 2:
                        self._part.setdefault(compact(part), []).append(c)

    def find(self, text: str, limit: int = 5) -> list[Character]:
        q = compact(text)
        found: list[Character] = []
        # 짧은 이름("사이" 등, 공백·기호 뺀 3글자 이하)은 글자 포함으로 찾으면 "사이트" 같은 일반 단어에 걸린다 → 단어 단위로만 맞춘다
        words = set()
        for w in _PUNCT.sub(" ", normalize(text)).split():
            words.add(compact(w))
            for j in _JOSA:
                if len(w) > len(j) + 1 and w.endswith(j):
                    words.add(compact(w[: -len(j)]))
        # 긴 이름부터 — "누에 토시야"가 "토시야"보다 먼저 잡히게
        for key in sorted(self._full, key=len, reverse=True):
            hit = (key in words) if len(key) <= SHORT_NAME else (key in q)
            if len(key) >= 2 and hit:
                for c in self._full[key]:
                    if c not in found:
                        found.append(c)
                q = q.replace(key, " ")
        if not found:
            # 이름의 한 부분은 "단어 단위"로만 맞춘다 — '타츠오미'가 '타츠오'(다른 캐릭터)에 걸리지 않게
            for key in sorted(self._part, key=len, reverse=True):
                group = self._part[key]
                if key in words and len({c.plain_name for c in group}) == 1 and group[0] not in found:
                    found.append(group[0])
        return found[:limit]


# ---------------------------------------------------------------------------
# 마크다운 지식 문서
# ---------------------------------------------------------------------------
_SPLITTER = MarkdownHeaderTextSplitter(headers_to_split_on=[("#", "h1"), ("##", "h2")], strip_headers=True)


def markdown_documents(folder: Path) -> list[Document]:
    docs: list[Document] = []
    for path in sorted(folder.glob("*.md")):
        for chunk in _SPLITTER.split_text(path.read_text(encoding="utf-8")):
            heads = [chunk.metadata.get("h1"), chunk.metadata.get("h2")]
            title = " › ".join(h for h in heads if h)
            body = chunk.page_content.strip()
            if not body:
                continue
            # 제목을 본문 앞에 붙여 두면 "출석체크 포인트?" 같은 질문이 제목으로도 걸린다
            docs.append(Document(
                page_content=f"[{title}]\n{body}",
                metadata={"source": path.name, "title": title or path.stem, "kind": "guide"},
            ))
    return docs


# ---------------------------------------------------------------------------
# 검색기 (LangChain BaseRetriever 구현)
# ---------------------------------------------------------------------------
class KoreanBM25Retriever(BaseRetriever):
    """한국어용 BM25 검색기. LangChain 의 Retriever 인터페이스(invoke)로 쓸 수 있고, 점수가 필요하면 search() 를 쓴다."""

    documents: list[Document]
    k: int = 5
    _bm25: BM25Okapi | None = None

    model_config = {"arbitrary_types_allowed": True}

    def model_post_init(self, __context) -> None:  # pydantic v2 훅
        self._bm25 = BM25Okapi([self._index_tokens(d) for d in self.documents]) if self.documents else None

    @staticmethod
    def _index_tokens(doc: Document) -> list[str]:
        # 제목(예: "회원 · 마이페이지 · 출석체크 › 출석체크") 토큰을 3번 더 넣어 제목이 맞는 문서를 앞으로 올린다
        return tokenize(doc.page_content) + tokenize(doc.metadata.get("title", "")) * 3

    def search(self, query: str, k: int | None = None) -> list[tuple[Document, float]]:
        if not self._bm25:
            return []
        scores = self._bm25.get_scores(tokenize(query))
        ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        out = []
        for i in ranked[: k or self.k]:
            if scores[i] <= 0:
                break
            out.append((self.documents[i], float(scores[i])))
        return out

    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> list[Document]:
        return [
            Document(page_content=d.page_content, metadata={**d.metadata, "score": s})
            for d, s in self.search(query)
        ]


@dataclass
class KnowledgeBase:
    retriever: KoreanBM25Retriever
    characters: CharacterIndex
    tiers: dict[int, dict]
    documents: list[Document]

    @property
    def tier_numbers(self) -> list[int]:
        return sorted(self.tiers)


def build_knowledge_base(knowledge_dir: Path, tiers_json: Path, k: int = 5) -> KnowledgeBase:
    docs = markdown_documents(knowledge_dir)
    characters: list[Character] = []
    tiers: dict[int, dict] = {}
    if tiers_json.is_file():
        characters, tiers = load_tiers(tiers_json)
        docs += tier_documents(tiers) + character_documents(characters)
    return KnowledgeBase(
        retriever=KoreanBM25Retriever(documents=docs, k=k),
        characters=CharacterIndex(characters),
        tiers=tiers,
        documents=docs,
    )
