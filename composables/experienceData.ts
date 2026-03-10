import type {
  ValueProp,
  Testimonial,
  GiftTier,
  GiftSet,
  HandmadeLine,
} from '~/types/experience.types'

/**
 * Centralized data source for storefront experience pages.
 * Swap these static arrays for Supabase / Nuxt Content queries when ready.
 */
export function useExperienceData() {
  /* ── Thrift ────────────────────────────────────────── */
  const thriftValueProps: ValueProp[] = [
    {
      title: 'Authenticity First',
      description:
        'Product pages prioritize condition, provenance, and transparent listing details.',
    },
    {
      title: 'Curated Excellence',
      description:
        'Inventory is handpicked for quality, brand story, and value.',
    },
    {
      title: 'Accessible Luxury',
      description:
        'Elevated shopping experience designed for both collectors and first-time thrifters.',
    },
  ]

  /* ── Gift ───────────────────────────────────────────── */
  const giftTiers: GiftTier[] = [
    { label: 'Tier 1', reward: 'Free sample at $35+' },
    { label: 'Tier 2', reward: 'Free gift wrap at $60+' },
    { label: 'Tier 3', reward: 'Premium bonus at $90+' },
  ]

  const giftTestimonials: Testimonial[] = [
    {
      name: 'Arielle M.',
      quote:
        'The custom gift box felt so personal and elegant. Everything arrived beautifully packed.',
    },
    {
      name: 'Jordan K.',
      quote:
        'I used the builder for a corporate thank-you set and it made me look incredibly prepared.',
    },
    {
      name: 'Nia R.',
      quote:
        'I loved mixing handmade body care with thrifted finds into one luxury-feeling gift.',
    },
  ]

  const preMadeGiftSets: GiftSet[] = [
    {
      title: 'Bridal Glow Set',
      description:
        'Soft florals, relaxation essentials, and elegant keepsakes.',
    },
    {
      title: 'Executive Appreciation Set',
      description:
        'Polished, premium picks tailored for client and team gifting.',
    },
    {
      title: 'Teacher Thank-You Set',
      description:
        'Calming bath/body favorites and thoughtful everyday comforts.',
    },
  ]

  /* ── Handmade ──────────────────────────────────────── */
  const handmadeLines: HandmadeLine[] = [
    {
      name: 'Candles',
      summary:
        'Signature scents designed for calm rituals and elevated spaces.',
    },
    {
      name: 'Lotions',
      summary:
        'Daily hydration blends with soft, layered fragrance profiles.',
    },
    {
      name: 'Body Wash',
      summary: 'Gentle cleansing formulas crafted for comfort and glow.',
    },
    {
      name: 'Body Butter',
      summary:
        'Rich moisture treatment for deep nourishment and softness.',
    },
  ]

  return {
    thriftValueProps,
    giftTiers,
    giftTestimonials,
    preMadeGiftSets,
    handmadeLines,
  }
}
