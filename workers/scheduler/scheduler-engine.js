import { sortByPriority }  from './strategies/priority-first.js';
import { bestFitRoom }     from './strategies/best-fit.js';
import { findConflicts }   from './validator.js';

function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

function professorAvailable(availability, professorId, day, start, end) {
  return availability.some(a =>
    a.professor_id === professorId &&
    a.day === day &&
    toMin(a.start_time) <= toMin(start) &&
    toMin(a.end_time)   >= toMin(end)
  );
}

function softwareMatch(roomSoftware, requirements) {
  for (const req of requirements) {
    if (!req.is_required) continue;
    const installed = roomSoftware.filter(rs => rs.software_id === req.software_id);
    if (!installed.length) return false;
  }
  return true;
}

export async function buildProposal(DB, careerId, semester) {
  const { results: groups } = await DB.prepare(`
    SELECT g.*, s.name AS subject_name, s.needs_lab, s.semester
    FROM groups g JOIN subjects s ON s.id = g.subject_id
    WHERE s.career_id=? ${semester ? 'AND s.semester=?' : ''}
    ORDER BY g.is_priority DESC, g.students DESC
  `).bind(...(semester ? [careerId, semester] : [careerId])).all();

  const { results: rooms } = await DB.prepare(
    `SELECT r.*, e.total_computers FROM rooms r LEFT JOIN room_equipment e ON e.room_id=r.id WHERE r.is_blocked=0`
  ).all();

  const { results: availability } = await DB.prepare('SELECT * FROM availability').all();

  const { results: allRoomSoftware } = await DB.prepare('SELECT * FROM room_software').all();

  const { results: allReqs } = await DB.prepare('SELECT * FROM subject_software_requirements').all();

  const { results: openReports } = await DB.prepare(
    `SELECT room_id FROM computer_reports WHERE status != 'resolved'`
  ).all();
  const reportedRooms = new Set(openReports.map(r => r.room_id));

  const DAYS       = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const TIME_PAIRS = [
    ['07:00', '09:00'], ['09:00', '11:00'], ['11:00', '13:00'],
    ['13:00', '15:00'], ['15:00', '17:00'], ['17:00', '19:00'],
  ];

  const assigned = [];
  const unassigned = [];
  const used = new Set(); // `${room_id}-${day}-${start}`

  for (const group of sortByPriority(groups)) {
    const reqs = allReqs.filter(r => r.subject_id === group.subject_id);

    const eligibleRooms = rooms.filter(room => {
      if (group.needs_lab && room.type !== 'lab') return false;
      if (!group.needs_lab && room.type === 'lab') return false;
      const rs = allRoomSoftware.filter(rs => rs.room_id === room.id);
      if (!softwareMatch(rs, reqs)) return false;
      return true;
    });

    let placed = false;
    outer: for (const day of DAYS) {
      for (const [start, end] of TIME_PAIRS) {
        const slotRooms = eligibleRooms.filter(r => !used.has(`${r.id}-${day}-${start}`));
        const room = bestFitRoom(slotRooms, group.students);
        if (!room) continue;

        assigned.push({
          group_id:     group.id,
          group_number: group.group_number,
          subject_name: group.subject_name,
          room_id:      room.id,
          room_name:    room.name,
          professor_id: null,
          day, start_time: start, end_time: end,
          is_confirmed: 0,
          warning: reportedRooms.has(room.id) ? 'Lab has open equipment reports' : null,
        });
        used.add(`${room.id}-${day}-${start}`);
        placed = true;
        break outer;
      }
    }
    if (!placed) unassigned.push(group);
  }

  const conflicts = findConflicts(assigned);
  return { assigned, unassigned, conflicts };
}
