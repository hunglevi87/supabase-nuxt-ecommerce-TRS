// File: server/api/offers/decline.post.ts
// Endpoint: POST /api/offers/decline
// Body: { offerId: string }

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { sendTransactionalEmail } from '~/server/utils/resend'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { offerId } = body

  if (!offerId) {
    throw createError({ statusCode: 400, message: 'Offer ID required' })
  }

  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  // Verify admin
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)

  const isAdmin = userRoles?.some((r: { role: string }) => r.role === 'admin')
  if (!isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Fetch offer
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select(
      `
      id,
      status,
      buyer_email,
      product_id,
      products(name)
    `
    )
    .eq('id', offerId)
    .single()

  if (offerError || !offer) {
    throw createError({ statusCode: 404, message: 'Offer not found' })
  }

  // Check if offer is still pending
  if (offer.status !== 'pending') {
    throw createError({
      statusCode: 409,
      message: `Cannot decline offer with status: ${offer.status}`,
    })
  }

  // Update offer status to declined
  const { error: updateError } = await supabase
    .from('offers')
    .update({
      status: 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('id', offerId)

  if (updateError) {
    console.error('Failed to update offer status:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Failed to decline offer',
    })
  }

  // Send buyer notification email (async)
  sendBuyerDeclineEmail({
    buyerEmail: offer.buyer_email,
    productName: offer.products.name,
  }).catch((err) => {
    console.error('Email send failed:', err)
  })

  return {
    success: true,
    message: 'Offer declined',
  }
})

async function sendBuyerDeclineEmail({
  buyerEmail,
  productName,
}: {
  buyerEmail: string
  productName: string
}) {
  await sendTransactionalEmail({
    to: buyerEmail,
    subject: `Your Offer Was Declined - ${productName}`,
    html: `
      <h2>Offer Update</h2>
      <p>Thanks for your interest in <strong>${productName}</strong>.</p>
      <p>Your recent offer was declined.</p>
      <p>You can still browse available items in The Relic Shop and submit another offer later.</p>
    `,
    text: [
      `Your offer for ${productName} was declined.`,
      'Thanks for shopping with The Relic Shop.',
    ].join('\n'),
  })
}
