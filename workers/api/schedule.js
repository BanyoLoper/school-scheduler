export async function handleSchedule(request, { env, user, json, url }) {
  const { DB } = env;
  const method   = request.method;
  const segments = url.pathname.replace('/api/schedule', '').split('/').filter(Boolean);
  const id       = segments[0] && segments[0] !== 'context' ? Number(segments[0]) : null;

  // ── Bulk context fetch (cached on client) ───────────────────────
  if (method === 'GET' && segments[0] === 'context') {
    const [
      { results: careers },
      { results: groups },
      { results: subjects },
      { results: profRows },
      { results: profSubjects },
      { results: availability },
      { results: rooms },
    ] = await Promise.all([
      DB.prepare('SELECT id, name, total_semesters FROM careers ORDER BY name').all(),
      DB.prepare('SELECT id, career_id, semester, group_number, students, is_priority FROM groups ORDER BY career_id, semester, group_number').all(),
      DB.prepare('SELECT id, name, career_id, semester, needs_lab FROM subjects ORDER BY career_id, semester, name').all(),
      DB.prepare('SELECT id, name FROM professors ORDER BY name').all(),
      DB.prepare('SELECT professor_id, subject_id FROM professor_subjects').all(),
      DB.prepare('SELECT professor_id, day, start_time, end_time FROM availability').all(),
      DB.prepare('SELECT id, name, type, capacity FROM rooms WHERE is_blocked=0 ORDER BY name').all(),
    ]);

    const profMap = Object.fromEntries(profRows.map(p => [p.id, { ...p, subject_ids: [], availability: [] }]));
    for (const ps of profSubjects) profMap[ps.professor_id]?.subject_ids.push(ps.subject_id);
    for (const a of availability)  profMap[a.professor_id]?.availability.push({ day: a.day, start_time: a.start_time, end_time: a.end_time });

    return json({ careers, groups, subjects, professors: Object.values(profMap), rooms });
  }

  if (method === 'GET') {
    const filterCareer = url.searchParams.get('career_id');
    const semester = url.searchParams.get('semester');
    const base = `
      SELECT a.*, r.name AS room_name, r.type AS room_type,
             p.name AS professor_name,
             g.group_number, g.students, g.is_priority,
             s.name AS subject_name, s.semester
      FROM assignments a
      JOIN groups   g ON g.id = a.group_id
      JOIN subjects s ON s.id = a.subject_id
      JOIN rooms    r ON r.id = a.room_id
      LEFT JOIN professors p ON p.id = a.professor_id`;
    let query, binds;
    if (filterCareer) {
      query = `${base} WHERE g.career_id = ?`;
      binds = [filterCareer];
    } else if (user.role === 'admin') {
      query = `${base} WHERE 1=1`;
      binds = [];
    } else {
      const ids = user.career_ids;
      if (!ids.length) return json([]);
      const ph = ids.map(() => '?').join(',');
      query = `${base} WHERE g.career_id IN (${ph})`;
      binds = [...ids];
    }
    if (semester) { query += ' AND g.semester=?'; binds.push(semester); }
    query += ' ORDER BY a.day, a.start_time';
    const { results } = await DB.prepare(query).bind(...binds).all();
    return json(results);
  }

  if (method === 'POST') {
    const { group_id, subject_id, room_id, professor_id, day, start_time, end_time } = await request.json();
    if (!group_id || !subject_id || !room_id || !day || !start_time || !end_time)
      return json({ error: 'group_id, subject_id, room_id, day, start_time, end_time required' }, 400);
    const conflict = await DB.prepare(
      'SELECT id FROM assignments WHERE room_id=? AND day=? AND start_time<? AND end_time>?'
    ).bind(room_id, day, end_time, start_time).first();
    if (conflict) return json({ error: 'Room already booked', conflict_id: conflict.id }, 409);
    const row = await DB.prepare(
      'INSERT INTO assignments (group_id, subject_id, room_id, professor_id, day, start_time, end_time) VALUES (?,?,?,?,?,?,?) RETURNING *'
    ).bind(group_id, subject_id, room_id, professor_id ?? null, day, start_time, end_time).first();
    return json(row, 201);
  }

  if (method === 'PUT' && id) {
    const { room_id, professor_id, day, start_time, end_time, is_confirmed } = await request.json();
    await DB.prepare(
      'UPDATE assignments SET room_id=COALESCE(?,room_id), professor_id=COALESCE(?,professor_id), day=COALESCE(?,day), start_time=COALESCE(?,start_time), end_time=COALESCE(?,end_time), is_confirmed=COALESCE(?,is_confirmed) WHERE id=?'
    ).bind(room_id ?? null, professor_id ?? null, day ?? null, start_time ?? null, end_time ?? null, is_confirmed ?? null, id).run();
    return json(await DB.prepare('SELECT * FROM assignments WHERE id=?').bind(id).first());
  }

  if (method === 'DELETE' && id) {
    await DB.prepare('DELETE FROM assignments WHERE id=?').bind(id).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, 405);
}
