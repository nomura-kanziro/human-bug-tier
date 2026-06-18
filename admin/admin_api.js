function getApiBase() {
  const { protocol, hostname, port } = window.location;

  if (port === '5000') {
    return `${protocol}//${hostname || 'localhost'}:5000`;
  }

  if (!port || port === '80' || port === '443') {
    return `${protocol}//${hostname}`;
  }

  return `${protocol}//${hostname || 'localhost'}:5000`;
}

function isAdminJwt(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.isAdmin === true;
  } catch (err) {
    return false;
  }
}

function getAdminAuthToken() {
  const saved = localStorage.getItem('adminAuthToken');
  if (saved) return saved;

  const legacy = localStorage.getItem('authToken');
  if (legacy && isAdminJwt(legacy)) {
    localStorage.setItem('adminAuthToken', legacy);
    return legacy;
  }

  return '';
}

function getAdminAuthHeaders() {
  const token = getAdminAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}