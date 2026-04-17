import { API_BASE } from '../utils/constants.js';
import { debounce, escapeHtml } from '../utils/helpers.js';

const SLOTS = [
  { label: '7:00 – 9:00',   start: '07:00', end: '09:00' },
  { label: '9:00 – 11:00',  start: '09:00', end: '11:00' },
  { label: '11:00 – 13:00', start: '11:00', end: '13:00' },
  { label: '13:00 – 15:00', start: '13:00', end: '15:00' },
  { label: '15:00 – 17:00', start: '15:00', end: '17:00' },
  { label: '17:00 – 19:00', start: '17:00', end: '19:00' },
  { label: '19:00 – 21:00', start: '19:00', end: '21:00' },
];

const WEEK_DAYS = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
];

let activeSlots    = new Set();   // "day|start"
let activeSubjects = new Map();   // id -> {id, name, semester, career_name}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
  if (res.status === 204) return null;
  return res.json();
}

function slotKey(day, start) { return `${day}|${start}`; }

// ── Grid ───────────────────────────────────────────────────────────
function buildGrid(container) {
  const headers = ['<div></div>', ...WEEK_DAYS.map(d => `<div class="avail-cell avail-header">${d.label}</div>`)].join('');

  const rows = SLOTS.map(slot => {
    const cells = WEEK_DAYS.map(day => {
      const key      = slotKey(day.key, slot.start);
      const isActive = activeSlots.has(key);
      return `<div class="avail-cell${isActive ? ' active' : ''}"
                   data-day="${day.key}" data-start="${slot.start}" data-end="${slot.end}">
              </div>`;
    }).join('');
    return `<div class="avail-time-label">${slot.label}</div>${cells}`;
  }).join('');

  container.innerHTML = `<div class="avail-grid">${headers}${rows}</div>`;

  container.querySelectorAll('.avail-cell[data-day]').forEach(cell => {
    cell.addEventListener('click', () => {
      const key = slotKey(cell.dataset.day, cell.dataset.start);
      if (activeSlots.has(key)) { activeSlots.delete(key); cell.classList.remove('active'); }
      else                       { activeSlots.add(key);    cell.classList.add('active'); }
    });
  });
}

// ── Subject tags ───────────────────────────────────────────────────
function renderTags(container) {
  container.innerHTML = [...activeSubjects.values()].map(s => `
    <span class="avail-tag" data-id="${s.id}">
      ${escapeHtml(s.name)}
      <span class="avail-tag-meta">${s.career_name} · ${s.semester}°</span>
      <button class="avail-tag-remove" data-id="${s.id}" title="Quitar">✕</button>
    </span>`).join('');
  container.querySelectorAll('.avail-tag-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      activeSubjects.delete(Number(btn.dataset.id));
      renderTags(container);
    });
  });
}

function initSubjectSearch(inputEl, dropdownEl, tagsEl) {
  const search = debounce(async () => {
    const q = inputEl.value.trim();
    if (!q) { dropdownEl.hidden = true; return; }
    const results = await apiFetch(`/availability/subjects?q=${encodeURIComponent(q)}`);
    const filtered = results.filter(r => !activeSubjects.has(r.id));
    if (!filtered.length) { dropdownEl.hidden = true; return; }
    dropdownEl.innerHTML = filtered.map(s => `
      <div class="search-option" data-id="${s.id}"
           data-name="${escapeHtml(s.name)}" data-sem="${s.semester}"
           data-career="${escapeHtml(s.career_name)}">
        <strong>${escapeHtml(s.name)}</strong>
        <span class="search-option-meta">${escapeHtml(s.career_name)} · ${s.semester}°</span>
      </div>`).join('');
    dropdownEl.hidden = false;

    dropdownEl.querySelectorAll('.search-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const id = Number(opt.dataset.id);
        activeSubjects.set(id, {
          id, name: opt.dataset.name,
          semester: Number(opt.dataset.sem),
          career_name: opt.dataset.career,
        });
        renderTags(tagsEl);
        inputEl.value = '';
        dropdownEl.hidden = true;
      });
    });
  }, 250);

  inputEl.addEventListener('input', search);
  document.addEventListener('click', e => {
    if (!dropdownEl.contains(e.target) && e.target !== inputEl) dropdownEl.hidden = true;
  });
}

// ── Main init ──────────────────────────────────────────────────────
export async function initPublicAvailabilityPage() {
  const nameInput     = document.getElementById('prof-name-input');
  const gridContainer = document.getElementById('grid-container');
  const tagsContainer = document.getElementById('subject-tags');
  const subjectInput  = document.getElementById('subject-search');
  const subjectDrop   = document.getElementById('subject-dropdown');
  const saveBtn       = document.getElementById('btn-save');
  const msgEl         = document.getElementById('form-message');

  buildGrid(gridContainer);
  initSubjectSearch(subjectInput, subjectDrop, tagsContainer);

  saveBtn?.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      msgEl.className = 'alert alert-warning';
      msgEl.textContent = 'Por favor escribe tu nombre completo.';
      msgEl.hidden = false;
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Enviando…';
    msgEl.hidden = true;

    try {
      const slots = [...activeSlots].map(key => {
        const [day, start_time] = key.split('|');
        const slot = SLOTS.find(s => s.start === start_time);
        return { day, start_time, end_time: slot.end };
      });

      await apiFetch('/availability/submit', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slots,
          subject_ids: [...activeSubjects.keys()],
        }),
      });

      msgEl.className = 'alert alert-success';
      msgEl.textContent = `Disponibilidad guardada — ${slots.length} bloque(s), ${activeSubjects.size} materia(s).`;
      msgEl.hidden = false;
    } catch (e) {
      msgEl.className = 'alert alert-danger';
      msgEl.textContent = e.message;
      msgEl.hidden = false;
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Enviar disponibilidad';
  });
}
