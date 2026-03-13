import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL (or NUXT_PUBLIC_SUPABASE_URL) for smoke test.')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) for smoke test.')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const { count, error: countError } = await supabase
  .from('sync_queue')
  .select('*', { count: 'exact', head: true })

if (countError) {
  throw new Error(`Unable to query sync_queue: ${countError.message}`)
}

process.stdout.write(`sync_queue is reachable. Existing rows: ${count ?? 0}\n`)

const { data: seededProduct, error: productError } = await supabase
  .from('products')
  .select('id,seller_id')
  .limit(1)
  .maybeSingle()

if (productError) {
  throw new Error(`Unable to query products for smoke seed: ${productError.message}`)
}

if (!seededProduct) {
  process.stdout.write('No product rows found. Skipping write-path smoke test.\n')
  process.exit(0)
}

const smokeToken = `sync-smoke-${randomUUID()}`
let insertedId = null
let cleanupErrorMessage = null

try {
  const { data: inserted, error: insertError } = await supabase
    .from('sync_queue')
    .insert({
      seller_id: seededProduct.seller_id,
      product_id: seededProduct.id,
      marketplace: 'ebay',
      action: 'publish',
      payload: {
        smokeToken,
      },
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      max_retries: 1,
    })
    .select('id,status,retry_count')
    .single()

  if (insertError) {
    throw new Error(`Unable to insert sync_queue smoke row: ${insertError.message}`)
  }

  insertedId = inserted.id
  process.stdout.write(`Inserted smoke row: ${insertedId}\n`)

  const { data: updated, error: updateError } = await supabase
    .from('sync_queue')
    .update({
      status: 'failed',
      error_message: `smoke test marker ${smokeToken}`,
      completed_at: new Date().toISOString(),
    })
    .eq('id', insertedId)
    .select('id,status,error_message')
    .single()

  if (updateError) {
    throw new Error(`Unable to update smoke row ${insertedId}: ${updateError.message}`)
  }

  if (updated.status !== 'failed') {
    throw new Error(`Unexpected status for smoke row ${insertedId}: ${updated.status}`)
  }

  process.stdout.write(`Updated smoke row: ${updated.id} -> ${updated.status}\n`)
}
finally {
  if (insertedId) {
    const { error: deleteError } = await supabase
      .from('sync_queue')
      .delete()
      .eq('id', insertedId)

    if (deleteError) {
      cleanupErrorMessage = `Unable to delete smoke row ${insertedId}: ${deleteError.message}`
    }
    else {
      process.stdout.write(`Deleted smoke row: ${insertedId}\n`)
    }
  }
}

if (cleanupErrorMessage) {
  throw new Error(cleanupErrorMessage)
}

process.stdout.write('sync_queue smoke test passed.\n')
