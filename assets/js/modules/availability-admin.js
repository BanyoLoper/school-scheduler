import { api } from '../core/api.js';
import { escapeHtml } from '../utils/helpers.js';

const SLOTS = [
  { label: '7:00 – 9:00',   start: '07:00' },
  { label: '9:00 – 11:00',  start: '09:00' },
  { label: '11:00 – 13:00', start: '11:00' },
  { label: '13:00 – 15:00', start: '13:00' },
  { label: '15:00 – 17:00', start: '15:00' },
  { label: '17:00 – 19:00', start: '17:00' },
  { label: '19:00 – 21:00', start: '19:00' },
];

const WEEK_DAYS = [
  { key: 'monday',    label: 'Lun' },
  { key: 'tuesday',   label: 'Mar' },
  { key: 'wednesday', label: 'Mié' },
  { key: 'thursday',  label: 'Jue' },
  { key: 'friday',    label: 'Vie' },
];

// ── Pending subjects tab ───────────────────────────────────────────
async function loadPending(containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = '<p style="color:var(--color-muted)">Cargando…</p>';

  const subjects = await api.get('/availability/pending-subjects');

  if (!subjects.length) {
    el.innerHTML = '<div class="alert alert-success" style="margin:0">Todas las materias tienen al menos un profesor registrado. ✓</div>';
    return;
  }

  // Group by career → semester
  const byCareer = new Map();
  for (const s of subjects) {
    if (!byCareer.has(s.career_id)) byCareer.set(s.career_id, { name: s.career_name, semesters: new Map() });
    const career = byCareer.get(s.career_id);
    if (!career.semesters.has(s.semester)) career.semesters.set(s.semester, []);
    career.semesters.get(s.semester).push(s);
  }

  el.innerHTML = [...byCareer.values()].map(career => `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <h3>${escapeHtml(career.name)}</h3>
        <span class="badge badge-danger" style="margin-left:auto">
          ${[...career.semesters.values()].flat().length} sin cobertura
        </span>
      </div>
      <div class="card-body" style="padding:0">
        <table class="data-table">
          <thead><tr><th>Semestre</th><th>Materia</th></tr></thead>
          <tbody>
            ${[...career.semesters.entries()].sort(([a],[b]) => a-b).map(([sem, list]) =>
              list.map((s, i) => `
                <tr>
                  ${i === 0 ? `<td rowspan="${list.length}" style="font-weight:600;vertical-align:top;padding-top:12px">${sem}°</td>` : ''}
                  <td>${escapeHtml(s.name)}</td>
                </tr>`).join('')
            ).join('')}
          </tbody>
        </table>
      </div>
    </div>`).join('');
}

// ── Professors tab ─────────────────────────────────────────────────
async function loadProfessors(containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = '<p style="color:var(--color-muted)">Cargando…</p>';

  const professors = await api.get('/availability/professors-overview');

  if (!professors.length) {
    el.innerHTML = '<p style="color:var(--color-muted)">Ningún profesor ha registrado disponibilidad.</p>';
    return;
  }

  el.innerHTML = `
    <div class="table-container">
      <table class="data-table">
        <thead><tr>
          <th>Profesor</th>
          <th style="text-align:center">Bloques</th>
          <th style="text-align:center">Materias</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${professors.map(p => `
            <tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td style="text-align:center">
                ${p.slot_count > 0
                  ? `<span class="badge badge-success">${p.slot_count}</span>`
                  : `<span class="badge badge-danger">0</span>`}
              </td>
              <td style="text-align:center">
                ${p.subject_count > 0
                  ? `<span class="badge badge-info">${p.subject_count}</span>`
                  : `<span class="badge">0</span>`}
              </td>
              <td style="text-align:right">
                <button class="btn btn-sm btn-secondary btn-detail" data-id="${p.id}" data-name="${escapeHtml(p.name)}">
                  Ver detalle
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  el.querySelectorAll('.btn-detail').forEach(btn => {
    btn.addEventListener('click', () => openProfModal(Number(btn.dataset.id), btn.dataset.name));
  });
}

// ── Professor detail modal ─────────────────────────────────────────
async function openProfModal(professorId, name) {
  const modal   = document.getElementById('prof-modal');
  const nameEl  = document.getElementById('modal-prof-name');
  const bodyEl  = document.getElementById('modal-prof-body');

  nameEl.textContent = name;
  bodyEl.innerHTML = '<p style="color:var(--color-muted)">Cargando…</p>';
  modal.hidden = false;

  const [slots, subjects] = await Promise.all([
    api.get(`/availability?professor_id=${professorId}`),
    api.get(`/availability/professor-subjects?professor_id=${professorId}`),
  ]);

  const activeSet = new Set(slots.map(s => `${s.day}|${s.start_time}`));

  const gridRows = SLOTS.map(slot => {
    const cells = WEEK_DAYS.map(day => {
      const active = activeSet.has(`${day.key}|${slot.start}`);
      return `<div class="avail-cell-sm${active ? ' active' : ''}"></div>`;
    }).join('');
    return `<div class="avail-time-sm">${slot.label}</div>${cells}`;
  }).join('');

  const headers = `<div></div>${WEEK_DAYS.map(d => `<div class="avail-header-sm">${d.label}</div>`).join('')}`;

  const subjectTags = subjects.length
    ? subjects.map(s => `<span class="avail-tag">
        ${escapeHtml(s.name)}
        <span class="avail-tag-meta">${escapeHtml(s.career_name)} · ${s.semester}°</span>
      </span>`).join('')
    : '<span style="color:var(--color-muted);font-size:13px">Sin materias registradas</span>';

  bodyEl.innerHTML = `
    <div style="overflow-x:auto;margin-bottom:20px">
      <div class="avail-grid-sm">${headers}${gridRows}</div>
    </div>
    <div style="font-weight:500;font-size:13px;margin-bottom:8px">Materias</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${subjectTags}</div>`;
}

// ── Page init ──────────────────────────────────────────────────────
export function initAvailabilityAdmin() {
  loadPending('tab-pending');

  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.hidden = true);
    const panel = document.getElementById(`tab-${btn.dataset.tab}`);
    if (panel) panel.hidden = false;

    if (btn.dataset.tab === 'professors' && !panel.dataset.loaded) {
      loadProfessors('tab-professors');
      panel.dataset.loaded = '1';
    }
  }));

  document.getElementById('modal-close')?.addEventListener('click', () => {
    document.getElementById('prof-modal').hidden = true;
  });
  document.getElementById('prof-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('prof-modal').hidden = true;
  });
}
