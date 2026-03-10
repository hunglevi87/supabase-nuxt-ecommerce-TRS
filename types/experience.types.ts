/** Shared types for data-driven storefront experience pages */

export interface ValueProp {
  title: string
  description: string
}

export interface Testimonial {
  name: string
  quote: string
}

export interface GiftTier {
  label: string
  reward: string
}

export interface GiftSet {
  title: string
  description: string
  /** Optional route for a dedicated gift-set page */
  href?: string
}

export interface HandmadeLine {
  name: string
  summary: string
}
