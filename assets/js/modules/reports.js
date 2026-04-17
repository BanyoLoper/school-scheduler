import { api } from '../core/api.js';
import { REPORT_STATUS, REPORT_STATUS_COLORS } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

export const reportsApi = {
  list:         (params = {}) => api.get(`/reports?${new URLSearchParams(params)}`),
  submit:       (data)        => api.post('/reports', data),
  updateStatus: (id, status)  => api.put(`/reports/${id}/status`, { status }),
};

export async function initPublicReportsPage() {
  const form      = document.getElementById('report-form');
  const msg       = document.getElementById('form-message');
  const roomSelect = document.getElementById('room-select');

  // Populate lab rooms (public GET /rooms)
  try {
    const rooms = await api.get('/rooms?type=lab');
    roomSelect.innerHTML = '<option value="">Selecciona un laboratorio</option>' +
      rooms.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
  } catch {
    roomSelect.innerHTML = '<option value="">Error cargando labs</option>';
  }

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      await reportsApi.submit(data);
      msg.className = 'alert alert-success';
      msg.textContent = 'Reporte enviado. Gracias por notificarlo.';
      form.reset();
    } catch (err) {
      msg.className = 'alert alert-danger';
      msg.textContent = err.message;
    }
    msg.hidden = false;
  });
}

export function renderReportRow(report) {
  const color = REPORT_STATUS_COLORS[report.status];
  return `
    <tr data-id="${report.id}">
      <td>${escapeHtml(report.room_name)}</td>
      <td>${escapeHtml(report.computer_tag)}</td>
      <td>${escapeHtml(report.reported_by)}</td>
      <td>${escapeHtml(report.description.slice(0, 60))}${report.description.length > 60 ? '…' : ''}</td>
      <td><span class="badge badge-${color}">${REPORT_STATUS[report.status]}</span></td>
      <td>
        ${report.status !== 'resolved'
          ? `<button class="btn btn-sm btn-success btn-resolve" data-id="${report.id}">Resolver</button>`
          : ''}
      </td>
    </tr>`;
}
