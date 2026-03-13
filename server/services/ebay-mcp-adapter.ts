import type {
  EbayAction,
  EbayOfferPayload,
  EbayPublishPayload,
  EbayRepricePayload,
  EbayUpdatePayload,
  JobResult,
} from '~/types/emma-jobs.types'

export interface EbayMcpRuntimeConfig {
  baseUrl: string | null
  apiKey: string | null
  clientId: string | null
  clientSecret: string | null
  environment: string
  redirectUri: string | null
  refreshToken: string | null
  marketplaceId: string
  contentLanguage: string
  timeoutMs: number
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
const DEFAULT_TIMEOUT_MS = 15000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeTimeout(value: string | undefined): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_TIMEOUT_MS
  }

  return Math.round(numeric)
}

export function resolveEbayConfig(): EbayMcpRuntimeConfig {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key])

  return {
    baseUrl: process.env.EBAY_MCP_BASE_URL ?? null,
    apiKey: process.env.EBAY_MCP_API_KEY ?? null,
    clientId: process.env.EBAY_CLIENT_ID ?? null,
    clientSecret: process.env.EBAY_CLIENT_SECRET ?? null,
    environment: process.env.EBAY_ENVIRONMENT ?? 'production',
    redirectUri: process.env.EBAY_REDIRECT_URI ?? null,
    refreshToken: process.env.EBAY_USER_REFRESH_TOKEN ?? null,
    marketplaceId: process.env.EBAY_MARKETPLACE_ID ?? 'EBAY_US',
    contentLanguage: process.env.EBAY_CONTENT_LANGUAGE ?? 'en-US',
    timeoutMs: normalizeTimeout(process.env.EBAY_MCP_TIMEOUT_MS),
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
function buildHeaders(config: EbayMcpRuntimeConfig): HeadersInit {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }

  if (config.apiKey) {
    headers.authorization = `Bearer ${config.apiKey}`
  }

  return headers
}

function resolveActionUrl(baseUrl: string, action: EbayAction): string {
  return new URL(`/actions/${action}`, baseUrl).toString()
}

async function readResponseBody(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as unknown
  }
  catch {
    return raw
  }
}

function normalizeActionSuccess(action: EbayAction, body: unknown): JobResult {
  if (!isRecord(body)) {
    return {
      status: 'done',
      message: `eBay MCP ${action} completed`,
      data: {
        raw: body,
      },
    }
  }

  const statusValue = typeof body.status === 'string'
    ? body.status.toLowerCase()
    : null
  const message = typeof body.message === 'string'
    ? body.message
    : `eBay MCP ${action} completed`
  const errorCode = typeof body.errorCode === 'string'
    ? body.errorCode
    : undefined
  const errorValue = typeof body.error === 'string'
    ? body.error
    : undefined
  const boolSuccess = typeof body.success === 'boolean'
    ? body.success
    : typeof body.ok === 'boolean'
      ? body.ok
      : null

  if (statusValue === 'failed' || boolSuccess === false) {
    return {
      status: 'failed',
      message: errorValue ?? message,
      errorCode: errorCode ?? 'MCP_ACTION_FAILED',
      data: body,
    }
  }

  if (statusValue === 'running' || statusValue === 'pending') {
    return {
      status: 'running',
      message,
      data: body,
    }
  }

  return {
    status: 'done',
    message,
    data: body,
  }
}

export class EbayMcpAdapter implements IEbayMcpAdapter {
  constructor(private readonly config: EbayMcpRuntimeConfig = resolveEbayConfig()) {}

  private async execute<TPayload>(action: EbayAction, payload: TPayload): Promise<JobResult> {
    if (this.config.missing.length > 0 || !this.config.baseUrl) {
      return notReady(action, this.config)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(resolveActionUrl(this.config.baseUrl, action), {
        method: 'POST',
        headers: buildHeaders(this.config),
        signal: controller.signal,
        body: JSON.stringify({
          action,
          payload,
          context: {
            clientId: this.config.clientId,
            clientSecret: this.config.clientSecret,
            redirectUri: this.config.redirectUri,
            refreshToken: this.config.refreshToken,
            environment: this.config.environment,
            marketplaceId: this.config.marketplaceId,
            contentLanguage: this.config.contentLanguage,
          },
        }),
      })

      const body = await readResponseBody(response)
      if (!response.ok) {
        return {
          status: 'failed',
          message: `eBay MCP ${action} failed with HTTP ${response.status}`,
          errorCode: `MCP_HTTP_${response.status}`,
          data: {
            responseBody: body,
          },
        }
      }

      return normalizeActionSuccess(action, body)
    }
    catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError'
      return {
        status: 'failed',
        message: timedOut
          ? `eBay MCP ${action} timed out after ${this.config.timeoutMs}ms`
          : `eBay MCP ${action} request failed`,
        errorCode: timedOut ? 'MCP_TIMEOUT' : 'MCP_REQUEST_FAILED',
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      }
    }
    finally {
      clearTimeout(timeout)
    }
  }

  async publish(_payload: EbayPublishPayload): Promise<JobResult> {
    return this.execute('publish', _payload)
  }

  async update(_payload: EbayUpdatePayload): Promise<JobResult> {
    return this.execute('update', _payload)
  }

  async offer(_payload: EbayOfferPayload): Promise<JobResult> {
    return this.execute('offer', _payload)
  }

  async reprice(_payload: EbayRepricePayload): Promise<JobResult> {
    return this.execute('reprice', _payload)
  }
}

export class EbayMcpAdapterStub implements IEbayMcpAdapter {
  constructor(private readonly config: EbayMcpRuntimeConfig = resolveEbayConfig()) {}

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

export function createEbayMcpAdapter(): IEbayMcpAdapter {
  const config = resolveEbayConfig()
  if (config.missing.length > 0 || !config.baseUrl) {
    return new EbayMcpAdapterStub(config)
  }

  return new EbayMcpAdapter(config)
}
