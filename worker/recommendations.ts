import type { Course, Stop } from '../src/types'

export type SearchCredentials = { clientId?: string; clientSecret?: string }

type SearchPlace = {
  title: string
  category: string
  roadAddress: string
  longitude: number
  latitude: number
  keyword: string
  source?: Stop['source']
  verifiedAt?: string
}

type RoutePreference = { themes?: string[]; placeCount?: number; pace?: string; food?: string | string[]; mood?: string | string[] }

export const MAX_ROUTE_KEYWORDS = 4
export const recommendationSearchRequestCount = (sameZone: boolean) => 2 + (sameZone ? 1 : 2) * MAX_ROUTE_KEYWORDS

export const curatedFallbackPlaces: SearchPlace[] = [
  { title: '감천문화마을', category: '관광명소', roadAddress: '부산 사하구 감내2로 203', latitude: 35.0975, longitude: 129.0106, keyword: '관광명소' },
  { title: '자갈치시장', category: '시장', roadAddress: '부산 중구 자갈치해안로 52', latitude: 35.0967, longitude: 129.0305, keyword: '맛집' },
  { title: '전포카페거리', category: '거리', roadAddress: '부산 부산진구 전포동', latitude: 35.1577, longitude: 129.0630, keyword: '카페' },
  { title: '광안리해수욕장', category: '관광명소', roadAddress: '부산 수영구 광안해변로 219', latitude: 35.1532, longitude: 129.1187, keyword: '관광명소' },
  { title: '흰여울문화마을', category: '관광명소', roadAddress: '부산 영도구 영선동4가 605-3', latitude: 35.0786, longitude: 129.0443, keyword: '관광명소' },
  { title: '부산시민공원', category: '공원', roadAddress: '부산 부산진구 시민공원로 73', latitude: 35.1667, longitude: 129.0571, keyword: '관광명소' },
  { title: '민락수변공원', category: '공원', roadAddress: '부산 수영구 민락수변로 129', latitude: 35.1555, longitude: 129.1328, keyword: '관광명소' },
  { title: '태종대유원지', category: '관광명소', roadAddress: '부산 영도구 전망로 24', latitude: 35.0512, longitude: 129.0872, keyword: '관광명소' },
  { title: 'F1963', category: '문화공간', roadAddress: '부산 수영구 구락로123번길 20', latitude: 35.1776, longitude: 129.1153, keyword: '카페' },
  { title: '수영사적공원', category: '문화유적', roadAddress: '부산 수영구 수영성로 43', latitude: 35.1710, longitude: 129.1130, keyword: '관광명소' },
  { title: '송도해상케이블카', category: '체험', roadAddress: '부산 서구 송도해변로 171', latitude: 35.0764, longitude: 129.0239, keyword: '체험' },
  { title: '해운대 블루라인파크 미포정거장', category: '체험', roadAddress: '부산 해운대구 달맞이길62번길 13', latitude: 35.1594, longitude: 129.1637, keyword: '체험' },
].map((place) => ({ ...place, source: '한국관광공사·부산관광포털', verifiedAt: '2026-07-31' }))

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

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function search(query: string, keyword: string, credentials: SearchCredentials, display = 5) {
  let data: { items?: Array<Record<string, unknown>> } | null = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const endpoint = new URL('https://openapi.naver.com/v1/search/local.json')
    endpoint.searchParams.set('query', query)
    endpoint.searchParams.set('display', String(display))
    endpoint.searchParams.set('sort', 'comment')
    const response = await fetch(endpoint, { headers: {
      'X-Naver-Client-Id': credentials.clientId ?? '',
      'X-Naver-Client-Secret': credentials.clientSecret ?? '',
    } })
    if (response.ok) {
      data = await response.json() as { items?: Array<Record<string, unknown>> }
      break
    }
    const detail = await response.text().catch(() => '')
    if (response.status !== 429 || attempt === 2) {
      console.error('naver-local-search-error', { status: response.status, query, detail: detail.slice(0, 300) })
      const error = new Error(response.status === 429
        ? '네이버 검색 요청이 많아 잠시 쉬고 있어요. 자동으로 다시 시도합니다.'
        : `네이버 장소 검색을 완료하지 못했습니다. (${response.status})`)
      if (response.status === 429) error.name = 'NaverRateLimitError'
      throw error
    }
    const retryAfter = Number(response.headers.get('Retry-After'))
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 800 * 2 ** attempt
    await sleep(delay + Math.floor(Math.random() * 300))
  }
  if (!data) throw new Error('네이버 장소 검색 결과를 불러오지 못했습니다.')
  return (data.items ?? []).flatMap((item): SearchPlace[] => {
    const longitude = Number(item.mapx) / 10_000_000
    const latitude = Number(item.mapy) / 10_000_000
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return []
    return [{ title: strip(item.title), category: strip(item.category), roadAddress: strip(item.roadAddress || item.address), longitude, latitude, keyword }]
  })
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await task(items[index])
      if (nextIndex < items.length) await sleep(120 + Math.floor(Math.random() * 100))
    }
  })
  await Promise.all(workers)
  return results
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
    latitude: point.latitude, longitude: point.longitude, source: point.source ?? '네이버 지역검색',
    verifiedAt: point.verifiedAt ?? new Date().toISOString().slice(0, 10),
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

export function selectPlaces(pool: SearchPlace[], origin: SearchPlace, destination: SearchPlace, profileId: string, teamKeywords: string[], count: number, avoidTitles = new Set<string>()) {
  const variant = profileId === 'slow' ? ['카페', '전시', '관광명소', '맛집', '쇼핑', '체험']
    : profileId === 'active' ? ['체험', '쇼핑', '관광명소', '맛집', '전시', '카페']
      : ['맛집', '카페', '관광명소', '쇼핑', '전시', '체험']
  const preferred = [...new Set([...variant.slice(0, 3), ...teamKeywords, ...variant.slice(3)])]
  const direct = distanceKm(origin, destination)
  const nearbyTrip = direct <= 3
  const center = { latitude: (origin.latitude + destination.latitude) / 2, longitude: (origin.longitude + destination.longitude) / 2 }
  const distanceFromRouteArea = (place: SearchPlace) => nearbyTrip
    ? distanceKm(center, place)
    : Math.min(distanceKm(origin, place), distanceKm(destination, place))
  const maxRouteAreaDistance = nearbyTrip ? 6 : Math.max(5, Math.min(10, direct * .65))
  const withoutEndpoints = pool.filter((place) => place.title !== origin.title && place.title !== destination.title && distanceKm(origin, place) > .08 && distanceKm(destination, place) > .08)
  const close = withoutEndpoints.filter((place) => distanceFromRouteArea(place) <= maxRouteAreaDistance)
  const candidates = close.length >= Math.min(6, count) ? close : withoutEndpoints
  const unique = [...candidates].filter((place, index, all) => all.findIndex((item) => item.title === place.title) === index)
  const selected: SearchPlace[] = []
  preferred.forEach((keyword) => {
    if (selected.length >= count) return
    const next = unique.filter((place) => place.keyword === keyword && !selected.includes(place) && !avoidTitles.has(place.title)).sort((a, b) => distanceFromRouteArea(a) - distanceFromRouteArea(b))[0]
    if (next) selected.push(next)
  })
  if (selected.length < count) {
    unique.filter((place) => !selected.includes(place) && !avoidTitles.has(place.title)).sort((a, b) => distanceFromRouteArea(a) - distanceFromRouteArea(b)).slice(0, count - selected.length).forEach((place) => selected.push(place))
  }
  if (selected.length < count) {
    unique.filter((place) => !selected.includes(place)).sort((a, b) => distanceFromRouteArea(a) - distanceFromRouteArea(b)).slice(0, count - selected.length).forEach((place) => selected.push(place))
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
  const nearbyTrip = distanceKm(origin, destination) <= 3

  const themeCounts: Record<string, number> = {}
  preferences.flatMap((preference) => preference.themes ?? []).forEach((theme) => { themeCounts[theme] = (themeCounts[theme] ?? 0) + 1 })
  const topThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).map(([theme]) => theme)
  const foodCounts: Record<string, number> = {}
  preferences.flatMap((preference) => Array.isArray(preference.food) ? preference.food : preference.food ? [preference.food] : []).forEach((food) => {
    foodCounts[food] = (foodCounts[food] ?? 0) + 1
  })
  const topFoods = Object.entries(foodCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).map(([food]) => food)
  const tasteKeywords = topThemes.map((theme) => themeKeyword[theme]).filter(Boolean)
  const foodKeywords = topFoods.map((food) => foodKeyword[food]).filter(Boolean)
  const teamKeywords = [...new Set([tasteKeywords[0], foodKeywords[0], ...tasteKeywords.slice(1), ...foodKeywords.slice(1)].filter(Boolean))]
  const visitCount = resolveVisitCount(preferences)
  const keywords = [...new Set([teamKeywords[0] ?? '맛집', '카페', '관광명소', '체험'])].slice(0, MAX_ROUTE_KEYWORDS)
  const zones = originName.trim() === destinationName.trim() ? [originName] : [originName, destinationName]
  await sleep(Math.floor(Math.random() * 500))
  const searchJobs = zones.flatMap((zone) => keywords.map((keyword) => ({ zone, keyword })))
  const batches = await mapWithConcurrency(searchJobs, 2, async ({ zone, keyword }) => {
    try { return await search(`부산 ${zone}${nearbyTrip ? ' 주변' : ''} ${keyword}`, keyword, credentials) }
    catch (reason) {
      console.warn('naver-route-search-skipped', { zone, keyword, reason: reason instanceof Error ? reason.message : String(reason) })
      return []
    }
  })
  const livePool = batches.flat().filter((place, index, all) => all.findIndex((item) => item.title === place.title) === index)
  const pool = (livePool.length >= 6 ? livePool : [...livePool, ...curatedFallbackPlaces]).filter((place, index, all) => all.findIndex((item) => item.title === place.title) === index)

  const usedAcrossCourses = new Set<string>()
  return profiles.map((profile) => {
    const selected = selectPlaces(pool, origin, destination, profile.id, teamKeywords, visitCount, usedAcrossCourses)
    selected.forEach((place) => usedAcrossCourses.add(place.title))
    const ordered = nearestOrder(selected, origin)
    const routePoints = [origin, ...ordered, destination]
    const routeKm = routePoints.slice(1).reduce((sum, point, index) => sum + distanceKm(routePoints[index], point), 0)
    const price = selected.reduce((sum, place) => sum + (keywordMeta[place.keyword]?.price ?? 0), 0)
    return {
      id: profile.id, title: profile.title, label: profile.label, emoji: profile.emoji,
      description: nearbyTrip
        ? `${originName}과 ${destinationName} 주변의 실제 장소를 둘러보는 당일치기 코스`
        : `${originName}에서 출발해 ${destinationName}에서 끝나는 가까운 당일치기 코스`,
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
