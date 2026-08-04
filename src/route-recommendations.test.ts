import { describe, expect, it } from 'vitest'
import { distanceKm, resolveVisitCount, selectPlaces } from '../worker/recommendations'
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
})
