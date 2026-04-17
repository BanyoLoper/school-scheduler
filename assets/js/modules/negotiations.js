import { api } from '../core/api.js';
import { NEGOTIATION_STATUS } from '../utils/constants.js';
import { showModal } from '../components/modal.js';

export const negotiationsApi = {
  list:   ()         => api.get('/negotiations'),
  create: (data)     => api.post('/negotiations', data),
  accept: (id)       => api.put(`/negotiations/${id}/accept`, {}),
  reject: (id)       => api.put(`/negotiations/${id}/reject`, {}),
};

export function renderNegotiationRow(neg) {
  const statusClass = { pending: 'warning', accepted: 'success', rejected: 'danger' }[neg.status];
  const actions = neg.status === 'pending' && neg.is_target
    ? `<button class="btn btn-sm btn-success btn-accept" data-id="${neg.id}">Aceptar</button>
       <button class="btn btn-sm btn-danger btn-reject" data-id="${neg.id}">Rechazar</button>`
    : '';
  return `
    <tr data-id="${neg.id}">
      <td>${neg.requester_name} → ${neg.target_name}</td>
      <td>${neg.room_a} (${neg.day_a} ${neg.start_a})</td>
      <td>${neg.room_b} (${neg.day_b} ${neg.start_b})</td>
      <td><span class="badge badge-${statusClass}">${NEGOTIATION_STATUS[neg.status]}</span></td>
      <td>${actions}</td>
    </tr>`;
}

export async function initNegotiationsPage() {
  const tbody = document.getElementById('negotiations-tbody');

  async function load() {
    tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
      const items = await negotiationsApi.list();
      tbody.innerHTML = items.map(renderNegotiationRow).join('') || '<tr><td colspan="5">Sin solicitudes.</td></tr>';
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-danger">${e.message}</td></tr>`;
    }
  }

  tbody.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('btn-accept')) {
      const ok = await showModal({ title: 'Confirmar intercambio', body: '¿Aceptar este intercambio de salón?', confirmText: 'Aceptar', cancelText: 'Cancelar' });
      if (ok) { await negotiationsApi.accept(id); load(); }
    }
    if (e.target.classList.contains('btn-reject')) {
      await negotiationsApi.reject(id);
      load();
    }
  });

  await load();
}
