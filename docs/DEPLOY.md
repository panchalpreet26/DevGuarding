# Free production deploy — DevGuardian AI

Stack used (all free tiers):

| Piece | Platform | Why |
| ----- | -------- | --- |
| Frontend | [Vercel](https://vercel.com) Hobby | Best for Vite/React SPA |
| Backend | [Render](https://render.com) Free Web Service | Express Node works; HTTPS included |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) M0 | Free 512MB shared cluster |

Railway can replace Render if you prefer; same env vars apply.

> Render free services **sleep after ~15 minutes** idle. First request after sleep can take 30–60s. That is normal on free tier.

---

## 0. Prerequisites (you must do these in the browser)

1. Accounts: GitHub, [Vercel](https://vercel.com/signup), [Render](https://dashboard.render.com), [MongoDB Atlas](https://cloud.mongodb.com).
2. Code pushed to GitHub (this repo).
3. Local `.env` values ready to copy (OAuth + OpenAI). **Never paste secrets into git.**

---

## 1. MongoDB Atlas (free)

1. Create a project → **Build a Database** → **M0 Free**.
2. Create a DB user (username + password). Save them.
3. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) so Render can connect.
4. **Connect** → **Drivers** → copy the URI, e.g.  
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/devguardian?retryWrites=true&w=majority`
5. Keep this as `MONGODB_URI`.

---

## 2. Deploy backend on Render

### Option A — Blueprint (recommended)

1. Push `render.yaml` to GitHub.
2. Render Dashboard → **New** → **Blueprint** → select this repo.
3. After the service is created, open **Environment** and set (replace placeholders):

| Variable | Example |
| -------- | ------- |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | `https://YOUR-APP.vercel.app` |
| `CLIENT_URL` | `https://YOUR-APP.vercel.app` |
| `MONGODB_URI` | Atlas URI from step 1 |
| `JWT_SECRET` | long random string (`openssl rand -hex 32`) |
| `GITHUB_CLIENT_ID` | from GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | from GitHub OAuth App |
| `GITHUB_CALLBACK_URL` | `https://YOUR-SERVICE.onrender.com/api/auth/github/callback` |
| `OPENAI_API_KEY` | your key |
| `OPENAI_MODEL` | `gpt-4o-mini` |

4. Deploy. Wait until status is **Live**.
5. Open `https://YOUR-SERVICE.onrender.com/api/health` — should return OK JSON.

### Option B — Manual Web Service

- **Root Directory:** repo root (leave empty)
- **Runtime:** Node
- **Build:** `npm install --include=dev && npm run build -w shared && npm run build -w backend`
- **Start:** `npm run start -w backend`
- Same env vars as above.

Note your backend URL: `https://devguardian-api-xxxx.onrender.com`

---

## 3. Update GitHub OAuth App for production

GitHub OAuth Apps allow **one** callback URL. For production:

1. https://github.com/settings/developers → your OAuth App (or create a second app named “DevGuardian AI Prod”).
2. **Homepage URL:** `https://YOUR-APP.vercel.app`
3. **Authorization callback URL:**  
   `https://YOUR-SERVICE.onrender.com/api/auth/github/callback`
4. Put the Client ID / Secret into Render env (and keep a separate local OAuth app for `localhost` if needed).

---

## 4. Deploy frontend on Vercel

1. [vercel.com/new](https://vercel.com/new) → import this GitHub repo.
2. **Important — Root Directory:** leave **empty** (repo root), **or** set to `frontend`.
   - Empty root → uses root `vercel.json`
   - `frontend` → uses `frontend/vercel.json` (installs from monorepo root via `cd ..`)
3. **Environment Variables** (Production):

| Name | Value |
| ---- | ----- |
| `VITE_API_BASE_URL` | `https://YOUR-SERVICE.onrender.com/api` |

4. Deploy.
5. Note the frontend URL: `https://YOUR-APP.vercel.app`

6. Go back to **Render** and set:
   - `CLIENT_ORIGIN` = `https://YOUR-APP.vercel.app`
   - `CLIENT_URL` = `https://YOUR-APP.vercel.app`
7. **Manual Deploy** on Render so CORS/cookies pick up the Vercel URL.

If you use a custom domain later, add it to `CLIENT_ORIGIN` (comma-separated) and update OAuth homepage + Vercel domain.

---

## 5. Smoke test (proves the deploy works)

1. Open the Vercel URL — landing page loads.
2. Click **Continue with GitHub** — GitHub consent, then redirect to `/dashboard`.
3. Repo switcher lists **your** repos.
4. Open **AI Chat**, ask something (needs `OPENAI_API_KEY`).
5. Open **Knowledge** — create an entry (needs Atlas URI).
6. Open **Guardian** — upload a small OpenAPI JSON.

If login fails with “state mismatch”: cold start / cookie blocked — hard refresh and try once more after the Render service is warm. Confirm `GITHUB_CALLBACK_URL` matches the OAuth app exactly (https, no trailing slash).

If CORS errors in browser console: `CLIENT_ORIGIN` must be exactly the Vercel origin (scheme + host, no path).

---

## 6. Local vs production env cheat sheet

Local (`.env`):

```env
CLIENT_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback
VITE_API_BASE_URL=http://localhost:4000/api
```

Production (platform dashboards only):

```env
# Render
NODE_ENV=production
CLIENT_ORIGIN=https://YOUR-APP.vercel.app
CLIENT_URL=https://YOUR-APP.vercel.app
GITHUB_CALLBACK_URL=https://YOUR-SERVICE.onrender.com/api/auth/github/callback
MONGODB_URI=mongodb+srv://...
# + OAuth + JWT + OpenAI

# Vercel
VITE_API_BASE_URL=https://YOUR-SERVICE.onrender.com/api
```

Cross-origin sessions use `SameSite=None; Secure` cookies when `NODE_ENV=production`.

---

## What the agent cannot do for you

- Create Vercel / Render / Atlas accounts or click “Deploy”
- Store your real secrets
- Create/update the GitHub OAuth App callback URL
- Guarantee free-tier uptime (sleep + cold starts)

After you paste your live URLs, we can double-check env wiring if something fails.
