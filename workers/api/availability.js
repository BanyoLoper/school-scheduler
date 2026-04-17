export async function handleAvailability(request, { env, user, json, url }) {
  const { DB } = env;
  const method = request.method;
  const path   = url.pathname; // e.g. /api/availability, /api/availability/professors

  // ── Public: submit availability form (name + slots + subjects) ──
  if (method === 'POST' && path.endsWith('/submit')) {
    const { name, slots, subject_ids } = await request.json();
    if (!name?.trim() || !Array.isArray(slots) || !Array.isArray(subject_ids))
      return json({ error: 'name, slots y subject_ids son requeridos' }, 400);

    // Derive career_id from the first subject provided
    let careerId = null;
    if (subject_ids.length > 0) {
      const subj = await DB.prepare(
        'SELECT career_id FROM subjects WHERE id = ?'
      ).bind(subject_ids[0]).first();
      careerId = subj?.career_id ?? null;
    }

    let professor = await DB.prepare(
      'SELECT id, career_id FROM professors WHERE LOWER(name) = LOWER(?)'
    ).bind(name.trim()).first();

    if (!professor) {
      professor = await DB.prepare(
        'INSERT INTO professors (name, career_id) VALUES (?, ?) RETURNING id'
      ).bind(name.trim(), careerId).first();
    } else if (careerId && !professor.career_id) {
      await DB.prepare('UPDATE professors SET career_id = ? WHERE id = ?')
        .bind(careerId, professor.id).run();
    }

    const pid = professor.id;
    await DB.prepare('DELETE FROM availability WHERE professor_id=?').bind(pid).run();
    for (const s of slots) {
      await DB.prepare(
        'INSERT INTO availability (professor_id, day, start_time, end_time) VALUES (?,?,?,?)'
      ).bind(pid, s.day, s.start_time, s.end_time).run();
    }

    await DB.prepare('DELETE FROM professor_subjects WHERE professor_id=?').bind(pid).run();
    for (const sid of subject_ids) {
      await DB.prepare('INSERT OR IGNORE INTO professor_subjects (professor_id, subject_id) VALUES (?,?)')
        .bind(pid, sid).run();
    }

    return json({ ok: true, professor_id: pid, slots: slots.length, subjects: subject_ids.length });
  }

  // ── Protected: subjects with no professor coverage ────────────
  if (method === 'GET' && path.endsWith('/pending-subjects')) {
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { results } = await DB.prepare(
      `SELECT s.id, s.name, s.semester, c.name AS career_name, c.id AS career_id
       FROM subjects s
       JOIN careers c ON c.id = s.career_id
       WHERE s.id NOT IN (SELECT subject_id FROM professor_subjects)
       ORDER BY c.name, s.semester, s.name`
    ).all();
    return json(results);
  }

  // ── Protected: professors overview ────────────────────────────
  if (method === 'GET' && path.endsWith('/professors-overview')) {
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { results } = await DB.prepare(
      `SELECT p.id, p.name,
         COUNT(DISTINCT a.id)          AS slot_count,
         COUNT(DISTINCT ps.subject_id) AS subject_count
       FROM professors p
       LEFT JOIN availability       a  ON a.professor_id  = p.id
       LEFT JOIN professor_subjects ps ON ps.professor_id = p.id
       GROUP BY p.id
       ORDER BY p.name`
    ).all();
    return json(results);
  }

  // ── Public: search professors by name ─────────────────────────
  if (method === 'GET' && path.endsWith('/professors')) {
    const q = url.searchParams.get('q') ?? '';
    const { results } = await DB.prepare(
      "SELECT id, name FROM professors WHERE name LIKE ? ORDER BY name LIMIT 20"
    ).bind(`%${q}%`).all();
    return json(results);
  }

  // ── Public: list all subjects (for professor subject preferences) ──
  if (method === 'GET' && path.endsWith('/subjects')) {
    const q = url.searchParams.get('q') ?? '';
    const { results } = await DB.prepare(
      `SELECT s.id, s.name, s.semester, c.name AS career_name
       FROM subjects s JOIN careers c ON c.id = s.career_id
       WHERE s.name LIKE ? ORDER BY c.name, s.semester, s.name LIMIT 30`
    ).bind(`%${q}%`).all();
    return json(results);
  }

  // ── Public: get professor's subject preferences ────────────────
  if (method === 'GET' && path.endsWith('/professor-subjects')) {
    const professorId = url.searchParams.get('professor_id');
    if (!professorId) return json({ error: 'professor_id required' }, 400);
    const { results } = await DB.prepare(
      `SELECT ps.subject_id, s.name, s.semester, c.name AS career_name
       FROM professor_subjects ps
       JOIN subjects s ON s.id = ps.subject_id
       JOIN careers  c ON c.id = s.career_id
       WHERE ps.professor_id = ?`
    ).bind(professorId).all();
    return json(results);
  }

  // ── Public: replace professor's subject preferences ────────────
  if (method === 'PUT' && path.endsWith('/professor-subjects')) {
    const { professor_id, subject_ids } = await request.json();
    if (!professor_id || !Array.isArray(subject_ids))
      return json({ error: 'professor_id and subject_ids required' }, 400);
    await DB.prepare('DELETE FROM professor_subjects WHERE professor_id=?').bind(professor_id).run();
    for (const sid of subject_ids) {
      await DB.prepare('INSERT OR IGNORE INTO professor_subjects (professor_id, subject_id) VALUES (?,?)')
        .bind(professor_id, sid).run();
    }
    return json({ ok: true });
  }

  // ── GET availability slots ─────────────────────────────────────
  if (method === 'GET') {
    const professorId = url.searchParams.get('professor_id');
    if (!professorId) return json({ error: 'professor_id required' }, 400);
    const { results } = await DB.prepare(
      'SELECT * FROM availability WHERE professor_id=? ORDER BY day, start_time'
    ).bind(professorId).all();
    return json(results);
  }

  // ── PUT: replace all slots for a professor ─────────────────────
  if (method === 'PUT') {
    const { professor_id, slots } = await request.json();
    if (!professor_id || !Array.isArray(slots))
      return json({ error: 'professor_id and slots required' }, 400);
    await DB.prepare('DELETE FROM availability WHERE professor_id=?').bind(professor_id).run();
    for (const s of slots) {
      await DB.prepare(
        'INSERT INTO availability (professor_id, day, start_time, end_time) VALUES (?,?,?,?)'
      ).bind(professor_id, s.day, s.start_time, s.end_time).run();
    }
    return json({ ok: true, count: slots.length });
  }

  // ── POST: add single slot (legacy) ────────────────────────────
  if (method === 'POST') {
    const { professor_id, day, start_time, end_time } = await request.json();
    if (!professor_id || !day || !start_time || !end_time)
      return json({ error: 'professor_id, day, start_time, end_time required' }, 400);
    const row = await DB.prepare(
      'INSERT INTO availability (professor_id, day, start_time, end_time) VALUES (?,?,?,?) RETURNING *'
    ).bind(professor_id, day, start_time, end_time).first();
    return json(row, 201);
  }

  // ── DELETE single slot ─────────────────────────────────────────
  const segments = path.replace('/api/availability', '').split('/').filter(Boolean);
  const id = segments[0] ? Number(segments[0]) : null;
  if (method === 'DELETE' && id) {
    await DB.prepare('DELETE FROM availability WHERE id=?').bind(id).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, 405);
}
