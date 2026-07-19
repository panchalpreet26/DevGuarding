# DevGuardian AI — Pitch Deck Context

Copy this file into Claude (or any LLM) to generate a strong hackathon PPT.

---

## Prompt for Claude

```
Create a professional hackathon pitch deck (10–14 slides) for DevGuardian AI.
Style: dark modern SaaS (Linear/Vercel vibe), minimal text, big headlines, clear diagrams.
Audience: judges / investors who care about problem, novelty, demo, tech, and next steps.
Do NOT call it a ChatGPT wrapper. Emphasize grounded repo intelligence.
Include suggested speaker notes per slide.
```

---

## Product

**Name:** DevGuardian AI  
**Tagline:** AI Engineering Brain  

**One-line pitch:**  
DevGuardian AI helps software teams understand their own codebase, preserve tribal knowledge, and catch API breaking changes — by grounding every answer in a connected GitHub repository, not generic LLM knowledge.

---

## Problem

- New engineers take weeks to learn a codebase
- Auth flows, services, and “why we did X” live in Slack / people’s heads
- Swagger and code drift → broken integrations
- Generic ChatGPT cannot see private repo structure or team decisions

---

## Solution

A dark, modern SaaS dashboard where you:

1. Sign in with **GitHub OAuth**
2. Select a repository
3. Auto-generate analysis (summary, stack, folder tree, APIs, auth flow)
4. Chat with AI **grounded in that repo**
5. Save answers the AI doesn’t know into **Engineering Memory**
6. Upload OpenAPI/Swagger and run **API Guardian** for mismatch reports

---

## Differentiator

Not another ChatGPT UI. Answers are built from:

- README
- Folder structure
- Services / routes / controllers / middleware
- Engineering Memory (human-verified)

Streamed via **OpenAI Responses API** with citations.

---

## Key features (demo-ready)

| Feature | What judges should see |
|--------|-------------------------|
| **GitHub Auth** | Continue with GitHub → authorize → dashboard; real avatar + repos |
| **Repo Analysis** | Summary, tech stack, folder tree, API list, auth flow, architecture diagram |
| **AI Chat** | Streaming answers, markdown + code blocks, copy, follow-ups; “I don’t know this yet.” when unsure |
| **Engineering Memory** | Save Q&A when AI is unsure; future chats search memory first; MongoDB CRUD |
| **API Guardian** | Upload Swagger → compare endpoints/methods/fields/validation → Critical/High/Medium/Low, affected files, suggested fix |
| **Dashboard UI** | Linear/Vercel-style dark theme, sidebar, repo switcher, stats cards |

---

## Demo / user journey

1. Landing → **Continue with GitHub**
2. OAuth callback → session cookie → Dashboard
3. Repo switcher loads the user’s real GitHub repos
4. Analysis runs → open **Repository** page
5. Ask in **AI Chat** (e.g. “Where is authentication?”)
6. If unknown → **Save explanation** to Knowledge Base
7. Ask again → answer comes from memory first
8. **API Guardian** → upload `swagger.json` → severity report

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React, Vite, TypeScript, TailwindCSS, shadcn/ui, React Router |
| Backend | Node.js, Express, TypeScript (routes → controllers → services) |
| Shared | npm workspaces monorepo + shared DTO package |
| Database | MongoDB (users + knowledge; in-memory fallback if Mongo down) |
| Auth | GitHub OAuth + httpOnly JWT session; access token encrypted at rest |
| AI | OpenAI Responses API (streaming SSE) |
| Repos | GitHub REST API (OAuth token; PAT optional fallback only) |
| Deploy target | Docker, Vercel (frontend), Railway (backend) |

---

## Architecture

```
Browser (React Dashboard)
        ↓ HTTPS + cookie session
Express API
  ├── Auth (OAuth + JWT)
  ├── Repos (GitHub API)
  ├── Analysis (tree + parsers)
  ├── Chat (context builder → OpenAI stream)
  ├── Knowledge (Mongo CRUD, memory-first)
  └── Guardian (OpenAPI parse → compare → report)
        ↓
GitHub API  |  OpenAI  |  MongoDB
```

---

## Monorepo structure

```
devguardian-ai/
├── frontend/   # React app
│   └── pages: Landing, Dashboard, Repository, Chat, Knowledge, Guardian
├── backend/    # Express API
├── shared/     # Shared TypeScript types
└── docs/       # Notes / lessons
```

---

## Security / trust points

- OAuth login (users don’t need to paste a PAT for normal use)
- HttpOnly session cookie
- GitHub token encrypted before storage
- AI instructed not to invent answers → “I don’t know this yet.”
- API mismatches ranked by severity with suggested fixes

---

## MVP status (hackathon)

**Working:**

- Full OAuth login + protected dashboard
- Repo list from signed-in account
- Repository analysis pipeline
- Streaming grounded chat
- Engineering Memory CRUD + memory-first retrieval
- API Guardian upload + report UI
- Modern dark dashboard

**Limitations / roadmap:**

- Mongo optional locally (falls back to memory)
- Guardian field/validation checks are heuristic (not a full type system)
- Deploy packaging (Docker/Vercel/Railway) planned; focus was product MVP
- Multi-team org admin / billing not in MVP

---

## Suggested slide outline (12 slides)

1. Title — DevGuardian AI
2. The problem (onboarding + knowledge loss + API drift)
3. Why ChatGPT isn’t enough
4. Product vision — AI Engineering Brain
5. Live product walkthrough / screenshots
6. Feature: Repo Analysis
7. Feature: Grounded AI Chat
8. Feature: Engineering Memory
9. Feature: API Guardian
10. Architecture & tech stack
11. Demo flow / what we shipped
12. Roadmap + call to action

---

## Taglines

- “Grounded in your codebase — not the internet.”
- “When AI doesn’t know, your team teaches it.”
- “Catch API breaks before they ship.”
- “Onboard in hours, not weeks.”

---

## Links

- GitHub: https://github.com/panchalpreet26/DevGuarding
- Local frontend: http://localhost:5173
- Local backend: http://localhost:4000/api

---

## Auth note (for accurate slides)

**Continue with GitHub** uses OAuth (`GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`).  
Dashboard repo listing uses the OAuth session token.  
`GITHUB_TOKEN` in `.env` is only an optional fallback for some server-side GitHub calls — it does not replace Connect with GitHub for listing the user’s repos.
