export type PublicDataEnv = {
  DB: D1Database
  PUBLIC_DATA_SERVICE_KEY?: string
}

export type PublicPlace = {
  provider: string
  sourceId: string
  title: string
  category: string
  address: string
  latitude: number
  longitude: number
  telephone: string
  imageUrl: string
  sourceUrl: string
  officialTags: string[]
  sourceModifiedAt?: string
}

const TOUR_TYPES: Record<string, string> = {
  '12': '관광명소',
  '14': '역사·문화',
  '15': '공연·축제',
  '28': '액티비티',
  '38': '쇼핑',
  '39': '맛집',
}

const itemsFrom = (data: any): Record<string, any>[] => {
  const value = data?.response?.body?.items?.item ?? data?.getFoodKr?.item ?? data?.item ?? []
  return Array.isArray(value) ? value : value ? [value] : []
}

const decodedServiceKey = (value: string) => {
  try { return decodeURIComponent(value) } catch { return value }
}

const pick = (item: Record<string, any>, ...keys: string[]) => {
  for (const key of keys) if (item[key] !== undefined && item[key] !== null && item[key] !== '') return item[key]
  return ''
}

async function fetchJson(url: URL) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`${url.pathname}: ${response.status}`)
  return response.json()
}

async function tourPlaces(serviceKey: string) {
  const results: PublicPlace[] = []
  for (const [contentTypeId, category] of Object.entries(TOUR_TYPES)) {
    const url = new URL('https://apis.data.go.kr/B551011/KorService2/areaBasedList2')
    url.searchParams.set('serviceKey', decodedServiceKey(serviceKey))
    url.searchParams.set('MobileOS', 'ETC')
    url.searchParams.set('MobileApp', 'Moyeo')
    url.searchParams.set('_type', 'json')
    url.searchParams.set('areaCode', '6')
    url.searchParams.set('contentTypeId', contentTypeId)
    url.searchParams.set('numOfRows', '1000')
    url.searchParams.set('pageNo', '1')
    const data = await fetchJson(url)
    for (const item of itemsFrom(data)) {
      const latitude = Number(item.mapy), longitude = Number(item.mapx)
      if (!item.contentid || !item.title || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
      results.push({
        provider: 'TOUR_API', sourceId: String(item.contentid), title: String(item.title), category,
        address: [item.addr1, item.addr2].filter(Boolean).join(' '), latitude, longitude,
        telephone: String(item.tel ?? ''), imageUrl: String(item.firstimage ?? ''),
        sourceUrl: `https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=${encodeURIComponent(String(item.contentid))}`,
        officialTags: ['한국관광공사 관광정보'], sourceModifiedAt: String(item.modifiedtime ?? ''),
      })
    }
  }
  return results
}

async function busanFoodPlaces(serviceKey: string) {
  const url = new URL('https://apis.data.go.kr/6260000/FoodService/getFoodKr')
  url.searchParams.set('ServiceKey', decodedServiceKey(serviceKey))
  url.searchParams.set('resultType', 'json')
  url.searchParams.set('numOfRows', '1000')
  url.searchParams.set('pageNo', '1')
  const data = await fetchJson(url)
  return itemsFrom(data).flatMap((item): PublicPlace[] => {
    const latitude = Number(item.LAT ?? item.lat), longitude = Number(item.LNG ?? item.lng)
    const sourceId = item.UC_SEQ ?? item.ucSeq
    const title = item.MAIN_TITLE ?? item.mainTitle
    if (!sourceId || !title || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
    return [{
      provider: 'BUSAN_FOOD', sourceId: String(sourceId), title: String(title), category: '맛집',
      address: String(item.ADDR1 ?? item.addr1 ?? ''), latitude, longitude,
      telephone: String(item.CNTCT_TEL ?? item.cntctTel ?? ''),
      imageUrl: String(item.MAIN_IMG_NORMAL ?? item.mainImgNormal ?? ''),
      sourceUrl: 'https://www.visitbusan.net/', officialTags: ['부산광역시 추천 맛집'],
      sourceModifiedAt: String(item.DATA_DAY ?? item.dataDay ?? ''),
    }]
  })
}

async function modelRestaurantPlaces(serviceKey: string) {
  const url = new URL('https://apis.data.go.kr/6260000/BusanTblFnrstrnStusService/getTblFnrstrnStusInfo')
  url.searchParams.set('serviceKey', decodedServiceKey(serviceKey))
  url.searchParams.set('resultType', 'json')
  url.searchParams.set('numOfRows', '1000')
  url.searchParams.set('pageNo', '1')
  const data = await fetchJson(url)
  return itemsFrom(data).flatMap((item): PublicPlace[] => {
    const title = pick(item, 'rstrtNm', 'RSTR_NM', '업소명', 'bsshNm', 'MAIN_TITLE')
    const address = pick(item, 'addr', 'ADDR', '소재지', 'roadNmAddr', 'ADDR1')
    const latitude = Number(pick(item, 'lat', 'LAT', 'latitude', '위도'))
    const longitude = Number(pick(item, 'lng', 'LNG', 'longitude', '경도'))
    if (!title || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !latitude || !longitude) return []
    const sourceId = String(pick(item, 'rstrtSn', 'RSTR_SN', '관리번호', 'idx') || `${title}:${address}`)
    return [{
      provider: 'BUSAN_MODEL_FOOD', sourceId, title: String(title), category: '맛집', address: String(address),
      latitude, longitude, telephone: String(pick(item, 'tel', 'TEL', '전화번호')),
      imageUrl: '', sourceUrl: 'https://www.busan.go.kr/', officialTags: ['부산광역시 모범음식점'],
      sourceModifiedAt: String(pick(item, 'dsgnYmd', 'DSGN_YMD', '지정일자')),
    }]
  })
}

const xmlValue = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i'))
  return match?.[1]?.trim() ?? ''
}

async function heritagePlaces() {
  const url = new URL('https://www.khs.go.kr/cha/SearchKindOpenapiList.do')
  url.searchParams.set('pageUnit', '1000')
  url.searchParams.set('pageIndex', '1')
  url.searchParams.set('ccbaCtcd', '21')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url.pathname}: ${response.status}`)
  const xml = await response.text()
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].flatMap((match): PublicPlace[] => {
    const item = match[1]
    const latitude = Number(xmlValue(item, 'latitude')), longitude = Number(xmlValue(item, 'longitude'))
    const sourceId = xmlValue(item, 'ccbaCpno') || `${xmlValue(item, 'ccbaKdcd')}-${xmlValue(item, 'ccbaAsno')}`
    const title = xmlValue(item, 'ccbaMnm1')
    if (!sourceId || !title || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !latitude || !longitude) return []
    const designation = xmlValue(item, 'ccmaName')
    return [{
      provider: 'KHS_HERITAGE', sourceId, title, category: '역사·문화',
      address: ['부산', xmlValue(item, 'ccsiName'), xmlValue(item, 'ccbaAdmin')].filter(Boolean).join(' '),
      latitude, longitude, telephone: '', imageUrl: '',
      sourceUrl: 'https://www.khs.go.kr/', officialTags: [designation || '국가유산청 등록 유산'],
      sourceModifiedAt: xmlValue(item, 'regDt'),
    }]
  })
}

async function savePlaces(db: D1Database, provider: string, places: PublicPlace[]) {
  const now = Math.floor(Date.now() / 1000)
  const statements = places.map((place) => db.prepare(`INSERT INTO public_places
    (provider,source_id,title,category,address,latitude,longitude,telephone,image_url,source_url,official_tags,source_modified_at,synced_at,active)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,1)
    ON CONFLICT(provider,source_id) DO UPDATE SET title=excluded.title,category=excluded.category,address=excluded.address,
    latitude=excluded.latitude,longitude=excluded.longitude,telephone=excluded.telephone,image_url=excluded.image_url,
    source_url=excluded.source_url,official_tags=excluded.official_tags,source_modified_at=excluded.source_modified_at,synced_at=excluded.synced_at,active=1`)
    .bind(place.provider, place.sourceId, place.title, place.category, place.address, place.latitude, place.longitude,
      place.telephone, place.imageUrl, place.sourceUrl, JSON.stringify(place.officialTags), place.sourceModifiedAt ?? null, now))
  for (let index = 0; index < statements.length; index += 50) await db.batch(statements.slice(index, index + 50))
  await db.prepare('UPDATE public_places SET active=0 WHERE provider=?1 AND synced_at < ?2').bind(provider, now).run()
  await db.prepare(`INSERT INTO public_data_sync (provider,status,last_started_at,last_completed_at,item_count,error_message)
    VALUES (?1,'ready',?2,?2,?3,NULL) ON CONFLICT(provider) DO UPDATE SET status='ready',last_completed_at=?2,item_count=?3,error_message=NULL`)
    .bind(provider, now, places.length).run()
}

export async function syncPublicData(env: PublicDataEnv) {
  const providers = [
    { id: 'KHS_HERITAGE', load: () => heritagePlaces() },
    ...(env.PUBLIC_DATA_SERVICE_KEY ? [
      { id: 'TOUR_API', load: () => tourPlaces(env.PUBLIC_DATA_SERVICE_KEY!) },
      { id: 'BUSAN_FOOD', load: () => busanFoodPlaces(env.PUBLIC_DATA_SERVICE_KEY!) },
      { id: 'BUSAN_MODEL_FOOD', load: () => modelRestaurantPlaces(env.PUBLIC_DATA_SERVICE_KEY!) },
    ] : []),
  ]
  const synced: string[] = []
  for (const provider of providers) {
    const now = Math.floor(Date.now() / 1000)
    await env.DB.prepare(`INSERT INTO public_data_sync (provider,status,last_started_at,item_count)
      VALUES (?1,'syncing',?2,0) ON CONFLICT(provider) DO UPDATE SET status='syncing',last_started_at=?2,error_message=NULL`).bind(provider.id, now).run()
    try {
      const places = await provider.load()
      await savePlaces(env.DB, provider.id, places)
      synced.push(provider.id)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason)
      console.error('public-data-sync-failed', { provider: provider.id, message })
      await env.DB.prepare("UPDATE public_data_sync SET status='failed',error_message=?1 WHERE provider=?2").bind(message.slice(0, 500), provider.id).run()
    }
  }
  return { enabled: Boolean(env.PUBLIC_DATA_SERVICE_KEY), synced }
}

export async function nearbyPublicPlaces(db: D1Database, center: { latitude: number; longitude: number }, radiusKm: number, limit = 120) {
  const latDelta = radiusKm / 111
  const lonDelta = radiusKm / (111 * Math.max(.2, Math.cos(center.latitude * Math.PI / 180)))
  const result = await db.prepare(`SELECT provider,source_id,title,category,address,latitude,longitude,source_url,official_tags,source_modified_at
    FROM public_places WHERE active=1 AND latitude BETWEEN ?1 AND ?2 AND longitude BETWEEN ?3 AND ?4 LIMIT ?5`)
    .bind(center.latitude - latDelta, center.latitude + latDelta, center.longitude - lonDelta, center.longitude + lonDelta, limit).all<any>()
  return result.results
}

export async function publicDataStatus(db: D1Database) {
  const result = await db.prepare('SELECT provider,status,last_completed_at,item_count,error_message FROM public_data_sync ORDER BY provider').all()
  return result.results
}
