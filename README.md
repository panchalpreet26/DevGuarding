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
| Deploy    | Docker · Vercel (FE) · Railway (BE)                         |

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
# Set GITHUB_TOKEN (PAT) to list your repos and raise API rate limits.
# Public repos can still be analyzed without a token (rate-limited).

# 3. Run both apps
npm run dev                 # backend :4000  +  frontend :5173
```

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

1. Open `/dashboard` and pick a repo from the switcher (loads from GitHub when `GITHUB_TOKEN` is set).
2. Backend reads README, package.json, folder tree, routes/controllers/services/middleware.
3. Full report appears on **Repository**; dashboard cards update from the same analysis.

API:

- `GET /api/repos` — list repositories for the token user
- `POST /api/analysis` — `{ "fullName": "owner/repo", "force": false }`
- `GET /api/analysis/:owner/:repo` — cached analysis

## Scripts (root)

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Run backend + frontend together    |
| `npm run dev:backend`  | Backend only                       |
| `npm run dev:frontend` | Frontend only                      |
| `npm run build`        | Build shared → backend → frontend  |
| `npm run lint`         | ESLint across the repo             |
| `npm run format`       | Prettier write                     |

## Build Milestones

1. ✅ **Project Setup** ← current
2. Authentication (GitHub OAuth)
3. Dashboard
4. GitHub Repository Integration
5. Repository Analysis
6. AI Chat
7. Engineering Memory
8. API Guardian
9. Deployment
