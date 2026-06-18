function getApiBase() {
  if (window.__API_BASE__) {
    return String(window.__API_BASE__).replace(/\/$/, '');
  }

  const { protocol, hostname, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || port === '5000';

  if (isLocal) {
    return `${protocol}//${hostname || 'localhost'}:5000`;
  }

  return '';
}

function getAuthApiBase() {
  const apiBase = getApiBase();
  return apiBase ? `${apiBase}/api/auth` : '';
}

// GitHub Pages 배포 후 백엔드를 클라우드에 올리면 index.html 등에서 아래처럼 설정:
// window.__API_BASE__ = 'https://your-backend.onrender.com';