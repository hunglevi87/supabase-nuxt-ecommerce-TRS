import type { EmmaHand, JobResult, SyncQueueJob } from '~/types/emma-jobs.types'

const HANDS: EmmaHand[] = [
  'gemini-stash-review',
  'classify-product',
  'price-product',
  'generate-selfcare-bundles',
]
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

function normalizeActionName(action: string): string {
  return action.trim().toLowerCase()
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function normalizeResponse(action: EmmaHand, body: unknown): JobResult {
  if (!isRecord(body)) {
    return {
      status: 'done',
      message: `${action} completed`,
      data: {
        raw: body,
      },
    }
  }

  const status = readString(body.status)?.toLowerCase()
  const message = readString(body.message) ?? `${action} completed`
  const explicitError = readString(body.error)
  const explicitErrorCode = readString(body.errorCode)
  const successFlag = typeof body.success === 'boolean'
    ? body.success
    : typeof body.ok === 'boolean'
      ? body.ok
      : null

  if (status === 'failed' || successFlag === false) {
    return {
      status: 'failed',
      message: explicitError ?? message,
      errorCode: explicitErrorCode ?? 'AI_ACTION_FAILED',
      data: body,
    }
  }

  if (status === 'running' || status === 'pending') {
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

function parseBody(text: string): unknown {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  }
  catch {
    return text
  }
}

export interface EmmaAiRuntimeConfig {
  aiEndpoint: string | null
  apiKey: string | null
  timeoutMs: number
}

export function resolveEmmaAiConfig(): EmmaAiRuntimeConfig {
  return {
    aiEndpoint: process.env.OPENFANG_AI_ENDPOINT ?? process.env.EMMA_AI_ENDPOINT ?? null,
    apiKey: process.env.OPENFANG_AI_API_KEY ?? null,
    timeoutMs: normalizeTimeout(process.env.OPENFANG_AI_TIMEOUT_MS),
  }
}

export function isAiHandAction(action: string): action is EmmaHand {
  const normalized = normalizeActionName(action)
  return HANDS.some(hand => hand === normalized)
}


function buildHeaders(config: EmmaAiRuntimeConfig): HeadersInit {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }

  if (config.apiKey) {
    headers.authorization = `Bearer ${config.apiKey}`
  }

  return headers
}

export class EmmaAiAdapter {
  constructor(private readonly config: EmmaAiRuntimeConfig = resolveEmmaAiConfig()) {}

  async run(action: EmmaHand, job: SyncQueueJob): Promise<JobResult> {
    const endpoint = this.config.aiEndpoint
    if (!endpoint) {
      return {
        status: 'failed',
        message: `No endpoint configured for AI hand ${action}`,
        errorCode: 'AI_CONFIG_MISSING',
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(this.config),
        signal: controller.signal,
        body: JSON.stringify({
          action,
          jobId: job.id,
          sellerId: job.seller_id,
          productId: job.product_id,
          marketplace: job.marketplace,
          payload: job.payload ?? {},
        }),
      })
      const body = parseBody(await response.text())

      if (!response.ok) {
        return {
          status: 'failed',
          message: `AI hand ${action} failed with HTTP ${response.status}`,
          errorCode: `AI_HTTP_${response.status}`,
          data: {
            responseBody: body,
          },
        }
      }

      return normalizeResponse(action, body)
    }
    catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError'
      return {
        status: 'failed',
        message: timedOut
          ? `AI hand ${action} timed out after ${this.config.timeoutMs}ms`
          : `AI hand ${action} request failed`,
        errorCode: timedOut ? 'AI_TIMEOUT' : 'AI_REQUEST_FAILED',
        data: {
          error: readErrorMessage(error),
        },
      }
    }
    finally {
      clearTimeout(timeout)
    }
  }
}
