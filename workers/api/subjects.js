export async function handleSubjects(request, { env, user, json, url }) {
  const { DB } = env;
  const method   = request.method;
  const path     = url.pathname;
  const isGroups = path.startsWith('/api/groups');
  const segments = path.replace(isGroups ? '/api/groups' : '/api/subjects', '').split('/').filter(Boolean);
  const id       = segments[0] ? Number(segments[0]) : null;

  if (isGroups) {
    if (method === 'GET') {
      const careerId = url.searchParams.get('career_id');
      const semester = url.searchParams.get('semester');
      if (!careerId || !semester) return json({ error: 'career_id and semester required' }, 400);
      const { results } = await DB.prepare(
        'SELECT * FROM groups WHERE career_id = ? AND semester = ? ORDER BY group_number'
      ).bind(careerId, semester).all();
      return json(results);
    }
    if (method === 'POST') {
      const { career_id, semester, group_number, students, is_priority = 0 } = await request.json();
      if (!career_id || !semester || !group_number || !students)
        return json({ error: 'career_id, semester, group_number, students required' }, 400);
      const row = await DB.prepare(
        'INSERT INTO groups (career_id, semester, group_number, students, is_priority) VALUES (?, ?, ?, ?, ?) RETURNING *'
      ).bind(career_id, semester, group_number, students, is_priority).first();
      return json(row, 201);
    }
    if (method === 'PUT' && id) {
      const { group_number, students, is_priority } = await request.json();
      await DB.prepare(
        'UPDATE groups SET group_number=COALESCE(?,group_number), students=COALESCE(?,students), is_priority=COALESCE(?,is_priority) WHERE id=?'
      ).bind(group_number ?? null, students ?? null, is_priority ?? null, id).run();
      return json(await DB.prepare('SELECT * FROM groups WHERE id=?').bind(id).first());
    }
    if (method === 'DELETE' && id) {
      await DB.prepare('DELETE FROM groups WHERE id=?').bind(id).run();
      return new Response(null, { status: 204 });
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  if (method === 'GET' && !id) {
    const filterCareer = url.searchParams.get('career_id');
    const semester = url.searchParams.get('semester');
    let query, binds;
    if (filterCareer) {
      query = 'SELECT * FROM subjects WHERE career_id = ?';
      binds = [filterCareer];
    } else if (user.role === 'admin') {
      query = 'SELECT * FROM subjects WHERE 1=1';
      binds = [];
    } else {
      const ids = user.career_ids;
      if (!ids.length) return json([]);
      const ph = ids.map(() => '?').join(',');
      query = `SELECT * FROM subjects WHERE career_id IN (${ph})`;
      binds = [...ids];
    }
    if (semester) { query += ' AND semester = ?'; binds.push(semester); }
    query += ' ORDER BY semester, name';
    const { results } = await DB.prepare(query).bind(...binds).all();
    for (const s of results) {
      const { results: reqs } = await DB.prepare(
        `SELECT ssr.software_id, ssr.is_required, sw.name, sw.version, sw.category
         FROM subject_software_requirements ssr JOIN software sw ON sw.id=ssr.software_id
         WHERE ssr.subject_id=?`
      ).bind(s.id).all();
      s.software_requirements = reqs;
    }
    return json(results);
  }

  if (method === 'POST') {
    const { name, career_id, semester, needs_lab = 0, software_requirements = [] } = await request.json();
    if (!name || !career_id || !semester) return json({ error: 'name, career_id, semester required' }, 400);
    if (user.role !== 'admin' && !user.career_ids.includes(career_id))
      return json({ error: 'Forbidden: career not assigned' }, 403);
    const subject = await DB.prepare(
      'INSERT INTO subjects (name, career_id, semester, needs_lab) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(name, career_id, semester, needs_lab).first();
    for (const req of software_requirements) {
      await DB.prepare('INSERT INTO subject_software_requirements (subject_id, software_id, is_required) VALUES (?, ?, ?)')
        .bind(subject.id, req.software_id, req.is_required ?? 1).run();
    }
    return json(subject, 201);
  }

  if (method === 'PUT' && id) {
    const { name, semester, needs_lab, software_requirements } = await request.json();
    await DB.prepare('UPDATE subjects SET name=COALESCE(?,name), semester=COALESCE(?,semester), needs_lab=COALESCE(?,needs_lab) WHERE id=?')
      .bind(name ?? null, semester ?? null, needs_lab ?? null, id).run();
    if (software_requirements !== undefined) {
      await DB.prepare('DELETE FROM subject_software_requirements WHERE subject_id=?').bind(id).run();
      for (const req of software_requirements) {
        await DB.prepare('INSERT INTO subject_software_requirements (subject_id, software_id, is_required) VALUES (?, ?, ?)')
          .bind(id, req.software_id, req.is_required ?? 1).run();
      }
    }
    return json(await DB.prepare('SELECT * FROM subjects WHERE id=?').bind(id).first());
  }

  if (method === 'DELETE' && id) {
    await DB.prepare('DELETE FROM subjects WHERE id=?').bind(id).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, 405);
}
