const json = (body, status = 200) =>
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

export const onRequestPost = async ({ request, env }) => {
  const apiKey = env.SENDGRID_API_KEY
  const toEmail = env.CONTACT_TO_EMAIL
  const fromEmail = env.CONTACT_FROM_EMAIL

  if (!apiKey || !toEmail || !fromEmail) {
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

  if (company) {
    return json({ ok: true })
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
    '',
    'Message:',
    message,
  ].join('\n')
  const html = `
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `

  const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: toEmail }],
        },
      ],
      from: {
        email: fromEmail,
        name: 'Abraham Godong Website',
      },
      reply_to: {
        email,
        name,
      },
      subject,
      content: [
        {
          type: 'text/plain',
          value: text,
        },
        {
          type: 'text/html',
          value: html,
        },
      ],
    }),
  })

  if (!sendGridResponse.ok) {
    return json({ error: 'Email could not be sent.' }, 502)
  }

  return json({ ok: true })
}

export const onRequestGet = () => json({ error: 'Method not allowed.' }, 405)
export const onRequestPut = () => json({ error: 'Method not allowed.' }, 405)
export const onRequestPatch = () => json({ error: 'Method not allowed.' }, 405)
export const onRequestDelete = () => json({ error: 'Method not allowed.' }, 405)
