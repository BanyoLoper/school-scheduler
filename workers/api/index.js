import { handleRooms }        from './rooms.js';
import { handleSubjects }      from './subjects.js';
import { handleProfessors }    from './professors.js';
import { handleAvailability }  from './availability.js';
import { handleSchedule }      from './schedule.js';
import { handleNegotiations }  from './negotiations.js';
import { handleLabInventory }  from './lab-inventory.js';
import { handleReports }       from './reports.js';

const PUBLIC_PREFIXES = ['/api/availability', '/api/reports'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function withCors(response, origin) {
  const h = new Headers(response.headers);
  h.set('Access-Control-Allow-Origin', origin);
  h.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  h.set('Access-Control-Allow-Credentials', 'true');
  return new Response(response.body, { status: response.status, headers: h });
}

function parseJwt(request) {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) return null;
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    return {
      email:          payload.email,
      sub:            payload.sub,
      career_id:      payload.custom?.career_id      ?? null,
      coordinator_id: payload.custom?.coordinator_id ?? null,
    };
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const origin = request.headers.get('Origin') ?? env.ALLOWED_ORIGIN ?? '*';

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), origin);
    }

    const isPublic = PUBLIC_PREFIXES.some(p => path.startsWith(p));
    const user     = parseJwt(request);

    if (!isPublic && !user) {
      return withCors(json({ error: 'Unauthorized' }, 401), origin);
    }

    const ctx = { env, user, json, url };

    let response;
    if      (path.startsWith('/api/rooms'))        response = await handleRooms(request, ctx);
    else if (path.startsWith('/api/subjects') ||
             path.startsWith('/api/groups'))        response = await handleSubjects(request, ctx);
    else if (path.startsWith('/api/professors'))    response = await handleProfessors(request, ctx);
    else if (path.startsWith('/api/availability'))  response = await handleAvailability(request, ctx);
    else if (path.startsWith('/api/schedule'))      response = await handleSchedule(request, ctx);
    else if (path.startsWith('/api/negotiations'))  response = await handleNegotiations(request, ctx);
    else if (path.startsWith('/api/lab-inventory')) response = await handleLabInventory(request, ctx);
    else if (path.startsWith('/api/reports'))       response = await handleReports(request, ctx);
    else response = json({ error: 'Not found' }, 404);

    return withCors(response, origin);
  },
};
