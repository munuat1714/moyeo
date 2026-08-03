import { describe, expect, it } from 'vitest'
import { distanceKm, resolveVisitCount } from '../worker/recommendations'
import { themes } from './data'

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

  it('팀원들이 고른 방문 장소 수의 평균을 1~6곳으로 계산한다', () => {
    expect(resolveVisitCount([{ placeCount: 3 }, { placeCount: 5 }])).toBe(4)
    expect(resolveVisitCount([{ placeCount: 10 }])).toBe(6)
    expect(resolveVisitCount([{ placeCount: 0 }])).toBe(1)
  })

  it('경로에 직접 반영할 취향만 제공한다', () => {
    expect(themes).not.toContain('산책')
    expect(themes).toEqual(expect.arrayContaining(['맛집', '감성 카페', '사진 명소', '액티비티', '역사·문화', '쇼핑']))
  })
})
