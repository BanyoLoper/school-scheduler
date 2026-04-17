import { getProfile, isAdmin } from '../core/profile.js';

const NAV_LINKS = [
  { href: '/dashboard.html',     label: 'Dashboard' },
  { href: '/schedule.html',      label: 'Horario' },
  { href: '/rooms.html',         label: 'Salones' },
  { href: '/subjects.html',      label: 'Materias' },
  { href: '/negotiations.html',  label: 'Negociaciones' },
  { href: '/lab-inventory.html', label: 'Inventario Labs' },
];

const ADMIN_LINKS = [
  { href: '/admin.html',   label: 'Admin' },
  { href: '/careers.html', label: 'Carreras' },
];

export async function initSidebar(activePath) {
  const profile = await getProfile();
  const current = activePath ?? window.location.pathname;

  const links = [...NAV_LINKS, ...(isAdmin() ? ADMIN_LINKS : [])];
  const navHtml = links.map(l => {
    const active = current === l.href || current.endsWith(l.href) ? ' class="active"' : '';
    return `<a href="${l.href}"${active}>${l.label}</a>`;
  }).join('\n      ');

  const userEl = document.getElementById('user-info');
  if (userEl) userEl.textContent = profile?.name ?? profile?.email ?? '';

  const navEl = document.querySelector('.sidebar-nav');
  if (navEl) navEl.innerHTML = navHtml;

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
