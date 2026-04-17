import { api } from '../core/api.js';
import { SOFTWARE_CATEGORIES } from '../utils/constants.js';
import { groupBy, escapeHtml } from '../utils/helpers.js';

export const labInventoryApi = {
  listSoftware:  ()            => api.get('/lab-inventory'),
  listForRoom:   (roomId)      => api.get(`/lab-inventory?room_id=${roomId}`),
  addToRoom:     (data)        => api.post('/lab-inventory', data),
  update:        (id, data)    => api.put(`/lab-inventory/${id}`, data),
  remove:        (id)          => api.delete(`/lab-inventory/${id}`),
  createSoftware:(data)        => api.post('/lab-inventory/software', data),
};

function renderSoftwareList(items) {
  if (!items.length) return '<p class="text-muted" style="padding:16px">Sin software registrado para este laboratorio.</p>';
  const byCategory = groupBy(items, 'category');
  return Object.entries(byCategory).map(([cat, list]) => `
    <div style="margin-bottom:20px">
      <h3 style="font-size:13px;font-weight:600;color:var(--color-muted);text-transform:uppercase;margin-bottom:8px">
        ${SOFTWARE_CATEGORIES[cat] ?? cat}
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${list.map(s => `
          <span class="software-tag">
            ${escapeHtml(s.name)}
            <span class="version">${escapeHtml(s.version)}</span>
            <span class="text-muted" style="font-size:11px">(${s.installed_count} equipos)</span>
            <button class="btn-remove-slot btn-remove-sw" data-id="${s.id}" title="Quitar">✕</button>
          </span>`).join('')}
      </div>
    </div>`).join('');
}

export async function initLabInventoryPage() {
  const roomSelect    = document.getElementById('filter-room');
  const container     = document.getElementById('software-container');
  const btnAdd        = document.getElementById('btn-add-software');

  const rooms = await api.get('/rooms?type=lab');
  roomSelect.innerHTML = '<option value="">Selecciona un lab</option>' +
    rooms.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');

  async function loadRoom(roomId) {
    if (!roomId) { container.innerHTML = '<p class="text-muted">Selecciona un laboratorio.</p>'; return; }
    container.innerHTML = '<p>Cargando...</p>';
    try {
      const items = await labInventoryApi.listForRoom(roomId);
      container.innerHTML = `<div class="card"><div class="card-body">${renderSoftwareList(items)}</div></div>`;
      container.addEventListener('click', async e => {
        if (e.target.classList.contains('btn-remove-sw')) {
          await labInventoryApi.remove(e.target.dataset.id);
          loadRoom(roomId);
        }
      }, { once: true });
    } catch (e) {
      container.innerHTML = `<p class="text-danger">${e.message}</p>`;
    }
  }

  roomSelect.addEventListener('change', () => loadRoom(roomSelect.value));

  btnAdd?.addEventListener('click', async () => {
    const roomId = roomSelect.value;
    if (!roomId) { alert('Selecciona primero un laboratorio.'); return; }
    const catalog = await labInventoryApi.listSoftware();
    const { showFormModal } = await import('../components/modal.js');
    await showFormModal({
      title: 'Agregar software al lab',
      fields: [
        { name: 'software_id', label: 'Software', type: 'select', required: true,
          options: catalog.map(s => ({ value: s.id, label: `${s.name} ${s.version}` })) },
        { name: 'installed_count', label: 'Equipos con este software', type: 'number' },
        { name: 'notes', label: 'Notas (opcional)' },
      ],
      onSave: async (data) => {
        await labInventoryApi.addToRoom({ ...data, room_id: roomId });
        loadRoom(roomId);
      },
    });
  });
}
