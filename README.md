# Signal — Website Analytics Dashboard

Self-hosted analytics: tracking snippet + Node/Express/SQLite backend + React dashboard.

## Run it locally

**1. Backend**
```bash
cd server
npm install
node index.js
```
Runs on http://localhost:4000, creates `analytics.db` automatically.

**2. Dashboard**
```bash
cd client
npm install
npm run dev
```
Runs on http://localhost:5173.

**3. Add a site** in the dashboard, copy the tracking snippet it shows you, paste it
into the site you want to track, right before `</body>`.

---

## Deploy the backend (so it can track a real live website)

Localhost only works if the tracked site is also on your machine. To track a real,
public website, deploy the backend somewhere reachable from the internet.

### Deploy to Render (recommended, free tier)

1. **Push this project to a GitHub repo** (the whole folder, or just `server/` — either works with the config below).
2. Go to [render.com](https://render.com) and sign up (GitHub login is fastest).
3. Click **New → Blueprint**, connect your repo. Render will detect `render.yaml`
   in this project and set up the web service + a 1GB persistent disk for the
   database automatically.
4. Deploy. You'll get a URL like `https://signal-analytics-server.onrender.com`.
5. **Update your dashboard** to point at it: in `client/`, copy `.env.example` to
   `.env` and set `VITE_API_URL` to your Render URL + `/api`, e.g.
   ```
   VITE_API_URL=https://signal-analytics-server.onrender.com/api
   ```
   Restart `npm run dev` (or rebuild for production) after adding this.
6. **Update the tracking snippet** on your live site — the dashboard will now
   generate it with your deployed URL automatically once `VITE_API_URL` is set.
   Paste the new snippet into your live site's HTML before `</body>`.

Note: Render's free tier spins down after inactivity, so the first request after
idle time takes ~30s to wake up. Fine for personal use, not for high-traffic sites.

### Deploy the dashboard itself (optional)

The dashboard is a static React build — deploy it anywhere static (Render Static
Site, Vercel, Netlify). Build with `npm run build` in `client/`, the output is in
`client/dist/`. Make sure `VITE_API_URL` is set at build time.

---

## What's included
- **Traffic**: pageviews, unique visitors, top pages, top referrers, daily trend
- **Performance**: load time, DOM ready, first paint, per-page breakdown
- **SEO**: stub panel — wiring up real rankings needs Google Search Console's API (OAuth + site verification), which is a separate integration

## Next steps not yet built
- Device/browser/OS breakdown
- Session duration / bounce rate
- Real-time visitor view
- Google Search Console integration for the SEO panel
- Multi-user auth (right now anyone with the dashboard URL can see all sites)
