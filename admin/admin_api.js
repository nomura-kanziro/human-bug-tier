function getApiBase() {
  const { protocol, hostname, port } = window.location;

  if (
    protocol === 'file:' ||
    port === '5500' || port === '3000' || port === '5173' ||
    port === '8080' || port === '4200' || port === '8000'
  ) {
    return 'http://localhost:5000';
  }
  return '';
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