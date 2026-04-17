import { api } from '../core/api.js';

export const roomsApi = {
  list:   (params = {}) => api.get(`/rooms?${new URLSearchParams(params)}`),
  get:    (id)          => api.get(`/rooms/${id}`),
  create: (data)        => api.post('/rooms', data),
  update: (id, data)    => api.put(`/rooms/${id}`, data),
  remove: (id)          => api.delete(`/rooms/${id}`),
};

export function renderRoomCard(room) {
  const blocked = room.is_blocked
    ? '<span class="badge badge-danger">Bloqueado</span>'
    : '<span class="badge badge-success">Disponible</span>';
  const typeLabel = room.type === 'lab' ? 'Laboratorio' : 'Teórico';
  const warnings  = room.open_reports?.length
    ? `<p class="text-warning">⚠ ${room.open_reports.length} reporte(s) abierto(s)</p>` : '';

  return `
    <div class="card" data-id="${room.id}">
      <div class="card-header">
        <h3>${room.name}</h3>
        ${blocked}
      </div>
      <div class="card-body">
        <p><strong>Tipo:</strong> ${typeLabel}</p>
        <p><strong>Capacidad:</strong> ${room.capacity} alumnos</p>
        ${room.has_computers ? `<p><strong>Equipos:</strong> ${room.total_computers} (${room.computer_tier})</p>` : ''}
        ${room.has_board ? '<p>✓ Pizarrón</p>' : ''}
        ${warnings}
      </div>
      <div class="card-footer">
        <button class="btn btn-secondary btn-edit" data-id="${room.id}">Editar</button>
        <button class="btn btn-danger btn-delete" data-id="${room.id}">Eliminar</button>
      </div>
    </div>`;
}

export async function initRoomsPage() {
  const container = document.getElementById('rooms-container');
  const filterType = document.getElementById('filter-type');

  async function load() {
    const type = filterType?.value || '';
    container.innerHTML = '<p>Cargando...</p>';
    try {
      const rooms = await roomsApi.list(type ? { type } : {});
      container.innerHTML = rooms.map(renderRoomCard).join('') || '<p>No hay salones registrados.</p>';
    } catch (e) {
      container.innerHTML = `<p class="text-danger">Error: ${e.message}</p>`;
    }
  }

  filterType?.addEventListener('change', load);
  document.getElementById('btn-add-room')?.addEventListener('click', () => {
    import('../components/modal.js').then(({ openRoomModal }) => openRoomModal(null, load));
  });

  container.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('btn-edit')) {
      const room = await roomsApi.get(id);
      import('../components/modal.js').then(({ openRoomModal }) => openRoomModal(room, load));
    }
    if (e.target.classList.contains('btn-delete')) {
      if (!confirm('¿Eliminar este salón?')) return;
      await roomsApi.remove(id);
      load();
    }
  });

  await load();
}
