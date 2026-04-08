// File: server/api/offers/accept.post.ts
// Endpoint: POST /api/offers/accept
// Body: { offerId: string }

import Stripe from 'stripe'
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

  // Fetch offer with product details
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select(
      `
      id,
      status,
      offered_amount,
      buyer_email,
      product_id,
      expires_at,
      products(id, name, price)
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
      message: `Cannot accept offer with status: ${offer.status}`,
    })
  }

  // Check if offer has expired
  const expiryTime = new Date(offer.expires_at).getTime()
  const now = Date.now()
  if (now > expiryTime) {
    // Auto-update status to expired
    await supabase.from('offers').update({ status: 'expired' }).eq('id', offerId)

    throw createError({
      statusCode: 410,
      message: 'This offer has expired',
    })
  }

  // Create Stripe Checkout Session
  const config = useRuntimeConfig()
  const stripeKey = config.stripeSecretKey
  if (!stripeKey) {
    throw createError({
      statusCode: 500,
      message: 'Stripe not configured',
    })
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-08-27.basil',
  })

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: offer.products.name,
              description: `Negotiated price via offer`,
            },
            unit_amount: Math.round(offer.offered_amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/products/${offer.products.id}`,
      customer_email: offer.buyer_email,
      metadata: {
        offerId: offer.id,
        productId: offer.product_id,
        buyerEmail: offer.buyer_email,
      },
    })

    // Update offer status to accepted
    const { error: updateError } = await supabase
      .from('offers')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)

    if (updateError) {
      console.error('Failed to update offer status:', updateError)
    }

    // Send buyer notification email (async)
    sendBuyerEmail({
      buyerEmail: offer.buyer_email,
      productName: offer.products.name,
      offerAmount: offer.offered_amount,
      checkoutUrl: session.url || '',
    }).catch((err) => {
      console.error('Email send failed:', err)
    })

    return {
      success: true,
      stripeCheckoutUrl: session.url,
      sessionId: session.id,
    }
  } catch (stripeError) {
    console.error('Stripe error:', stripeError)
    throw createError({
      statusCode: 500,
      message: 'Failed to create Stripe checkout session',
    })
  }
})

async function sendBuyerEmail({
  buyerEmail,
  productName,
  offerAmount,
  checkoutUrl,
}: {
  buyerEmail: string
  productName: string
  offerAmount: number
  checkoutUrl: string
}) {
  await sendTransactionalEmail({
    to: buyerEmail,
    subject: `Your Offer Was Accepted! - ${productName}`,
    html: `
      <h2>Your Offer Was Accepted</h2>
      <p>Great news! Your offer for <strong>${productName}</strong> has been accepted.</p>
      <p><strong>Accepted Price:</strong> $${offerAmount.toFixed(2)}</p>
      <p><a href="${checkoutUrl}">Complete Payment</a></p>
      <p>This payment link is tied to your accepted offer.</p>
    `,
    text: [
      `Your offer was accepted for ${productName}.`,
      `Accepted price: $${offerAmount.toFixed(2)}`,
      `Complete payment: ${checkoutUrl}`,
    ].join('\n'),
  })
}
