// Auto-generated types for haggle/offers feature
// Update this when Supabase schema changes

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface Offer {
  id: string
  product_id: string
  buyer_email: string
  offered_amount: number
  status: OfferStatus
  expires_at: string
  created_at: string
  updated_at: string
}

export interface OfferInsert {
  product_id: string
  buyer_email: string
  offered_amount: number
  status?: OfferStatus
  expires_at?: string
}

export interface OfferUpdate {
  status?: OfferStatus
  updated_at?: string
}

export interface OrderWithOffer {
  id: string
  offer_id: string | null
  final_amount: number | null
  total: number
  status: string
  created_at: string
  // ... other order fields
}

export interface ProductWithHaggle {
  id: string
  name: string
  price: number
  allows_haggle: boolean
  inventory_qty: number
  // ... other product fields
}

export type Database = {
  public: {
    Tables: {
      offers: {
        Row: Offer
        Insert: OfferInsert
        Update: OfferUpdate
        Relationships: [
          {
            foreignKeyName: 'offers_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Enums: {
      offer_status: OfferStatus
    }
  }
}
