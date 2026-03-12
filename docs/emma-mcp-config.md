# Emma + eBay MCP Runtime Wiring
This file documents runtime keys and wiring points for Emma/Botsee + eBay orchestration.
## Required environment variables
Set these in your runtime secret manager (do not hardcode in repo):
- `EBAY_MCP_BASE_URL`
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_ENVIRONMENT`
- `EBAY_REDIRECT_URI`
- `EBAY_USER_REFRESH_TOKEN`
- `EBAY_MARKETPLACE_ID`
- `EBAY_CONTENT_LANGUAGE`
- `EMMA_AI_ENDPOINT`
- `BOTSEE_ENDPOINT`
## Execution path
1. Hidden-Gem/TRS/Telegram enqueue rows in `sync_queue`.
2. `openfang-job-runner` picks ready jobs and dispatches by `action`.
3. eBay actions are delegated to the eBay MCP adapter.
4. Runner persists terminal status (`done`/`failed`) and error metadata back to `sync_queue`.
## Trigger options
- Supabase Edge Function cron invoking a server endpoint that runs `runJobCycle`.
- External scheduler (CI job or cloud cron) invoking the same endpoint.
- Realtime listener pattern that triggers processing when pending rows are inserted.
## Current state
- Adapter is intentionally stubbed until eBay MCP service endpoint and credentials are live.
- Emma/Botsee endpoints are placeholders; runbook should be updated once service URLs are finalized.
