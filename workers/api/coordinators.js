export async function handleCoordinators(request, { env, user, json, url }) {
  if (user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

  const method = request.method;
  const segments = url.pathname.split('/').filter(Boolean); // ['api','coordinators',id?,action?]
  const id     = segments[2] ? parseInt(segments[2]) : null;
  const action = segments[3] ?? null; // 'careers'

  // PUT /api/coordinators/:id/careers — replace career assignments
  if (method === 'PUT' && action === 'careers') {
    const { career_ids } = await request.json();
    if (!Array.isArray(career_ids)) return json({ error: 'career_ids must be an array' }, 400);
    await env.DB.prepare('DELETE FROM coordinator_careers WHERE coordinator_id=?').bind(id).run();
    for (const cid of career_ids) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO coordinator_careers (coordinator_id, career_id) VALUES (?,?)'
      ).bind(id, cid).run();
    }
    return json({ ok: true });
  }

  if (method === 'GET') {
    const { results: coordinators } = await env.DB.prepare(
      'SELECT id, name, email, role FROM coordinators ORDER BY name'
    ).all();
    const { results: assignments } = await env.DB.prepare(
      'SELECT coordinator_id, career_id FROM coordinator_careers'
    ).all();
    const careerMap = {};
    for (const a of assignments) {
      if (!careerMap[a.coordinator_id]) careerMap[a.coordinator_id] = [];
      careerMap[a.coordinator_id].push(a.career_id);
    }
    return json(coordinators.map(c => ({ ...c, career_ids: careerMap[c.id] ?? [] })));
  }

  if (method === 'POST') {
    const { name, email, role } = await request.json();
    if (!name || !email) return json({ error: 'name and email are required' }, 400);
    const result = await env.DB.prepare(
      "INSERT INTO coordinators (name, email, role) VALUES (?,?,?) RETURNING id"
    ).bind(name, email, role ?? 'coordinator').first();
    return json({ id: result.id }, 201);
  }

  if (!id) return json({ error: 'Coordinator id required' }, 400);

  if (method === 'PUT') {
    const { name, email, role } = await request.json();
    await env.DB.prepare(
      'UPDATE coordinators SET name=?, email=?, role=? WHERE id=?'
    ).bind(name, email, role ?? 'coordinator', id).run();
    return json({ ok: true });
  }

  if (method === 'DELETE') {
    await env.DB.prepare('DELETE FROM coordinators WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}
