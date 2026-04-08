# Copilot Instructions for The Relic Shop (TRS)

## Project Overview

**The Relic Shop (TRS)** is a Nuxt 3 + Vue 3 storefront and admin dashboard for a luxury item marketplace, integrated with Supabase, eBay MCP automation, and OpenFang + Gemini AI orchestration.

**Key Features:**
- E-commerce storefront with product browsing, search, cart, and checkout (Stripe)
- Admin job scheduler to orchestrate eBay listings and AI-powered product operations
- Real-time inventory sync with eBay via MCP adapter
- AI-powered product operations: classification, pricing, bundle generation, review analysis
- Ionic PWA wrapper for mobile support

## Quick Start Commands

### Development & Testing

```bash
# Install dependencies (pnpm required - pinned to 10.31.0)
corepack enable && corepack prepare pnpm@10.31.0 --activate
pnpm install

# Start dev server
pnpm dev

# Lint and typecheck
pnpm lint       # ESLint + vue/require-default-prop warnings are expected
pnpm typecheck  # Nuxt TypeScript check (shadcn component name collision warnings expected)

# Full validation (before commits to production branches)
pnpm validate:orchestration   # Runs lint + typecheck + smoke:sync-queue
```

### Orchestration Commands

```bash
# Setup cloud environment (deterministic env validation)
pnpm setup:cloud

# Smoke test: validate Supabase connection and sync_queue table
pnpm smoke:sync-queue   # Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

# Trigger job execution
curl -X POST http://localhost:3000/api/admin/jobs/run \
  -H "x-openfang-runner-token: <OPENFANG_RUNNER_TOKEN>" \
  -H "Content-Type: application/json"
```

## Haggle / Make Offer Feature

### Overview

**⚠️ IMPORTANT:** The haggle feature operates **independently of eBay**, to avoid violating eBay's Terms of Service. The flow is:
1. User makes offer on TRS storefront (not eBay)
2. Seller accepts/declines independently via TRS admin
3. If accepted, buyer pays via Stripe at negotiated price
4. Inventory syncs back to eBay (optional, via job queue)

This keeps payment, negotiation, and checkout entirely within TRS—compliant with eBay ToS.

### Database Schema

**Products Table:**
```sql
ALTER TABLE products ADD COLUMN allows_haggle BOOLEAN DEFAULT false;
```

**Offers Table:**
```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  buyer_email TEXT NOT NULL,
  offered_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined' | 'expired'
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Orders Table (add new columns):**
```sql
ALTER TABLE orders ADD COLUMN offer_id UUID REFERENCES offers(id);
ALTER TABLE orders ADD COLUMN final_amount DECIMAL(10,2);
```

### User Flow

1. **Product Page:**
   - Show "Buy Now" button (list price → Stripe)
   - Show "💬 Make an Offer" button (if product.allows_haggle = true)

2. **Make Offer Modal:**
   - Buyer enters: offer amount + email
   - Validates: offer >= 70% of list price (or configurable threshold)
   - Submits to `POST /api/offers`

3. **Seller Notification:**
   - Email to seller: "[Product Name] - Offer: $XXX from [buyer_email]"
   - Link to `/admin/offers` to accept/decline
   - Optional: Telegram notification (if configured)

4. **Seller Decision (via `/admin/offers`):**
   - Click "Accept" → creates Stripe Checkout session at negotiated price
   - Click "Decline" → sends rejection email to buyer
   - Auto-expire after 48 hours with expiry notification

5. **Buyer Payment:**
   - Receives email: "Your offer was accepted! [Stripe checkout link]"
   - Completes payment at negotiated price via Stripe
   - Stripe webhook updates `orders` table and decrements inventory

6. **Post-Purchase:**
   - Update product inventory
   - Optionally enqueue job to sync inventory back to eBay via `reprice` or listing update

### API Endpoints

**Create Offer:**
```
POST /api/offers
Body: { productId: UUID, offerAmount: number, buyerEmail: string }
Returns: { offerId: UUID, status: 'pending', expiresAt: ISO8601 }
```

**Accept Offer:**
```
POST /api/offers/[offerId]/accept
Returns: { stripeCheckoutUrl: string }
```

**Decline Offer:**
```
POST /api/offers/[offerId]/decline
Returns: { success: boolean }
```

**List Seller Offers:**
```
GET /api/offers?status=pending
Returns: offers[] with product details
```

**Stripe Webhook:**
```
POST /api/stripe/webhook
Event: checkout.session.completed
- Fetch associated offer
- Create order with offer_id + final_amount
- Mark offer as 'accepted'
- Decrement product inventory
- Optionally enqueue eBay inventory sync job
```

### Implementation Locations

| Component | Path | Notes |
|-----------|------|-------|
| Offer Form Modal | `components/HaggleModal.vue` | Input: amount + email, submit handler |
| Create Offer API | `server/api/offers.ts` | Validate, insert to DB, send seller email |
| Accept Offer API | `server/api/offers/accept.post.ts` | Validate offer status, create Stripe session |
| Decline Offer API | `server/api/offers/decline.post.ts` | Update status, notify buyer |
| Admin Offers Page | `pages/admin/offers.vue` | List pending offers, accept/decline buttons |
| Stripe Webhook | `server/api/stripe/webhook.post.ts` | Existing file; add offer_id handling |
| Product Page | `pages/products/[slug].vue` | Add "Make an Offer" button if allows_haggle |

### eBay Sync (Optional Post-Purchase)

After Stripe payment succeeds, inventory can be synced back to eBay:

```typescript
// In Stripe webhook handler, after order created:
if (product.synced_to_ebay_listing_id) {
  await db.from('sync_queue').insert({
    action_type: 'reprice',
    marketplace: 'ebay',
    payload: {
      listingId: product.synced_to_ebay_listing_id,
      newPrice: product.price, // Or adjust based on demand
      reason: 'Inventory sold via haggle'
    }
  })
}
```

This triggers `openfang-job-runner` to execute the `reprice` action via `ebay-mcp-adapter`.

### Validation Rules

- **Minimum Offer:** >= 70% of list price (configurable per product)
- **Maximum Offers:** 1 active offer per buyer per product per 24hrs
- **Expiry:** 48 hours from creation
- **Inventory Check:** Can't haggle if inventory = 0

### Email Templates

**Seller Notification:**
```
Subject: New Offer on [Product Name]

Hi Ry,

A customer has made an offer on your item:

Product: [Product Name]
Offered Amount: $XXX
Original Price: $YYY
Buyer Email: [email]

[Accept Button] [Decline Button]

Offer expires in 48 hours.
```

**Buyer Acceptance Email:**
```
Subject: Your Offer Was Accepted!

Hi [Buyer],

Great news! Your offer of $XXX for [Product Name] has been accepted.

[Complete Payment Button → Stripe Checkout]

Payment expires in 24 hours.
```

### Error Handling

- Offer validation fails: Return 400 with clear reason
- Offer already declined: 409 Conflict
- Expired offer: Auto-decline via cron job (optional) or on-read
- Stripe session creation fails: Fallback to manual retry button

### Build & Preview

```bash
# Production build
pnpm build

# Local preview of production build
pnpm preview

# Generate static site (rarely used for this SPA)
pnpm generate
```

## Critical Architecture

### Three-Layer Orchestration Runtime

The project orchestrates jobs across three systems:

1. **Supabase (`sync_queue`)** - Persistent job queue
   - Rows enqueued by Hidden-Gem, TRS FlipAgent, or Telegram
   - `openfang-job-runner` polls for `pending` jobs and marks them `running`
   - Status + errors persisted back after execution

2. **eBay MCP Adapter** (`server/services/ebay-mcp-adapter.ts`)
   - Handles actions: `publish`, `update`, `offer`, `reprice`
   - Communicates with `EBAY_MCP_BASE_URL` (eBay MCP service)
   - Requires: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_USER_REFRESH_TOKEN`, `EBAY_MARKETPLACE_ID`

3. **OpenFang + Gemini AI** (`server/services/emma-ai-adapter.ts`)
   - Handles actions: `gemini-stash-review`, `classify-product`, `price-product`, `generate-selfcare-bundles`
   - Dispatches to `OPENFANG_AI_ENDPOINT` with bearer token
   - Timeout: `OPENFANG_AI_TIMEOUT_MS` (default 15000ms)

**Execution Flow:**
```
sync_queue (pending job)
  → openfang-job-runner.runJobCycle()
    → Fetch job, mark running
    → Route by action type:
      - eBay action? → ebay-mcp-adapter
      - AI action? → emma-ai-adapter
    → Retry with exponential backoff on failure
    → Persist status/error metadata back to sync_queue
```

**API Endpoints:**
- `GET /api/admin/jobs` - List jobs with status filtering + pagination
- `POST /api/admin/jobs/run` - Trigger job cycle (requires `x-openfang-runner-token` header)

### Frontend Architecture

**State Management (Pinia):**
- `store/cart.ts` - Cart state with Supabase persistence
- `store/wishlist.ts` - Wishlist state with Supabase persistence
- Stores use `@pinia-plugin-persistedstate` for automatic localStorage sync

**API Layer:**
- `composables/apiServices.ts` - Supabase queries and fetch wrapper
- Server endpoints in `server/api/` follow Nuxt 3 directory convention (auto-routed)
- `server/services/` - Business logic (job runner, adapters, eBay, AI)

**UI Components:**
- `components/ui/` - shadcn-vue components (Radix UI primitives)
- Use [shadcn-nuxt](https://shadcn-nuxt.com/) for component generation and updates
- Tailwind CSS with HSL CSS variables (see `tailwind.config.js` for theme)

**Pages & Routing:**
- File-based routing: `pages/` → auto-routed (e.g., `pages/products/[id].vue` → `/products/:id`)
- Admin section: `pages/admin/jobs.vue` → `/admin/jobs`

**Database Types:**
- `types/database.types.ts` - Auto-generated Supabase types
- Update with: `pnpm update-types` (requires Supabase project ID in env)
- Use `TablesInsert<'table'>` and `TablesRow<'table'>` for type-safe queries

## Environment Variables

**Essential (all deployments):**
- `SUPABASE_URL` / `SUPABASE_KEY` - Supabase project credentials
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase access (for migrations, admin ops)

**Storefront (optional):**
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLIC_KEY` - Stripe integration

**Orchestration (optional, required for job runner):**
- `OPENFANG_RUNNER_TOKEN` - Bearer token for `/api/admin/jobs/run`
- `OPENFANG_AI_ENDPOINT` - Gemini AI orchestration endpoint
- `OPENFANG_AI_API_KEY` - API key for `OPENFANG_AI_ENDPOINT`
- `EBAY_MCP_BASE_URL` / `EBAY_MCP_API_KEY` - eBay MCP service endpoint
- `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_USER_REFRESH_TOKEN`
- `EBAY_ENVIRONMENT` (default: `production`)
- `EBAY_MARKETPLACE_ID` (default: `EBAY_US`)

See `.env.example` for complete list.

## Code Style & Conventions

**TypeScript:**
- Enable strict mode; use explicit types for function parameters and return values
- Prefer `import type` for type-only imports

**Vue 3 Composition API:**
- Use `<script setup>` syntax
- All composables exported from `composables/` prefixed with `use` (e.g., `useApiServices`, `useCartStore`)

**Styling:**
- Tailwind CSS first; use CSS variables in `tailwind.config.js` theme
- Dark mode: `dark:` prefix (configured in config)
- Radix/shadcn components for complex UI (modals, popovers, forms)

**Formatting:**
- Prettier config: 2-space tabs, single quotes, no semicolons
- ESLint extends `@nuxt/eslint` with `vue/html-self-closing: off`
- Lint before commits: `pnpm lint`

**Naming:**
- Camel case for functions, variables, and stores
- PascalCase for Vue components and types
- Snake case for Supabase table/column names (auto-generated in types)

## Known Issues & Workarounds

**ESLint Warnings (Expected):**
- `vue/require-default-prop` - Accepted as project pattern; disable rule per component if needed

**TypeScript Warnings (Expected):**
- shadcn component name collisions in type checking - Suppressible but does not affect build

**Database Schema Gap (Blocker):**
- TRS FlipAgent tables missing from Supabase: `sellers`, `products`, `listings`, `integrations`, `ai_generations`
- **Action Required:** Apply migrations in `supabase/migrations/20260308*.sql` via Supabase dashboard or CLI before running `pnpm smoke:sync-queue`

## Debugging Orchestration Jobs

1. **Check job queue:**
   ```sql
   -- Supabase SQL Editor
   SELECT id, action_type, status, error_message, created_at 
   FROM sync_queue 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

2. **Trigger job manually:**
   ```bash
   curl -X POST http://localhost:3000/api/admin/jobs/run \
     -H "x-openfang-runner-token: YOUR_TOKEN" \
     -H "Content-Type: application/json"
   ```

3. **Monitor job runner logs:**
   - Check `openfang-job-runner.ts` for retry/backoff logic
   - Errors logged to Supabase `sync_queue.error_message` and `sync_queue.error_metadata`

4. **Test adapters in isolation:**
   - eBay: Create test job in `sync_queue` with `action_type: "publish"` and `payload` containing eBay listing data
   - AI: Create test job with `action_type: "classify-product"` and product data in `payload`

## Related Documentation

- **AI/MCP Integration:** See `docs/emma-mcp-config.md` for runtime wiring details
- **Supabase Migrations:** Located in `supabase/migrations/` (schema version-dated)
- **shadcn-vue:** Use `npx shadcn-nuxt@latest add [component]` to add pre-built UI components

## Next Steps for New Contributors

1. Set up environment: Copy `.env.example` → `.env` and populate credentials
2. Run `pnpm install && pnpm dev` to start dev server
3. Run `pnpm validate:orchestration` to check your setup
4. Review `server/services/openfang-job-runner.ts` to understand job execution flow
5. Check `composables/apiServices.ts` for Supabase query patterns
