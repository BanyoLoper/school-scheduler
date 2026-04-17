export async function handleProfessors(request, { env, user, json, url }) {
  const { DB } = env;
  const method   = request.method;
  const segments = url.pathname.replace('/api/professors', '').split('/').filter(Boolean);
  const id       = segments[0] ? Number(segments[0]) : null;

  if (method === 'GET' && !id) {
    const careerId = url.searchParams.get('career_id') ?? user.career_id;
    const { results } = await DB.prepare('SELECT * FROM professors WHERE career_id=? ORDER BY name').bind(careerId).all();
    return json(results);
  }

  if (method === 'GET' && id) {
    const prof = await DB.prepare('SELECT * FROM professors WHERE id=?').bind(id).first();
    if (!prof) return json({ error: 'Professor not found' }, 404);
    const { results: availability } = await DB.prepare(
      'SELECT * FROM availability WHERE professor_id=? ORDER BY day, start_time'
    ).bind(id).all();
    return json({ ...prof, availability });
  }

  if (method === 'POST') {
    const { name, career_id } = await request.json();
    if (!name || !career_id) return json({ error: 'name and career_id required' }, 400);
    const row = await DB.prepare('INSERT INTO professors (name, career_id) VALUES (?, ?) RETURNING *').bind(name, career_id).first();
    return json(row, 201);
  }

  if (method === 'PUT' && id) {
    const { name } = await request.json();
    await DB.prepare('UPDATE professors SET name=COALESCE(?,name) WHERE id=?').bind(name ?? null, id).run();
    return json(await DB.prepare('SELECT * FROM professors WHERE id=?').bind(id).first());
  }

  if (method === 'DELETE' && id) {
    await DB.prepare('DELETE FROM professors WHERE id=?').bind(id).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, 405);
}
