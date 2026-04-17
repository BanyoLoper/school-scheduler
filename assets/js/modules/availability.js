import { api } from '../core/api.js';
import { DAY_LABELS, DAYS } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

export const availabilityApi = {
  list:   (professorId, day) => api.get(`/availability?professor_id=${professorId}${day ? '&day=' + day : ''}`),
  create: (data)             => api.post('/availability', data),
  remove: (id)               => api.delete(`/availability/${id}`),
};

export function renderAvailabilityGrid(slots) {
  const byDay = DAYS.reduce((acc, d) => ({ ...acc, [d]: [] }), {});
  for (const s of slots) (byDay[s.day] ??= []).push(s);

  return `<table class="availability-grid">
    <thead><tr><th>Día</th><th>Franjas disponibles</th></tr></thead>
    <tbody>
      ${DAYS.map(day => `
        <tr>
          <td>${DAY_LABELS[day]}</td>
          <td>${byDay[day].map(s => `
            <span class="time-slot">
              ${s.start_time}–${s.end_time}
              <button class="btn-remove-slot" data-id="${s.id}">✕</button>
            </span>`).join('') || '<em>Sin disponibilidad</em>'}
          </td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

export async function initPublicAvailabilityPage() {
  const form = document.getElementById('availability-form');
  const msg  = document.getElementById('form-message');

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      await availabilityApi.create(data);
      msg.className = 'alert alert-success';
      msg.textContent = 'Disponibilidad registrada correctamente.';
      form.reset();
    } catch (err) {
      msg.className = 'alert alert-danger';
      msg.textContent = err.message;
    }
    msg.hidden = false;
  });
}
