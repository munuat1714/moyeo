import { describe, expect, it } from 'vitest'
import { evaluatePublicDataHealth, mapModelRestaurantItem } from '../worker/public-data'

describe('public data health', () => {
  it('keeps stale fallback data usable while reporting that refresh is overdue', () => {
    const now = 1_000_000
    expect(evaluatePublicDataHealth([{ provider: 'TOUR_API', status: 'ready', item_count: 1, last_completed_at: now - 60 }], now).status).toBe('ok')
    expect(evaluatePublicDataHealth([{ provider: 'TOUR_API', status: 'ready', item_count: 10, last_completed_at: now - 73 * 60 * 60 }], now))
      .toMatchObject({ status: 'degraded', unavailable: [], overdue: ['TOUR_API'] })
    expect(evaluatePublicDataHealth([{ provider: 'KMA_FORECAST', status: 'failed', item_count: 0, last_completed_at: null }], now).status).toBe('unavailable')
    expect(evaluatePublicDataHealth([{ provider: 'BUSAN_EXHIBITION', status: 'ready', item_count: 0, last_completed_at: now - 73 * 60 * 60 }], now).status).toBe('degraded')
    expect(evaluatePublicDataHealth([{ provider: 'BUSAN_EXHIBITION', status: 'failed', item_count: 0, last_completed_at: null }], now).status).toBe('degraded')
  })
})

describe('mapModelRestaurantItem', () => {
  it('공식 모범음식점 필드와 좌표를 추천 장소로 변환한다', () => {
    const place = mapModelRestaurantItem({
      bsnsNm: '가야마당돼지국밥',
      addrRoad: '부산광역시 부산진구 가야공원로 64',
      bsnsCond: '한식',
      menu: '돼지국밥',
      tel: '051-897-4100',
      dataDay: '2025-05-19',
      lat: '35.163125',
      lng: '129.107037',
    })
    expect(place).toMatchObject({
      provider: 'BUSAN_MODEL_FOOD', title: '가야마당돼지국밥', category: '맛집',
      latitude: 35.163125, longitude: 129.107037,
      officialTags: ['부산광역시 모범음식점', '한식', '돼지국밥'],
    })
  })

  it('유효한 좌표가 없는 데이터는 추천에 사용하지 않는다', () => {
    expect(mapModelRestaurantItem({ bsnsNm: '좌표 없는 식당', addrRoad: '부산광역시 중구' })).toBeNull()
  })
})
