import { api } from '../core/api.js';
import { REPORT_STATUS, REPORT_STATUS_COLORS, REPORTER_LABELS } from '../utils/constants.js';

const STATUS_OPTIONS = Object.entries(REPORT_STATUS)
  .map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

function statusBadge(status) {
  const color = REPORT_STATUS_COLORS[status] ?? 'secondary';
  return `<span class="badge badge-${color}">${REPORT_STATUS[status] ?? status}</span>`;
}

function reporterLabel(r) { return REPORTER_LABELS[r] ?? r; }

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' }) : '—';
}

// ── Reports table ──────────────────────────────────────────────────
async function loadReports(containerId, statusFilter) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<p style="padding:16px;color:var(--color-muted)">Cargando…</p>';

  const qs = statusFilter ? `?status=${statusFilter}` : '';
  const reports = await api.get(`/reports${qs}`);

  if (!reports.length) {
    el.innerHTML = '<p style="padding:16px;color:var(--color-muted)">Sin reportes.</p>';
    return;
  }

  el.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Equipo</th><th>Sala</th><th>Descripción</th>
        <th>Reportó</th><th>Fecha</th><th>Estado</th><th></th>
      </tr></thead>
      <tbody>
        ${reports.map(r => `
          <tr data-id="${r.id}">
            <td><strong>${r.computer_tag}</strong></td>
            <td>${r.room_name}</td>
            <td style="max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${r.description}">${r.description}</td>
            <td>${reporterLabel(r.reported_by)}</td>
            <td>${formatDate(r.created_at)}</td>
            <td>${statusBadge(r.status)}</td>
            <td style="text-align:right;white-space:nowrap">
              <select class="status-select" data-id="${r.id}" style="font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid var(--color-border)">
                ${Object.entries(REPORT_STATUS).map(([v, l]) =>
                  `<option value="${v}" ${r.status === v ? 'selected' : ''}>${l}</option>`
                ).join('')}
              </select>
              <button class="btn btn-sm btn-danger btn-del" data-id="${r.id}" style="margin-left:6px">✕</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  el.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      await api.put(`/reports/${sel.dataset.id}`, { status: sel.value });
      const row = el.querySelector(`tr[data-id="${sel.dataset.id}"]`);
      row.querySelector('.badge').outerHTML = statusBadge(sel.value);
    });
  });

  el.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar reporte?')) return;
      await api.delete(`/reports/${btn.dataset.id}`);
      btn.closest('tr').remove();
    });
  });
}

// ── Stats ──────────────────────────────────────────────────────────
async function loadStats(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const s = await api.get('/reports/stats');

  const totalByStatus = Object.fromEntries(s.by_status.map(r => [r.status, r.total]));
  const total = s.by_status.reduce((a, r) => a + r.total, 0);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px">
      ${Object.entries(REPORT_STATUS).map(([v, l]) => `
        <div class="stat-card">
          <div class="stat-value">${totalByStatus[v] ?? 0}</div>
          <div class="stat-label">${l}</div>
        </div>`).join('')}
      <div class="stat-card">
        <div class="stat-value">${total}</div>
        <div class="stat-label">Total histórico</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <h3 style="font-size:14px;font-weight:600;margin-bottom:10px">Salas con más reportes</h3>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Sala</th><th style="text-align:right">Reportes</th></tr></thead>
            <tbody>
              ${s.by_room.map(r => `
                <tr><td>${r.room_name}</td><td style="text-align:right;font-weight:600">${r.total}</td></tr>
              `).join('') || '<tr><td colspan="2" style="color:var(--color-muted)">Sin datos</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 style="font-size:14px;font-weight:600;margin-bottom:10px">Equipos más reportados</h3>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Etiqueta</th><th style="text-align:right">Reportes</th></tr></thead>
            <tbody>
              ${s.by_tag.map(r => `
                <tr><td><strong>${r.computer_tag}</strong></td><td style="text-align:right;font-weight:600">${r.total}</td></tr>
              `).join('') || '<tr><td colspan="2" style="color:var(--color-muted)">Sin datos</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div style="grid-column:1/-1">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:10px">Tendencia mensual (últimos 6 meses)</h3>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Mes</th><th style="text-align:right">Reportes</th><th>Barra</th></tr></thead>
            <tbody>
              ${(() => {
                const max = Math.max(...s.by_month.map(r => r.total), 1);
                return s.by_month.map(r => `
                  <tr>
                    <td>${r.month}</td>
                    <td style="text-align:right;font-weight:600">${r.total}</td>
                    <td style="width:200px">
                      <div style="height:10px;background:var(--color-primary);border-radius:4px;width:${Math.round(r.total/max*100)}%;min-width:4px"></div>
                    </td>
                  </tr>`).join('') || '<tr><td colspan="3" style="color:var(--color-muted)">Sin datos</td></tr>';
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// ── Page init ──────────────────────────────────────────────────────
export async function initReportsAdminPage() {
  await loadReports('tab-pending', 'pending');

  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.hidden = true);
    const panel = document.getElementById(`tab-${btn.dataset.tab}`);
    if (panel) panel.hidden = false;

    if (btn.dataset.tab === 'history'   && !panel.dataset.loaded) { loadReports('tab-history', '');           panel.dataset.loaded = '1'; }
    if (btn.dataset.tab === 'stats'     && !panel.dataset.loaded) { loadStats('tab-stats');                   panel.dataset.loaded = '1'; }
  }));
}
