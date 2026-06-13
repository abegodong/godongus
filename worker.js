import { handleContactRequest, json } from './functions/lib/contact.js'

const deadReckoningPoisCsvUrl =
  'https://docs.google.com/spreadsheets/d/1bwaJZiFD1QsQ5QXfdTSbTdl8w-dLYUfIb04nQcGkJ3c/gviz/tq?tqx=out:csv&gid=1827903938'
const triangulatedPoisCsvUrl =
  'https://docs.google.com/spreadsheets/d/1bwaJZiFD1QsQ5QXfdTSbTdl8w-dLYUfIb04nQcGkJ3c/gviz/tq?tqx=out:csv&gid=2021580753'

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

    if (url.pathname === '/api/dead-reckoning-pois') {
      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed.' }, 405)
      }

      const response = await fetch(deadReckoningPoisCsvUrl, {
        headers: {
          Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8',
        },
      })

      if (!response.ok) {
        return json({ error: 'Unable to load Dead Reckoning POIs.' }, 502)
      }

      return new Response(await response.text(), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    }

    if (url.pathname === '/api/triangulated-pois') {
      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed.' }, 405)
      }

      const response = await fetch(triangulatedPoisCsvUrl, {
        headers: {
          Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8',
        },
      })

      if (!response.ok) {
        return json({ error: 'Unable to load Triangulated POIs.' }, 502)
      }

      return new Response(await response.text(), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    }

    return env.ASSETS.fetch(request)
  },
}
