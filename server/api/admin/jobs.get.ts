import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

export default defineEventHandler(async (event) => {
  const client = event.context.supabase as SupabaseClient
  const query = getQuery(event)

  const status = typeof query.status === 'string' ? query.status : undefined
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(query.offset) || 0, 0)

  let supabaseQuery = client
    .from('sync_queue')
    .select(
      'id,marketplace,action,status,created_at,scheduled_at,completed_at,error_message,retry_count,max_retries,seller_id,product_id',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') {
    supabaseQuery = supabaseQuery.eq('status', status)
  }

  const { data, count, error } = await supabaseQuery

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch admin jobs: ${error.message}`,
    })
  }

  return {
    jobs: data ?? [],
    count: count ?? 0,
    limit,
    offset,
  }
})
