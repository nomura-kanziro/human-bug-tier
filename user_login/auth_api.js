function getAuthApiBase() {
  const { protocol, hostname, port } = window.location;

  if (port === '5000') {
    return `${protocol}//${hostname || 'localhost'}:5000/api/auth`;
  }

  if (!port || port === '80' || port === '443') {
    return `${protocol}//${hostname}/api/auth`;
  }

  return `${protocol}//${hostname || 'localhost'}:5000/api/auth`;
}