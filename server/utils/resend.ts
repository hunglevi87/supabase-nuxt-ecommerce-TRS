interface SendTransactionalEmailInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

interface ResendResponse {
  id?: string
  message?: string
}

export async function sendTransactionalEmail(input: SendTransactionalEmailInput): Promise<ResendResponse> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
  })

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(`Resend API request failed (${response.status}): ${responseText}`)
  }

  return (await response.json()) as ResendResponse
}
