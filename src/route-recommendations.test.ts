import { describe, expect, it } from 'vitest'
import { curatedFallbackPlaces, distanceKm, recommendationSearchRequestCount, resolveVisitCount, selectPlaces } from '../worker/recommendations'
import { foods, themes } from './data'

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

  it('출발·도착지가 가까우면 두 지점 자체가 아닌 주변 장소를 고른다', () => {
    const origin = { title: '서면역', category: '역', roadAddress: '', latitude: 35.1577, longitude: 129.0590, keyword: '출발지' }
    const destination = { title: '전포역', category: '역', roadAddress: '', latitude: 35.1530, longitude: 129.0650, keyword: '도착지' }
    const pool = [
      origin,
      destination,
      { title: '전포 카페거리', category: '거리', roadAddress: '', latitude: 35.1550, longitude: 129.0630, keyword: '카페' },
      { title: '부산시민공원', category: '공원', roadAddress: '', latitude: 35.1666, longitude: 129.0557, keyword: '관광명소' },
    ]
    expect(selectPlaces(pool, origin, destination, 'balance', ['카페'], 2).map((place) => place.title)).toEqual(['전포 카페거리', '부산시민공원'])
  })

  it('앞 코스에서 사용한 장소를 다음 코스에서는 가능한 한 피한다', () => {
    const origin = { title: '출발', category: '역', roadAddress: '', latitude: 35.15, longitude: 129.06, keyword: '출발지' }
    const destination = { title: '도착', category: '역', roadAddress: '', latitude: 35.16, longitude: 129.07, keyword: '도착지' }
    const pool = [
      { title: '맛집 A', category: '식당', roadAddress: '', latitude: 35.151, longitude: 129.061, keyword: '맛집' },
      { title: '맛집 B', category: '식당', roadAddress: '', latitude: 35.152, longitude: 129.062, keyword: '맛집' },
      { title: '카페 A', category: '카페', roadAddress: '', latitude: 35.153, longitude: 129.063, keyword: '카페' },
      { title: '카페 B', category: '카페', roadAddress: '', latitude: 35.154, longitude: 129.064, keyword: '카페' },
      { title: '명소 A', category: '명소', roadAddress: '', latitude: 35.155, longitude: 129.065, keyword: '관광명소' },
      { title: '체험 A', category: '체험', roadAddress: '', latitude: 35.156, longitude: 129.066, keyword: '체험' },
    ]
    const first = selectPlaces(pool, origin, destination, 'balance', ['맛집'], 2)
    const second = selectPlaces(pool, origin, destination, 'slow', ['맛집'], 2, new Set(first.map((place) => place.title)))
    expect(second.map((place) => place.title)).not.toEqual(first.map((place) => place.title))
    expect(second.every((place) => !first.some((used) => used.title === place.title))).toBe(true)
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

  it('실제 음식점 검색에 사용할 음식 분류를 제공한다', () => {
    expect(foods).toEqual(expect.arrayContaining(['한식', '고기·구이', '해산물', '일식', '중식', '양식', '분식', '디저트·베이커리', '채식']))
  })

  it('추천 한 번의 네이버 검색 요청을 최대 10회로 제한한다', () => {
    expect(recommendationSearchRequestCount(false)).toBe(8)
    expect(recommendationSearchRequestCount(true)).toBe(5)
    expect(recommendationSearchRequestCount(false) * 1000).toBe(8_000)
  })

  it('네이버 일부 검색이 실패해도 사용할 부산 검수 장소를 확보한다', () => {
    expect(curatedFallbackPlaces.length).toBeGreaterThanOrEqual(12)
    expect(new Set(curatedFallbackPlaces.map((place) => place.title)).size).toBe(curatedFallbackPlaces.length)
    expect(curatedFallbackPlaces).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '광안리해수욕장' }),
      expect.objectContaining({ title: '부산시민공원' }),
      expect.objectContaining({ title: '송도해상케이블카' }),
    ]))
  })
})
