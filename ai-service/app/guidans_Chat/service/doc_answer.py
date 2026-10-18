"""문서 답 — AI 서버(LLM)가 꺼져 있을 때 `knowledge/` 지식 문서에서 **그대로** 뽑아 만드는 답.

LLM 이 하던 일(말로 다듬기)은 못 하지만, 내용은 전부 지식 문서의 문장 그대로라서 틀린 말을 지어내지 않는다.
- 캐릭터 질문: `tiers.json` 의 정확한 티어 정보 한 줄.
- 그 외: 검색된 문서 중 위쪽 1~2개에서 **질문과 관련 있는 줄만** 골라(질문 단어와 겹치는 줄 우선, 원래 순서 유지) 출처 제목과 함께 보여 준다.
  문서가 짧으면 통째로, 티어 목록 문서는 목록을 그대로 보여 준다.
"""
from __future__ import annotations

from langchain_core.documents import Document

from .knowledge import strip_question_words, tokenize

HEADER = "AI 서버가 꺼져 있어서, 사이트 정보(지식 문서)에서 찾은 내용을 그대로 알려 드려요."
NOT_FOUND = "관련 정보를 찾지 못했어요. 푸터의 \"문의하기\"로 남겨 주세요."
TIER_TIP = "메뉴 \"티어표\"에서 해당 티어 화면을 열면 같은 등급의 다른 캐릭터도 볼 수 있어요."

SHORT_DOC = 300          # 이 글자 수 이하의 짧은 문서는 통째로 보여 준다
LINE_BUDGET = 650        # 문서 하나에서 보여 줄 최대 글자 수
TIER_LIST_BUDGET = 1600  # 티어 목록 문서는 목록이 핵심이라 더 길게
MAX_DOCS = 2


def _body_lines(doc: Document) -> list[str]:
    text = doc.page_content
    if text.startswith("[") and "\n" in text:      # "[제목]" 첫 줄은 빼고 본문만
        text = text.split("\n", 1)[1]
    return [ln.rstrip() for ln in text.split("\n") if ln.strip()]


def _line_scores(lines: list[str], question: str) -> list[int]:
    # 군더더기 말("어때·알려줘·하면")을 뺀 주제어로만 겹침을 센다 — 안 그러면 흔한 말 때문에 상관없는 줄·문서가 끼어든다
    q = {t for t in tokenize(strip_question_words(question) or question) if len(t) >= 2}
    scores = []
    for ln in lines:
        toks = set(tokenize(ln))
        scores.append(len(q & toks))
    return scores


def pick_lines(doc: Document, question: str, budget: int = LINE_BUDGET) -> tuple[list[str], int]:
    """(보여 줄 줄들, 가장 높은 줄 점수). 예산 안이면 통째로, 넘치면 점수 높은 줄부터 채우고 원래 순서로 정렬한다."""
    lines = _body_lines(doc)
    scores = _line_scores(lines, question)
    best = max(scores, default=0)
    total = sum(len(ln) + 1 for ln in lines)
    if total <= SHORT_DOC:
        return lines, best
    if best > 0:    # 길이가 있으면 질문과 겹치는 줄만(없는 줄은 뺀다)
        lines_idx = [i for i in range(len(lines)) if scores[i] > 0]
    else:
        lines_idx = list(range(len(lines)))
    if sum(len(lines[i]) + 1 for i in lines_idx) <= budget:
        return [lines[i] for i in lines_idx], best
    chosen: set[int] = set()
    used = 0
    for i in sorted(lines_idx, key=lambda k: (-scores[k], k)):
        cost = len(lines[i]) + 1
        if used + cost > budget and chosen:
            continue
        chosen.add(i)
        used += cost
        if used >= budget:
            break
    return [lines[i] for i in sorted(chosen)], best


def build_doc_answer(question: str, facts: list[str], docs: list[Document]) -> str:
    return build_doc_answer_with_sources(question, facts, docs)[0]


def build_doc_answer_with_sources(question: str, facts: list[str], docs: list[Document]) -> tuple[str, list[str]]:
    """(답, 실제로 보여 준 문서 제목들) — 화면의 "참고" 에는 보여 준 문서만 올라가게 한다."""
    if facts:
        return "\n".join(f"• {f}" for f in facts) + "\n\n" + TIER_TIP, []
    blocks: list[str] = []
    shown: list[str] = []
    for rank, doc in enumerate(docs):
        if len(blocks) >= MAX_DOCS:
            break
        budget = TIER_LIST_BUDGET if doc.metadata.get("kind") == "tier" else LINE_BUDGET
        lines, best = pick_lines(doc, question, budget)
        if rank > 0 and best < 2:       # 둘째 문서는 주제어가 충분히(2개 이상) 겹칠 때만
            continue
        blocks.append(f"▸ {doc.metadata.get('title', '')}\n" + "\n".join(lines))
        shown.append(doc.metadata.get("title", ""))
    if not blocks:
        return NOT_FOUND, []
    return HEADER + "\n\n" + "\n\n".join(blocks), shown
