import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { listSites, createSite, deleteSite, getSummary, API_ORIGIN } from './api';
import './dashboard.css';

const RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function AddSiteForm({ onAdd }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [open, setOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !domain) return;
    await onAdd(name, domain);
    setName(''); setDomain(''); setOpen(false);
  };

  if (!open) {
    return <button className="btn-add" onClick={() => setOpen(true)}>+ Add site</button>;
  }

  return (
    <form className="add-site-form" onSubmit={submit}>
      <input placeholder="Site name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <input placeholder="domain.com" value={domain} onChange={e => setDomain(e.target.value)} />
      <div className="add-site-actions">
        <button type="submit" className="btn-primary">Create</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

function EmbedSnippet({ siteId }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${API_ORIGIN}/tracker.js" data-site-id="${siteId}"></script>`;

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="panel embed-panel">
      <div className="panel-header">
        <h3>Install tracking</h3>
        <span className="panel-sub">Paste this before &lt;/body&gt; on every page you want tracked</span>
      </div>
      <div className="code-block">
        <code>{snippet}</code>
        <button className="btn-copy" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  );
}

function PerformanceSection({ perf, byPage }) {
  const rating = (ms) => {
    if (ms == null) return { label: 'No data', cls: 'neutral' };
    if (ms < 1000) return { label: 'Fast', cls: 'good' };
    if (ms < 2500) return { label: 'Moderate', cls: 'warn' };
    return { label: 'Slow', cls: 'bad' };
  };
  const loadRating = rating(perf?.avgLoad);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Performance</h3>
        <span className={`badge badge-${loadRating.cls}`}>{loadRating.label}</span>
      </div>
      <div className="perf-grid">
        <Stat label="Avg load" value={perf?.avgLoad ? `${Math.round(perf.avgLoad)}ms` : '—'} />
        <Stat label="Avg DOM ready" value={perf?.avgDom ? `${Math.round(perf.avgDom)}ms` : '—'} />
        <Stat label="Avg first paint" value={perf?.avgPaint ? `${Math.round(perf.avgPaint)}ms` : '—'} />
        <Stat label="Range" value={perf?.minLoad ? `${Math.round(perf.minLoad)}–${Math.round(perf.maxLoad)}ms` : '—'} />
      </div>
      {byPage?.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Path</th><th>Avg load</th><th>Samples</th></tr></thead>
          <tbody>
            {byPage.map(p => (
              <tr key={p.path}>
                <td>{p.path}</td>
                <td className="mono">{Math.round(p.avgLoad)}ms</td>
                <td className="mono">{p.samples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SeoStub() {
  return (
    <div className="panel seo-stub">
      <div className="panel-header">
        <h3>SEO</h3>
        <span className="badge badge-neutral">Not connected</span>
      </div>
      <p className="stub-text">
        Keyword rankings, backlinks, and search visibility need a connection to a search
        data source (e.g. Google Search Console). Once connected, ranking trends and
        top queries will appear here.
      </p>
      <button className="btn-ghost" disabled>Connect Search Console (coming soon)</button>
    </div>
  );
}

function Dashboard({ site, onDelete }) {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getSummary(site.id, days);
    setSummary(data);
    setLoading(false);
  }, [site.id, days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="dashboard">
      <div className="dashboard-top">
        <div>
          <h1>{site.name}</h1>
          <span className="domain">{site.domain}</span>
        </div>
        <div className="top-actions">
          <div className="range-toggle">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r.days}
                className={days === r.days ? 'active' : ''}
                onClick={() => setDays(r.days)}
              >{r.label}</button>
            ))}
          </div>
          <button className="btn-ghost danger" onClick={() => onDelete(site.id)}>Delete site</button>
        </div>
      </div>

      {loading && <div className="loading">Loading analytics…</div>}

      {!loading && summary && (
        <>
          <div className="stat-row">
            <Stat label="Pageviews" value={summary.totalViews} />
            <Stat label="Unique visitors" value={summary.uniqueVisitors} />
            <Stat label="Top page" value={summary.topPages[0]?.path || '—'} />
            <Stat label="Avg load time" value={summary.performance?.avgLoad ? `${Math.round(summary.performance.avgLoad)}ms` : '—'} />
          </div>

          <div className="panel">
            <div className="panel-header"><h3>Traffic</h3></div>
            {summary.byDay.length === 0 ? (
              <div className="empty">No pageviews yet in this range. Install the tracking snippet below to start collecting data.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={summary.byDay}>
                  <CartesianGrid stroke="#2a2f3b" vertical={false} />
                  <XAxis dataKey="day" stroke="#8b93a3" fontSize={12} />
                  <YAxis stroke="#8b93a3" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#1a1e27', border: '1px solid #2a2f3b', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="views" stroke="#f0a339" strokeWidth={2} dot={false} name="Views" />
                  <Line type="monotone" dataKey="visitors" stroke="#4fd1a5" strokeWidth={2} dot={false} name="Visitors" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="two-col">
            <div className="panel">
              <div className="panel-header"><h3>Top pages</h3></div>
              {summary.topPages.length === 0 ? <div className="empty">No data yet</div> : (
                <table className="data-table">
                  <thead><tr><th>Path</th><th>Views</th></tr></thead>
                  <tbody>
                    {summary.topPages.map(p => (
                      <tr key={p.path}><td>{p.path}</td><td className="mono">{p.views}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="panel">
              <div className="panel-header"><h3>Top referrers</h3></div>
              {summary.topReferrers.length === 0 ? <div className="empty">No data yet</div> : (
                <table className="data-table">
                  <thead><tr><th>Source</th><th>Views</th></tr></thead>
                  <tbody>
                    {summary.topReferrers.map(r => (
                      <tr key={r.referrer}><td>{r.referrer}</td><td className="mono">{r.views}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <PerformanceSection perf={summary.performance} byPage={summary.performanceByPage} />
          <SeoStub />
          <EmbedSnippet siteId={site.id} />
        </>
      )}
    </div>
  );
}

export default function App() {
  const [sites, setSites] = useState([]);
  const [selected, setSelected] = useState(null);

  const loadSites = async () => {
    const data = await listSites();
    setSites(data);
    if (!selected && data.length > 0) setSelected(data[0]);
  };

  useEffect(() => { loadSites(); }, []);

  const handleAdd = async (name, domain) => {
    const site = await createSite(name, domain);
    await loadSites();
    setSelected(site);
  };

  const handleDelete = async (id) => {
    await deleteSite(id);
    const remaining = sites.filter(s => s.id !== id);
    setSites(remaining);
    setSelected(remaining[0] || null);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <span>Signal</span>
        </div>
        <div className="site-list">
          {sites.map(s => (
            <button
              key={s.id}
              className={`site-item ${selected?.id === s.id ? 'active' : ''}`}
              onClick={() => setSelected(s)}
            >
              <span className="site-dot" />
              <div>
                <div className="site-name">{s.name}</div>
                <div className="site-domain">{s.domain}</div>
              </div>
            </button>
          ))}
        </div>
        <AddSiteForm onAdd={handleAdd} />
      </aside>
      <main className="main">
        {selected ? (
          <Dashboard site={selected} onDelete={handleDelete} />
        ) : (
          <div className="empty-state">
            <h2>No sites yet</h2>
            <p>Add a website to start seeing traffic, performance, and SEO analysis.</p>
          </div>
        )}
      </main>
    </div>
  );
}
