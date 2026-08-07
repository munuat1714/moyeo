import { describe, expect, it } from 'vitest'
import { formatSourceDate, naverRouteUrl, sourceDisplay, transitLeg } from './route-display'
import type { Stop } from './types'

const stop = (title: string, latitude: number, longitude: number): Stop => ({
  title, latitude, longitude, time: '10:00', category: '관광', duration: '1시간', price: 0, shared: false, description: '',
})

describe('route display', () => {
  it('TourAPI 수정시각을 사용자가 읽는 월로 표시한다', () => {
    expect(formatSourceDate('2025121909')).toEqual({ short: '2025년 12월 기준', detail: '2025년 12월 19일 9시 갱신' })
    expect(sourceDisplay('한국관광공사 TourAPI', '2025121909').text).toBe('한국관광공사 TourAPI · 2025년 12월 기준')
  })

  it('가까운 구간은 도보로 안내한다', () => {
    expect(transitLeg(stop('A', 35.1577, 129.0630), stop('B', 35.1585, 129.0660))?.mode).toBe('도보')
  })

  it('먼 구간은 대중교통으로 안내한다', () => {
    const leg = transitLeg(stop('A', 35.1151, 129.0414), stop('B', 35.1532, 129.1187))!
    expect(leg.mode).toBe('지하철·버스')
    expect(naverRouteUrl(leg)).toContain('nmap://route/public?')
  })
})
