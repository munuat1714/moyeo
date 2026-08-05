import { describe, expect, it } from 'vitest'
import { itemsFrom } from '../worker/public-data'
import { validTravelDate } from '../worker/rooms'

describe('public API response parsing', () => {
  it('reads items wrapped by a Busan service operation name', () => {
    expect(itemsFrom({ getBusanCultureExhibitDetail: { item: [{ res_no: '1', title: '전시' }] } }))
      .toEqual([{ res_no: '1', title: '전시' }])
  })
})

describe('travel date policy', () => {
  it('allows only today through seven days later in Korea', () => {
    const now = new Date('2026-08-05T03:00:00Z')
    expect(validTravelDate('2026-08-05', now)).toBe(true)
    expect(validTravelDate('2026-08-12', now)).toBe(true)
    expect(validTravelDate('2026-08-04', now)).toBe(false)
    expect(validTravelDate('2026-08-13', now)).toBe(false)
  })
})
