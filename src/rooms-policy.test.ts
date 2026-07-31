import { describe, expect, it } from 'vitest'
import { ROOM_TTL_SECONDS, roomExpiresAt } from '../worker/rooms'

describe('여행방 만료 정책', () => {
  it('생성 시각으로부터 정확히 7일 뒤 만료한다', () => {
    const createdAt = 1_800_000_000
    expect(ROOM_TTL_SECONDS).toBe(604_800)
    expect(roomExpiresAt(createdAt)).toBe(createdAt + 7 * 24 * 60 * 60)
  })
})
