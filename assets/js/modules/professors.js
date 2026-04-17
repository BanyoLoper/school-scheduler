import { api } from '../core/api.js';
import { getUser } from '../core/auth.js';

export const professorsApi = {
  list:   (careerId) => api.get(`/professors?career_id=${careerId}`),
  get:    (id)       => api.get(`/professors/${id}`),
  create: (data)     => api.post('/professors', data),
  update: (id, data) => api.put(`/professors/${id}`, data),
  remove: (id)       => api.delete(`/professors/${id}`),
};

export function renderProfessorRow(prof) {
  return `
    <tr data-id="${prof.id}">
      <td>${prof.name}</td>
      <td>
        <button class="btn btn-sm btn-info btn-availability" data-id="${prof.id}">Disponibilidad</button>
        <button class="btn btn-sm btn-secondary btn-edit-prof" data-id="${prof.id}">Editar</button>
        <button class="btn btn-sm btn-danger btn-delete-prof" data-id="${prof.id}">Eliminar</button>
      </td>
    </tr>`;
}

export async function initProfessorsPage() {
  const tbody = document.getElementById('professors-tbody');
  const user  = getUser();

  async function load() {
    tbody.innerHTML = '<tr><td colspan="2">Cargando...</td></tr>';
    try {
      const profs = await professorsApi.list(user.career_id);
      tbody.innerHTML = profs.map(renderProfessorRow).join('') || '<tr><td colspan="2">Sin profesores.</td></tr>';
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="2" class="text-danger">${e.message}</td></tr>`;
    }
  }

  tbody.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('btn-delete-prof')) {
      if (!confirm('¿Eliminar profesor?')) return;
      await professorsApi.remove(id);
      load();
    }
  });

  document.getElementById('btn-add-professor')?.addEventListener('click', () => {
    import('../components/modal.js').then(({ openProfessorModal }) => openProfessorModal(null, load));
  });

  await load();
}
