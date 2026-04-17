// Returns the eligible room with the smallest capacity that still fits the group.
// Prefers rooms where capacity - students is minimized (least waste).
export function bestFitRoom(rooms, students) {
  const eligible = rooms.filter(r => r.capacity >= students && !r.is_blocked);
  if (!eligible.length) return null;
  return eligible.reduce((best, room) =>
    (room.capacity - students) < (best.capacity - students) ? room : best
  );
}
