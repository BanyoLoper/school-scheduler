// Cloudflare Access sets the CF_Authorization cookie and passes the JWT
// in the Cf-Access-Jwt-Assertion header on every authenticated request.
// On the frontend we decode the payload (no verification needed — the
// worker already validates the signature server-side).

function parseCfJwt() {
  const cookie = document.cookie
    .split(';')
    .find(c => c.trim().startsWith('CF_Authorization='));
  if (!cookie) return null;
  const token = cookie.trim().slice('CF_Authorization='.length);
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

let _user = null;

export function getUser() {
  if (_user) return _user;
  const payload = parseCfJwt();
  if (!payload) return null;
  _user = {
    email:         payload.email,
    sub:           payload.sub,
    career_id:     payload.custom?.career_id   ?? null,
    coordinator_id: payload.custom?.coordinator_id ?? null,
    name:          payload.custom?.name        ?? payload.email,
  };
  return _user;
}

export function requireAuth(redirectTo = '/index.html') {
  if (!getUser()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

export function isAuthenticated() {
  return getUser() !== null;
}
