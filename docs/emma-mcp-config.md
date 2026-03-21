# Emma + eBay MCP Runtime Wiring
This file documents runtime keys and wiring points for OpenFang + Gemini AI hands and eBay orchestration.
## Required environment variables
Set these in your runtime secret manager (do not hardcode in repo):
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
## Setup and validation
Use deterministic setup before cloud execution:
- `pnpm setup:cloud`
Validate orchestration locally:
- `pnpm validate:orchestration`
## Execution path
1. Hidden-Gem/TRS/Telegram enqueue rows in `sync_queue`.
2. `openfang-job-runner` fetches ready jobs and marks them `running`.
3. eBay actions (`publish`, `update`, `offer`, `reprice`) dispatch through the eBay MCP adapter.
4. AI actions (`gemini-stash-review`, `classify-product`, `price-product`, `generate-selfcare-bundles`) dispatch through `OPENFANG_AI_ENDPOINT`.
5. Failures use retry backoff and persist status/error metadata back to `sync_queue`.
## Trigger options
- Authenticated endpoint: `POST /api/admin/jobs/run` with `x-openfang-runner-token` (or bearer token).
- Supabase Edge Function cron invoking that endpoint.
- External scheduler (CI job or cloud cron) invoking the same endpoint.
## Handoff status (March 13, 2026)
**Validation Run Results (Local - March 13, 2026):**

Completed:
- ✅ Botsee references removed from active orchestration paths and docs
- ✅ Runner endpoint, retry/backoff behavior, and AI/eBay dispatch wiring are in place
- ✅ Local checks passed: `pnpm lint` (6 warnings), `pnpm typecheck` (warnings only)
- ✅ Supabase connection verified - `sync_queue` table accessible (0 rows)

Blocked:
- ⚠️ **Database Schema Gap**: TRS FlipAgent tables (`sellers`, `products`, `listings`, `integrations`, `ai_generations`) not found in Supabase. Only Hidden-Gem tables exist (`users`, `stash_items`, `sync_queue`).
- ⚠️ **Missing Secrets**: OpenFang/Emma orchestration vars empty (OPENFANG_RUNNER_TOKEN, EBAY_MCP_BASE_URL, OPENFANG_AI_ENDPOINT, OPENFANG_AI_API_KEY)

Resume from here:
1. Apply TRS Supabase migrations (`supabase/migrations/20260308*.sql`) via Supabase dashboard SQL Editor or CLI
2. Verify tables created: `sellers`, `products`, `listings`, `integrations`, `ai_generations`, `sync_queue`
3. Populate OpenFang/Emma orchestration secrets in environment
4. Re-run `pnpm validate:orchestration` (lint + typecheck + smoke:sync-queue)
5. Execute final cloud run and capture run ID + outcome

## Current status assimilation (March 21, 2026)
This section reconciles orchestration/runtime status with the current in-repo implementation state.

### Confirmed implemented since handoff
- Haggle feature scaffold now exists in Nuxt paths:
  - `components/HaggleModal.vue`
  - `pages/admin/offers.vue`
  - `server/api/offers.ts`
  - `server/api/offers/accept.post.ts`
  - `server/api/offers/decline.post.ts`
  - `server/api/stripe/webhook.post.ts`
- Supabase haggle migration added: `supabase/migrations/202603180001_haggle_feature_schema.sql`.

### Completed since previous update
- Transactional email delivery is now wired via Resend for:
  - seller offer notifications (`server/api/offers.ts`)
  - buyer offer acceptance and decline updates (`server/api/offers/accept.post.ts`, `server/api/offers/decline.post.ts`)
  - buyer order confirmation on webhook settlement (`server/api/stripe/webhook.post.ts`)
- Validation run is complete after haggle/resend updates:
  - `pnpm lint` (warnings only)
  - `pnpm typecheck` (warnings only)
  - `pnpm validate:orchestration` succeeded
  - `pnpm smoke:sync-queue` reachable

### Still pending (runtime + operations)
- Shared Supabase environment still needs migration verification for both FlipAgent core tables and haggle schema.
- Offer expiration lifecycle policy should be finalized for deterministic behavior (scheduled expiry vs read-time transition).
- Live end-to-end verification is still required in the target environment (offer create -> accept/decline -> Stripe checkout -> webhook persistence + email delivery).

### Canonical status references
- Steering/priority list: `next steps.md`
- Architecture + phased roadmap: `The Relic Shop Frontend Implementation Plan.md`
- Runtime wiring reference (this file): `docs/emma-mcp-config.md`
