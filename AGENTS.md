# AGENTS.md — The Relic Shop

Nuxt 3 luxury e-commerce PWA ("The Relic Shop") backed by Supabase + Stripe. Three storefront verticals: **Thrift**, **Gift**, **Handmade**.

---

## Dev Commands

```bash
pnpm dev          # dev server on :3000 (0.0.0.0)
pnpm build        # production build
pnpm lint         # ESLint
pnpm typecheck    # nuxt typecheck (tsc)
pnpm update-types # regenerate types/database.types.ts from Supabase project agkajtjnmvpxvycwpvrz
```

**Required env vars** (`.env`):
```
SUPABASE_URL=...
SUPABASE_KEY=...       # anon key
STRIPE_SECRET_KEY=...
STRIPE_PUBLIC_KEY=...
```

---

## Architecture & Data Flow

```
Page / Component
  └─ useApiServices()          ← composables/apiServices.ts (central HTTP client)
       ├─ useFetch('/api/supabase/...')   → server/api/supabase/**  (Nitro handlers)
       └─ direct supabase client calls   (for simple queries)

server/api/supabase/**
  └─ event.context.supabase    ← typed SupabaseClient<Database> injected by
                                  server/plugins/supabase.ts (Nitro plugin)

Pinia stores (store/cart.ts, store/wishlist.ts)
  └─ call useApiServices() for all persistence; cart is persisted via
     @pinia-plugin-persistedstate/nuxt

Stripe checkout
  └─ pages/checkout.vue → POST /api/stripe/payment-intent → Stripe API
```

All server routes receive Supabase via `event.context.supabase as SupabaseClient<Database>`; never instantiate a new client inside a handler.

---

## Database Schema (Two Migration Sets)

`supabase/migrations/` contains **two distinct layers**:

| Migration | Purpose |
|---|---|
| `202603080001_flipagent_core.sql` | Seller/marketplace core: `sellers`, `products` (uuid PK), `listings`, `integrations`, `ai_generations`, `sync_queue` |
| `202603080002_relic_shop_tables.sql` | Storefront layer: `orders`, `order_items`, `gift_vault_items`, `builder_settings`, `draft_gift_boxes`, `jobs`, `wishlists`, `user_roles`, `leads` |
| `202603080003_rls_policies.sql` | RLS on all tables; helper functions `is_admin()`, `has_role()`, `current_seller_id()` |

> ⚠️ `types/database.types.ts` (auto-generated) reflects the **live remote DB** which still includes older cart/wishlist tables (`cartItems`, `cart`, `wishlist` with integer IDs). Always use `Tables<'tableName'>` / `TablesInsert<'tableName'>` from this file for type safety.

---

## Patterns & Conventions

### Composables
- **`useApiServices()`** — single source of truth for all data fetching. Every new server endpoint should be exposed here, not called ad-hoc from components.
- **`useExperienceData()`** — static arrays for thrift/gift/handmade pages. The file explicitly notes to swap these for Supabase / Nuxt Content queries when ready.
- `useSupabaseUser()` and `useSupabaseClient()` are auto-imported via `@nuxtjs/supabase`; `supabase.redirect` is disabled in `nuxt.config.ts` so redirects are handled manually in middleware.

### Authentication & Authorization
- `middleware/auth.ts` — any protected page adds `definePageMeta({ middleware: 'auth' })`
- `middleware/admin.ts` — checks `user.app_metadata.roles` then falls back to `user.user_metadata.roles`; admin role name is `'admin'`

### UI Components
- Primitive UI lives in `components/ui/` (shadcn-vue pattern — Radix Vue + CVA + Tailwind)
- Feature components in `components/{cart,category,product,section,wishlist,auth}/`
- `components/common/` holds global layout pieces (header, footer, logo, search)
- Nuxt auto-imports components; use `<CommonAppHeader />` not `<AppHeader />`

### Layouts
- `default` — standard storefront (header + footer)
- `app` — Ionic wrapper (`IonApp > IonPage > IonContent`) for PWA/mobile views
- `admin` — admin section; apply via `definePageMeta({ layout: 'admin', middleware: 'admin' })`

### Content Pages
- Editorial markdown lives in `content/` and is served by `@nuxt/content` v3
- Example: `content/discover/gift.md` → rendered in `/gift` page

### Styling
- Tailwind config at `tailwind.config.js`; global CSS entry at `assets/css/tailwind.css`
- Brand fonts: **Cormorant Garamond** (headings), **Playfair Display** (display), **Inter** (body)
- Color mode via `@nuxtjs/color-mode` with `classSuffix: ''` (class is `dark`, not `dark-mode`)

---

## Key Files

| File | Role |
|---|---|
| `composables/apiServices.ts` | All client→server data fetching |
| `store/cart.ts` | Cart state + persistence; syncs to Supabase when user is logged in |
| `store/wishlist.ts` | Watches `useSupabaseUser()` to load/clear on auth change |
| `server/plugins/supabase.ts` | Injects typed Supabase client into every Nitro request context |
| `types/database.types.ts` | Auto-generated; source of all DB row types |
| `types/search.types.ts` | `CollectionSearchParams` + `SortBy` enum used in collection pages |
| `supabase/migrations/` | Single source of truth for schema; run via Supabase CLI |

