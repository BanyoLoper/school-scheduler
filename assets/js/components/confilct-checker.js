import { slotsOverlap } from '../utils/helpers.js';
import { DAY_LABELS }   from '../utils/constants.js';

// Returns human-readable conflict strings for a proposed move.
// assignments: current full list; movingId: id being moved; target: {room_id, day, start_time, end_time}
export function findLocalConflicts(assignments, movingId, target) {
  const conflicts = [];
  const moving = assignments.find(a => a.id === movingId);

  for (const a of assignments) {
    if (a.id === movingId) continue;
    if (a.day !== target.day) continue;
    if (!slotsOverlap(target.start_time, target.end_time, a.start_time, a.end_time)) continue;

    if (a.room_id === target.room_id) {
      conflicts.push(
        `Salón ya ocupado por "${a.subject_name}" Grupo ${a.group_number} el ${DAY_LABELS[a.day]} ${a.start_time}–${a.end_time}`
      );
    }

    if (moving?.professor_id && a.professor_id === moving.professor_id) {
      conflicts.push(
        `Profesor asignado a otra clase ("${a.subject_name}") en el mismo horario`
      );
    }
  }

  return conflicts;
}
