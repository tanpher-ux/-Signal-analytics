// Set VITE_API_URL in a .env file to point at your deployed backend, e.g.
// VITE_API_URL=https://signal-analytics-server.onrender.com/api
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const API_ORIGIN = BASE.replace(/\/api\/?$/, '');

export async function listSites() {
  const r = await fetch(`${BASE}/sites`);
  return r.json();
}

export async function createSite(name, domain) {
  const r = await fetch(`${BASE}/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, domain })
  });
  return r.json();
}

export async function deleteSite(id) {
  const r = await fetch(`${BASE}/sites/${id}`, { method: 'DELETE' });
  return r.json();
}

export async function getSummary(siteId, days = 7) {
  const r = await fetch(`${BASE}/sites/${siteId}/summary?days=${days}`);
  return r.json();
}
