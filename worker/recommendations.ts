import type { Course, Stop } from '../src/types'
import { nearbyPublicPlaces, weatherRiskForDate } from './public-data'

export type SearchCredentials = { clientId?: string; clientSecret?: string }
export type SearchCache = D1Database

type SearchPlace = {
  title: string
  category: string
  roadAddress: string
  longitude: number
  latitude: number
  keyword: string
  source?: Stop['source']
  verifiedAt?: string
  detail?: string
}

type RoutePreference = { themes?: string[]; placeCount?: number; pace?: string; food?: string | string[]; mood?: string | string[] }

export const MAX_ROUTE_KEYWORDS = 3
export const recommendationSearchRequestCount = (sameZone: boolean) => 2 + (sameZone ? 1 : 2) * MAX_ROUTE_KEYWORDS

const SEARCH_CACHE_TTL_SECONDS = 14 * 24 * 60 * 60
const SEARCH_STALE_TTL_SECONDS = 60 * 24 * 60 * 60

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

const openRouteZones = [
  { label: '서면·전포', query: '서면 전포', latitude: 35.1577, longitude: 129.0630 },
  { label: '광안리·수영', query: '광안리 수영', latitude: 35.1580, longitude: 129.1180 },
  { label: '해운대·청사포', query: '해운대 청사포', latitude: 35.1600, longitude: 129.1760 },
  { label: '남포·광복', query: '남포 광복', latitude: 35.1010, longitude: 129.0300 },
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

const publicKeyword = (category: string) => category === '맛집' ? '맛집'
  : category === '액티비티' ? '체험'
    : category === '쇼핑' ? '쇼핑'
      : category === '역사·문화' || category === '공연·축제' ? '전시' : '관광명소'

const mapPublicPlaces = (rows: any[]): SearchPlace[] => rows.map((row) => ({
  title: String(row.title), category: String(row.category), roadAddress: String(row.address ?? ''),
  latitude: Number(row.latitude), longitude: Number(row.longitude), keyword: publicKeyword(String(row.category)),
  source: row.provider === 'BUSAN_FOOD' ? '부산광역시 맛집정보'
    : row.provider === 'BUSAN_MODEL_FOOD' ? '부산광역시 모범음식점'
    : row.provider === 'KHS_HERITAGE' ? '국가유산청 공식 데이터' : '한국관광공사 TourAPI',
  verifiedAt: String(row.source_modified_at || new Date().toISOString().slice(0, 10)).slice(0, 10),
  detail: [row.event_start_date && row.event_end_date ? `운영 기간 ${String(row.event_start_date).replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3')}~${String(row.event_end_date).replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3')}` : '',
    row.event_title ? `오늘의 전시: ${row.event_title}` : '', row.opening_hours || row.event_hours, row.overview]
    .filter(Boolean).join(' · ').slice(0, 220),
}))

const normalizeSearchQuery = (query: string) => query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR')

async function readSearchCache(db: SearchCache | undefined, cacheKey: string, allowStale = false) {
  if (!db) return null
  const cutoff = Math.floor(Date.now() / 1000) - (allowStale ? SEARCH_STALE_TTL_SECONDS : 0)
  const row = await db.prepare('SELECT response_json, expires_at FROM place_search_cache WHERE cache_key = ?1 AND expires_at >= ?2')
    .bind(cacheKey, cutoff).first<{ response_json: string; expires_at: number }>()
  if (!row || (!allowStale && row.expires_at < Math.floor(Date.now() / 1000))) return null
  try { return JSON.parse(row.response_json) as SearchPlace[] } catch { return null }
}

async function writeSearchCache(db: SearchCache | undefined, cacheKey: string, places: SearchPlace[]) {
  if (!db) return
  const now = Math.floor(Date.now() / 1000)
  await db.prepare(`INSERT INTO place_search_cache (cache_key,response_json,fetched_at,expires_at)
    VALUES (?1,?2,?3,?4)
    ON CONFLICT(cache_key) DO UPDATE SET response_json=excluded.response_json, fetched_at=excluded.fetched_at, expires_at=excluded.expires_at`)
    .bind(cacheKey, JSON.stringify(places), now, now + SEARCH_CACHE_TTL_SECONDS).run()
}

async function search(query: string, keyword: string, credentials: SearchCredentials, display = 5, db?: SearchCache) {
  const cacheKey = `naver:local:v1:${display}:${normalizeSearchQuery(query)}`
  const cached = await readSearchCache(db, cacheKey)
  if (cached) return cached.map((place) => ({ ...place, keyword }))
  let data: { items?: Array<Record<string, unknown>> } | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
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
    if (response.status !== 429 || attempt === 1) {
      const stale = await readSearchCache(db, cacheKey, true)
      if (stale) return stale.map((place) => ({ ...place, keyword }))
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
  const places = (data.items ?? []).flatMap((item): SearchPlace[] => {
    const longitude = Number(item.mapx) / 10_000_000
    const latitude = Number(item.mapy) / 10_000_000
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return []
    return [{ title: strip(item.title), category: strip(item.category), roadAddress: strip(item.roadAddress || item.address), longitude, latitude, keyword: '' }]
  })
  await writeSearchCache(db, cacheKey, places)
  return places.map((place) => ({ ...place, keyword }))
}

export function cachedPlaceSearch(query: string, credentials: SearchCredentials, db: SearchCache, display = 5) {
  return search(query, '', credentials, display, db)
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

const normalizedPlaceName = (value: string) => strip(value)
  .toLocaleLowerCase('ko-KR')
  .replace(/[^\p{L}\p{N}]/gu, '')

export function selectBestPlaceMatch<T extends { title: string; latitude: number; longitude: number }>(
  items: T[],
  expected: { title: string; latitude?: number; longitude?: number },
) {
  const expectedName = normalizedPlaceName(expected.title)
  const hasExpectedPoint = Number.isFinite(expected.latitude) && Number.isFinite(expected.longitude)
  const ranked = items.map((item) => {
    const candidateName = normalizedPlaceName(item.title)
    const exactName = candidateName === expectedName
    const partialName = candidateName.includes(expectedName) || expectedName.includes(candidateName)
    const distance = hasExpectedPoint
      ? distanceKm({ latitude: expected.latitude!, longitude: expected.longitude! }, item)
      : 0
    return { item, exactName, partialName, distance }
  }).filter(({ exactName, partialName, distance }) => {
    if (hasExpectedPoint && distance > 3) return false
    return exactName || partialName
  }).sort((a, b) => Number(b.exactName) - Number(a.exactName)
    || Number(b.partialName) - Number(a.partialName)
    || a.distance - b.distance)
  return ranked[0]?.item ?? null
}

export function resolveVisitCount(preferences: RoutePreference[]) {
  const counts = preferences.map((preference) => preference.placeCount ?? (preference.pace === '여유롭게' ? 3 : preference.pace === '알차게' ? 5 : 4))
  return Math.max(1, Math.min(6, Math.round(counts.reduce((sum, count) => sum + count, 0) / Math.max(1, counts.length))))
}

function routeStop(title: string, time: string, point: SearchPlace, shared = false): Stop {
  const meta = keywordMeta[point.keyword] ?? { category: '관광', duration: '1시간', price: 0 }
  const stop: Stop = {
    time, title, category: meta.category, duration: meta.duration, price: meta.price, shared,
    description: [point.category || meta.category, point.roadAddress || '상세 위치는 네이버지도에서 확인해 주세요.', point.detail].filter(Boolean).join(' · '),
    latitude: point.latitude, longitude: point.longitude, source: point.source ?? '네이버 지역검색',
    verifiedAt: point.verifiedAt ?? new Date().toISOString().slice(0, 10),
    placeUrl: `https://map.naver.com/p/search/${encodeURIComponent(title)}`,
  }
  return stop
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

export function selectPlaces(pool: SearchPlace[], origin: SearchPlace, destination: SearchPlace, profileId: string, teamKeywords: string[], count: number, avoidTitles = new Set<string>(), badWeather = false) {
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
  const rankDistance = (place: SearchPlace) => distanceFromRouteArea(place)
    + (badWeather && !['맛집', '쇼핑', '역사·문화', '공연·축제', '전시·예술'].includes(place.category) ? 4 : 0)
  const maxRouteAreaDistance = nearbyTrip ? 6 : Math.max(5, Math.min(10, direct * .65))
  const withoutEndpoints = pool.filter((place) => place.title !== origin.title && place.title !== destination.title && distanceKm(origin, place) > .08 && distanceKm(destination, place) > .08)
  const close = withoutEndpoints.filter((place) => distanceFromRouteArea(place) <= maxRouteAreaDistance)
  const candidates = close.length >= Math.min(6, count) ? close : withoutEndpoints
  const unique = [...candidates].filter((place, index, all) => all.findIndex((item) => item.title === place.title) === index)
  const selected: SearchPlace[] = []
  preferred.forEach((keyword) => {
    if (selected.length >= count) return
    const next = unique.filter((place) => place.keyword === keyword && !selected.includes(place) && !avoidTitles.has(place.title)).sort((a, b) => rankDistance(a) - rankDistance(b))[0]
    if (next) selected.push(next)
  })
  if (selected.length < count) {
    unique.filter((place) => !selected.includes(place) && !avoidTitles.has(place.title)).sort((a, b) => rankDistance(a) - rankDistance(b)).slice(0, count - selected.length).forEach((place) => selected.push(place))
  }
  if (selected.length < count) {
    unique.filter((place) => !selected.includes(place)).sort((a, b) => rankDistance(a) - rankDistance(b)).slice(0, count - selected.length).forEach((place) => selected.push(place))
  }
  return selected
}

async function generateOpenRouteCourses(preferredArea: string, credentials: SearchCredentials, preferences: RoutePreference[], db?: SearchCache, travelDate?: string) {
  const themeCounts: Record<string, number> = {}
  preferences.flatMap((preference) => preference.themes ?? []).forEach((theme) => { themeCounts[theme] = (themeCounts[theme] ?? 0) + 1 })
  const topThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]).map(([theme]) => theme)
  const teamKeywords = topThemes.map((theme) => themeKeyword[theme]).filter(Boolean)
  const visitCount = resolveVisitCount(preferences)
  const selectedZone = openRouteZones.find((zone) => zone.label === preferredArea)
  const assignments = profiles.map((profile, index) => ({ profile, zone: selectedZone ?? openRouteZones[index] }))
  const publicByZone = new Map<string, SearchPlace[]>()
  if (db) {
    await Promise.all([...new Map(assignments.map(({ zone }) => [zone.label, zone])).values()].map(async (zone) => {
      const rows = await nearbyPublicPlaces(db, zone, 6, 120, travelDate)
      publicByZone.set(zone.label, mapPublicPlaces(rows))
    }))
  }
  const profileKeyword: Record<string, string> = { balance: '맛집', slow: '카페', active: '체험' }
  const jobs = credentials.clientId && credentials.clientSecret ? assignments.filter(({ zone }) => (publicByZone.get(zone.label)?.length ?? 0) < Math.max(6, visitCount * 2))
    .flatMap(({ profile, zone }) => [profileKeyword[profile.id], teamKeywords[0] ?? '관광명소'].map((keyword) => ({ zone, keyword })))
    .filter((job, index, all) => all.findIndex((item) => item.zone.label === job.zone.label && item.keyword === job.keyword) === index) : []
  const batches = await mapWithConcurrency(jobs, 2, async ({ zone, keyword }) => {
    try { return await search(`부산 ${zone.query} ${keyword}`, keyword, credentials, 5, db) }
    catch (reason) {
      console.warn('naver-open-route-search-skipped', { zone: zone.label, keyword, reason: reason instanceof Error ? reason.message : String(reason) })
      return []
    }
  })
  const liveByZone = new Map<string, SearchPlace[]>()
  jobs.forEach((job, index) => liveByZone.set(job.zone.label, [...(liveByZone.get(job.zone.label) ?? []), ...batches[index]]))
  const usedAcrossCourses = new Set<string>()
  const badWeather = db ? await weatherRiskForDate(db, travelDate) : false

  return assignments.map(({ profile, zone }) => {
    const center: SearchPlace = { title: `${zone.label} 중심`, category: '권역', roadAddress: '', latitude: zone.latitude, longitude: zone.longitude, keyword: '관광명소' }
    const live = [...(publicByZone.get(zone.label) ?? []), ...(liveByZone.get(zone.label) ?? [])]
    const liveNearby = live.filter((place) => distanceKm(center, place) <= 3)
    const liveExpanded = live.filter((place) => distanceKm(center, place) <= 6)
    const nearbyFallback = curatedFallbackPlaces.filter((place) => distanceKm(center, place) <= 3)
    const expandedFallback = curatedFallbackPlaces.filter((place) => distanceKm(center, place) <= 6)
    const pool = [...liveNearby, ...nearbyFallback, ...(liveNearby.length + nearbyFallback.length < visitCount ? [...liveExpanded, ...expandedFallback] : [])]
      .filter((place, index, all) => all.findIndex((item) => item.title === place.title) === index)
    const selected = selectPlaces(pool, center, center, profile.id, teamKeywords, visitCount, usedAcrossCourses, badWeather)
    selected.forEach((place) => usedAcrossCourses.add(place.title))
    const ordered = nearestOrder(selected, center)
    const routeKm = ordered.slice(1).reduce((sum, point, index) => sum + distanceKm(ordered[index], point), 0)
    return {
      id: profile.id, title: `${zone.label} ${profile.title}`, label: profile.label, emoji: profile.emoji,
      description: `${zone.label} 소권역 안에서 대중교통 누적 이동을 줄인 당일치기 코스`, match: 80,
      tags: [...new Set([...topThemes, ...profile.tags])].slice(0, 4), totalPrice: 0,
      travelMinutes: Math.max(15, Math.round(routeKm * 5 + Math.max(0, ordered.length - 1) * 8)),
      days: [[...ordered.map((place, index) => routeStop(place.title, visitTime(index, ordered.length), place))]],
    }
  })
}

export async function generateRouteCourses(originName: string, destinationName: string, credentials: SearchCredentials, preferences: RoutePreference[] = [], preferredArea?: string, db?: SearchCache, travelDate?: string): Promise<Course[]> {
  if (!credentials.clientId || !credentials.clientSecret) {
    if (preferredArea && db) return generateOpenRouteCourses(preferredArea, credentials, preferences, db, travelDate)
    throw new Error('출발·도착 장소의 좌표 확인을 위해 네이버 지역검색 설정이 필요합니다.')
  }
  if (preferredArea) return generateOpenRouteCourses(preferredArea, credentials, preferences, db, travelDate)
  const [originResults, destinationResults] = await Promise.all([
    search(`부산 ${originName}`, '출발지', credentials, 1, db),
    search(`부산 ${destinationName}`, '도착지', credentials, 1, db),
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
  const center = { latitude: (origin.latitude + destination.latitude) / 2, longitude: (origin.longitude + destination.longitude) / 2 }
  const publicPool = db ? mapPublicPlaces(await nearbyPublicPlaces(db, center, nearbyTrip ? 6 : Math.max(6, Math.min(12, distanceKm(origin, destination))), 150, travelDate)) : []
  const badWeather = db ? await weatherRiskForDate(db, travelDate) : false
  if (publicPool.length < Math.max(8, visitCount * 2)) await sleep(Math.floor(Math.random() * 500))
  const searchJobs = publicPool.length >= Math.max(8, visitCount * 2) ? [] : zones.flatMap((zone) => keywords.map((keyword) => ({ zone, keyword })))
  const batches = await mapWithConcurrency(searchJobs, 2, async ({ zone, keyword }) => {
    try { return await search(`부산 ${zone}${nearbyTrip ? ' 주변' : ''} ${keyword}`, keyword, credentials, 5, db) }
    catch (reason) {
      console.warn('naver-route-search-skipped', { zone, keyword, reason: reason instanceof Error ? reason.message : String(reason) })
      return []
    }
  })
  const livePool = batches.flat().filter((place, index, all) => all.findIndex((item) => item.title === place.title) === index)
  const combinedPool = [...publicPool, ...livePool]
  const pool = (combinedPool.length >= 6 ? combinedPool : [...combinedPool, ...curatedFallbackPlaces]).filter((place, index, all) => all.findIndex((item) => item.title === place.title) === index)

  const usedAcrossCourses = new Set<string>()
  return profiles.map((profile) => {
    const selected = selectPlaces(pool, origin, destination, profile.id, teamKeywords, visitCount, usedAcrossCourses, badWeather)
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
