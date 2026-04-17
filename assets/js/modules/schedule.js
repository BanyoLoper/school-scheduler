import { api } from '../core/api.js';
import { getUser } from '../core/auth.js';
import { renderGrid } from '../components/schedule-grid.js';
import { showModal } from '../components/modal.js';
import { findLocalConflicts } from '../components/confilct-checker.js';

export const scheduleApi = {
  list:     (params = {}) => api.get(`/schedule?${new URLSearchParams(params)}`),
  create:   (data)        => api.post('/schedule', data),
  update:   (id, data)    => api.put(`/schedule/${id}`, data),
  remove:   (id)          => api.delete(`/schedule/${id}`),
  generate: (data)        => api.post('/schedule/generate', data),
};

let _assignments = [];

export function getAssignments() { return _assignments; }

export async function initSchedulePage() {
  const user     = getUser();
  const gridEl   = document.getElementById('schedule-grid');
  const semesterSel = document.getElementById('filter-semester');
  const btnGen   = document.getElementById('btn-generate');

  async function load() {
    const params = { career_id: user.career_id };
    if (semesterSel?.value) params.semester = semesterSel.value;
    _assignments = await scheduleApi.list(params);
    renderGrid(gridEl, _assignments, onDrop);
  }

  async function onDrop(assignmentId, newRoomId, day, startTime, endTime) {
    const target = { room_id: newRoomId, day, start_time: startTime, end_time: endTime };
    const conflicts = findLocalConflicts(_assignments, assignmentId, target);

    if (conflicts.length) {
      const confirmed = await showModal({
        title: 'Conflictos detectados',
        body: `<ul>${conflicts.map(c => `<li>${c}</li>`).join('')}</ul><p>¿Desea continuar con el cambio?</p>`,
        confirmText: 'Confirmar cambio',
        cancelText:  'Cancelar',
      });
      if (!confirmed) return;
    }

    await scheduleApi.update(assignmentId, target);
    await load();
  }

  btnGen?.addEventListener('click', async () => {
    btnGen.disabled = true;
    btnGen.textContent = 'Generando...';
    try {
      const semester = semesterSel?.value ? Number(semesterSel.value) : null;
      const result   = await scheduleApi.generate({ career_id: user.career_id, semester });

      const confirmed = await showModal({
        title: `Propuesta generada — ${result.assigned.length} asignaciones`,
        body: `
          <p>${result.unassigned.length} grupos sin asignar.</p>
          ${result.conflicts.length ? `<p class="text-danger">${result.conflicts.length} conflicto(s) detectado(s).</p>` : ''}
          <p>¿Guardar esta propuesta?</p>`,
        confirmText: 'Guardar propuesta',
        cancelText: 'Descartar',
      });

      if (confirmed) {
        for (const a of result.assigned) {
          await scheduleApi.create(a);
        }
        await load();
      }
    } finally {
      btnGen.disabled = false;
      btnGen.textContent = 'Generar propuesta';
    }
  });

  semesterSel?.addEventListener('change', load);
  await load();
}
