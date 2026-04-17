import { DAYS, DAY_LABELS, TIME_SLOTS } from '../utils/constants.js';

export function renderGrid(container, assignments, onDropCallback) {
  if (!container) return;

  const bySlot = {};
  for (const a of assignments) {
    const key = `${a.day}-${a.start_time}`;
    (bySlot[key] ??= []).push(a);
  }

  const headers = ['Hora', ...DAYS.map(d => DAY_LABELS[d])].map(h => `<th>${h}</th>`).join('');

  const rows = TIME_SLOTS.slice(0, -1).map((slot, i) => {
    const cells = DAYS.map(day => {
      const slotAssignments = bySlot[`${day}-${slot}`] ?? [];
      const blocks = slotAssignments.map(a => buildBlock(a)).join('');
      return `<td class="grid-cell" data-day="${day}" data-time="${slot}" data-end="${TIME_SLOTS[i + 1]}">${blocks}</td>`;
    }).join('');
    return `<tr><td class="time-label">${slot}</td>${cells}</tr>`;
  }).join('');

  container.innerHTML = `<table class="schedule-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;

  if (onDropCallback) attachDragDrop(container, assignments, onDropCallback);
}

function buildBlock(a) {
  const priority = a.is_priority ? 'priority' : '';
  const warning  = a.warning     ? 'warning'  : '';
  return `
    <div class="schedule-block ${priority} ${warning}"
         draggable="true"
         data-id="${a.id}"
         data-room="${a.room_id}"
         title="${a.warning ?? ''}">
      <strong>${a.subject_name}</strong>
      <span>G${a.group_number} • ${a.room_name}</span>
      ${a.professor_name ? `<span>${a.professor_name}</span>` : ''}
      ${a.warning ? '<span class="block-warning">⚠</span>' : ''}
    </div>`;
}

function attachDragDrop(container, assignments, onDrop) {
  let draggingId = null;

  container.addEventListener('dragstart', e => {
    draggingId = e.target.closest('[data-id]')?.dataset.id;
    e.target.closest('[data-id]')?.classList.add('dragging');
  });

  container.addEventListener('dragend', e => {
    e.target.closest('[data-id]')?.classList.remove('dragging');
  });

  container.querySelectorAll('.grid-cell').forEach(cell => {
    cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('drag-over'); });
    cell.addEventListener('dragleave', ()  => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', async e => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      if (!draggingId) return;
      const assignment = assignments.find(a => String(a.id) === String(draggingId));
      if (!assignment) return;
      await onDrop(
        Number(draggingId),
        assignment.room_id,
        cell.dataset.day,
        cell.dataset.time,
        cell.dataset.end,
      );
      draggingId = null;
    });
  });
}
