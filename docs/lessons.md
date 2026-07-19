## 2026-07-19 — Render build: missing `@types/node` / Express types

- **Symptoms:** Render `tsc` fails with TS2591 (`process`, `node:path`), TS7016 (no declaration for `express`/`jsonwebtoken`), and check-file assert/console errors.
- **Root cause:** `NODE_ENV=production` on Render makes `npm install` skip `devDependencies`, where TypeScript and `@types/*` lived. `*.check.ts` files were also included in the production compile.
- **Fix:** Move `typescript` + required `@types/*` into `dependencies` (backend + shared). Build with `npm install --include=dev`. Exclude `src/**/*.check.ts` from `backend/tsconfig.json`. Set `"types": ["node"]`.
- **Prevention:** Any platform that installs with production NODE_ENV must either include compile-time types in `dependencies` or force `--include=dev` for the build step.
- **Sources:** Render Node build behavior; TypeScript TS2591 docs.
