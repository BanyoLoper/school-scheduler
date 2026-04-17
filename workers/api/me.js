export async function handleMe(request, { user, json }) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  return json(user);
}
