export async function handleCareers(request, { env, user, json, url }) {
  const method = request.method;
  const segments = url.pathname.split('/').filter(Boolean); // ['api','careers',id?]
  const id = segments[2] ? parseInt(segments[2]) : null;

  if (method === 'GET') {
    if (user.role === 'admin') {
      const { results } = await env.DB.prepare(
        'SELECT id, name, description, code, total_semesters FROM careers ORDER BY name'
      ).all();
      return json(results);
    }
    // Coordinator: only assigned careers
    if (!user.career_ids.length) return json([]);
    const placeholders = user.career_ids.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id, name, description, code, total_semesters FROM careers WHERE id IN (${placeholders}) ORDER BY name`
    ).bind(...user.career_ids).all();
    return json(results);
  }

  if (user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

  if (method === 'POST') {
    const { name, description, code, total_semesters } = await request.json();
    if (!name) return json({ error: 'name is required' }, 400);
    const result = await env.DB.prepare(
      'INSERT INTO careers (name, description, code, total_semesters) VALUES (?,?,?,?) RETURNING id'
    ).bind(name, description ?? null, code ?? null, total_semesters ?? 9).first();
    return json({ id: result.id }, 201);
  }

  if (!id) return json({ error: 'Career id required' }, 400);

  if (method === 'PUT') {
    const { name, description, code, total_semesters } = await request.json();
    await env.DB.prepare(
      'UPDATE careers SET name=?, description=?, code=?, total_semesters=? WHERE id=?'
    ).bind(name, description ?? null, code ?? null, total_semesters ?? 9, id).run();
    return json({ ok: true });
  }

  if (method === 'DELETE') {
    await env.DB.prepare('DELETE FROM careers WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}
