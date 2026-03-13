import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { runJobCycle } from '~/server/services/openfang-job-runner'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

function normalizeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }

  return Math.min(Math.max(Math.round(numeric), min), max)
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return null
  }

  return authHeader.slice(7).trim()
}

function enforceRunnerToken(event: H3Event): void {
  const expectedToken = process.env.OPENFANG_RUNNER_TOKEN
  if (!expectedToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OPENFANG_RUNNER_TOKEN is not configured.',
    })
  }

  const tokenFromHeader = getHeader(event, 'x-openfang-runner-token')
  const bearerToken = extractBearerToken(getHeader(event, 'authorization'))
  const providedToken = tokenFromHeader ?? bearerToken

  if (!providedToken || providedToken !== expectedToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }
}

type RunBody = {
  limit?: number
  baseBackoffSeconds?: number
  maxBackoffSeconds?: number
}

export default defineEventHandler(async (event) => {
  enforceRunnerToken(event)
  const client = event.context.supabase as SupabaseClient
  const body = await readBody<RunBody>(event).catch(() => ({} as RunBody))
  const query = getQuery(event)

  const limit = normalizeNumber(body.limit ?? query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  const baseBackoffSeconds = normalizeNumber(body.baseBackoffSeconds ?? query.baseBackoffSeconds, 30, 5, 3600)
  const maxBackoffSeconds = normalizeNumber(body.maxBackoffSeconds ?? query.maxBackoffSeconds, 900, 30, 86400)

  const summary = await runJobCycle(client, {
    limit,
    baseBackoffSeconds,
    maxBackoffSeconds,
  })

  return {
    ok: true,
    ...summary,
  }
})
