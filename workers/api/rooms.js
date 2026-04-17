export async function handleRooms(request, { env, json, url }) {
  const { DB } = env;
  const method   = request.method;
  const segments = url.pathname.replace('/api/rooms', '').split('/').filter(Boolean);
  const id       = segments[0] ? Number(segments[0]) : null;

  if (method === 'GET' && !id) {
    const type    = url.searchParams.get('type');
    const blocked = url.searchParams.get('blocked');
    let query  = `SELECT r.*, e.has_board, e.has_computers, e.total_computers, e.computer_tier
                  FROM rooms r LEFT JOIN room_equipment e ON e.room_id = r.id WHERE 1=1`;
    const binds = [];
    if (type)           { query += ' AND r.type = ?';       binds.push(type); }
    if (blocked !== null) { query += ' AND r.is_blocked = ?'; binds.push(Number(blocked)); }
    query += ' ORDER BY r.name';
    const { results } = await DB.prepare(query).bind(...binds).all();
    return json(results);
  }

  if (method === 'GET' && id) {
    const room = await DB.prepare(
      `SELECT r.*, e.has_board, e.has_computers, e.total_computers, e.computer_tier
       FROM rooms r LEFT JOIN room_equipment e ON e.room_id = r.id WHERE r.id = ?`
    ).bind(id).first();
    if (!room) return json({ error: 'Room not found' }, 404);

    const { results: software } = await DB.prepare(
      `SELECT rs.id, rs.installed_count, rs.notes, s.name, s.version, s.category, s.license_type
       FROM room_software rs JOIN software s ON s.id = rs.software_id WHERE rs.room_id = ?`
    ).bind(id).all();

    const { results: open_reports } = await DB.prepare(
      `SELECT id, computer_tag, status, created_at FROM computer_reports
       WHERE room_id = ? AND status != 'resolved'`
    ).bind(id).all();

    return json({ ...room, software, open_reports });
  }

  if (method === 'POST') {
    const { name, type, capacity, equipment = {} } = await request.json();
    if (!name || !type || !capacity) return json({ error: 'name, type, capacity required' }, 400);
    const room = await DB.prepare(
      'INSERT INTO rooms (name, type, capacity) VALUES (?, ?, ?) RETURNING *'
    ).bind(name, type, capacity).first();
    await DB.prepare(
      'INSERT INTO room_equipment (room_id, has_board, has_computers, total_computers, computer_tier) VALUES (?, ?, ?, ?, ?)'
    ).bind(room.id, equipment.has_board ?? 1, equipment.has_computers ?? 0, equipment.total_computers ?? 0, equipment.computer_tier ?? 'none').run();
    return json(room, 201);
  }

  if (method === 'PUT' && id) {
    const { name, type, capacity, is_blocked, equipment = {} } = await request.json();
    await DB.prepare(
      'UPDATE rooms SET name=COALESCE(?,name), type=COALESCE(?,type), capacity=COALESCE(?,capacity), is_blocked=COALESCE(?,is_blocked) WHERE id=?'
    ).bind(name ?? null, type ?? null, capacity ?? null, is_blocked ?? null, id).run();
    if (Object.keys(equipment).length) {
      await DB.prepare(
        'UPDATE room_equipment SET has_board=COALESCE(?,has_board), has_computers=COALESCE(?,has_computers), total_computers=COALESCE(?,total_computers), computer_tier=COALESCE(?,computer_tier) WHERE room_id=?'
      ).bind(equipment.has_board ?? null, equipment.has_computers ?? null, equipment.total_computers ?? null, equipment.computer_tier ?? null, id).run();
    }
    const updated = await DB.prepare(
      'SELECT r.*, e.has_board, e.has_computers, e.total_computers, e.computer_tier FROM rooms r LEFT JOIN room_equipment e ON e.room_id=r.id WHERE r.id=?'
    ).bind(id).first();
    return json(updated);
  }

  if (method === 'DELETE' && id) {
    await DB.prepare('DELETE FROM rooms WHERE id = ?').bind(id).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, 405);
}
