import { handleContactRequest, json } from '../lib/contact.js'

export const onRequestPost = async ({ request, env }) => handleContactRequest(request, env)

export const onRequestGet = () => json({ error: 'Method not allowed.' }, 405)
export const onRequestPut = () => json({ error: 'Method not allowed.' }, 405)
export const onRequestPatch = () => json({ error: 'Method not allowed.' }, 405)
export const onRequestDelete = () => json({ error: 'Method not allowed.' }, 405)
