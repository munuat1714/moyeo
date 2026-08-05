import { describe, expect, it } from 'vitest'
import { ROOM_TTL_SECONDS, isoDate, roomExpiresAt, validItinerary, validPreference } from '../worker/rooms'

describe('여행방 만료 정책', () => {
  it('생성 시각으로부터 정확히 7일 뒤 만료한다', () => {
    const createdAt = 1_800_000_000
    expect(ROOM_TTL_SECONDS).toBe(604_800)
    expect(roomExpiresAt(createdAt)).toBe(createdAt + 7 * 24 * 60 * 60)
  })

  it('실제 존재하는 YYYY-MM-DD 날짜만 허용한다', () => {
    expect(isoDate('2026-08-05')).toBe(true)
    expect(isoDate('2026-02-30')).toBe(false)
    expect(isoDate('20260805')).toBe(false)
  })

  it('취향과 일정의 크기 및 필수 필드를 검증한다', () => {
    expect(validPreference({ themes: ['맛집'], food: ['한식'], mood: ['활기찬'], placeCount: 3 })).toBe(true)
    expect(validPreference({ themes: [], food: [], mood: [], placeCount: 99 })).toBe(false)
    expect(validItinerary([[{ title: '자갈치시장', time: '10:00', category: '맛집', duration: '1시간', description: '시장 방문' }]])).toBe(true)
    expect(validItinerary([[{ title: '', time: '10:00', category: '맛집', duration: '1시간', description: '' }]])).toBe(false)
  })
})
