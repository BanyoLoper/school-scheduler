export async function handleAvailability(request, { env, json, url }) {
  const { DB } = env;
  const method   = request.method;
  const segments = url.pathname.replace('/api/availability', '').split('/').filter(Boolean);
  const id       = segments[0] ? Number(segments[0]) : null;

  if (method === 'GET') {
    const professorId = url.searchParams.get('professor_id');
    if (!professorId) return json({ error: 'professor_id required' }, 400);
    const day = url.searchParams.get('day');
    let query  = 'SELECT * FROM availability WHERE professor_id=?';
    const binds = [professorId];
    if (day) { query += ' AND day=?'; binds.push(day); }
    query += ' ORDER BY day, start_time';
    const { results } = await DB.prepare(query).bind(...binds).all();
    return json(results);
  }

  if (method === 'POST') {
    const { professor_id, day, start_time, end_time } = await request.json();
    if (!professor_id || !day || !start_time || !end_time) {
      return json({ error: 'professor_id, day, start_time, end_time required' }, 400);
    }
    const overlap = await DB.prepare(
      'SELECT id FROM availability WHERE professor_id=? AND day=? AND start_time<? AND end_time>?'
    ).bind(professor_id, day, end_time, start_time).first();
    if (overlap) return json({ error: 'Overlapping availability slot' }, 409);

    const row = await DB.prepare(
      'INSERT INTO availability (professor_id, day, start_time, end_time) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(professor_id, day, start_time, end_time).first();
    return json(row, 201);
  }

  if (method === 'DELETE' && id) {
    await DB.prepare('DELETE FROM availability WHERE id=?').bind(id).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, 405);
}
