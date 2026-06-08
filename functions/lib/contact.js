export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const getRequestIp = (request) => {
  const forwardedFor = request.headers.get('x-forwarded-for') || ''

  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('true-client-ip') ||
    forwardedFor.split(',')[0]?.trim() ||
    ''
  )
}

const verifyTurnstile = async ({ secret, token, remoteIp }) => {
  const formData = new FormData()
  formData.append('secret', secret)
  formData.append('response', token)

  if (remoteIp) {
    formData.append('remoteip', remoteIp)
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    return false
  }

  const result = await response.json()
  return Boolean(result.success)
}

export const handleContactRequest = async (request, env) => {
  const apiKey = env.RESEND_API_KEY
  const toEmail = env.CONTACT_TO_EMAIL
  const fromEmail = env.CONTACT_FROM_EMAIL
  const turnstileSecret = env.TURNSTILE_SECRET_KEY

  if (!apiKey || !toEmail || !fromEmail || !turnstileSecret) {
    return json({ error: 'Contact form is not configured.' }, 500)
  }

  let payload

  try {
    payload = await request.json()
  } catch (error) {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const name = String(payload.name || '').trim()
  const email = String(payload.email || '').trim()
  const message = String(payload.message || '').trim()
  const company = String(payload.company || '').trim()
  const submittedIp = String(payload.ipAddress || '').trim().slice(0, 120)
  const turnstileToken = String(payload.turnstileToken || '').trim()
  const requestIp = getRequestIp(request)
  const ipAddress = requestIp || submittedIp || 'Unavailable'

  if (company) {
    return json({ ok: true })
  }

  if (!turnstileToken) {
    return json({ error: 'Verification is required.' }, 400)
  }

  const turnstileValid = await verifyTurnstile({
    secret: turnstileSecret,
    token: turnstileToken,
    remoteIp: requestIp || submittedIp,
  })

  if (!turnstileValid) {
    return json({ error: 'Verification failed.' }, 400)
  }

  if (!name || !isValidEmail(email) || !message) {
    return json({ error: 'Name, email, and message are required.' }, 400)
  }

  if (name.length > 120 || email.length > 254 || message.length > 5000) {
    return json({ error: 'Message is too long.' }, 400)
  }

  const subject = `Website message from ${name}`
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `IP address: ${ipAddress}`,
    '',
    'Message:',
    message,
  ].join('\n')
  const html = `
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>IP address:</strong> ${escapeHtml(ipAddress)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Abraham Godong Website <${fromEmail}>`,
      to: [toEmail],
      reply_to: `${name} <${email}>`,
      subject,
      text,
      html,
    }),
  })

  if (!resendResponse.ok) {
    return json({ error: 'Email could not be sent.' }, 502)
  }

  return json({ ok: true })
}
