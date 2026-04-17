import { api } from '../core/api.js';

// ── Coordinators tab ──────────────────────────────────────────────

export async function loadCoordinators(containerId) {
  const [coordinators, careers] = await Promise.all([
    api.get('/coordinators'),
    api.get('/careers'),
  ]);

  const careerMap = Object.fromEntries(careers.map(c => [c.id, c.name]));
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h2 style="font-size:16px">Coordinadores</h2>
      <button class="btn btn-primary" id="btn-new-coordinator">+ Nuevo</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Carreras</th><th></th></tr></thead>
      <tbody>
        ${coordinators.map(c => `
          <tr>
            <td>${c.name}</td>
            <td>${c.email}</td>
            <td><span class="badge ${c.role === 'admin' ? 'badge-primary' : 'badge-secondary'}">${c.role}</span></td>
            <td>${(c.career_ids ?? []).map(id => careerMap[id] ?? id).join(', ') || '—'}</td>
            <td style="text-align:right">
              <button class="btn btn-sm" data-action="edit-coord" data-id="${c.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-action="del-coord" data-id="${c.id}">Eliminar</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  el.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);

    if (btn.dataset.action === 'del-coord') {
      if (!confirm('¿Eliminar coordinador?')) return;
      await api.delete(`/coordinators/${id}`);
      loadCoordinators(containerId);
    }
    if (btn.dataset.action === 'edit-coord') {
      const coord = coordinators.find(c => c.id === id);
      openCoordinatorModal(coord, careers, () => loadCoordinators(containerId));
    }
  });

  document.getElementById('btn-new-coordinator')?.addEventListener('click', () => {
    openCoordinatorModal(null, careers, () => loadCoordinators(containerId));
  });
}

function openCoordinatorModal(coord, careers, onSave) {
  const isNew = !coord;
  const checkedIds = coord?.career_ids ?? [];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${isNew ? 'Nuevo coordinador' : 'Editar coordinador'}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label>Nombre<input id="m-coord-name" class="input" value="${coord?.name ?? ''}" /></label>
        <label>Email<input id="m-coord-email" class="input" type="email" value="${coord?.email ?? ''}" /></label>
        <label>Rol
          <select id="m-coord-role" class="input">
            <option value="coordinator" ${coord?.role !== 'admin' ? 'selected' : ''}>coordinator</option>
            <option value="admin" ${coord?.role === 'admin' ? 'selected' : ''}>admin</option>
          </select>
        </label>
        <label>Carreras asignadas</label>
        <div id="m-career-checks" style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
          ${careers.map(c => `
            <label style="font-weight:normal;display:flex;align-items:center;gap:8px">
              <input type="checkbox" value="${c.id}" ${checkedIds.includes(c.id) ? 'checked' : ''}/>
              ${c.name}
            </label>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" id="m-cancel">Cancelar</button>
        <button class="btn btn-primary" id="m-save">Guardar</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  document.getElementById('m-cancel').onclick = () => modal.remove();

  document.getElementById('m-save').onclick = async () => {
    const name  = document.getElementById('m-coord-name').value.trim();
    const email = document.getElementById('m-coord-email').value.trim();
    const role  = document.getElementById('m-coord-role').value;
    const career_ids = [...modal.querySelectorAll('#m-career-checks input:checked')].map(el => Number(el.value));

    if (!name || !email) { alert('Nombre y email son obligatorios'); return; }

    if (isNew) {
      const { id } = await api.post('/coordinators', { name, email, role });
      await api.put(`/coordinators/${id}/careers`, { career_ids });
    } else {
      await api.put(`/coordinators/${coord.id}`, { name, email, role });
      await api.put(`/coordinators/${coord.id}/careers`, { career_ids });
    }
    modal.remove();
    onSave();
  };
}
