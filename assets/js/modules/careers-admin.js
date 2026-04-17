import { api } from '../core/api.js';

export async function loadCareers(containerId) {
  const careers = await api.get('/careers');
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h2 style="font-size:16px">Carreras</h2>
      <button class="btn btn-primary" id="btn-new-career" data-shortcut="alt+n">+ Nueva carrera<span class="btn-shortcut">Alt+N</span></button>
    </div>
    <table class="data-table">
      <thead><tr><th>Código</th><th>Nombre</th><th>Semestres</th><th></th></tr></thead>
      <tbody>
        ${careers.map(c => `
          <tr>
            <td>${c.code ?? '—'}</td>
            <td>${c.name}</td>
            <td>${c.total_semesters}</td>
            <td style="text-align:right">
              <button class="btn btn-sm" data-action="edit" data-id="${c.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-action="delete" data-id="${c.id}">Eliminar</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  el.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);

    if (btn.dataset.action === 'delete') {
      if (!confirm('¿Eliminar carrera? Esto eliminará todas sus materias y grupos.')) return;
      await api.delete(`/careers/${id}`);
      loadCareers(containerId);
    }
    if (btn.dataset.action === 'edit') {
      const career = careers.find(c => c.id === id);
      openCareerModal(career, () => loadCareers(containerId));
    }
  });

  document.getElementById('btn-new-career')?.addEventListener('click', () => {
    openCareerModal(null, () => loadCareers(containerId));
  });
}

function openCareerModal(career, onSave) {
  const isNew = !career;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${isNew ? 'Nueva carrera' : 'Editar carrera'}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label>Nombre<input id="m-career-name" class="input" value="${career?.name ?? ''}" /></label>
        <label>Código (ej: ISC)<input id="m-career-code" class="input" value="${career?.code ?? ''}" /></label>
        <label>Total de semestres<input id="m-career-sems" class="input" type="number" min="1" max="20" value="${career?.total_semesters ?? 9}" /></label>
        <label>Descripción<input id="m-career-desc" class="input" value="${career?.description ?? ''}" /></label>
      </div>
      <div class="modal-footer">
        <button class="btn" id="m-cancel">Cancelar</button>
        <button class="btn btn-primary" id="m-save">Guardar</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('m-career-name').focus();

  const closeModal = () => modal.remove();
  modal.querySelector('.modal-close').onclick = closeModal;
  document.getElementById('m-cancel').onclick = closeModal;
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
  }, { once: true });

  document.getElementById('m-save').onclick = async () => {
    const name            = document.getElementById('m-career-name').value.trim();
    const code            = document.getElementById('m-career-code').value.trim() || null;
    const total_semesters = Number(document.getElementById('m-career-sems').value);
    const description     = document.getElementById('m-career-desc').value.trim() || null;

    if (!name) { alert('El nombre es obligatorio'); return; }

    if (isNew) {
      await api.post('/careers', { name, code, total_semesters, description });
    } else {
      await api.put(`/careers/${career.id}`, { name, code, total_semesters, description });
    }
    modal.remove();
    onSave();
  };
}
