# DevGuardian AI

An **AI Engineering Brain** that helps software teams understand their codebase, preserve engineering knowledge, detect API mismatches, and accelerate onboarding.

Not a ChatGPT wrapper — it grounds every answer in your actual repository.

## Features

1. **GitHub Auth** — log in with GitHub, pick a repo.
2. **Repository Analysis** — auto-generate project summary, tech stack, folder tree, API list, auth flow.
3. **AI Repository Chat** — ask questions answered from repo context.
4. **API Guardian** — diff Swagger/OpenAPI vs code vs frontend requests; flag breaking changes.
5. **Engineering Memory** — capture tribal knowledge when the AI doesn't know something.
6. **Architecture Overview** — stack, folder tree, simple diagram.

## Tech Stack

| Layer     | Tech                                                        |
| --------- | ----------------------------------------------------------- |
| Frontend  | React, Vite, TypeScript, TailwindCSS, shadcn/ui, React Router |
| Backend   | Node.js, Express, TypeScript                                |
| Database  | MongoDB                                                      |
| Auth      | GitHub OAuth                                                 |
| AI        | OpenAI Responses API                                        |
| Repo data | GitHub REST API                                             |
| Deploy    | Vercel (FE) · Render (BE) · MongoDB Atlas (free)            |

## Monorepo Layout

```
devguardian-ai/
├── frontend/   # Vite + React + TS + Tailwind + shadcn
├── backend/    # Express + TS (routes → controllers → services)
├── shared/     # Types shared by frontend & backend
└── docs/       # Specs, architecture notes, lessons learned
```

## Getting Started

```bash
# 1. Install everything (npm workspaces)
npm install

# 2. Configure env
cp .env.example .env
# Required for GitHub login:
#   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET  (OAuth App)
#   JWT_SECRET
#   CLIENT_URL=http://localhost:5173
#   GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback

# 3. Run both apps
npm run dev                 # backend :4000  +  frontend :5173
```

### GitHub OAuth App setup

1. Open https://github.com/settings/developers → **New OAuth App**
2. Homepage URL: `http://localhost:5173`
3. Authorization callback URL: `http://localhost:4000/api/auth/github/callback`
4. Copy Client ID + Client Secret into `.env`
5. Restart backend, click **Continue with GitHub**

After login, your real repositories load in the dashboard switcher (no PAT required).

### API Guardian

Upload OpenAPI/Swagger JSON and compare against repository routes:

- Endpoints & methods
- Request / response fields
- Validation signals

Report shows severity (Critical / High / Medium / Low), affected files, and suggested fixes.

- `POST /api/guardian/compare` — `{ repoFullName, swagger }`
- `GET /api/guardian/:owner/:repo` — cached report

### Engineering Memory

When chat confidence is low (`I don't know this yet.`), save an explanation from the chat UI or **Knowledge Base**.

Stored fields: question, answer, repository (`repoFullName`), createdBy, timestamps.

Future chat answers **search memory first** (strong matches short-circuit the model).

Requires MongoDB (`MONGODB_URI`). If Mongo is down, an in-memory fallback keeps the API usable.

- `GET /api/knowledge?repoFullName=owner/repo`
- `GET /api/knowledge/search?repoFullName=&q=`
- `GET /api/knowledge/:id`
- `POST /api/knowledge` — `{ repoFullName, question, answer, createdBy? }`
- `PUT /api/knowledge/:id`
- `DELETE /api/knowledge/:id`

### AI Repository Chat

1. Select a repo, open **AI Chat**.
2. Backend searches README + folder tree + services/routes + knowledge base, then streams an answer via OpenAI Responses API.
3. Markdown, code blocks (with copy), citations, and follow-up chips are supported.

Requires `OPENAI_API_KEY` in `.env`.

- `POST /api/chat/stream` — SSE stream (`meta` → `delta*` → `done`)
- `POST /api/chat` — non-streaming `{ answer, citations, unknown }`

### Repository analysis

1. Sign in with GitHub, open `/dashboard`, and pick a repo from the switcher.
2. Backend reads README, package.json, folder tree, routes/controllers/services/middleware.
3. Full report appears on **Repository**; dashboard cards update from the same analysis.

API:

- `GET /api/repos` — list repositories for the signed-in user (requires session cookie)
- `POST /api/analysis` — `{ "fullName": "owner/repo", "force": false }`
- `GET /api/analysis/:owner/:repo` — cached analysis

### Auth API

- `GET /api/auth/github` — start OAuth (`repo` + `read:org` scopes for private/org repos)
- `GET /api/auth/github/callback` — OAuth callback (sets httpOnly session cookie; session row in Mongo)
- `GET /api/auth/github/app/install` — optional GitHub App install (org shared access)
- `GET /api/auth/github/app/callback` — App setup URL callback
- `GET /api/auth/me` — current user
- `POST /api/auth/logout` — revoke this session + GitHub token
- `POST /api/auth/logout-all` — revoke every session for the user
- `GET /api/auth/status` — whether OAuth / GitHub App env is configured

Sign-in **requires MongoDB** (sessions are revocable server-side). Re-authorize once after upgrading so GitHub grants the new `repo` scope.

## Scripts (root)

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Run backend + frontend together    |
| `npm run dev:backend`  | Backend only                       |
| `npm run dev:frontend` | Frontend only                      |
| `npm run build`        | Build shared → backend → frontend  |
| `npm run lint`         | ESLint across the repo             |
| `npm run format`       | Prettier write                     |

## Free production deploy

Full guide: **[docs/DEPLOY.md](docs/DEPLOY.md)**

| Piece | Free host |
| ----- | --------- |
| Frontend | Vercel (`vercel.json` at repo root) |
| Backend | Render (`render.yaml` Blueprint) |
| DB | MongoDB Atlas M0 |

After deploy, set Vercel `VITE_API_BASE_URL` to `https://<render-service>.onrender.com/api`, and set Render `CLIENT_ORIGIN` / `CLIENT_URL` to your Vercel URL. Update the GitHub OAuth callback to the Render URL.

## Build Milestones

1. ✅ Project Setup
2. ✅ Authentication (GitHub OAuth)
3. ✅ Dashboard
4. ✅ GitHub Repository Integration
5. ✅ Repository Analysis
6. ✅ AI Chat
7. ✅ Engineering Memory
8. ✅ API Guardian
9. ✅ Deployment configs (Vercel + Render)
