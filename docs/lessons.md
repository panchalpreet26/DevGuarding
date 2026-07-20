## 2026-07-20 — Auth milestone upgrades (sessions, private repos, secrets)

- **Changes:** OAuth scopes ? `repo` + `read:org`; private repos allowed; Mongo-backed sessions with `jti` (logout / logout-all revoke); GitHub 401 clears stored token + sessions; OAuth token revoked on logout; prod refuses weak JWT_SECRET/ENCRYPTION_KEY and boots only with Mongo; auth fails loudly without Mongo (no memory user store); rate limits on auth routes; login audit fields; authError UX maps codes and clears query params; optional GitHub App install for org-shared repos.
- **Migration:** Existing session cookies without `jti` are invalid — users must sign in again. Re-consent GitHub for the wider scope.
- **Sources:** GitHub Apps JWT + installation tokens docs; OAuth App token DELETE revoke API.
- **Prevention:** Never treat cookie clear alone as logout; never soft-fallback secrets in production.
## 2026-07-19 â€” Render build: missing `@types/node` / Express types

- **Symptoms:** Render `tsc` fails with TS2591 (`process`, `node:path`), TS7016 (no declaration for `express`/`jsonwebtoken`), and check-file assert/console errors.
- **Root cause:** `NODE_ENV=production` on Render makes `npm install` skip `devDependencies`, where TypeScript and `@types/*` lived. `*.check.ts` files were also included in the production compile.
- **Fix:** Move `typescript` + required `@types/*` into `dependencies` (backend + shared). Build with `npm install --include=dev`. Exclude `src/**/*.check.ts` from `backend/tsconfig.json`. Set `"types": ["node"]`.
- **Prevention:** Any platform that installs with production NODE_ENV must either include compile-time types in `dependencies` or force `--include=dev` for the build step.
- **Sources:** Render Node build behavior; TypeScript TS2591 docs.

## 2026-07-19 â€” Vercel: `No workspaces found: --workspace=shared`

- **Symptoms:** Vercel build fails after `npm install` with npm error that workspace `shared` does not exist.
- **Root cause:** Project Root Directory was `frontend/`, so install ran outside the monorepo workspace root.
- **Fix:** Add `frontend/vercel.json` that `cd ..` then install/build workspaces. Root `vercel.json` uses `npm run vercel-build`. Document both Root Directory options.
- **Prevention:** Monorepo Vite apps on Vercel must install from the repo that contains `"workspaces"`, not from a nested package alone.

## 2026-07-19 â€” Mongo `Invalid scheme` with Atlas URI present in .env

- **Symptoms:** `MongoDB unavailable` with `Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"`.
- **Root cause:** `MONGODB_URI=` left empty and the Atlas URL placed on the next line. dotenv treats that as empty string; `??` fallback does not apply to `""`.
- **Fix:** Put the full URI on one line: `MONGODB_URI=mongodb+srv://...`. Treat blank `MONGODB_URI` as unset in `connectMongo`.
- **Prevention:** Never split env values across lines; empty string â‰  missing.

## 2026-07-20 — Deployed analysis: browser 502 + GitHub API error 409

- **Symptoms:** Analysis fails on production with HTTP 502; message `GitHub API error 409`.
- **Root cause:** GitHub returns 409 for GET /git/trees when the repo has no commits. Client mapped all non-OK GitHub statuses to HTTP 502.
- **Fix:** Handle 409 explicitly; empty tree returns minimal analysis instead of crashing.
- **Prevention:** Map empty-repo conflicts to actionable messages, not generic 502s.
