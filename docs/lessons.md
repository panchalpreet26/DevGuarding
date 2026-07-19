## 2026-07-19 — Render build: missing `@types/node` / Express types

- **Symptoms:** Render `tsc` fails with TS2591 (`process`, `node:path`), TS7016 (no declaration for `express`/`jsonwebtoken`), and check-file assert/console errors.
- **Root cause:** `NODE_ENV=production` on Render makes `npm install` skip `devDependencies`, where TypeScript and `@types/*` lived. `*.check.ts` files were also included in the production compile.
- **Fix:** Move `typescript` + required `@types/*` into `dependencies` (backend + shared). Build with `npm install --include=dev`. Exclude `src/**/*.check.ts` from `backend/tsconfig.json`. Set `"types": ["node"]`.
- **Prevention:** Any platform that installs with production NODE_ENV must either include compile-time types in `dependencies` or force `--include=dev` for the build step.
- **Sources:** Render Node build behavior; TypeScript TS2591 docs.

## 2026-07-19 — Vercel: `No workspaces found: --workspace=shared`

- **Symptoms:** Vercel build fails after `npm install` with npm error that workspace `shared` does not exist.
- **Root cause:** Project Root Directory was `frontend/`, so install ran outside the monorepo workspace root.
- **Fix:** Add `frontend/vercel.json` that `cd ..` then install/build workspaces. Root `vercel.json` uses `npm run vercel-build`. Document both Root Directory options.
- **Prevention:** Monorepo Vite apps on Vercel must install from the repo that contains `"workspaces"`, not from a nested package alone.

## 2026-07-19 — Mongo `Invalid scheme` with Atlas URI present in .env

- **Symptoms:** `MongoDB unavailable` with `Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"`.
- **Root cause:** `MONGODB_URI=` left empty and the Atlas URL placed on the next line. dotenv treats that as empty string; `??` fallback does not apply to `""`.
- **Fix:** Put the full URI on one line: `MONGODB_URI=mongodb+srv://...`. Treat blank `MONGODB_URI` as unset in `connectMongo`.
- **Prevention:** Never split env values across lines; empty string ≠ missing.
