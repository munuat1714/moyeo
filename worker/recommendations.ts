import type { Course, Stop } from '../src/types'

export type SearchCredentials = { clientId?: string; clientSecret?: string }

type SearchPlace = {
  title: string
  category: string
  roadAddress: string
  longitude: number
  latitude: number
  keyword: string
}

type RoutePreference = { themes?: string[]; placeCount?: number; pace?: string; food?: string }

const profiles = [
  { id: 'balance', title: '가까운 곳부터 알차게', label: '동선 균형', emoji: '✨', tags: ['맛집', '감성 카페', '사진'] },
  { id: 'slow', title: '천천히 머무는 동네 여행', label: '여유 중심', emoji: '🌿', tags: ['감성 카페', '산책', '사진'] },
  { id: 'active', title: '보고 즐기는 활동 여행', label: '체험 중심', emoji: '⚡', tags: ['액티비티', '맛집', '사진'] },
] as const

const keywordMeta: Record<string, { category: string; duration: string; price: number }> = {
  맛집: { category: '맛집', duration: '1시간 20분', price: 18000 },
  카페: { category: '카페', duration: '1시간', price: 8000 },
  관광명소: { category: '관광', duration: '1시간 20분', price: 0 },
  공원: { category: '산책', duration: '1시간', price: 0 },
  체험: { category: '액티비티', duration: '1시간 30분', price: 18000 },
  전시: { category: '관광', duration: '1시간 20분', price: 10000 },
  쇼핑: { category: '쇼핑', duration: '1시간 20분', price: 20000 },
  한식: { category: '맛집', duration: '1시간 20분', price: 18000 },
  고기: { category: '맛집', duration: '1시간 20분', price: 22000 },
  해산물: { category: '맛집', duration: '1시간 20분', price: 25000 },
  일식: { category: '맛집', duration: '1시간 20분', price: 20000 },
  중식: { category: '맛집', duration: '1시간 20분', price: 18000 },
  양식: { category: '맛집', duration: '1시간 20분', price: 22000 },
  분식: { category: '맛집', duration: '1시간', price: 10000 },
  베이커리: { category: '카페', duration: '1시간', price: 9000 },
  채식: { category: '맛집', duration: '1시간 20분', price: 18000 },
}

const themeKeyword: Record<string, string> = {
  '맛집': '맛집', '감성 카페': '카페', '사진 명소': '관광명소', '사진': '관광명소',
  '액티비티': '체험', '역사·문화': '전시', '역사': '전시', '쇼핑': '쇼핑',
}

const foodKeyword: Record<string, string> = {
  '한식': '한식', '고기·구이': '고기', '고기': '고기', '해산물': '해산물', '일식': '일식',
  '중식': '중식', '양식': '양식', '분식': '분식', '디저트·베이커리': '베이커리', '베이커리': '베이커리', '채식': '채식',
}

const strip = (value: unknown) => String(value ?? '')
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

async function search(query: string, keyword: string, credentials: SearchCredentials, display = 5) {
  const endpoint = new URL('https://openapi.naver.com/v1/search/local.json')
  endpoint.searchParams.set('query', query)
  endpoint.searchParams.set('display', String(display))
  endpoint.searchParams.set('sort', 'comment')
  const response = await fetch(endpoint, { headers: {
    'X-Naver-Client-Id': credentials.clientId ?? '',
    'X-Naver-Client-Secret': credentials.clientSecret ?? '',
  } })
  if (!response.ok) throw new Error(`Naver search failed: ${response.status}`)
  const data = await response.json() as { items?: Array<Record<string, unknown>> }
  return (data.items ?? []).flatMap((item): SearchPlace[] => {
    const longitude = Number(item.mapx) / 10_000_000
    const latitude = Number(item.mapy) / 10_000_000
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return []
    return [{ title: strip(item.title), category: strip(item.category), roadAddress: strip(item.roadAddress || item.address), longitude, latitude, keyword }]
  })
}

export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180
  const dLat = radians(b.latitude - a.latitude), dLon = radians(b.longitude - a.longitude)
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export function resolveVisitCount(preferences: RoutePreference[]) {
  const counts = preferences.map((preference) => preference.placeCount ?? (preference.pace === '여유롭게' ? 3 : preference.pace === '알차게' ? 5 : 4))
  return Math.max(1, Math.min(6, Math.round(counts.reduce((sum, count) => sum + count, 0) / Math.max(1, counts.length))))
}

function routeStop(title: string, time: string, point: SearchPlace, shared = false): Stop {
  const meta = keywordMeta[point.keyword] ?? { category: '관광', duration: '1시간', price: 0 }
  return {
    time, title, category: meta.category, duration: meta.duration, price: meta.price, shared,
    description: `${point.category || meta.category} · ${point.roadAddress || '상세 위치는 네이버지도에서 확인해 주세요.'}`,
    latitude: point.latitude, longitude: point.longitude, source: '네이버 지역검색',
    verifiedAt: new Date().toISOString().slice(0, 10),
    placeUrl: `https://map.naver.com/p/search/${encodeURIComponent(title)}`,
  }
}

function endpointStop(title: string, time: string, point: SearchPlace, start: boolean): Stop {
  return {
    time, title, category: '교통', duration: '20분', price: 0, shared: true,
    description: start ? '입력한 출발 장소에서 여행을 시작해요.' : '입력한 도착 장소에서 여행을 마무리해요.',
    latitude: point.latitude, longitude: point.longitude, source: '네이버 지역검색',
    verifiedAt: new Date().toISOString().slice(0, 10),
    placeUrl: `https://map.naver.com/p/search/${encodeURIComponent(title)}`,
  }
}

function nearestOrder(items: SearchPlace[], start: SearchPlace) {
  const remaining = [...items], ordered: SearchPlace[] = []
  let current = start
  while (remaining.length) {
    remaining.sort((a, b) => distanceKm(current, a) - distanceKm(current, b) || a.title.localeCompare(b.title, 'ko'))
    current = remaining.shift()!
    ordered.push(current)
  }
  return ordered
}

function selectPlaces(pool: SearchPlace[], origin: SearchPlace, destination: SearchPlace, profileId: string, teamKeywords: string[], count: number) {
  const variant = profileId === 'slow' ? ['카페', '전시', '관광명소', '맛집', '쇼핑', '체험']
    : profileId === 'active' ? ['체험', '쇼핑', '관광명소', '맛집', '전시', '카페']
      : ['맛집', '카페', '관광명소', '쇼핑', '전시', '체험']
  const preferred = [...new Set([...teamKeywords, ...variant])]
  const direct = distanceKm(origin, destination)
  const maxEndpointDistance = direct < 2 ? 5 : Math.max(5, Math.min(10, direct * .65))
  const close = pool.filter((place) => Math.min(distanceKm(origin, place), distanceKm(destination, place)) <= maxEndpointDistance)
  const candidates = close.length >= 6 ? close : pool
  const unique = [...candidates].filter((place, index, all) => all.findIndex((item) => item.title === place.title) === index)
  const endpointDistance = (place: SearchPlace) => Math.min(distanceKm(origin, place), distanceKm(destination, place))
  const selected: SearchPlace[] = []
  preferred.forEach((keyword) => {
    if (selected.length >= count) return
    const next = unique.filter((place) => place.keyword === keyword && !selected.includes(place)).sort((a, b) => endpointDistance(a) - endpointDistance(b))[0]
    if (next) selected.push(next)
  })
  if (selected.length < count) {
    unique.filter((place) => !selected.includes(place)).sort((a, b) => endpointDistance(a) - endpointDistance(b)).slice(0, count - selected.length).forEach((place) => selected.push(place))
  }
  return selected
}

export async function generateRouteCourses(originName: string, destinationName: string, credentials: SearchCredentials, preferences: RoutePreference[] = []): Promise<Course[]> {
  if (!credentials.clientId || !credentials.clientSecret) throw new Error('네이버 지역검색 설정이 필요합니다.')
  const [originResults, destinationResults] = await Promise.all([
    search(`부산 ${originName}`, '출발지', credentials, 1),
    search(`부산 ${destinationName}`, '도착지', credentials, 1),
  ])
  const origin = originResults[0], destination = destinationResults[0]
  if (!origin || !destination) throw new Error('출발 또는 도착 장소를 찾지 못했습니다.')

  const themeCounts: Record<string, number> = {}
  preferences.flatMap((preference) => preference.themes ?? []).forEach((theme) => { themeCounts[theme] = (themeCounts[theme] ?? 0) + 1 })
  const topThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).map(([theme]) => theme)
  const foodCounts: Record<string, number> = {}
  preferences.forEach((preference) => { if (preference.food) foodCounts[preference.food] = (foodCounts[preference.food] ?? 0) + 1 })
  const topFoods = Object.entries(foodCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).map(([food]) => food)
  const tasteKeywords = topThemes.map((theme) => themeKeyword[theme]).filter(Boolean)
  const foodKeywords = topFoods.map((food) => foodKeyword[food]).filter(Boolean)
  const teamKeywords = [...new Set([tasteKeywords[0], foodKeywords[0], ...tasteKeywords.slice(1), ...foodKeywords.slice(1)].filter(Boolean))]
  const visitCount = resolveVisitCount(preferences)
  const keywords = [...new Set([...teamKeywords, '맛집', '카페', '관광명소', '체험', '전시', '쇼핑'])]
  const zones = originName.trim() === destinationName.trim() ? [originName] : [originName, destinationName]
  const batches = await Promise.all(zones.flatMap((zone) => keywords.map((keyword) => search(`부산 ${zone} ${keyword}`, keyword, credentials))))
  const pool = batches.flat().filter((place, index, all) => all.findIndex((item) => item.title === place.title) === index)
  if (pool.length < 6) throw new Error('경로 주변 추천 장소가 부족합니다.')

  return profiles.map((profile) => {
    const selected = selectPlaces(pool, origin, destination, profile.id, teamKeywords, visitCount)
    const ordered = nearestOrder(selected, origin)
    const routePoints = [origin, ...ordered, destination]
    const routeKm = routePoints.slice(1).reduce((sum, point, index) => sum + distanceKm(routePoints[index], point), 0)
    const price = selected.reduce((sum, place) => sum + (keywordMeta[place.keyword]?.price ?? 0), 0)
    return {
      id: profile.id, title: profile.title, label: profile.label, emoji: profile.emoji,
      description: `${originName}에서 출발해 ${destinationName}에서 끝나는 가까운 당일치기 코스`,
      match: 80, tags: [...new Set([...topThemes, ...topFoods, ...profile.tags])].slice(0, 4), totalPrice: price, travelMinutes: Math.max(20, Math.round(routeKm * 4)),
      days: [[endpointStop(originName, '09:30', origin, true), ...ordered.map((place, index) => routeStop(place.title, visitTime(index, ordered.length), place)), endpointStop(destinationName, '18:00', destination, false)]],
    }
  })
}

function visitTime(index: number, total: number) {
  const startMinutes = 10 * 60 + 15, endMinutes = 16 * 60 + 45
  const value = total <= 1 ? startMinutes : Math.round(startMinutes + (endMinutes - startMinutes) * index / (total - 1))
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
