export async function handleLabInventory(request, { env, json, url }) {
  const { DB } = env;
  const method   = request.method;
  const segments = url.pathname.replace('/api/lab-inventory', '').split('/').filter(Boolean);
  const id       = segments[0] ? Number(segments[0]) : null;

  // GET /api/lab-inventory?room_id=X — software installed in a lab
  if (method === 'GET' && !id) {
    const roomId = url.searchParams.get('room_id');
    if (!roomId) {
      // Return all software catalog
      const { results } = await DB.prepare('SELECT * FROM software ORDER BY category, name, version').all();
      return json(results);
    }
    const { results } = await DB.prepare(`
      SELECT rs.id, rs.installed_count, rs.notes,
             s.id AS software_id, s.name, s.version, s.category, s.license_type
      FROM room_software rs JOIN software s ON s.id = rs.software_id
      WHERE rs.room_id=? ORDER BY s.category, s.name
    `).bind(roomId).all();
    return json(results);
  }

  // POST /api/lab-inventory — add software entry to a lab
  if (method === 'POST') {
    const { room_id, software_id, installed_count, notes } = await request.json();
    if (!room_id || !software_id) return json({ error: 'room_id and software_id required' }, 400);
    const row = await DB.prepare(
      'INSERT INTO room_software (room_id, software_id, installed_count, notes) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(room_id, software_id, installed_count ?? 0, notes ?? null).first();
    return json(row, 201);
  }

  // PUT /api/lab-inventory/:id
  if (method === 'PUT' && id) {
    const { installed_count, notes } = await request.json();
    await DB.prepare(
      'UPDATE room_software SET installed_count=COALESCE(?,installed_count), notes=COALESCE(?,notes) WHERE id=?'
    ).bind(installed_count ?? null, notes ?? null, id).run();
    return json(await DB.prepare('SELECT * FROM room_software WHERE id=?').bind(id).first());
  }

  // DELETE /api/lab-inventory/:id
  if (method === 'DELETE' && id) {
    await DB.prepare('DELETE FROM room_software WHERE id=?').bind(id).run();
    return new Response(null, { status: 204 });
  }

  // POST /api/lab-inventory/software — create new software entry in catalog
  if (method === 'POST' && segments[0] === 'software') {
    const { name, version, category, license_type = 'free' } = await request.json();
    if (!name || !version || !category) return json({ error: 'name, version, category required' }, 400);
    const row = await DB.prepare(
      'INSERT INTO software (name, version, category, license_type) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(name, version, category, license_type).first();
    return json(row, 201);
  }

  return json({ error: 'Method not allowed' }, 405);
}
