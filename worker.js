import { handleContactRequest, json } from './functions/lib/contact.js'
import {
  buildDeadReckoningPoisDataset,
  deadReckoningPoisCsvUrl,
} from './functions/lib/sunnyside.js'

const sunnysidePoisKvKey = 'dead-reckoning-pois'

const isAuthorizedUpdateRequest = (request, env) => {
  const configuredToken = env.SUNNYSIDE_UPDATE_TOKEN

  if (!configuredToken) return false

  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  return token === configuredToken
}

const fetchStaticSunnysidePois = (request, env) => {
  const assetUrl = new URL('/data/sunnyside-pois.json', request.url)

  return env.ASSETS.fetch(new Request(assetUrl, request))
}

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

    if (url.pathname === '/api/sunnyside/pois') {
      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed.' }, 405)
      }

      const cachedPois = await env.SUNNYSIDE_POIS?.get(sunnysidePoisKvKey)

      if (cachedPois) {
        return new Response(cachedPois, {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'public, max-age=300',
          },
        })
      }

      return fetchStaticSunnysidePois(request, env)
    }

    if (url.pathname === '/api/sunnyside/pois/update') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, 405)
      }

      if (!isAuthorizedUpdateRequest(request, env)) {
        return json({ error: 'Unauthorized.' }, 401)
      }

      if (!env.SUNNYSIDE_POIS) {
        return json({ error: 'SUNNYSIDE_POIS KV binding is not configured.' }, 500)
      }

      const dataset = await buildDeadReckoningPoisDataset(fetch)
      const body = JSON.stringify(dataset, null, 2)

      await env.SUNNYSIDE_POIS.put(sunnysidePoisKvKey, body)

      return json({
        ok: true,
        count: dataset.count,
        updatedAt: dataset.updatedAt,
      })
    }

    return env.ASSETS.fetch(request)
  },
}
