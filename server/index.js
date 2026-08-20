const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const db = require('./db');

const app = express();

// The /api/collect endpoint needs to accept requests from ANY site running the
// tracker snippet, so it stays open. Everything else could be tightened to
// your dashboard's origin via DASHBOARD_ORIGIN if you want stricter CORS later.
app.use(cors());
app.use(express.json());
app.use('/tracker.js', express.static(__dirname + '/public/tracker.js'));

// ---------- SITES ----------

app.post('/api/sites', (req, res) => {
  const { name, domain } = req.body;
  if (!name || !domain) return res.status(400).json({ error: 'name and domain required' });
  const id = nanoid(10);
  db.prepare('INSERT INTO sites (id, name, domain) VALUES (?, ?, ?)').run(id, name, domain);
  res.json({ id, name, domain });
});

app.get('/api/sites', (req, res) => {
  const sites = db.prepare('SELECT * FROM sites ORDER BY created_at DESC').all();
  res.json(sites);
});

app.delete('/api/sites/:id', (req, res) => {
  db.prepare('DELETE FROM sites WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM events WHERE site_id = ?').run(req.params.id);
  db.prepare('DELETE FROM performance_events WHERE site_id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- TRACKING INGEST (called by the snippet on tracked sites) ----------

app.post('/api/collect', (req, res) => {
  const { siteId, type, path: pagePath, referrer, visitorId, perf } = req.body;
  if (!siteId || !type) return res.status(400).json({ error: 'siteId and type required' });

  const site = db.prepare('SELECT id FROM sites WHERE id = ?').get(siteId);
  if (!site) return res.status(404).json({ error: 'unknown siteId' });

  const ua = req.headers['user-agent'] || '';

  if (type === 'pageview') {
    db.prepare(`INSERT INTO events (site_id, type, path, referrer, visitor_id, user_agent)
                VALUES (?, 'pageview', ?, ?, ?, ?)`)
      .run(siteId, pagePath || '/', referrer || '', visitorId || '', ua);
  }

  if (perf) {
    db.prepare(`INSERT INTO performance_events (site_id, path, load_time_ms, dom_content_loaded_ms, first_paint_ms)
                VALUES (?, ?, ?, ?, ?)`)
      .run(siteId, pagePath || '/', perf.loadTime || null, perf.domContentLoaded || null, perf.firstPaint || null);
  }

  res.json({ ok: true });
});

// ---------- ANALYTICS QUERIES ----------

app.get('/api/sites/:id/summary', (req, res) => {
  const siteId = req.params.id;
  const days = parseInt(req.query.days) || 7;

  const totalViews = db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE site_id = ? AND type='pageview' AND created_at >= datetime('now', ?)`
  ).get(siteId, `-${days} days`).c;

  const uniqueVisitors = db.prepare(
    `SELECT COUNT(DISTINCT visitor_id) as c FROM events WHERE site_id = ? AND type='pageview' AND created_at >= datetime('now', ?)`
  ).get(siteId, `-${days} days`).c;

  const byDay = db.prepare(
    `SELECT date(created_at) as day, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
     FROM events WHERE site_id = ? AND type='pageview' AND created_at >= datetime('now', ?)
     GROUP BY day ORDER BY day ASC`
  ).all(siteId, `-${days} days`);

  const topPages = db.prepare(
    `SELECT path, COUNT(*) as views FROM events WHERE site_id = ? AND type='pageview' AND created_at >= datetime('now', ?)
     GROUP BY path ORDER BY views DESC LIMIT 10`
  ).all(siteId, `-${days} days`);

  const topReferrers = db.prepare(
    `SELECT CASE WHEN referrer = '' THEN 'Direct' ELSE referrer END as referrer, COUNT(*) as views
     FROM events WHERE site_id = ? AND type='pageview' AND created_at >= datetime('now', ?)
     GROUP BY referrer ORDER BY views DESC LIMIT 10`
  ).all(siteId, `-${days} days`);

  const perf = db.prepare(
    `SELECT AVG(load_time_ms) as avgLoad, AVG(dom_content_loaded_ms) as avgDom, AVG(first_paint_ms) as avgPaint,
            MIN(load_time_ms) as minLoad, MAX(load_time_ms) as maxLoad
     FROM performance_events WHERE site_id = ? AND created_at >= datetime('now', ?)`
  ).get(siteId, `-${days} days`);

  const perfByPage = db.prepare(
    `SELECT path, AVG(load_time_ms) as avgLoad, COUNT(*) as samples
     FROM performance_events WHERE site_id = ? AND created_at >= datetime('now', ?)
     GROUP BY path ORDER BY avgLoad DESC LIMIT 10`
  ).all(siteId, `-${days} days`);

  res.json({
    totalViews,
    uniqueVisitors,
    byDay,
    topPages,
    topReferrers,
    performance: perf,
    performanceByPage: perfByPage
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Analytics server running on http://localhost:${PORT}`));
