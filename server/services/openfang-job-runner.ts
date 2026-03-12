import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { EbayMcpAdapterStub, type IEbayMcpAdapter } from '~/server/services/ebay-mcp-adapter'
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
const ACTION_TO_HANDLER: Record<string, keyof IEbayMcpAdapter> = {
  publish: 'publish',
  update: 'update',
  offer: 'offer',
  reprice: 'reprice',
}

function normalizeAction(action: string): string {
  return action.trim().toLowerCase().replace(/^ebay[-_:]/, '')
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
  limit = 25,
): Promise<SyncQueueJob[]> {
  const { data, error } = await client
    .from(SYNC_QUEUE_TABLE)
    .select(
      'id,seller_id,product_id,marketplace,action,payload,status,retry_count,max_retries,created_at,scheduled_at,completed_at,error_message',
    )
    .in('status', READY_STATUSES)
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch ready jobs: ${error.message}`,
    })
  }

  return (data as SyncQueueJob[]) ?? []
}

export async function dispatchJob(
  job: SyncQueueJob,
  adapter: IEbayMcpAdapter,
): Promise<JobResult> {
  const normalized = normalizeAction(job.action)
  const payload = job.payload ?? {}

  if (ACTION_TO_HANDLER[normalized] === 'publish') {
    return toJobResult(await adapter.publish(payload as unknown as EbayPublishPayload))
  }

  if (ACTION_TO_HANDLER[normalized] === 'update') {
    return toJobResult(await adapter.update(payload as unknown as EbayUpdatePayload))
  }

  if (ACTION_TO_HANDLER[normalized] === 'offer') {
    return toJobResult(await adapter.offer(payload as unknown as EbayOfferPayload))
  }

  if (ACTION_TO_HANDLER[normalized] === 'reprice') {
    return toJobResult(await adapter.reprice(payload as unknown as EbayRepricePayload))
  }

  return {
    status: 'failed',
    message: `No handler registered for action "${job.action}"`,
    errorCode: 'UNKNOWN_ACTION',
  }
}

export async function persistJobResult(
  client: SupabaseClient,
  job: SyncQueueJob,
  result: JobResult,
): Promise<void> {
  const done = result.status === 'done'
  const nextStatus = done ? 'done' : 'failed'

  const { error } = await client
    .from(SYNC_QUEUE_TABLE)
    .update({
      status: nextStatus,
      completed_at: new Date().toISOString(),
      error_message: done ? null : (result.message ?? 'Job failed'),
    })
    .eq('id', job.id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to persist job result for ${job.id}: ${error.message}`,
    })
  }
}

export interface JobCycleSummary {
  processed: number
  succeeded: number
  failed: number
}

export async function runJobCycle(
  client: SupabaseClient,
  adapter: IEbayMcpAdapter = new EbayMcpAdapterStub(),
): Promise<JobCycleSummary> {
  const readyJobs = await fetchReadyJobs(client)
  let succeeded = 0
  let failed = 0

  for (const job of readyJobs) {
    try {
      const result = await dispatchJob(job, adapter)
      await persistJobResult(client, job, result)
      if (result.status === 'done') {
        succeeded += 1
      }
      else {
        failed += 1
      }
    }
    catch {
      failed += 1
    }
  }

  return {
    processed: readyJobs.length,
    succeeded,
    failed,
  }
}
