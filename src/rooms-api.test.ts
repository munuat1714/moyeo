import { describe, expect, it } from 'vitest'
import { handleRoomApi } from '../worker/rooms'

function database(options: { room?: Record<string, unknown> } = {}) {
  const statement = (sql: string): D1PreparedStatement => ({
    bind: () => statement(sql),
    first: async () => sql.startsWith('SELECT * FROM rooms') ? options.room ?? null : null,
    run: async () => ({ success: true, meta: { changes: 1 }, results: [] }),
    all: async () => ({ success: true, meta: {}, results: [] }),
    raw: async () => [],
  } as unknown as D1PreparedStatement)
  const db = {
    prepare: (sql: string) => statement(sql),
    batch: async () => [],
  } as unknown as D1Database
  return { db }
}

const credentials = { clientId: '', clientSecret: '' }

describe('room API boundary', () => {
  it('creates a valid one-person room without exposing a token in the URL', async () => {
    const { db } = database()
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const request = new Request('https://example.test/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '부산 여행', routeMode: 'fixed', origin: '부산역', destination: '해운대', hostName: '민지', startDate: date, endDate: date, transport: '대중교통', stay: '', expectedMembers: 1 }),
    })

    const response = await handleRoomApi(request, db, new URL(request.url), credentials)
    const body = await response!.json() as { roomId: string; memberId: string; token: string }

    expect(response?.status).toBe(201)
    expect(body.roomId).toMatch(/^[a-z0-9]{10}$/)
    expect(body.memberId).toBeTruthy()
    expect(body.token).toBeTruthy()
    expect(request.url).not.toContain(body.token)
  })

  it('rejects invalid room input before writing', async () => {
    const { db } = database()
    const request = new Request('https://example.test/api/rooms', { method: 'POST', body: JSON.stringify({ name: '누락된 여행' }) })

    const response = await handleRoomApi(request, db, new URL(request.url), credentials)

    expect(response?.status).toBe(400)
    await expect(response?.json()).resolves.toEqual({ error: '여행방 필수 정보를 확인해 주세요.' })
  })

  it('requires a member token for protected room actions', async () => {
    const now = Math.floor(Date.now() / 1000)
    const { db } = database({ room: {
      id: 'abcdefghij', name: '부산 여행', origin: '부산역', destination: '해운대',
      start_date: '2026-08-15', end_date: '2026-08-15', transport: '대중교통', stay: '', expected_members: 2,
      vote_round: 1, runoff_course_ids: '[]', final_course_id: null, recommendation_json: null,
      recommendation_status: null, recommendation_started_at: null, recommendation_retry_at: null,
      itinerary_json: null, created_at: now, expires_at: now + 3600, route_mode: 'fixed', preferred_area: '상관없음',
    } })
    const request = new Request('https://example.test/api/rooms/abcdefghij/preferences', { method: 'PUT', body: '{}' })

    const response = await handleRoomApi(request, db, new URL(request.url), credentials)

    expect(response?.status).toBe(401)
  })
})
