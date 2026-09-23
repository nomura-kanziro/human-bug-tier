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
  ],
};
