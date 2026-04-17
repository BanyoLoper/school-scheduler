import { api } from '../core/api.js';
import { getProfile } from '../core/profile.js';

export const subjectsApi = {
  list:        (params = {}) => api.get(`/subjects?${new URLSearchParams(params)}`),
  create:      (data)        => api.post('/subjects', data),
  update:      (id, data)    => api.put(`/subjects/${id}`, data),
  remove:      (id)          => api.delete(`/subjects/${id}`),
  listGroups:  (career_id, semester) => api.get(`/groups?career_id=${career_id}&semester=${semester}`),
  createGroup: (data)        => api.post('/groups', data),
  updateGroup: (id, data)    => api.put(`/groups/${id}`, data),
  removeGroup: (id)          => api.delete(`/groups/${id}`),
};

function renderSubjectRow(subject) {
  const reqs = subject.software_requirements?.map(r => r.name).join(', ') || '—';
  const labBadge = subject.needs_lab
    ? '<span class="badge badge-info">Lab</span>'
    : '<span class="badge">Teórico</span>';
  return `
    <tr data-id="${subject.id}">
      <td>${subject.name}</td>
      <td>${labBadge}</td>
      <td>${reqs}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-secondary btn-edit-subject" data-id="${subject.id}">Editar</button>
        <button class="btn btn-sm btn-danger btn-delete-subject" data-id="${subject.id}">Eliminar</button>
      </td>
    </tr>`;
}

function groupSubjects(subjects) {
  const map = new Map();
  for (const s of subjects) {
    if (!map.has(s.career_id)) map.set(s.career_id, { career_id: s.career_id, career_name: s._career_name, semesters: new Map() });
    const c = map.get(s.career_id);
    if (!c.semesters.has(s.semester)) c.semesters.set(s.semester, []);
    c.semesters.get(s.semester).push(s);
  }
  return map;
}

function renderGrouped(subjects) {
  if (!subjects.length) return '<p style="color:var(--color-muted);padding:16px">Sin materias.</p>';

  const grouped = groupSubjects(subjects);
  return [...grouped.values()].map(career => `
    <div class="subjects-career-block">
      <div class="subjects-career-header">
        <h2>${career.career_name}</h2>
        <button class="btn-toggle btn-toggle-career" aria-label="Colapsar carrera">▼</button>
      </div>
      <div class="subjects-career-body">
        ${[...career.semesters.entries()].sort(([a],[b]) => a - b).map(([semester, list]) => `
          <div class="subjects-semester-section">
            <div class="subjects-semester-header">
              <span class="semester-toggle-group">
                <button class="btn-toggle btn-toggle-semester" aria-label="Colapsar semestre">▼</button>
                <span class="semester-label">Semestre ${semester}</span>
              </span>
              <button class="btn btn-sm btn-info btn-groups"
                      data-career-id="${career.career_id}"
                      data-semester="${semester}"
                      data-career-name="${career.career_name}">
                Grupos
              </button>
            </div>
            <div class="table-container subjects-table">
              <table>
                <thead><tr><th>Materia</th><th>Tipo</th><th>Software requerido</th><th>Acciones</th></tr></thead>
                <tbody>${list.map(renderSubjectRow).join('')}</tbody>
              </table>
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

export async function initSubjectsPage() {
  const container      = document.getElementById('subjects-container');
  const filterCareer   = document.getElementById('filter-career');
  const filterSemester = document.getElementById('filter-semester');
  const filterType     = document.getElementById('filter-type');
  const careerLabel    = document.getElementById('career-label');

  const [profile, careers] = await Promise.all([getProfile(), api.get('/careers')]);
  const careerMap = Object.fromEntries(careers.map(c => [c.id, c.name]));

  if (careerLabel) {
    careerLabel.textContent = profile.role === 'admin'
      ? 'Todas las carreras'
      : profile.career_ids.map(id => careerMap[id] ?? id).join(', ');
  }

  // Populate career filter
  const allowedCareers = profile.role === 'admin'
    ? careers
    : careers.filter(c => profile.career_ids.includes(c.id));
  allowedCareers.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    filterCareer?.appendChild(opt);
  });

  let allSubjects = [];

  function applyFilters() {
    let list = allSubjects;
    if (filterCareer?.value)   list = list.filter(s => s.career_id == filterCareer.value);
    if (filterSemester?.value) list = list.filter(s => s.semester  == filterSemester.value);
    const typeVal = filterType?.value ?? '';
    if (typeVal !== '') list = list.filter(s => String(s.needs_lab) === typeVal);
    container.innerHTML = renderGrouped(list);
    attachHandlers();
  }

  function attachHandlers() {
    container.querySelectorAll('.btn-delete-subject').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar materia?')) return;
        await subjectsApi.remove(btn.dataset.id);
        load();
      });
    });

    container.querySelectorAll('.btn-edit-subject').forEach(btn => {
      btn.addEventListener('click', async () => {
        const subject = allSubjects.find(s => s.id == btn.dataset.id);
        const { openSubjectModal } = await import('../components/modal.js');
        openSubjectModal(subject, load);
      });
    });

    container.querySelectorAll('.btn-toggle-career').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.subjects-career-block').classList.toggle('collapsed');
      });
    });

    container.querySelectorAll('.btn-toggle-semester').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.subjects-semester-section').classList.toggle('collapsed');
      });
    });

    container.querySelectorAll('.btn-groups').forEach(btn => {
      btn.addEventListener('click', async () => {
        const { openGroupsModal } = await import('../components/modal.js');
        openGroupsModal({
          career_id:   Number(btn.dataset.careerId),
          semester:    Number(btn.dataset.semester),
          career_name: btn.dataset.careerName,
        });
      });
    });
  }

  async function load() {
    container.innerHTML = '<p style="color:var(--color-muted);padding:16px">Cargando...</p>';
    try {
      allSubjects = await subjectsApi.list({});
      for (const s of allSubjects) s._career_name = careerMap[s.career_id] ?? `Carrera ${s.career_id}`;
      applyFilters();
    } catch (e) {
      container.innerHTML = `<p class="text-danger" style="padding:16px">${e.message}</p>`;
    }
  }

  filterCareer?.addEventListener('change', applyFilters);
  filterSemester?.addEventListener('change', applyFilters);
  filterType?.addEventListener('change', applyFilters);

  document.getElementById('btn-add-subject')?.addEventListener('click', async () => {
    const { openSubjectModal } = await import('../components/modal.js');
    openSubjectModal(null, load);
  });

  await load();
}
