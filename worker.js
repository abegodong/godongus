import { handleContactRequest, json } from './functions/lib/contact.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/contact') {
      if (request.method === 'POST') {
        return handleContactRequest(request, env)
      }

      return json({ error: 'Method not allowed.' }, 405)
    }

    return env.ASSETS.fetch(request)
  },
}
