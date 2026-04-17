import { getProfile, isAdmin } from '../core/profile.js';

const NAV_LINKS = [
  { href: '/dashboard.html',          label: 'Dashboard' },
  { href: '/schedule.html',           label: 'Horario' },
  { href: '/rooms.html',              label: 'Salones' },
  { href: '/subjects.html',           label: 'Materias' },
  { href: '/availability-admin.html', label: 'Disponibilidad' },
  { href: '/negotiations.html',       label: 'Negociaciones' },
  { href: '/lab-inventory.html',      label: 'Inventario Labs' },
  { href: '/reports-admin.html',      label: 'Reportes' },
];

const ADMIN_LINKS = [
  { href: '/careers.html', label: 'Carreras' },
  { href: '/admin.html',   label: 'Admin' },
];

export async function initSidebar(activePath) {
  const profile = await getProfile();
  const current = activePath ?? window.location.pathname;
  const links   = [...NAV_LINKS, ...(isAdmin() ? ADMIN_LINKS : [])];

  const navEl = document.querySelector('.sidebar-nav');
  const userEl = document.getElementById('user-info');
  if (userEl) userEl.textContent = profile?.name ?? profile?.email ?? '';
  if (!navEl) return;

  navEl.innerHTML = links.map((l, i) => {
    const active = current === l.href || current.endsWith(l.href) ? ' class="active"' : '';
    const shortcut = i === 9 ? 'Alt+0' : `Alt+${i + 1}`;
    return `<a href="${l.href}"${active} data-idx="${i}">
      ${l.label}
      <kbd>${shortcut}</kbd>
    </a>`;
  }).join('');

  // Alt+1–9 and Alt+0: navigate to sidebar section
  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const raw = parseInt(e.key);
    const idx = raw === 0 ? 9 : raw - 1;
    if (isNaN(idx) || idx < 0 || idx >= links.length) return;
    e.preventDefault();
    const dest = links[idx].href;
    if (current === dest || current.endsWith(dest)) return;
    const main = document.querySelector('.main-content');
    if (main) {
      main.classList.add('leaving');
      setTimeout(() => { window.location.href = dest; }, 130);
    } else {
      window.location.href = dest;
    }
  });

  // Alt+N: trigger any [data-shortcut="alt+n"] button on the page
  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key.toLowerCase() !== 'n') return;
    const btn = document.querySelector('[data-shortcut="alt+n"]:not(:disabled)');
    if (btn) { e.preventDefault(); btn.click(); }
  });

  // Decorate [data-shortcut] buttons with a small hint line
  document.querySelectorAll('[data-shortcut]').forEach(btn => {
    const shortcut = btn.dataset.shortcut.replace('alt+', 'Alt+').replace('ctrl+', 'Ctrl+');
    btn.innerHTML += `<span class="btn-shortcut">${shortcut}</span>`;
  });

  // Smooth page transitions
  const main = document.querySelector('.main-content');
  if (main) {
    navEl.addEventListener('click', e => {
      const link = e.target.closest('a[href]');
      if (!link || link.classList.contains('active')) return;
      e.preventDefault();
      const dest = link.href;
      main.classList.add('leaving');
      setTimeout(() => { window.location.href = dest; }, 130);
    });
  }
}
