# The Relic Shop (TRS)
Nuxt 3 + Supabase storefront/admin for The Relic Shop, with OpenFang + Gemini AI orchestration and eBay MCP automation hooks.
## Current Implementation Status
- Core Nuxt storefront/admin shell is active (Ionic, PWA, Supabase integration).
- eBay MCP integration slice is implemented:
  - typed sync job contracts
  - eBay adapter service
  - job runner with retry/backoff and status persistence
  - admin jobs monitor API/UI
- AI orchestration is OpenFang + Gemini only (`gemini-stash-review`, `classify-product`, `price-product`, `generate-selfcare-bundles`).
- Botsee is removed from active orchestration/config.
### Tonight handoff (March 13, 2026)
- Local gates completed: `pnpm lint` (warnings only) and `pnpm typecheck`.
- Final cloud validation/run not completed yet because runtime secrets for Supabase validation were not confirmed in Oz secret store.
- Next action: set/verify required secrets, run `pnpm validate:orchestration`, then run one final cloud execution and record run IDs.
## Tech Stack
- Nuxt 3 + Vue 3
- Ionic (`@nuxtjs/ionic`)
- Supabase (`@nuxtjs/supabase`, `@supabase/supabase-js`)
- Pinia
- Tailwind CSS
- Stripe
- TypeScript
## Prerequisites
- Node.js 18+
- Corepack enabled
- `pnpm@10.31.0` (pinned in `package.json`)
- Supabase project credentials
- (For orchestration) eBay MCP service credentials and OpenFang AI endpoint credentials
## Setup
1. Install pnpm via Corepack and dependencies:
```bash
corepack enable
corepack prepare pnpm@10.31.0 --activate
pnpm install
```
2. Copy env template and configure:
```bash
cp .env.example .env
```
Fill `.env` with required values for your target workflow.
## Key Environment Variables
Minimum for app + Supabase access:
- `SUPABASE_URL`
- `SUPABASE_KEY` (or Supabase anon/public key where applicable)
For orchestration runner/API execution:
- `OPENFANG_RUNNER_TOKEN`
- `OPENFANG_AI_ENDPOINT`
- `OPENFANG_AI_API_KEY`
- `OPENFANG_AI_TIMEOUT_MS`
- `EBAY_MCP_BASE_URL`
- `EBAY_MCP_API_KEY`
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_ENVIRONMENT`
- `EBAY_REDIRECT_URI`
- `EBAY_USER_REFRESH_TOKEN`
- `EBAY_MARKETPLACE_ID`
- `EBAY_CONTENT_LANGUAGE`
- `EBAY_MCP_TIMEOUT_MS`
## Run Commands
Start dev server:
```bash
pnpm dev
```
Build and preview:
```bash
pnpm build
pnpm preview
```
Lint and typecheck:
```bash
pnpm lint
pnpm typecheck
```
## Orchestration Commands
Deterministic cloud/local setup:
```bash
pnpm setup:cloud
```
Supabase sync queue smoke check:
```bash
pnpm smoke:sync-queue
```
Full orchestration validation:
```bash
pnpm validate:orchestration
```
Note: `smoke:sync-queue` requires `SUPABASE_URL` (or `NUXT_PUBLIC_SUPABASE_URL`) plus `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_KEY`).
## Orchestration Endpoints
- `GET /api/admin/jobs`
  - List `sync_queue` jobs with status filter + pagination.
- `POST /api/admin/jobs/run`
  - Runs `runJobCycle` with optional `limit`, `baseBackoffSeconds`, and `maxBackoffSeconds`.
  - Requires `x-openfang-runner-token` header (or bearer token) matching `OPENFANG_RUNNER_TOKEN`.
## Relevant Paths
- `server/services/openfang-job-runner.ts`
- `server/services/ebay-mcp-adapter.ts`
- `server/services/emma-ai-adapter.ts`
- `server/api/admin/jobs.get.ts`
- `server/api/admin/jobs/run.post.ts`
- `pages/admin/jobs.vue`
- `docs/emma-mcp-config.md`
