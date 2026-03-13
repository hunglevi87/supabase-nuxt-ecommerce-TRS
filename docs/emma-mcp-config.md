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
