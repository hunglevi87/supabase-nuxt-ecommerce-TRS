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
### Current status (March 21, 2026)
- ✅ Haggle slice is implemented in Nuxt paths (`components/HaggleModal.vue`, `pages/admin/offers.vue`, `server/api/offers.ts`, `server/api/offers/accept.post.ts`, `server/api/offers/decline.post.ts`, `server/api/stripe/webhook.post.ts`).
- ✅ Resend email wiring is in place for seller notification, buyer accept/decline updates, and order confirmation.
- ✅ Validation re-run completed successfully: `pnpm lint`, `pnpm typecheck`, `pnpm validate:orchestration` (with expected warnings only); `smoke:sync-queue` reachable.
- ⚠️ Remaining operational gap: verify shared Supabase migrations/tables in target environment and run live E2E offer->payment->webhook email confirmation.
### Tonight handoff (March 13, 2026)
**Validation Run Results (Local - March 13, 2026):**
- ✅ `pnpm lint`: Passed (6 warnings only - vue/require-default-prop in UI components)
- ✅ `pnpm typecheck`: Passed (warnings only - component name collisions in shadcn UI)
- ⚠️ `pnpm smoke:sync-queue`: **BLOCKED** - Supabase connection works, but TRS FlipAgent tables (`sellers`, `products`, `listings`, `integrations`, `ai_generations`) are missing from database. Hidden-Gem tables (`users`, `stash_items`, `sync_queue`) exist.

**Required Action:** Apply TRS Supabase migrations (`supabase/migrations/20260308*.sql`) to create missing tables before full orchestration validation.

**Environment Status:**
- ✅ Supabase credentials verified (URL + Service Role Key)
- ✅ eBay credentials present (Client ID, Secret, Refresh Token)
- ⚠️ OpenFang/Emma orchestration vars empty (OPENFANG_RUNNER_TOKEN, EBAY_MCP_BASE_URL, OPENFANG_AI_ENDPOINT, OPENFANG_AI_API_KEY)

**Next Steps:**
1. Apply TRS Supabase migrations via dashboard or CLI
2. Re-run `pnpm smoke:sync-queue` to confirm table creation
3. Populate OpenFang/Emma orchestration secrets
4. Execute final cloud validation and record run IDs
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
