import { describe, expect, it } from 'vitest'
import { distanceKm } from '../worker/recommendations'

describe('경로 기반 추천 거리 계산', () => {
  it('서면 주변 두 지점의 실제 거리를 계산한다', () => {
    const seomyeon = { latitude: 35.1577, longitude: 129.0590 }
    const jeonpo = { latitude: 35.1577, longitude: 129.0630 }
    expect(distanceKm(seomyeon, jeonpo)).toBeGreaterThan(0.3)
    expect(distanceKm(seomyeon, jeonpo)).toBeLessThan(0.5)
  })

  it('같은 지점의 거리는 0이다', () => {
    const point = { latitude: 35.1577, longitude: 129.0590 }
    expect(distanceKm(point, point)).toBe(0)
  })
})
