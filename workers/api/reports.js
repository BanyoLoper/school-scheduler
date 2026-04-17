const VALID_STATUSES = ['pending', 'fixed', 'false-alarm', 'duplicate'];

export async function handleReports(request, { env, user, json, url }) {
  const { DB } = env;
  const method   = request.method;
  const path     = url.pathname;
  const segments = path.replace('/api/reports', '').split('/').filter(Boolean);
  const id       = segments[0] && segments[0] !== 'stats' ? Number(segments[0]) : null;

  // ── Stats (protected) ───────────────────────────────────────────
  if (method === 'GET' && path.endsWith('/stats')) {
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const [byRoom, byStatus, byTag, byMonth] = await Promise.all([
      DB.prepare(`SELECT r.name AS room_name, COUNT(*) AS total
                  FROM computer_reports cr JOIN rooms r ON r.id=cr.room_id
                  GROUP BY cr.room_id ORDER BY total DESC LIMIT 10`).all(),
      DB.prepare(`SELECT status, COUNT(*) AS total FROM computer_reports GROUP BY status`).all(),
      DB.prepare(`SELECT computer_tag, COUNT(*) AS total FROM computer_reports
                  GROUP BY computer_tag ORDER BY total DESC LIMIT 10`).all(),
      DB.prepare(`SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS total
                  FROM computer_reports
                  WHERE created_at >= date('now','-6 months')
                  GROUP BY month ORDER BY month`).all(),
    ]);
    return json({
      by_room:   byRoom.results,
      by_status: byStatus.results,
      by_tag:    byTag.results,
      by_month:  byMonth.results,
    });
  }

  // ── GET list ────────────────────────────────────────────────────
  if (method === 'GET' && !id) {
    const roomId = url.searchParams.get('room_id');
    const status = url.searchParams.get('status');
    let query  = 'SELECT cr.*, r.name AS room_name FROM computer_reports cr JOIN rooms r ON r.id=cr.room_id WHERE 1=1';
    const binds = [];
    if (roomId) { query += ' AND cr.room_id=?'; binds.push(roomId); }
    if (status) { query += ' AND cr.status=?';  binds.push(status); }
    query += ' ORDER BY cr.created_at DESC';
    const { results } = await DB.prepare(query).bind(...binds).all();
    return json(results);
  }

  // ── POST (public) ───────────────────────────────────────────────
  if (method === 'POST') {
    const { room_id, computer_tag, reported_by, description, photo_url } = await request.json();
    if (!room_id || !computer_tag || !reported_by || !description)
      return json({ error: 'room_id, computer_tag, reported_by, description required' }, 400);
    const row = await DB.prepare(
      'INSERT INTO computer_reports (room_id, computer_tag, reported_by, description, photo_url) VALUES (?,?,?,?,?) RETURNING *'
    ).bind(room_id, computer_tag, reported_by, description, photo_url ?? null).first();
    return json(row, 201);
  }

  // ── PUT status (protected) ──────────────────────────────────────
  if (method === 'PUT' && id) {
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { status } = await request.json();
    if (!VALID_STATUSES.includes(status)) return json({ error: 'Invalid status' }, 400);
    const resolved_at = status === 'fixed' ? new Date().toISOString() : null;
    await DB.prepare('UPDATE computer_reports SET status=?, resolved_at=? WHERE id=?')
      .bind(status, resolved_at, id).run();
    return json(await DB.prepare('SELECT * FROM computer_reports WHERE id=?').bind(id).first());
  }

  // ── DELETE (protected) ──────────────────────────────────────────
  if (method === 'DELETE' && id) {
    if (!user) return json({ error: 'Unauthorized' }, 401);
    await DB.prepare('DELETE FROM computer_reports WHERE id=?').bind(id).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, 405);
}
