# Problem Statement

Deliver The Relic Shop storefront and admin as a Nuxt 3 \+ Ionic mobile\-responsive web \+ PWA experience, using Supabase as the source of truth for commerce data and operations\.
## Current State \(researched\)
* TRS currently has Nuxt \+ Supabase \+ Stripe baseline commerce wiring, but still uses Vinylata IA/branding and does not yet contain the locked Relic Shop architecture \(`nuxt.config.ts:6-23`, `pages/index.vue:3-7`, `components/common/AppHeader.vue:23-27`, `assets/css/tailwind.css:16`\)\.
* TRS already includes foundational cart, wishlist, checkout, and Supabase API routes that can be extended rather than rebuilt \(`store/cart.ts:29-178`, `store/wishlist.ts:12-50`, `pages/checkout.vue:177`, `server/api/supabase/products-categories/[categoryId]/index.get.ts:1`\)\.
* TRS Phase 0 scaffolding has started in this repo: Ionic/Content/PWA modules were added, admin/app layouts were introduced, and initial Supabase migration files were created \(`nuxt.config.ts:5-57`, `layouts/admin.vue:1`, `layouts/app.vue:1`, `supabase/migrations/202603080001_flipagent_core.sql:1`, `supabase/migrations/202603080002_relic_shop_tables.sql:1`\)\.
* Validation currently shows pre\-existing and integration type issues that must be cleared to restore a green baseline before expanding storefront features \(notably `pages/collections/[slug].vue`, `store/wishlist.ts`, `components/category/Carousel.vue`, and `server/api/stripe/payment-intent.post.ts`\)\.
## Locked Architecture
* Storefront \+ Admin: Nuxt 3 \+ `@nuxtjs/ionic`\.
* Mobile delivery: TRS runs as responsive web \+ PWA\.
* Database/Auth/Realtime/Storage: Supabase\.
* Inventory source of truth is Hidden\-Gem \(mobile app\) writing to shared Supabase `sellers`/`products`/`listings`; TRS storefront/admin consumes and extends that shared model without creating a competing inventory authority\.
* Payments/Payouts: Stripe Checkout \+ Link \+ Tax with Found bank payouts\.
* Shipping: Shippo API\.
* Transactional Email: Resend\.
* CMS: Directus \(content source and publish target\)\.
* AI: Gemini \\+ OpenFang, orchestrated via an admin AI control panel that can trigger cross\\-system workflows for TRS storefront and Hidden\\-Gem inventory operations; the customer\\-facing AI system name is Emma, with Gemini hands handled through OpenFang orchestration\\.
* Marketplace channel: eBay only for listing sync and best\-offer/haggle, executed through `ebay-mcp` as the standardized eBay tool layer for Emma/OpenFang automations\.
* WordPress/WooCommerce: removed from final system scope\.
## Brand and Experience System \(Locked\)
* Brand identity: The Relic Shop, “Rare, Elegant, Luxury Items Curated,” with authenticity\-first, community, curated excellence, and accessible luxury values\.
* Core visual motif: bee crest with twin golden snakes, botanical flourishes, and dark luxury palette\.
* Experience pillars in product: Thrifted Luxury, Pre\-Made Gift Sets, Gift Box Builder, and Handcrafted Bath & Body\.
* Typography and motion direction: Cormorant Garamond, Playfair Display, Inter; bee/snake micro\-interactions and crest\-driven premium states\.
## Data Model Plan \(Supabase\)
* Treat `sellers`, `products`, `listings`, `integrations`, `ai_generations`, and `sync_queue` as shared canonical tables owned operationally by Hidden\-Gem and consumed by TRS with compatible RLS access patterns\.
* Extend `products` with taxonomy fields used by Emma/Gemini and bundle generation: `product_type` \\(`relic_handmade` | `bbw_repurposed` | `thrifted_luxury`\\), `collection`, `scent_profile[]`, `use_case[]`, `bundle_role` \\(`hero` | `support` | `filler`\\), and pricing\\-assist fields \\(`suggested_price`, `price_floor`, `price_ceiling`, `pricing_confidence`\\)\\.
* Build next: `orders`, `order_items`, `gift_vault_items`, `builder_settings`, `draft_gift_boxes`, `jobs`, `content_pages`, `audit_logs`, `wishlists`, `user_roles`, `leads`, `gift_sets` \(if separated from single products\), and control\-plane metadata needed to coordinate OpenFang tasks and Directus publish state\.
* Add command/notification plumbing tables as needed for automation observability \(`telegram_message_queue` and optional `telegram_commands`\) plus conversation state in `conversations`/`messages` for in\-app assistant interactions\.
* Stripe webhook ownership: order creation, item snapshot persistence, status updates, shipping label metadata, and email dispatch traceability\.
* Maintain explicit order typing \(`thrifted`, `gift_set`, `gift_box`, `bath_body`\) and immutable order item snapshots for post\-purchase auditability\.
## AI Hands and Orchestration \(Locked\)
* Stash critic hand \\(Gemini\\): periodic or on\\-demand stash reviews that output long\\-form draft content, short Discover cards, and Telegram\\-ready summaries\\.
* Bundle architect hand: generates tiered gift bundles from compatible `products` \+ `gift_vault_items` using scent/use\-case/bundle\-role compatibility\.
* Self\-care merch assistant hand: classifies RELIC\-made vs B&BW repurposed items, recommends bundle role, and suggests pricing ranges\.
* Core job types in `jobs`: `gemini-stash-review`, `classify-product`, `price-product`, `generate-selfcare-bundles`, plus eBay action jobs \\(publish/update/offer/reprice\\) that delegate to `ebay-mcp` tools\\.
* Execution pattern: clients \(Hidden\-Gem app, TRS admin, Telegram webhook\) enqueue `jobs`; `openfang-job-runner` Edge Function executes hand calls and `ebay-mcp` actions, then writes structured results to `jobs.result` plus domain tables\.
* Publishing pattern: Gemini long\\-form outputs go to Directus as drafts for editorial approval; short\\-form outputs flow to Discover surfaces; operational summaries flow to Telegram\\.
## Implementation Phases
### Phase 0: Foundation \(Days 1\-5\)
* Fork baseline repo and install locked modules: `@nuxtjs/ionic`, `@nuxtjs/supabase`, and Directus integration client\(s\) for runtime content fetch/publish workflows\.
* Stand up `ebay-mcp` runtime configuration \(credentials via secrets, OAuth user\-token flow, marketplace defaults\) for use by local agents and cloud job execution\.
* Apply Supabase migrations for FlipAgent core \+ new Relic Shop tables and policies\.
* Configure auth \(email/password \+ Google OAuth\) and establish layout shells \(`default`, `admin`, `app`\)\.
* Configure PWA baseline \(manifest, icons, offline shell, installability checks\)\.
* Connect Stripe account/payout setup and finalize TRS\-side runtime config contracts for payments, shipping, email, AI endpoints, and Directus API access\.
### Phase 1: Inventory \+ Storefront Core \(Days 6\-18\)
* Launch thrifted and bath/body catalog/product experiences on shared Supabase inventory from Hidden\-Gem\.
* Implement classification workflow in Hidden\-Gem/TRS admin so `product_type`, `collection`, `scent_profile`, `use_case`, and `bundle_role` are captured and normalized for downstream filters\.
* Implement Stripe Checkout session route, webhook ingestion, Shippo label creation, and Resend confirmation flow\.
* Deliver customer account baseline: orders, tracking, wishlist, saved addresses\.
* Include trust signals on thrifted PDPs \(auth notes, provenance, eBay reference badge\)\.
### Phase 2: Gift Box Builder \(Days 19\-30\)
* Port builder logic into Nuxt/Ionic composables and Pinia store \(items, totals, tier progress\)\.
* Build vault browsing from `gift_vault_items`, reward logic from `builder_settings`, and authenticated draft saves in `draft_gift_boxes`\.
* Implement self\-care bundle architect generation for 3\-tier starter bundles \(starter/curator/ultimate\) with item IDs, quantities, recipient framing, and optional image prompts\.
* Write generated bundles into draft `gift_set` records \(or `products` with `product_type='gift_set'`\), then route through admin approval before storefront publish\.
* Support shareable preview tokens, gift\-box SKU generation, and packing\-slip view aligned to crest branding\.
* Deliver admin vault/settings tools for seasonal rotation, max quantity, and tier thresholds\.
### Phase 3: Admin Panel \+ Automations \(Days 31\-45\)
* Build inventory manager, sync monitor, gift set architect, customer/order hub, and operational analytics\.
* Add eBay command center surfaces for listing state, offer/haggle actions, and queued eBay job outcomes powered by `ebay-mcp`\.
* Implement AI control panel experience for Emma “custom hands” orchestration, writing to `jobs` with execution/results lifecycle and audit trails across TRS \+ Hidden\-Gem workflows\.
* Add dedicated admin surfaces: `AI Bundles` \\(review/publish AI\\-generated sets\\) and `Gemini Insights` \\(stash critic outputs and recommendations\\)\\.
* Add Directus publishing controls so OpenFang\-generated long\-form content can be reviewed, approved, and reflected in storefront content pages\.
* Add notification configuration surface, role management \(`user_roles`\), and `audit_logs` visibility\.
### Phase 4: AI Gift Concierge \(Days 46\-55\)
* Deliver themed concierge chat for recipient/occasion/style/budget flows with Supabase\-backed history\.
* Add an in\-app OpenFang/Emma chat toggle that accepts slash\-command style intents and translates them into `jobs` requests\.
* Add curated suggestion pages, budget\-aware builder suggestions, and lead capture into `leads`\.
* Expose admin controls for model routing, transcript QA, and abandonment metrics\.
### Phase 5: eBay Haggle Button \(Days 56\-60\)
* Add server endpoint for eBay Best Offer using tokens from `integrations`\.
* Add thrifted PDP “Make an Offer” UX with account\-side active\-offers visibility\.
### Phase 6: Web/PWA Launch Hardening \(Days 61\-70\)
* Complete PWA quality gates: installability, offline fallback behavior, cache/version strategy, and update UX\.
* Finish responsive and performance hardening for phone/tablet/desktop including Core Web Vitals targets\.
* Finalize production rollout checklist, monitoring, and post\-launch issue triage playbook\.
## End\-to\-End Commerce Flow \(Locked\)
* Customer cart in Pinia creates Stripe Checkout session \(tax \+ Link \+ shipping collection\)\.
* Stripe webhook persists `orders` and `order_items` in Supabase\.
* Post\-payment automation creates Shippo label and sends Resend confirmation with tracking\.
* Customer account reflects order/tracking status, while payout lifecycle flows through Stripe to Found bank\.
* Hidden\-Gem/TRS/Telegram assistant actions enqueue `jobs`; `openfang-job-runner` executes and persists structured outputs\.
* eBay\-facing jobs route through `ebay-mcp` tools so listing, order, and offer operations use one consistent API contract\.
* Gemini stash\\-review outputs publish as Directus drafts for admin approval, then surface in storefront content and Discover snippets after publish\\.
* Telegram command flow \(`telegram-webhook`\) mirrors app/admin capabilities by translating `/openfang` commands into shared `jobs` requests\.
## Execution Notes
* This version supersedes prior variants by removing WooCommerce and keeping TRS focused on shared Supabase \+ storefront/admin delivery\.
* Hidden\-Gem is in scope as the upstream inventory producer; TRS is in scope as the storefront/admin consumer and orchestration surface on the same Supabase truth layer\.
* Directus is included as the content publishing backend so OpenFang outputs can be promoted into storefront\-visible content with review/auditability\.
* Naming convention lock: the AI system is Emma, with Gemini stash\\-critic capabilities orchestrated through OpenFang hands\\.
* Operational lock: eBay automations should prefer `ebay-mcp` over ad\-hoc direct endpoint wiring so app/admin/Telegram all share the same behavior and permissions model\.
* Implementation priority is integration fidelity \(shared schema, sync\-safe reads/writes, control\-plane observability, and storefront UX continuity\) rather than duplicating inventory ownership\.
## Tonight Handoff (March 13, 2026)
**Validation Run Results (Local - March 13, 2026):**

| Check | Status | Details |
|-------|--------|---------|
| `pnpm lint` | ✅ Passed | 6 warnings (vue/require-default-prop in UI components) |
| `pnpm typecheck` | ✅ Passed | Warnings only (shadcn component name collisions) |
| `smoke:sync-queue` | ⚠️ **BLOCKED** | Supabase connection works, TRS FlipAgent tables missing |
| Hidden-Gem `npm run lint` | ✅ Passed | 8 errors (unescaped entities), 37 warnings after --fix |
| Hidden-Gem `npm run check:types` | ⚠️ **8 errors** | Type mismatches in navigation + missing assets + pRetry types |

**Database Schema Gap Identified:**
- Hidden-Gem tables exist: `users`, `stash_items`, `sync_queue`
- TRS FlipAgent tables **MISSING**: `sellers`, `products`, `listings`, `integrations`, `ai_generations`
- **Root Cause**: TRS Supabase migrations (`supabase/migrations/20260308*.sql`) not applied to shared database

**Environment Status:**
- ✅ Supabase credentials verified (URL + Service Role Key)
- ✅ eBay credentials present (Client ID, Secret, Refresh Token)
- ⚠️ OpenFang/Emma orchestration vars empty (OPENFANG_RUNNER_TOKEN, EBAY_MCP_BASE_URL, OPENFANG_AI_ENDPOINT, OPENFANG_AI_API_KEY)

**Resume Path:**
1. Apply TRS Supabase migrations via Supabase dashboard SQL Editor or CLI
2. Verify tables: `sellers`, `products`, `listings`, `integrations`, `ai_generations`, `sync_queue`
3. Populate OpenFang/Emma orchestration secrets
4. Re-run `pnpm validate:orchestration` (lint + typecheck + smoke:sync-queue)
5. Execute final cloud run and capture run IDs/results

## Progress Update (Haggle Slice)

### Implemented in this repository
* Haggle UI scaffold added on storefront product pages via `components/HaggleModal.vue` and `pages/products/[slug].vue`.
* Admin offer triage surface added at `pages/admin/offers.vue`.
* Offer APIs added:
  * `server/api/offers.ts`
  * `server/api/offers/accept.post.ts`
  * `server/api/offers/decline.post.ts`
* Stripe offer settlement webhook logic added in `server/api/stripe/webhook.post.ts`.
* Supabase migration added for haggle schema in `supabase/migrations/202603180001_haggle_feature_schema.sql`.

### Unfinished / needs completion
* Shared Supabase target environment still requires migration verification to ensure all FlipAgent + haggle tables/columns are present.
* Offer expiry handling policy should be finalized and made deterministic (scheduled job vs read-time expiration transition).
* Live E2E run in target environment is still required to confirm full offer/email/webhook behavior with real provider delivery.

### Recommended next implementation pass
1. Apply/verify migrations in shared Supabase and smoke test `offers` + webhook paths.
2. Execute a live offer flow to verify Resend delivery and Stripe webhook persistence in target environment.
3. Confirm expiry policy implementation choice and enforce it consistently.
4. Run manual E2E check: make offer -> accept/decline -> Stripe checkout -> webhook persistence.

### Completed after this plan update
* Resend transactional emails are now integrated for seller notifications, buyer acceptance/decline messages, and post-payment confirmation.
* Validation completed successfully: `pnpm lint`, `pnpm typecheck`, and `pnpm validate:orchestration` (warnings-only baseline preserved).
