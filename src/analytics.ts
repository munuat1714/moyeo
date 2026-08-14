import { apiUrl } from './runtime'

const EVENT_KEY = 'modu-trip-anonymous-events-v1'
const ATTRIBUTION_KEY = 'modu-trip-attribution-v1'
const SESSION_EVENT_PREFIX = 'modu-trip-session-event:'

type AnonymousEvent = { name: string; at: string }

export function track(name: string) {
  try {
    const events = JSON.parse(localStorage.getItem(EVENT_KEY) ?? '[]') as AnonymousEvent[]
    localStorage.setItem(EVENT_KEY, JSON.stringify([...events.slice(-49), { name, at: new Date().toISOString() }]))
    const query = new URLSearchParams(window.location.search)
    const incoming = {
      source: query.get('utm_source') ?? '', medium: query.get('utm_medium') ?? '', campaign: query.get('utm_campaign') ?? '',
    }
    if (incoming.source || incoming.medium || incoming.campaign) sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(incoming))
    const attribution = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) ?? '{}') as typeof incoming
    const sessionKey = `${SESSION_EVENT_PREFIX}${name}`
    const firstInSession = sessionStorage.getItem(sessionKey) !== '1'
    if (firstInSession) sessionStorage.setItem(sessionKey, '1')
    void fetch(apiUrl('/api/events'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ name, ...attribution, firstInSession }),
    }).catch(() => undefined)
  } catch {
    // Analytics must never block the trip flow.
  }
}
