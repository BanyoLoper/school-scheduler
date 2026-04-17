function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function overlaps(aS, aE, bS, bE) {
  return toMin(aS) < toMin(bE) && toMin(bS) < toMin(aE);
}

// Returns array of conflict descriptions for a proposed assignment list.
export function findConflicts(assignments) {
  const conflicts = [];
  for (let i = 0; i < assignments.length; i++) {
    for (let j = i + 1; j < assignments.length; j++) {
      const a = assignments[i];
      const b = assignments[j];
      if (a.day !== b.day) continue;
      if (a.room_id === b.room_id && overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) {
        conflicts.push({ type: 'room', ids: [i, j], room_id: a.room_id, day: a.day });
      }
      if (a.professor_id && a.professor_id === b.professor_id &&
          overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) {
        conflicts.push({ type: 'professor', ids: [i, j], professor_id: a.professor_id, day: a.day });
      }
    }
  }
  return conflicts;
}
