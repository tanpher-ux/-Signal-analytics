const Database = require('better-sqlite3');
const path = require('path');

// DB_PATH lets you point at a persistent disk in production (e.g. Render disk
// mounted at /data). Falls back to a local file for development.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'analytics.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  type TEXT NOT NULL,          -- 'pageview'
  path TEXT,
  referrer TEXT,
  visitor_id TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  path TEXT,
  load_time_ms INTEGER,
  dom_content_loaded_ms INTEGER,
  first_paint_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_site ON events(site_id, created_at);
CREATE INDEX IF NOT EXISTS idx_perf_site ON performance_events(site_id, created_at);
`);

module.exports = db;
