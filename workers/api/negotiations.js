export async function handleNegotiations(request, { env, user, json, url }) {
  const { DB } = env;
  const method   = request.method;
  const segments = url.pathname.replace('/api/negotiations', '').split('/').filter(Boolean);
  const id       = segments[0] ? Number(segments[0]) : null;
  const action   = segments[1] ?? null;

  if (method === 'GET') {
    const { results } = await DB.prepare(`
      SELECT n.*,
        rc.name AS requester_name, tc.name AS target_name,
        rma.name AS room_a, rmb.name AS room_b,
        ra.day AS day_a, ra.start_time AS start_a, ra.end_time AS end_a,
        rb.day AS day_b, rb.start_time AS start_b, rb.end_time AS end_b
      FROM negotiations n
      JOIN coordinators rc  ON rc.id  = n.requester_id
      JOIN coordinators tc  ON tc.id  = n.target_id
      JOIN assignments  ra  ON ra.id  = n.assignment_a
      JOIN assignments  rb  ON rb.id  = n.assignment_b
      JOIN rooms        rma ON rma.id = ra.room_id
      JOIN rooms        rmb ON rmb.id = rb.room_id
      WHERE n.requester_id=? OR n.target_id=?
      ORDER BY n.created_at DESC
    `).bind(user.coordinator_id, user.coordinator_id).all();
    return json(results);
  }

  if (method === 'POST') {
    const { target_id, assignment_a, assignment_b } = await request.json();
    if (!target_id || !assignment_a || !assignment_b)
      return json({ error: 'target_id, assignment_a, assignment_b required' }, 400);
    const row = await DB.prepare(
      'INSERT INTO negotiations (requester_id, target_id, assignment_a, assignment_b) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(user.coordinator_id, target_id, assignment_a, assignment_b).first();
    return json(row, 201);
  }

  if (method === 'PUT' && id && (action === 'accept' || action === 'reject')) {
    const neg = await DB.prepare('SELECT * FROM negotiations WHERE id=?').bind(id).first();
    if (!neg) return json({ error: 'Not found' }, 404);
    if (neg.target_id !== user.coordinator_id) return json({ error: 'Forbidden' }, 403);
    if (neg.status !== 'pending') return json({ error: 'Already resolved' }, 409);

    if (action === 'accept') {
      const a = await DB.prepare('SELECT room_id FROM assignments WHERE id=?').bind(neg.assignment_a).first();
      const b = await DB.prepare('SELECT room_id FROM assignments WHERE id=?').bind(neg.assignment_b).first();
      await DB.prepare('UPDATE assignments SET room_id=? WHERE id=?').bind(b.room_id, neg.assignment_a).run();
      await DB.prepare('UPDATE assignments SET room_id=? WHERE id=?').bind(a.room_id, neg.assignment_b).run();
    }

    await DB.prepare('UPDATE negotiations SET status=? WHERE id=?')
      .bind(action === 'accept' ? 'accepted' : 'rejected', id).run();
    return json(await DB.prepare('SELECT * FROM negotiations WHERE id=?').bind(id).first());
  }

  return json({ error: 'Method not allowed' }, 405);
}
