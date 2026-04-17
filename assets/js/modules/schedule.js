import { api }        from '../core/api.js';
import { getProfile } from '../core/profile.js';
import { escapeHtml } from '../utils/helpers.js';

// ── Constants ────────────────────────────────────────────────────────
const DAYS = ['monday','tuesday','wednesday','thursday','friday'];
const DAY_LABELS = { monday:'Lunes', tuesday:'Martes', wednesday:'Miércoles', thursday:'Jueves', friday:'Viernes' };
const SLOTS = [
  { label:'7:00–9:00',   start:'07:00', end:'09:00' },
  { label:'9:00–11:00',  start:'09:00', end:'11:00' },
  { label:'11:00–13:00', start:'11:00', end:'13:00' },
  { label:'13:00–15:00', start:'13:00', end:'15:00' },
  { label:'15:00–17:00', start:'15:00', end:'17:00' },
  { label:'17:00–19:00', start:'17:00', end:'19:00' },
  { label:'19:00–21:00', start:'19:00', end:'21:00' },
];
const STORAGE_KEY = 'school-schedule-proposals';

// ── Module state ─────────────────────────────────────────────────────
let cache    = null;
let profile  = null;
let working  = [];
let navState = { careerIdx: 0, semester: 1 };

function toMin(t) { const [h,m] = t.split(':').map(Number); return h*60+m; }

// ── Cache ────────────────────────────────────────────────────────────
async function ensureCache() {
  if (cache) return;
  cache = await api.get('/schedule/context');
}

function currentCareer() { return cache?.careers?.[navState.careerIdx]; }

// ── Violation checker ────────────────────────────────────────────────
function checkViolations(a, all) {
  const violations = [];

  if (a.professor_id) {
    const prof = cache.professors.find(p => p.id === a.professor_id);
    const avail = prof?.availability?.some(av =>
      av.day === a.day &&
      toMin(av.start_time) <= toMin(a.start_time) &&
      toMin(av.end_time)   >= toMin(a.end_time)
    );
    if (!avail) violations.push('Profesor no disponible en este horario');

    const dbl = all.find(b =>
      b._id !== a._id &&
      b.professor_id === a.professor_id &&
      b.day === a.day &&
      b.start_time === a.start_time
    );
    if (dbl) violations.push(`Profesor ya asignado a "${dbl.subject_name}"`);
  }

  const roomConflict = all.find(b =>
    b._id !== a._id &&
    b.room_id === a.room_id &&
    b.day === a.day &&
    b.start_time === a.start_time
  );
  if (roomConflict) violations.push(`Salón ocupado por "${roomConflict.subject_name}" G${roomConflict.group_number}`);

  return violations;
}

function recomputeViolations() {
  for (const a of working) {
    a.violations = checkViolations(a, working);
  }
}

// ── Grid renderer ────────────────────────────────────────────────────
function renderGrid() {
  const container = document.getElementById('schedule-grid');
  if (!container || !cache) return;

  const career = currentCareer();
  const sem    = navState.semester;
  const view   = working.filter(a => a.career_id === career?.id && a.semester === sem);

  const byCell = {};
  for (const a of view) {
    const key = `${a.day}-${a.start_time}`;
    (byCell[key] ??= []).push(a);
  }

  const ths = ['<th class="time-col"></th>', ...DAYS.map(d => `<th>${DAY_LABELS[d]}</th>`)].join('');

  const rows = SLOTS.map(slot => {
    const cells = DAYS.map(day => {
      const key   = `${day}-${slot.start}`;
      const items = byCell[key] ?? [];
      let content = '';
      if (items.length > 1) {
        content = `<div class="cell-blocks-row">${items.map(a => buildBlock(a, items.length)).join('')}</div>`;
      } else if (items.length === 1) {
        content = buildBlock(items[0], 1);
      }
      return `<td class="grid-cell" data-day="${day}" data-start="${slot.start}" data-end="${slot.end}">${content}</td>`;
    }).join('');
    return `<tr><td class="time-label">${slot.label}</td>${cells}</tr>`;
  }).join('');

  container.innerHTML = `
    <table class="schedule-table">
      <thead><tr>${ths}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  attachGridEvents(container);
}

function buildBlock(a, countInCell) {
  const hasV = a.violations?.length > 0;

  let violationBadge = '';
  if (hasV) {
    const tipLines = a.violations.map(v => `<div>• ${escapeHtml(v)}</div>`).join('');
    violationBadge = `<div class="violation-badge">⚠${a.violations.length}<div class="violation-tooltip">${tipLines}</div></div>`;
  }

  const profLine = a.professor_name
    ? `<span>${escapeHtml(a.professor_name)}</span>`
    : `<span class="no-prof">Sin profesor</span>`;

  const groupBadge = countInCell > 1 ? `<span class="group-badge">G${a.group_number}</span>` : '';

  return `
    <div class="schedule-block-new${hasV ? ' has-violations' : ''}" draggable="true" data-aid="${a._id}">
      ${violationBadge}
      <strong>${escapeHtml(a.subject_name)}</strong>
      <span>${escapeHtml(a.room_name)}</span>
      ${profLine}
      ${groupBadge}
    </div>`;
}

// ── Pending subjects panel ───────────────────────────────────────────
function renderPending() {
  const container = document.getElementById('pending-subjects');
  if (!container || !cache) return;

  const career  = currentCareer();
  const sem     = navState.semester;
  const groups  = cache.groups.filter(g => g.career_id === career?.id && g.semester === sem);
  const subjects = cache.subjects.filter(s => s.career_id === career?.id && s.semester === sem);

  const pending = [];
  for (const group of groups) {
    for (const subject of subjects) {
      const sessions = working.filter(a => a.group_id === group.id && a.subject_id === subject.id).length;
      if (sessions < 2) {
        pending.push({ group, subject, sessions });
      }
    }
  }

  if (!pending.length) {
    container.innerHTML = `
      <div class="pending-header">Materias pendientes</div>
      <p class="pending-empty">✓ Todas las materias de este semestre están asignadas.</p>`;
    return;
  }

  const tags = pending.map(({ group, subject, sessions }) => {
    const remaining = 2 - sessions;
    const cls = sessions === 1 ? 'pending-tag half' : 'pending-tag';
    return `
      <span class="${cls}" title="Grupo ${group.group_number} · ${remaining} sesión${remaining > 1 ? 'es' : ''} pendiente${remaining > 1 ? 's' : ''}">
        ${escapeHtml(subject.name)}
        ${groups.length > 1 ? `<em>G${group.group_number}</em>` : ''}
        <span class="pending-sessions">${sessions}/2</span>
      </span>`;
  }).join('');

  container.innerHTML = `
    <div class="pending-header">
      Materias pendientes
      <span class="pending-count">${pending.length}</span>
    </div>
    <div class="pending-tags">${tags}</div>`;
}

// ── Grid events ──────────────────────────────────────────────────────
function attachGridEvents(container) {
  let draggingAid = null;

  container.addEventListener('dragstart', e => {
    const block = e.target.closest('[data-aid]');
    if (!block) return;
    draggingAid = block.dataset.aid;
    block.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragend', e => {
    e.target.closest('[data-aid]')?.classList.remove('dragging');
  });

  container.querySelectorAll('.grid-cell').forEach(cell => {
    cell.addEventListener('click', e => {
      if (e.target.closest('[data-aid]')) return;
      openAddModal(cell.dataset.day, cell.dataset.start, cell.dataset.end);
    });
    cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('drag-over'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', e => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      if (!draggingAid) return;
      const a = working.find(x => x._id === draggingAid);
      if (a) {
        a.day        = cell.dataset.day;
        a.start_time = cell.dataset.start;
        a.end_time   = cell.dataset.end;
        recomputeViolations();
        renderAll();
      }
      draggingAid = null;
    });
  });

  container.addEventListener('click', e => {
    const block = e.target.closest('[data-aid]');
    if (!block) return;
    e.stopPropagation();
    openBlockMenu(block.dataset.aid, block);
  });
}

// ── Block context menu ───────────────────────────────────────────────
function openBlockMenu(aid, blockEl) {
  document.getElementById('block-menu')?.remove();
  const rect = blockEl.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = 'block-menu';
  menu.className = 'block-context-menu';
  menu.style.cssText = `top:${rect.bottom + window.scrollY + 4}px;left:${rect.left + window.scrollX}px`;
  menu.innerHTML = `<button class="danger" data-action="delete">🗑 Eliminar bloque</button>`;
  document.body.appendChild(menu);

  menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
    working = working.filter(x => x._id !== aid);
    recomputeViolations();
    renderAll();
    menu.remove();
  });

  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

// ── Add modal ────────────────────────────────────────────────────────
async function openAddModal(day, startTime, endTime) {
  const career = currentCareer();
  const sem    = navState.semester;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:460px">
      <h2>${DAY_LABELS[day]} · ${startTime}–${endTime}</h2>
      <div class="modal-body">
        <div id="aml-loader" style="text-align:center;padding:24px;color:var(--color-muted)">
          <span class="spinner"></span> Cargando disponibilidad…
        </div>
        <div id="aml-fields" class="form-stack" hidden></div>
      </div>
      <div class="modal-footer" id="aml-footer" hidden>
        <button class="btn btn-secondary" id="aml-cancel">Cancelar</button>
        <button class="btn btn-primary"   id="aml-confirm">Agregar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#aml-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  }, { once: true });

  try {
    const groups   = cache.groups.filter(g => g.career_id === career.id && g.semester === sem);
    const subjects = cache.subjects.filter(s => s.career_id === career.id && s.semester === sem);

    const pending = [];
    for (const group of groups) {
      for (const subject of subjects) {
        const sessions = working.filter(a => a.group_id === group.id && a.subject_id === subject.id).length;
        if (sessions < 2) pending.push({ group, subject, sessions });
      }
    }

    const loaderEl = modal.querySelector('#aml-loader');
    const fieldsEl = modal.querySelector('#aml-fields');
    const footerEl = modal.querySelector('#aml-footer');

    if (!pending.length) {
      loaderEl.innerHTML = '<p>No hay materias pendientes para este semestre.</p>';
      footerEl.hidden = false;
      modal.querySelector('#aml-confirm').hidden = true;
      return;
    }

    const availProfs = cache.professors.filter(p =>
      p.availability?.some(av =>
        av.day === day &&
        toMin(av.start_time) <= toMin(startTime) &&
        toMin(av.end_time)   >= toMin(endTime)
      )
    );

    const occupiedRooms = new Set(
      working.filter(a => a.day === day && a.start_time === startTime).map(a => a.room_id)
    );
    const freeRooms = cache.rooms.filter(r => !occupiedRooms.has(r.id));

    const sgOpts = pending.map(p =>
      `<option value="${p.group.id}|${p.subject.id}|${p.subject.needs_lab}">
        ${escapeHtml(p.subject.name)} — G${p.group.group_number}${p.sessions === 1 ? ' (falta 1 sesión)' : ''}
      </option>`
    ).join('');

    fieldsEl.innerHTML = `
      <label>Materia y grupo
        <select id="aml-sg" required>
          <option value="">Seleccionar materia…</option>
          ${sgOpts}
        </select>
      </label>
      <label>Profesor
        <select id="aml-prof">
          <option value="">Sin asignar</option>
        </select>
      </label>
      <label>Salón / Laboratorio
        <select id="aml-room" required>
          <option value="">Seleccionar salón…</option>
        </select>
      </label>
      <p id="aml-notice" class="session-notice" hidden></p>`;

    loaderEl.hidden = true;
    fieldsEl.hidden = false;
    footerEl.hidden = false;

    const sgSel    = fieldsEl.querySelector('#aml-sg');
    const profSel  = fieldsEl.querySelector('#aml-prof');
    const roomSel  = fieldsEl.querySelector('#aml-room');
    const noticeEl = fieldsEl.querySelector('#aml-notice');

    function refreshDropdowns() {
      const parts     = sgSel.value.split('|');
      const subjectId = parts[1] ? Number(parts[1]) : null;
      const needsLab  = parts[2] === '1';

      profSel.innerHTML = '<option value="">Sin asignar</option>';
      roomSel.innerHTML = '<option value="">Seleccionar salón…</option>';
      noticeEl.hidden   = true;

      if (!subjectId) return;

      const eligible = availProfs.filter(p => p.subject_ids.includes(subjectId));
      if (eligible.length) {
        eligible.forEach(p => { profSel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`; });
      } else {
        profSel.innerHTML = '<option value="">Sin profesores disponibles</option>';
      }

      const typeRooms = freeRooms.filter(r => needsLab ? r.type === 'lab' : r.type === 'theory');
      if (typeRooms.length) {
        typeRooms.forEach(r => { roomSel.innerHTML += `<option value="${r.id}">${escapeHtml(r.name)} (cap. ${r.capacity})</option>`; });
      } else {
        roomSel.innerHTML = `<option value="">${needsLab ? 'Sin laboratorios disponibles' : 'Sin aulas disponibles'}</option>`;
      }

      const groupId  = Number(parts[0]);
      const sessions = working.filter(a => a.group_id === groupId && a.subject_id === subjectId).length;
      if (sessions === 0) {
        noticeEl.textContent = 'Faltará asignar 1 sesión más para completar las 4 horas semanales.';
        noticeEl.hidden = false;
      } else if (sessions === 1) {
        noticeEl.textContent = 'Esta es la segunda sesión — completará las 4 horas semanales.';
        noticeEl.hidden = false;
      }
    }

    sgSel.addEventListener('change', refreshDropdowns);

    modal.querySelector('#aml-confirm').addEventListener('click', () => {
      const parts     = sgSel.value.split('|');
      const groupId   = Number(parts[0]);
      const subjectId = Number(parts[1]);
      const roomId    = Number(roomSel.value);

      if (!groupId || !subjectId || !roomId) {
        roomSel.style.outline = '2px solid var(--color-danger)';
        return;
      }

      const group   = cache.groups.find(g => g.id === groupId);
      const subject = cache.subjects.find(s => s.id === subjectId);
      const room    = cache.rooms.find(r => r.id === roomId);
      const prof    = profSel.value ? cache.professors.find(p => p.id === Number(profSel.value)) : null;

      working.push({
        _id:           crypto.randomUUID(),
        group_id:      group.id,
        subject_id:    subject.id,
        room_id:       room.id,
        professor_id:  prof?.id   ?? null,
        group_number:  group.group_number,
        subject_name:  subject.name,
        room_name:     room.name,
        professor_name: prof?.name ?? null,
        career_id:     career.id,
        semester:      sem,
        day,
        start_time:    startTime,
        end_time:      endTime,
        violations:    [],
      });

      recomputeViolations();
      renderAll();
      close();
    });

  } catch (err) {
    modal.querySelector('#aml-loader').innerHTML =
      `<p style="color:var(--color-danger)">Error: ${escapeHtml(err.message)}</p>`;
    modal.querySelector('#aml-footer').hidden = false;
    modal.querySelector('#aml-confirm').hidden = true;
  }
}

// ── Nav + save button ────────────────────────────────────────────────
function renderNav() {
  const career = currentCareer();
  document.getElementById('career-label').textContent = career?.name ?? '—';
  document.getElementById('sem-label').textContent    = `Semestre ${navState.semester}`;

  const violations = working.reduce((n, a) => n + (a.violations?.length ?? 0), 0);
  const btn = document.getElementById('btn-save-proposal');
  if (btn) {
    btn.textContent = violations > 0
      ? `Guardar propuesta (⚠ ${violations} advertencia${violations > 1 ? 's' : ''})`
      : 'Guardar propuesta';
  }
}

function renderAll() {
  renderNav();
  renderGrid();
  renderPending();
}

// ── Save proposal ────────────────────────────────────────────────────
function saveProposal() {
  if (!working.length) {
    alert('El horario está vacío. Agrega al menos una clase antes de guardar.');
    return;
  }

  const violations = working.reduce((n, a) => n + (a.violations?.length ?? 0), 0);
  const coverageMap = {};
  for (const a of working) {
    (coverageMap[a.career_id] ??= new Set()).add(a.semester);
  }
  const coverage = Object.entries(coverageMap).map(([cid, sems]) => ({
    career_id:   Number(cid),
    career_name: cache.careers.find(c => c.id === Number(cid))?.name ?? String(cid),
    semesters:   [...sems].sort((a,b) => a-b),
  }));

  const proposal = {
    id:              crypto.randomUUID(),
    created_by:      profile.email,
    created_at:      new Date().toISOString(),
    assignments:     structuredClone(working),
    violation_count: violations,
    coverage,
    votes:           {},
  };

  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  stored.push(proposal);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  const notice = document.getElementById('save-notice');
  notice.textContent = '¡Propuesta guardada!';
  notice.hidden = false;
  setTimeout(() => { notice.hidden = true; }, 3000);
}

// ── Keyboard navigation ──────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.modal-overlay')) return;
    if (!cache?.careers?.length) return;

    const maxSem = currentCareer()?.total_semesters ?? 1;
    const n      = cache.careers.length;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      navState.semester = (navState.semester % maxSem) + 1;
      renderAll();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navState.semester = navState.semester === 1 ? maxSem : navState.semester - 1;
      renderAll();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navState.careerIdx = (navState.careerIdx + 1) % n;
      navState.semester  = Math.min(navState.semester, cache.careers[navState.careerIdx].total_semesters);
      renderAll();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navState.careerIdx = ((navState.careerIdx - 1) % n + n) % n;
      navState.semester  = Math.min(navState.semester, cache.careers[navState.careerIdx].total_semesters);
      renderAll();
    }
  });
}

// ── Init ─────────────────────────────────────────────────────────────
export async function initSchedulePage({ onProposalsTab } = {}) {
  profile = await getProfile();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = true; });
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).hidden = false;
      if (btn.dataset.tab === 'proposals') onProposalsTab?.();
    });
  });

  document.getElementById('career-prev')?.addEventListener('click', () => {
    const n = cache.careers.length;
    navState.careerIdx = ((navState.careerIdx - 1) % n + n) % n;
    navState.semester  = Math.min(navState.semester, currentCareer().total_semesters);
    renderAll();
  });
  document.getElementById('career-next')?.addEventListener('click', () => {
    navState.careerIdx = (navState.careerIdx + 1) % cache.careers.length;
    navState.semester  = Math.min(navState.semester, currentCareer().total_semesters);
    renderAll();
  });
  document.getElementById('sem-prev')?.addEventListener('click', () => {
    const max = currentCareer().total_semesters;
    navState.semester = navState.semester === 1 ? max : navState.semester - 1;
    renderAll();
  });
  document.getElementById('sem-next')?.addEventListener('click', () => {
    const max = currentCareer().total_semesters;
    navState.semester = (navState.semester % max) + 1;
    renderAll();
  });

  document.getElementById('btn-save-proposal')?.addEventListener('click', saveProposal);

  await ensureCache();
  setupKeyboard();
  renderAll();
}
