const routes = new Map();

export function route(hash, handler) {
  routes.set(hash, handler);
}

export function navigate(hash) {
  window.location.hash = hash;
}

function dispatch() {
  const hash    = window.location.hash.slice(1) || 'home';
  const handler = routes.get(hash) ?? routes.get('*');
  if (handler) handler(hash);
}

export function initRouter() {
  window.addEventListener('hashchange', dispatch);
  dispatch();
}
