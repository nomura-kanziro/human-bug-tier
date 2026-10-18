"""로컬 개발용 AI 서비스 시작·종료·상태 — 터미널을 닫거나 Ctrl+C 가 날아가도 꺼지지 않게 떼어서(detached) 띄운다.

사용:  cd ai-service
       .venv/Scripts/python scripts/dev_service.py start [--port 8000]
       .venv/Scripts/python scripts/dev_service.py status [--port 8000]
       .venv/Scripts/python scripts/dev_service.py stop  [--port 8000]

- start 는 uvicorn 을 새 프로세스 그룹으로 띄우고(Windows: DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP) 로그를 `uvicorn.log` 에 쓴다.
  `/health` 가 응답할 때까지 기다렸다가 상태를 보여 준다. 이미 떠 있으면 아무것도 하지 않는다.
- Ollama 는 따로 켜져 있어야 한다(꺼져 있어도 서비스는 뜨고, 지식 문서 답으로 동작한다 — `status` 의 ai 가 off).
- 로컬 개발 전용이다. 운영 배포 방식이 아니다(RDMD/guides/deploy-checklist.md "AI" 절).
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent.parent

def pid_file(port: int) -> Path:
    return SERVICE_DIR / f".dev_service-{port}.pid"     # 포트마다 따로(여러 개를 동시에 띄울 수 있게)


def health(port: int, timeout: float = 2.0) -> dict | None:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=timeout) as res:
            return json.load(res)
    except (urllib.error.URLError, OSError, ValueError, TimeoutError):
        return None


def show(port: int) -> None:
    h = health(port)
    if not h:
        print(f"AI 서비스(:{port}) 꺼져 있음")
        return
    vec = h.get("vector", {})
    print(f"AI 서비스(:{port}) 켜짐 | AI 서버 {h.get('ai', '?').upper()} ({h.get('provider')}:{h.get('model')}) | "
          f"지식 조각 {h.get('documents')}개 · 벡터 {'OK' if vec.get('ready') else '미사용/실패'} {vec.get('error', '')}")


def start(port: int) -> None:
    if health(port):
        print("이미 켜져 있어요.")
        show(port)
        return
    log = open(SERVICE_DIR / "uvicorn.log", "ab")
    flags = 0
    if os.name == "nt":
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP | getattr(subprocess, "CREATE_NO_WINDOW", 0)
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=SERVICE_DIR, stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
        creationflags=flags, start_new_session=(os.name != "nt"),
    )
    pid_file(port).write_text(str(proc.pid), encoding="utf-8")
    print(f"시작함(PID {proc.pid}) — 지식 색인·모델 준비 중(첫 실행은 20~40초)…")
    for _ in range(90):
        time.sleep(1)
        if health(port):
            show(port)
            return
        if proc.poll() is not None:
            print("서비스가 바로 종료됐어요. uvicorn.log 를 확인하세요.")
            return
    print("아직 준비 중이에요. 잠시 뒤 status 로 확인하세요.")


def stop(port: int) -> None:
    pid = None
    pf = pid_file(port)
    if pf.is_file() and pf.read_text(encoding="utf-8").strip().isdigit():
        pid = int(pf.read_text(encoding="utf-8").strip())
    if pid is None:
        print("이 스크립트로 띄운 프로세스를 못 찾았어요(다른 방법으로 띄웠다면 직접 종료하세요).")
        return
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
        else:
            os.kill(pid, signal.SIGTERM)
    except OSError:
        pass
    pf.unlink(missing_ok=True)
    time.sleep(1)
    print("종료함." if not health(port) else "아직 응답해요 — 직접 확인하세요.")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("action", choices=["start", "stop", "status"])
    ap.add_argument("--port", type=int, default=8000)
    a = ap.parse_args()
    {"start": start, "stop": stop, "status": show}[a.action](a.port)


if __name__ == "__main__":
    main()
