export type Marketplace = 'ebay'

export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

export type EmmaHand =
  | 'botsee-stash-review'
  | 'classify-product'
  | 'price-product'
  | 'generate-selfcare-bundles'

export type EbayAction = 'publish' | 'update' | 'offer' | 'reprice'

export type JobAction = EmmaHand | EbayAction

export interface EbayPublishPayload {
  sku: string
  productId?: string
  listingTemplate?: Record<string, unknown>
}

export interface EbayUpdatePayload {
  listingId: string
  patch: Record<string, unknown>
}

export interface EbayOfferPayload {
  listingId: string
  offerAmount: number
  currency?: string
  message?: string
}

export interface EbayRepricePayload {
  listingId: string
  newPrice: number
  currency?: string
  reason?: string
}

export interface EmmaListingGenPayload {
  productId: string
  tone?: 'luxury' | 'editorial' | 'concierge'
  constraints?: Record<string, unknown>
}

export interface BotseeAnalysisPayload {
  productIds?: string[]
  segment?: 'high-value' | 'self-care' | 'new-arrivals' | 'thrifted'
  includeTelegramSummary?: boolean
}

export interface SyncQueueJob {
  id: string
  seller_id: string
  product_id: string | null
  marketplace: string
  action: string
  payload: Record<string, unknown> | null
  status: string
  retry_count: number | null
  max_retries: number | null
  created_at: string
  scheduled_at: string | null
  completed_at: string | null
  error_message: string | null
}

export interface CreateJobRequest<TPayload = Record<string, unknown>> {
  sellerId: string
  productId?: string
  marketplace: Marketplace
  action: JobAction
  payload: TPayload
}

export interface JobResult<TData = Record<string, unknown>> {
  status: JobStatus
  message: string
  data?: TData
  errorCode?: string
}

export type SyncQueueSchema = {
  public: {
    Tables: {
      sync_queue: {
        Row: SyncQueueJob
        Insert: Partial<SyncQueueJob>
        Update: Partial<SyncQueueJob>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
