// Generic modal — returns a Promise<boolean> (true = confirmed, false = cancelled)
export function showModal({ title, body, confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
  return new Promise(resolve => {
    const existing = document.getElementById('app-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'app-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">${title}</h2>
        <div class="modal-body">${body}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">${cancelText}</button>
          <button class="btn btn-primary"   id="modal-confirm">${confirmText}</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    (modal.querySelector('input:not([type=hidden]), select') ?? modal.querySelector('#modal-confirm'))?.focus();

    const close = (result) => { modal.remove(); resolve(result); };
    modal.querySelector('#modal-confirm').addEventListener('click', () => close(true));
    modal.querySelector('#modal-cancel').addEventListener('click',  () => close(false));
    modal.addEventListener('click', e => { if (e.target === modal) close(false); });

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', esc); }
    }, { once: true });
  });
}

export function showFormModal({ title, fields, data = {}, onSave }) {
  const fieldHtml = fields.map(f => {
    const val = data[f.name] ?? '';
    if (f.type === 'select') {
      const opts = f.options.map(o => `<option value="${o.value}" ${o.value == val ? 'selected' : ''}>${o.label}</option>`).join('');
      return `<label>${f.label}<select name="${f.name}" ${f.required ? 'required' : ''}>${opts}</select></label>`;
    }
    return `<label>${f.label}<input type="${f.type ?? 'text'}" name="${f.name}" value="${val}" ${f.required ? 'required' : ''} /></label>`;
  }).join('');

  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box">
        <h2>${title}</h2>
        <form id="modal-form" class="form-stack">${fieldHtml}</form>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
          <button class="btn btn-primary"   id="modal-save" type="submit" form="modal-form">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('input[type="text"], input:not([type])')?.focus();

    const close = () => { modal.remove(); resolve(null); };
    modal.querySelector('#modal-cancel').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    }, { once: true });

    modal.querySelector('#modal-form').addEventListener('submit', async e => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(e.target));
      await onSave(formData);
      modal.remove();
      resolve(formData);
    });
  });
}

export async function openRoomModal(room, onDone) {
  const { showFormModal } = await import('./modal.js');
  const { roomsApi } = await import('../modules/rooms.js');
  await showFormModal({
    title: room ? 'Editar Salón' : 'Nuevo Salón',
    data: room ?? {},
    fields: [
      { name: 'name',     label: 'Nombre',     required: true },
      { name: 'type',     label: 'Tipo',        type: 'select', required: true,
        options: [{ value: 'theory', label: 'Teórico' }, { value: 'lab', label: 'Laboratorio' }] },
      { name: 'capacity', label: 'Capacidad',   type: 'number', required: true },
    ],
    onSave: async (data) => {
      room ? await roomsApi.update(room.id, data) : await roomsApi.create(data);
      onDone?.();
    },
  });
}

export async function openSubjectModal(subject, onDone) {
  const { subjectsApi } = await import('../modules/subjects.js');
  const { getProfile }  = await import('../core/profile.js');
  const { api }         = await import('../core/api.js');
  const [profile, careers] = await Promise.all([getProfile(), api.get('/careers')]);

  const allowedCareers = profile.role === 'admin'
    ? careers
    : careers.filter(c => profile.career_ids.includes(c.id));

  await showFormModal({
    title: subject ? 'Editar Materia' : 'Nueva Materia',
    data: subject ?? {},
    fields: [
      { name: 'name',      label: 'Nombre',   required: true },
      { name: 'career_id', label: 'Carrera',  type: 'select', required: true,
        options: allowedCareers.map(c => ({ value: c.id, label: c.name })) },
      { name: 'semester',  label: 'Semestre', type: 'number', required: true },
      { name: 'needs_lab', label: 'Requiere laboratorio', type: 'select',
        options: [{ value: '0', label: 'No' }, { value: '1', label: 'Sí' }] },
    ],
    onSave: async (data) => {
      subject ? await subjectsApi.update(subject.id, data) : await subjectsApi.create(data);
      onDone?.();
    },
  });
}

export async function openProfessorModal(prof, onDone) {
  const { professorsApi } = await import('../modules/professors.js');
  const { getProfile }    = await import('../core/profile.js');
  const { api }           = await import('../core/api.js');
  const [profile, careers] = await Promise.all([getProfile(), api.get('/careers')]);

  const allowedCareers = profile.role === 'admin'
    ? careers
    : careers.filter(c => profile.career_ids.includes(c.id));

  await showFormModal({
    title: prof ? 'Editar Profesor' : 'Nuevo Profesor',
    data: prof ?? {},
    fields: [
      { name: 'name',      label: 'Nombre',  required: true },
      { name: 'career_id', label: 'Carrera', type: 'select', required: true,
        options: allowedCareers.map(c => ({ value: c.id, label: c.name })) },
    ],
    onSave: async (data) => {
      prof ? await professorsApi.update(prof.id, data) : await professorsApi.create(data);
      onDone?.();
    },
  });
}

export async function openGroupsModal({ career_id, semester, career_name }) {
  const { subjectsApi } = await import('../modules/subjects.js');

  async function renderGroups(container) {
    const groups = await subjectsApi.listGroups(career_id, semester);
    container.innerHTML = groups.length ? `
      <table class="data-table" style="margin-bottom:12px">
        <thead><tr><th>Grupo</th><th>Alumnos</th><th>Prioritario</th><th></th></tr></thead>
        <tbody>
          ${groups.map(g => `
            <tr>
              <td>Grupo ${g.group_number}</td>
              <td>${g.students}</td>
              <td>${g.is_priority ? '<span class="badge badge-warning">Sí</span>' : '—'}</td>
              <td style="text-align:right">
                <button class="btn btn-sm btn-danger" data-del="${g.id}">Eliminar</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>` : '<p style="color:var(--color-muted);margin-bottom:12px">Sin grupos registrados.</p>';

    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar grupo?')) return;
        await subjectsApi.removeGroup(btn.dataset.del);
        renderGroups(container);
      });
    });
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px">
      <h2>Grupos — ${career_name}, Semestre ${semester}</h2>
      <div class="modal-body">
        <div id="groups-list">Cargando...</div>
        <details style="margin-top:8px">
          <summary style="cursor:pointer;font-weight:500;font-size:13px;color:var(--color-primary)">+ Agregar grupo</summary>
          <div style="display:flex;gap:8px;align-items:flex-end;margin-top:10px;flex-wrap:wrap">
            <label style="flex:1;min-width:80px">Número<input id="g-num" class="input" type="number" min="1" value="1"/></label>
            <label style="flex:1;min-width:80px">Alumnos<input id="g-students" class="input" type="number" min="1" value="30"/></label>
            <label style="display:flex;align-items:center;gap:6px;font-weight:normal;margin-bottom:4px">
              <input id="g-priority" type="checkbox"/> Prioritario
            </label>
            <button class="btn btn-primary btn-sm" id="g-save" style="margin-bottom:4px">Guardar</button>
          </div>
        </details>
      </div>
      <div class="modal-footer">
        <button class="btn" id="g-close">Cerrar</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  const listEl = modal.querySelector('#groups-list');
  await renderGroups(listEl);

  modal.querySelector('#g-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); }
  }, { once: true });

  modal.querySelector('#g-save').addEventListener('click', async () => {
    const group_number = Number(modal.querySelector('#g-num').value);
    const students     = Number(modal.querySelector('#g-students').value);
    const is_priority  = modal.querySelector('#g-priority').checked ? 1 : 0;
    if (!group_number || !students) return;
    await subjectsApi.createGroup({ career_id, semester, group_number, students, is_priority });
    modal.querySelector('#g-num').value = group_number + 1;
    renderGroups(listEl);
  });
}
