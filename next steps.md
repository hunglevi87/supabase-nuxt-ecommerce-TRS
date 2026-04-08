# Next Steps (TRS)

## Current state summary

TRS is a **Nuxt 3 + Vue 3** app (not Next.js) with active Supabase + Stripe + orchestration scaffolding.  
The haggle feature has been scaffolded in-repo with:
- `components/HaggleModal.vue`
- `pages/admin/offers.vue`
- `server/api/offers.ts`
- `server/api/offers/accept.post.ts`
- `server/api/offers/decline.post.ts`
- `server/api/stripe/webhook.post.ts`
- `supabase/migrations/202603180001_haggle_feature_schema.sql`

## What’s done

1. Offer schema migration created (`offers`, order linkage fields, haggle flags).
2. Product-page haggle UI entry point added.
3. Admin offers dashboard page added.
4. Offer create/accept/decline API routes added.
5. Stripe webhook route extended for offer checkout completion flow.

## What is still unfinished (priority)

1. **Schema application in shared Supabase**
   - Apply pending TRS migrations in target project.
   - Re-verify required shared tables and new haggle tables/columns.

2. **Offer lifecycle hardening**
   - Expiry handling policy (cron or on-read transition to `expired`) should be finalized.
   - Confirm one-offer-per-24h rule behavior with tests/manual checks.

3. **Live E2E verification in target env**
   - Run a real offer flow and confirm delivery + persistence:
   - make offer -> seller notification email
   - accept/decline -> buyer email
   - completed checkout -> webhook order persistence + confirmation email

4. **Operational docs sync**
   - Keep `README.md`, `.github/copilot-instructions.md`, and `docs/emma-mcp-config.md` aligned after each milestone.

## Immediate execution order

1. Apply/check Supabase migrations in shared env.
2. Verify full haggle flow manually:
   - make offer → admin accept/decline → Stripe session/webhook → inventory/order updates.
3. Confirm email deliverability in provider logs and inboxes.
