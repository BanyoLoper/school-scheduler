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
    modal.querySelector('#modal-confirm').focus();

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

    const close = () => { modal.remove(); resolve(null); };
    modal.querySelector('#modal-cancel').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

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
  const { getUser }     = await import('../core/auth.js');
  const user = getUser();
  await showFormModal({
    title: subject ? 'Editar Materia' : 'Nueva Materia',
    data: subject ?? {},
    fields: [
      { name: 'name',      label: 'Nombre',   required: true },
      { name: 'semester',  label: 'Semestre', type: 'number', required: true },
      { name: 'needs_lab', label: 'Requiere laboratorio', type: 'select',
        options: [{ value: '0', label: 'No' }, { value: '1', label: 'Sí' }] },
    ],
    onSave: async (data) => {
      data.career_id = user.career_id;
      subject ? await subjectsApi.update(subject.id, data) : await subjectsApi.create(data);
      onDone?.();
    },
  });
}

export async function openProfessorModal(prof, onDone) {
  const { professorsApi } = await import('../modules/professors.js');
  const { getUser }       = await import('../core/auth.js');
  const user = getUser();
  await showFormModal({
    title: prof ? 'Editar Profesor' : 'Nuevo Profesor',
    data: prof ?? {},
    fields: [{ name: 'name', label: 'Nombre', required: true }],
    onSave: async (data) => {
      data.career_id = user.career_id;
      prof ? await professorsApi.update(prof.id, data) : await professorsApi.create(data);
      onDone?.();
    },
  });
}
