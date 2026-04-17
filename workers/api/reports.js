// POST is public. GET and PUT require auth (checked in index.js context).
export async function handleReports(request, { env, user, json, url }) {
  const { DB } = env;
  const method   = request.method;
  const segments = url.pathname.replace('/api/reports', '').split('/').filter(Boolean);
  const id       = segments[0] ? Number(segments[0]) : null;
  const action   = segments[1] ?? null;

  if (method === 'GET') {
    const roomId = url.searchParams.get('room_id');
    const status = url.searchParams.get('status');
    let query  = `SELECT cr.*, r.name AS room_name FROM computer_reports cr JOIN rooms r ON r.id=cr.room_id WHERE 1=1`;
    const binds = [];
    if (roomId) { query += ' AND cr.room_id=?'; binds.push(roomId); }
    if (status) { query += ' AND cr.status=?';  binds.push(status); }
    query += ' ORDER BY cr.created_at DESC';
    const { results } = await DB.prepare(query).bind(...binds).all();
    return json(results);
  }

  if (method === 'POST') {
    const { room_id, computer_tag, reported_by, description, photo_url } = await request.json();
    if (!room_id || !computer_tag || !reported_by || !description)
      return json({ error: 'room_id, computer_tag, reported_by, description required' }, 400);
    const row = await DB.prepare(
      'INSERT INTO computer_reports (room_id, computer_tag, reported_by, description, photo_url) VALUES (?, ?, ?, ?, ?) RETURNING *'
    ).bind(room_id, computer_tag, reported_by, description, photo_url ?? null).first();
    return json(row, 201);
  }

  if (method === 'PUT' && id && action === 'status') {
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { status } = await request.json();
    const resolved_at = status === 'resolved' ? new Date().toISOString() : null;
    await DB.prepare('UPDATE computer_reports SET status=?, resolved_at=? WHERE id=?')
      .bind(status, resolved_at, id).run();
    return json(await DB.prepare('SELECT * FROM computer_reports WHERE id=?').bind(id).first());
  }

  return json({ error: 'Method not allowed' }, 405);
}
