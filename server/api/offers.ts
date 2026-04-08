import type { OfferInsert } from '~/types/haggle.types'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { sendTransactionalEmail } from '~/server/utils/resend'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  // Handle GET: List offers (admin only)
  if (event.req.method === 'GET') {
    // Get status filter from query
    const status = getQuery(event).status as string | undefined

    // Verify admin
    const user = await serverSupabaseUser(event)
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

    // Query offers
    let query = supabase
      .from('offers')
      .select(
        `
        id,
        product_id,
        buyer_email,
        offered_amount,
        status,
        expires_at,
        created_at,
        products(id, name, price)
      `
      )
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      throw createError({ statusCode: 400, message: error.message })
    }

    return data
  }

  // Handle POST: Create new offer
  if (event.req.method === 'POST') {
    const body = await readBody(event)
    const { productId, offerAmount, buyerEmail } = body

    // Validate inputs
    if (!productId || !offerAmount || !buyerEmail) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: productId, offerAmount, buyerEmail',
      })
    }

    if (!buyerEmail.includes('@')) {
      throw createError({ statusCode: 400, message: 'Invalid email address' })
    }

    if (typeof offerAmount !== 'number' || offerAmount <= 0) {
      throw createError({ statusCode: 400, message: 'Offer amount must be positive' })
    }

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, allows_haggle, inventory_qty')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      throw createError({ statusCode: 404, message: 'Product not found' })
    }

    // Validate haggle is allowed
    if (!product.allows_haggle) {
      throw createError({
        statusCode: 400,
        message: 'This product does not accept offers',
      })
    }

    // Check inventory
    if (product.inventory_qty === 0) {
      throw createError({ statusCode: 400, message: 'Product is out of stock' })
    }

    // Validate offer amount (70% minimum)
    const minOffer = product.price * 0.7
    if (offerAmount < minOffer) {
      throw createError({
        statusCode: 400,
        message: `Offer must be at least $${minOffer.toFixed(2)} (70% of list price)`,
      })
    }

    // Check for duplicate active offers (1 per buyer per product per 24hrs)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentOffers } = await supabase
      .from('offers')
      .select('id')
      .eq('product_id', productId)
      .eq('buyer_email', buyerEmail)
      .eq('status', 'pending')
      .gte('created_at', oneDayAgo)

    if (recentOffers && recentOffers.length > 0) {
      throw createError({
        statusCode: 400,
        message: 'You already have an active offer for this product. Try again in 24 hours.',
      })
    }

    // Create offer
    const offerData: OfferInsert = {
      product_id: productId,
      buyer_email: buyerEmail,
      offered_amount: offerAmount,
      status: 'pending',
    }

    const { data: offer, error: insertError } = await supabase
      .from('offers')
      .insert(offerData)
      .select()
      .single()

    if (insertError) {
      console.error('Offer creation error:', insertError)
      throw createError({
        statusCode: 500,
        message: 'Failed to create offer',
      })
    }

    // Send email to seller (implement in separate service)
    try {
      await sendSellerNotificationEmail({
        productName: product.name,
        offerId: offer.id,
        offerAmount,
        listPrice: product.price,
        buyerEmail,
      })
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      // Don't fail the request if email fails
    }

    // Optional: Send Telegram notification if configured
    try {
      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
      const telegramChatId = process.env.TELEGRAM_CHAT_ID
      if (telegramBotToken && telegramChatId) {
        await sendTelegramNotification(
          `💬 New offer: $${offerAmount} (list: $${product.price}) for "${product.name}" from ${buyerEmail}`
        )
      }
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError)
    }

    return {
      success: true,
      offerId: offer.id,
      status: offer.status,
      expiresAt: offer.expires_at,
    }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

// Helper function to send seller notification email
async function sendSellerNotificationEmail({
  productName,
  offerId,
  offerAmount,
  listPrice,
  buyerEmail,
}: {
  productName: string
  offerId: string
  offerAmount: number
  listPrice: number
  buyerEmail: string
}) {
  const sellerEmail = process.env.SELLER_EMAIL

  if (!sellerEmail) {
    throw new Error('SELLER_EMAIL is not configured')
  }

  const html = `
    <h2>New Offer Received</h2>
    <p>A customer submitted a new offer.</p>
    <ul>
      <li><strong>Product:</strong> ${productName}</li>
      <li><strong>Offer:</strong> $${offerAmount.toFixed(2)}</li>
      <li><strong>List Price:</strong> $${listPrice.toFixed(2)}</li>
      <li><strong>Buyer Email:</strong> ${buyerEmail}</li>
      <li><strong>Offer ID:</strong> ${offerId}</li>
    </ul>
    <p>Review this offer in the TRS admin dashboard.</p>
  `

  await sendTransactionalEmail({
    to: sellerEmail,
    subject: `New Offer on ${productName}`,
    html,
    text: [
      'New Offer Received',
      `Product: ${productName}`,
      `Offer: $${offerAmount.toFixed(2)}`,
      `List Price: $${listPrice.toFixed(2)}`,
      `Buyer Email: ${buyerEmail}`,
      `Offer ID: ${offerId}`,
    ].join('\n'),
  })
}

// Helper function to send Telegram notification
async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    throw new Error('Telegram config missing')
  }

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    }
  )

  if (!res.ok) {
    throw new Error(`Telegram API error: ${res.statusText}`)
  }
}
