import { api } from '../core/api.js';
import { getUser } from '../core/auth.js';

export const subjectsApi = {
  list:        (params = {}) => api.get(`/subjects?${new URLSearchParams(params)}`),
  create:      (data)        => api.post('/subjects', data),
  update:      (id, data)    => api.put(`/subjects/${id}`, data),
  remove:      (id)          => api.delete(`/subjects/${id}`),
  listGroups:  (subjectId)   => api.get(`/groups?subject_id=${subjectId}`),
  createGroup: (data)        => api.post('/groups', data),
  updateGroup: (id, data)    => api.put(`/groups/${id}`, data),
  removeGroup: (id)          => api.delete(`/groups/${id}`),
};

export function renderSubjectRow(subject) {
  const reqs = subject.software_requirements?.map(r => r.name).join(', ') || '—';
  const labBadge = subject.needs_lab
    ? '<span class="badge badge-info">Lab</span>'
    : '<span class="badge">Teórico</span>';
  return `
    <tr data-id="${subject.id}">
      <td>${subject.name}</td>
      <td>${subject.semester}°</td>
      <td>${labBadge}</td>
      <td>${reqs}</td>
      <td>
        <button class="btn btn-sm btn-secondary btn-edit-subject" data-id="${subject.id}">Editar</button>
        <button class="btn btn-sm btn-info btn-groups" data-id="${subject.id}" data-name="${subject.name}">Grupos</button>
        <button class="btn btn-sm btn-danger btn-delete-subject" data-id="${subject.id}">Eliminar</button>
      </td>
    </tr>`;
}

export async function initSubjectsPage() {
  const tbody    = document.getElementById('subjects-tbody');
  const filterSemester = document.getElementById('filter-semester');
  const user     = getUser();

  async function load() {
    tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
      const params = { career_id: user.career_id };
      if (filterSemester?.value) params.semester = filterSemester.value;
      const subjects = await subjectsApi.list(params);
      tbody.innerHTML = subjects.map(renderSubjectRow).join('') || '<tr><td colspan="5">Sin materias.</td></tr>';
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-danger">${e.message}</td></tr>`;
    }
  }

  filterSemester?.addEventListener('change', load);

  tbody.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('btn-delete-subject')) {
      if (!confirm('¿Eliminar materia?')) return;
      await subjectsApi.remove(id);
      load();
    }
  });

  document.getElementById('btn-add-subject')?.addEventListener('click', () => {
    import('../components/modal.js').then(({ openSubjectModal }) => openSubjectModal(null, load));
  });

  await load();
}
