// pm2 프로세스 설정 — Oracle Cloud VM 에서 백엔드(프론트 dist 서빙 포함)를 상시 실행한다.
// 서버 안 경로: /opt/human-bug-tier/current → releases/<시각> 을 가리키는 심볼릭 링크(배포 때마다 교체).
// 시크릿은 여기 적지 않는다 — /opt/human-bug-tier/shared/.env 를 backend/.env 로 링크해서 server.js 가 읽는다.
module.exports = {
  apps: [
    {
      name: 'human-bug-tier',
      cwd: '/opt/human-bug-tier/current/backend',
      script: 'server.js',
      // 이벤트 스케줄러(setInterval)·유튜브 동기화가 프로세스 안에서 돌기 때문에 반드시 1개만 띄운다
      // (cluster 로 여러 개 띄우면 스케줄러가 중복 실행된다)
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      time: true,
    },
    // AI 전용 서비스(FastAPI) — shared/ai.env 가 있을 때만 deploy.sh 가 띄운다(`--only hbt-ai`).
    // 127.0.0.1 에만 바인드한다: 바깥(nginx·보안 목록)에 8000 을 열지 않고, 브라우저는 backend 의 /api/ai 만 부른다.
    // 파이썬 가상환경은 릴리스 밖(shared/ai-venv)에 둬서 배포마다 다시 만들지 않는다. 시크릿은 ai-service/.env → shared/ai.env.
    {
      name: 'hbt-ai',
      cwd: '/opt/human-bug-tier/current/ai-service',
      script: '/opt/human-bug-tier/shared/ai-venv/bin/python',
      args: '-m uvicorn app.main:app --host 127.0.0.1 --port 8000',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      // 1GB VM 이라 백엔드(600M 상한)와 합쳐 넘치지 않게 낮게 잡는다. 벡터를 끈 상태의 상주 메모리는 100~150MB 안팎
      max_memory_restart: '300M',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      time: true,
    },
  ],
};
