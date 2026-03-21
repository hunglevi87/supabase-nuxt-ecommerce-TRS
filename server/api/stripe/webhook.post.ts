// File: server/api/stripe/webhook.post.ts
// Handles Stripe webhook events, including checkout.session.completed for offer-based purchases

import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import StripeSdk from 'stripe'
import { serverSupabaseClient } from '#supabase/server'
import { sendTransactionalEmail } from '~/server/utils/resend'

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export default defineEventHandler(async (event) => {
  if (!stripeWebhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return { received: true } // Don't expose that webhook is not configured
  }

  const body = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!body || !signature) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }

  // Verify Stripe signature
  const config = useRuntimeConfig()
  const stripeSecretKey = config.stripeSecretKey
  if (!stripeSecretKey) {
    throw createError({ statusCode: 500, message: 'Stripe not configured' })
  }

  let stripeEvent: Stripe.Event
  try {
    const stripe = new StripeSdk(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    })
    stripeEvent = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  const supabase = await serverSupabaseClient(event)

  // Handle checkout.session.completed
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session

    // Check if this is an offer-based purchase
    const offerId = session.metadata?.offerId
    if (offerId) {
      try {
        await handleOfferCheckoutCompletion(supabase, session, offerId)
      } catch (err) {
        console.error('Failed to process offer checkout:', err)
        // Still return 200 to acknowledge webhook
      }
    } else {
      // Regular cart purchase - add your logic here
      console.log('Regular checkout completed:', session.id)
    }
  }

  // Handle payment_intent.succeeded (alternative event)
  if (stripeEvent.type === 'payment_intent.succeeded') {
    console.log('Payment intent succeeded:', stripeEvent.data.object.id)
    // Optional: add logic here
  }

  // Handle charge.failed
  if (stripeEvent.type === 'charge.failed') {
    console.error('Charge failed:', stripeEvent.data.object.id)
    // Optional: notify seller
  }

  return { received: true }
})

async function handleOfferCheckoutCompletion(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  offerId: string
) {
  const buyerEmail = session.customer_email

  // Fetch offer to verify it's accepted
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single()

  if (offerError || !offer) {
    console.error('Offer not found:', offerId)
    return
  }

  if (offer.status !== 'accepted') {
    console.warn(`Offer ${offerId} is not in accepted status:`, offer.status)
    return
  }

  // Fetch product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', offer.product_id)
    .single()

  if (productError || !product) {
    console.error('Product not found:', offer.product_id)
    return
  }

  // Create order with offer context
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_email: buyerEmail,
      offer_id: offerId,
      final_amount: offer.offered_amount,
      stripe_session_id: session.id,
      status: 'paid',
      total: offer.offered_amount,
      subtotal: offer.offered_amount,
      tax: 0,
      shipping_cost: 0,
      order_type: 'thrifted', // or determine from product
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (orderError) {
    console.error('Failed to create order:', orderError)
    throw orderError
  }

  console.log('Order created:', order.id)

  // Persist immutable line-item snapshot for order history.
  const { error: orderItemError } = await supabase.from('order_items').insert({
    order_id: order.id,
    product_id: offer.product_id,
    title: product.title ?? 'Offer purchase',
    sku: product.sku ?? null,
    quantity: 1,
    unit_price: offer.offered_amount,
  })

  if (orderItemError) {
    console.error('Failed to create order item:', orderItemError)
  }

  // Decrement product inventory
  const newInventory = Math.max(0, product.inventory_qty - 1)
  const { error: updateError } = await supabase
    .from('products')
    .update({ inventory_qty: newInventory })
    .eq('id', offer.product_id)

  if (updateError) {
    console.error('Failed to update inventory:', updateError)
  } else {
    console.log(`Inventory updated: ${product.inventory_qty} → ${newInventory}`)
  }

  // Optional: Sync inventory back to eBay if product is synced
  if (product.ebay_listing_id) {
    try {
      const { error: jobError } = await supabase.from('sync_queue').insert({
        seller_id: product.seller_id,
        product_id: offer.product_id,
        action: 'reprice',
        marketplace: 'ebay',
        status: 'pending',
        payload: {
          listingId: product.ebay_listing_id,
          newPrice: product.price,
          reason: 'Inventory sold via haggle',
          newQuantity: newInventory,
        },
      })

      if (jobError) {
        console.error('Failed to create sync job:', jobError)
      } else {
        console.log('eBay inventory sync job created')
      }
    } catch (err) {
      console.error('Error creating sync job:', err)
    }
  }

  // Send confirmation email to buyer (async)
  sendOrderConfirmationEmail({
    buyerEmail: buyerEmail || '',
    productName: product.name,
    amount: offer.offered_amount,
    orderId: order.id,
  }).catch((err) => {
    console.error('Email send failed:', err)
  })
}

async function sendOrderConfirmationEmail({
  buyerEmail,
  productName,
  amount,
  orderId,
}: {
  buyerEmail: string
  productName: string
  amount: number
  orderId: string
}) {
  if (!buyerEmail) {
    throw new Error('Buyer email is required for order confirmation email')
  }

  await sendTransactionalEmail({
    to: buyerEmail,
    subject: `Order Confirmed - ${productName}`,
    html: `
      <h2>Order Confirmed</h2>
      <p>Thanks for your purchase from The Relic Shop.</p>
      <ul>
        <li><strong>Order ID:</strong> ${orderId}</li>
        <li><strong>Item:</strong> ${productName}</li>
        <li><strong>Amount Paid:</strong> $${amount.toFixed(2)}</li>
      </ul>
      <p>We will follow up with shipping details.</p>
    `,
    text: [
      'Order Confirmed',
      `Order ID: ${orderId}`,
      `Item: ${productName}`,
      `Amount Paid: $${amount.toFixed(2)}`,
    ].join('\n'),
  })
}
