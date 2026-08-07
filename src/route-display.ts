import type { Stop } from './types'

export type TransitLeg = {
  from: Stop
  to: Stop
  distanceKm: number
  minutes: number
  mode: '도보' | '버스·도보' | '지하철·버스'
  color: string
}

const validPoint = (stop: Stop): stop is Stop & { latitude: number; longitude: number } =>
  Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)

export function distanceKm(a: Stop, b: Stop) {
  if (!validPoint(a) || !validPoint(b)) return 0
  const radians = (value: number) => value * Math.PI / 180
  const dLat = radians(b.latitude - a.latitude)
  const dLon = radians(b.longitude - a.longitude)
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export function transitLeg(from: Stop, to: Stop): TransitLeg | null {
  if (!validPoint(from) || !validPoint(to)) return null
  const directDistance = distanceKm(from, to)
  const distance = directDistance * 1.22
  if (distance <= 0.9) return { from, to, distanceKm: distance, minutes: Math.max(4, Math.round(distance * 13)), mode: '도보', color: '#5f7f6e' }
  if (distance <= 4) return { from, to, distanceKm: distance, minutes: Math.round(8 + distance * 4), mode: '버스·도보', color: '#ef8354' }
  return { from, to, distanceKm: distance, minutes: Math.round(13 + distance * 3), mode: '지하철·버스', color: '#1769aa' }
}

export function transitLegs(stops: Stop[]) {
  return stops.slice(0, -1).map((stop, index) => transitLeg(stop, stops[index + 1]))
}

export function formatSourceDate(value?: string) {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 6) return null
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  if (year < 2000 || month < 1 || month > 12) return null
  const day = digits.length >= 8 ? Number(digits.slice(6, 8)) : 0
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : -1
  const short = `${year}년 ${month}월 기준`
  const detail = day >= 1 && day <= 31
    ? `${year}년 ${month}월 ${day}일${hour >= 0 && hour <= 23 ? ` ${hour}시` : ''} 갱신`
    : `${year}년 ${month}월 갱신`
  return { short, detail }
}

export function sourceDisplay(source?: string, verifiedAt?: string) {
  const date = formatSourceDate(verifiedAt)
  return {
    text: [source || '운영자 검수', date?.short].filter(Boolean).join(' · '),
    title: date ? `원본 데이터 ${date.detail}` : undefined,
  }
}

export function naverRouteUrl(leg: TransitLeg) {
  const action = leg.mode === '도보' ? 'walk' : 'public'
  const start = `${leg.from.longitude},${leg.from.latitude},${encodeURIComponent(leg.from.title)},-`
  const destination = `${leg.to.longitude},${leg.to.latitude},${encodeURIComponent(leg.to.title)},-`
  return `https://map.naver.com/p/directions/${start}/${destination}/-/${action}`
}
