import type {
  EbayOfferPayload,
  EbayPublishPayload,
  EbayRepricePayload,
  EbayUpdatePayload,
  JobResult,
} from '~/types/emma-jobs.types'

export interface EbayMcpRuntimeConfig {
  baseUrl: string | null
  clientId: string | null
  clientSecret: string | null
  environment: string
  redirectUri: string | null
  refreshToken: string | null
  marketplaceId: string
  contentLanguage: string
  missing: string[]
}

export interface IEbayMcpAdapter {
  publish(payload: EbayPublishPayload): Promise<JobResult>
  update(payload: EbayUpdatePayload): Promise<JobResult>
  offer(payload: EbayOfferPayload): Promise<JobResult>
  reprice(payload: EbayRepricePayload): Promise<JobResult>
}

const REQUIRED_ENV_KEYS = [
  'EBAY_MCP_BASE_URL',
  'EBAY_CLIENT_ID',
  'EBAY_CLIENT_SECRET',
  'EBAY_REDIRECT_URI',
  'EBAY_USER_REFRESH_TOKEN',
] as const

export function resolveEbayConfig(): EbayMcpRuntimeConfig {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key])

  return {
    baseUrl: process.env.EBAY_MCP_BASE_URL ?? null,
    clientId: process.env.EBAY_CLIENT_ID ?? null,
    clientSecret: process.env.EBAY_CLIENT_SECRET ?? null,
    environment: process.env.EBAY_ENVIRONMENT ?? 'production',
    redirectUri: process.env.EBAY_REDIRECT_URI ?? null,
    refreshToken: process.env.EBAY_USER_REFRESH_TOKEN ?? null,
    marketplaceId: process.env.EBAY_MARKETPLACE_ID ?? 'EBAY_US',
    contentLanguage: process.env.EBAY_CONTENT_LANGUAGE ?? 'en-US',
    missing,
  }
}

function notReady(action: string, config: EbayMcpRuntimeConfig): JobResult {
  return {
    status: 'failed',
    message: `eBay MCP adapter is not wired for ${action}`,
    errorCode: config.missing.length > 0 ? 'MCP_CONFIG_MISSING' : 'MCP_NOT_IMPLEMENTED',
    data: {
      missingConfigKeys: config.missing,
      expectedBaseUrl: config.baseUrl,
      environment: config.environment,
    },
  }
}

export class EbayMcpAdapterStub implements IEbayMcpAdapter {
  private readonly config = resolveEbayConfig()

  async publish(_payload: EbayPublishPayload): Promise<JobResult> {
    return notReady('publish', this.config)
  }

  async update(_payload: EbayUpdatePayload): Promise<JobResult> {
    return notReady('update', this.config)
  }

  async offer(_payload: EbayOfferPayload): Promise<JobResult> {
    return notReady('offer', this.config)
  }

  async reprice(_payload: EbayRepricePayload): Promise<JobResult> {
    return notReady('reprice', this.config)
  }
}
