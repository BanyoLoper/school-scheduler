import { isAuthenticated } from './auth.js';

const PUBLIC_PAGES = ['index.html', 'availability.html', 'reports.html'];

const routes = new Map();

export function route(hash, handler) {
  routes.set(hash, handler);
}

export function navigate(hash) {
  window.location.hash = hash;
}

function isPublicPage() {
  const page = window.location.pathname.split('/').pop();
  return PUBLIC_PAGES.some(p => page === p || page === '');
}

function dispatch() {
  if (!isPublicPage() && !isAuthenticated()) {
    window.location.href = '/index.html';
    return;
  }
  const hash    = window.location.hash.slice(1) || 'home';
  const handler = routes.get(hash) ?? routes.get('*');
  if (handler) handler(hash);
}

export function initRouter() {
  window.addEventListener('hashchange', dispatch);
  dispatch();
}
