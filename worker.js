import { handleContactRequest, json } from './functions/lib/contact.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/contact/ip') {
      return json({
        ip:
          request.headers.get('cf-connecting-ip') ||
          request.headers.get('true-client-ip') ||
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          '',
      })
    }

    if (url.pathname === '/api/contact/config') {
      return json({
        turnstileSiteKey: env.TURNSTILE_SITE_KEY || '',
      })
    }

    if (url.pathname === '/api/contact') {
      if (request.method === 'POST') {
        return handleContactRequest(request, env)
      }

      return json({ error: 'Method not allowed.' }, 405)
    }

    return env.ASSETS.fetch(request)
  },
}
