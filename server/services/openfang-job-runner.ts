import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { EmmaAiAdapter, isAiHandAction } from '~/server/services/emma-ai-adapter'
import { createEbayMcpAdapter, type IEbayMcpAdapter } from '~/server/services/ebay-mcp-adapter'
import type {
  EbayOfferPayload,
  EbayPublishPayload,
  EbayRepricePayload,
  EbayUpdatePayload,
  JobResult,
  SyncQueueJob,
} from '~/types/emma-jobs.types'

const SYNC_QUEUE_TABLE = 'sync_queue'
const READY_STATUSES = ['pending', 'queued']
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const DEFAULT_BASE_BACKOFF_SECONDS = 30
const DEFAULT_MAX_BACKOFF_SECONDS = 900
const ACTION_TO_HANDLER: Record<string, keyof IEbayMcpAdapter> = {
  publish: 'publish',
  update: 'update',
  offer: 'offer',
  reprice: 'reprice',
}
export interface RunJobCycleOptions extends PersistJobOptions {
  limit?: number
  ebayAdapter?: IEbayMcpAdapter
  aiAdapter?: EmmaAiAdapter
}

function normalizeAction(action: string): string {
  return action.trim().toLowerCase().replace(/^ebay[-_:]/, '')
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIMIT
  }

  return Math.min(Math.max(Math.round(limit), 1), MAX_LIMIT)
}

function normalizeBackoff(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback
  }

  return Math.round(value)
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function toJobResult(result: JobResult | null | undefined): JobResult {
  if (!result) {
    return {
      status: 'failed',
      message: 'Job handler returned no result',
      errorCode: 'EMPTY_RESULT',
    }
  }

  return result
}

export async function fetchReadyJobs(
  client: SupabaseClient,
  limit = DEFAULT_LIMIT,
): Promise<SyncQueueJob[]> {
  const normalizedLimit = normalizeLimit(limit)
  const { data, error } = await client
    .from(SYNC_QUEUE_TABLE)
    .select(
      'id,seller_id,product_id,marketplace,action,payload,status,retry_count,max_retries,created_at,scheduled_at,completed_at,error_message',
    )
    .in('status', READY_STATUSES)
    .order('scheduled_at', { ascending: true })
    .limit(normalizedLimit)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch ready jobs: ${error.message}`,
    })
  }

  return (data as SyncQueueJob[]) ?? []
}
export async function markJobRunning(
  client: SupabaseClient,
  job: SyncQueueJob,
): Promise<void> {
  const { error } = await client
    .from(SYNC_QUEUE_TABLE)
    .update({
      status: 'running',
      error_message: null,
    })
    .eq('id', job.id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to mark job ${job.id} as running: ${error.message}`,
    })
  }
}

interface DispatchAdapters {
  ebayAdapter: IEbayMcpAdapter
  aiAdapter: EmmaAiAdapter
}

export async function dispatchJob(
  job: SyncQueueJob,
  adapters: DispatchAdapters,
): Promise<JobResult> {
  const normalized = normalizeAction(job.action)
  const payload = job.payload ?? {}

  if (ACTION_TO_HANDLER[normalized] === 'publish') {
    return toJobResult(await adapters.ebayAdapter.publish(payload as unknown as EbayPublishPayload))
  }

  if (ACTION_TO_HANDLER[normalized] === 'update') {
    return toJobResult(await adapters.ebayAdapter.update(payload as unknown as EbayUpdatePayload))
  }

  if (ACTION_TO_HANDLER[normalized] === 'offer') {
    return toJobResult(await adapters.ebayAdapter.offer(payload as unknown as EbayOfferPayload))
  }

  if (ACTION_TO_HANDLER[normalized] === 'reprice') {
    return toJobResult(await adapters.ebayAdapter.reprice(payload as unknown as EbayRepricePayload))
  }

  if (isAiHandAction(normalized)) {
    return toJobResult(await adapters.aiAdapter.run(normalized, job))
  }

  return {
    status: 'failed',
    message: `No handler registered for action "${job.action}"`,
    errorCode: 'UNKNOWN_ACTION',
  }
}
export interface PersistJobOptions {
  baseBackoffSeconds?: number
  maxBackoffSeconds?: number
}

export interface PersistedJobOutcome {
  status: 'done' | 'failed' | 'pending'
  wasRetried: boolean
}

export async function persistJobResult(
  client: SupabaseClient,
  job: SyncQueueJob,
  result: JobResult,
  options: PersistJobOptions = {},
): Promise<PersistedJobOutcome> {
  const done = result.status === 'done'
  const maxRetries = job.max_retries ?? 3
  const currentRetryCount = job.retry_count ?? 0
  const nextRetryCount = done ? currentRetryCount : currentRetryCount + 1
  const shouldRetry = !done && nextRetryCount < maxRetries
  const nextStatus: 'done' | 'failed' | 'pending' = done
    ? 'done'
    : shouldRetry
      ? 'pending'
      : 'failed'
  const baseBackoffSeconds = normalizeBackoff(options.baseBackoffSeconds, DEFAULT_BASE_BACKOFF_SECONDS)
  const maxBackoffSeconds = Math.max(
    baseBackoffSeconds,
    normalizeBackoff(options.maxBackoffSeconds, DEFAULT_MAX_BACKOFF_SECONDS),
  )
  const retryDelaySeconds = shouldRetry
    ? Math.min(maxBackoffSeconds, baseBackoffSeconds * (2 ** Math.max(nextRetryCount - 1, 0)))
    : 0
  const nextScheduledAt = shouldRetry
    ? new Date(Date.now() + (retryDelaySeconds * 1000)).toISOString()
    : null

  const { error } = await client
    .from(SYNC_QUEUE_TABLE)
    .update({
      status: nextStatus,
      retry_count: done ? currentRetryCount : nextRetryCount,
      completed_at: nextStatus === 'pending' ? null : new Date().toISOString(),
      scheduled_at: nextScheduledAt,
      error_message: done ? null : (result.message ?? 'Job failed'),
    })
    .eq('id', job.id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to persist job result for ${job.id}: ${error.message}`,
    })
  }

  return {
    status: nextStatus,
    wasRetried: shouldRetry,
  }
}

export interface JobCycleSummary {
  processed: number
  succeeded: number
  failed: number
  retried: number
}

export async function runJobCycle(
  client: SupabaseClient,
  options: RunJobCycleOptions = {},
): Promise<JobCycleSummary> {
  const limit = normalizeLimit(options.limit ?? DEFAULT_LIMIT)
  const ebayAdapter = options.ebayAdapter ?? createEbayMcpAdapter()
  const aiAdapter = options.aiAdapter ?? new EmmaAiAdapter()
  const readyJobs = await fetchReadyJobs(client, limit)
  let succeeded = 0
  let failed = 0
  let retried = 0

  for (const job of readyJobs) {
    try {
      await markJobRunning(client, job)
      const result = await dispatchJob(job, {
        ebayAdapter,
        aiAdapter,
      })
      const persisted = await persistJobResult(client, job, result, options)

      if (persisted.status === 'done') {
        succeeded += 1
      }
      else if (persisted.status === 'pending') {
        retried += 1
      }
      else {
        failed += 1
      }
    }
    catch (error) {
      const failureResult: JobResult = {
        status: 'failed',
        message: `Job runner exception: ${readErrorMessage(error)}`,
        errorCode: 'RUNNER_EXCEPTION',
      }

      try {
        const persisted = await persistJobResult(client, job, failureResult, options)
        if (persisted.status === 'pending') {
          retried += 1
        }
        else {
          failed += 1
        }
      }
      catch {
        failed += 1
      }
    }
  }

  return {
    processed: readyJobs.length,
    succeeded,
    failed,
    retried,
  }
}
