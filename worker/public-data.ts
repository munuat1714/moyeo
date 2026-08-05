export type PublicDataEnv = { DB: D1Database; PUBLIC_DATA_SERVICE_KEY?: string }

export type PublicPlace = {
  provider: string; sourceId: string; title: string; category: string; address: string
  latitude: number; longitude: number; telephone: string; imageUrl: string; sourceUrl: string
  officialTags: string[]; sourceModifiedAt?: string
  eventStartDate?: string; eventEndDate?: string
}

const TOUR_TYPES: Record<string, string> = {
  '12': '관광명소', '14': '역사·문화', '15': '공연·축제', '28': '액티비티', '38': '쇼핑', '39': '맛집',
}

const decodedServiceKey = (value: string) => { try { return decodeURIComponent(value) } catch { return value } }
const itemsFrom = (data: any): Record<string, any>[] => {
  const value = data?.response?.body?.items?.item ?? data?.getFoodKr?.item ?? data?.item ?? []
  return Array.isArray(value) ? value : value ? [value] : []
}
const pick = (item: Record<string, any>, ...keys: string[]) => {
  for (const key of keys) if (item[key] !== undefined && item[key] !== null && item[key] !== '') return item[key]
  return ''
}
const clean = (value: unknown) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;/g, ' ').replace(/\s+/g, ' ').trim()

async function fetchJson(url: URL) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`${url.pathname}: ${response.status}`)
  const data = await response.json<any>()
  const code = data?.response?.header?.resultCode
  if (code && code !== '00' && code !== '0000') throw new Error(`${url.pathname}: ${code} ${data.response.header.resultMsg ?? ''}`)
  return data
}

const publicUrl = (path: string, serviceKey: string) => {
  const url = new URL(`https://apis.data.go.kr${path}`)
  url.searchParams.set('serviceKey', decodedServiceKey(serviceKey))
  return url
}

async function tourPlaces(serviceKey: string) {
  const results: PublicPlace[] = []
  for (const [contentTypeId, category] of Object.entries(TOUR_TYPES).filter(([id]) => id !== '15')) {
    const url = publicUrl('/B551011/KorService2/areaBasedList2', serviceKey)
    Object.entries({ MobileOS: 'ETC', MobileApp: 'Moyeo', _type: 'json', areaCode: '6', contentTypeId, numOfRows: '1000', pageNo: '1' })
      .forEach(([key, value]) => url.searchParams.set(key, value))
    for (const item of itemsFrom(await fetchJson(url))) {
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
  const kst = new Date(Date.now() + 9 * 3600_000)
  const today = `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(kst.getUTCDate()).padStart(2, '0')}`
  const festivalUrl = publicUrl('/B551011/KorService2/searchFestival2', serviceKey)
  Object.entries({ MobileOS: 'ETC', MobileApp: 'Moyeo', _type: 'json', areaCode: '6', eventStartDate: today, numOfRows: '1000', pageNo: '1', arrange: 'A' })
    .forEach(([key, value]) => festivalUrl.searchParams.set(key, value))
  for (const item of itemsFrom(await fetchJson(festivalUrl))) {
    const latitude = Number(item.mapy), longitude = Number(item.mapx)
    const eventStartDate = String(item.eventstartdate ?? ''), eventEndDate = String(item.eventenddate ?? '')
    if (!item.contentid || !item.title || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || !String(item.addr1 ?? '').includes('부산') || !eventStartDate || !eventEndDate || eventEndDate < today) continue
    results.push({
      provider: 'TOUR_API', sourceId: String(item.contentid), title: String(item.title), category: '공연·축제',
      address: [item.addr1, item.addr2].filter(Boolean).join(' '), latitude, longitude,
      telephone: String(item.tel ?? ''), imageUrl: String(item.firstimage ?? ''),
      sourceUrl: `https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=${encodeURIComponent(String(item.contentid))}`,
      officialTags: ['한국관광공사 행사정보'], sourceModifiedAt: String(item.modifiedtime ?? ''), eventStartDate, eventEndDate,
    })
  }
  return results
}

async function busanFoodPlaces(serviceKey: string) {
  const url = publicUrl('/6260000/FoodService/getFoodKr', serviceKey)
  Object.entries({ resultType: 'json', numOfRows: '1000', pageNo: '1' }).forEach(([key, value]) => url.searchParams.set(key, value))
  return itemsFrom(await fetchJson(url)).flatMap((item): PublicPlace[] => {
    const latitude = Number(item.LAT ?? item.lat), longitude = Number(item.LNG ?? item.lng)
    const sourceId = item.UC_SEQ ?? item.ucSeq, title = item.MAIN_TITLE ?? item.mainTitle
    if (!sourceId || !title || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
    return [{ provider: 'BUSAN_FOOD', sourceId: String(sourceId), title: String(title), category: '맛집',
      address: String(item.ADDR1 ?? item.addr1 ?? ''), latitude, longitude, telephone: String(item.CNTCT_TEL ?? item.cntctTel ?? ''),
      imageUrl: String(item.MAIN_IMG_NORMAL ?? item.mainImgNormal ?? ''), sourceUrl: 'https://www.visitbusan.net/',
      officialTags: ['부산광역시 추천 맛집'], sourceModifiedAt: String(item.DATA_DAY ?? item.dataDay ?? '') }]
  })
}

async function modelRestaurantPlaces(serviceKey: string) {
  const url = publicUrl('/6260000/BusanTblFnrstrnStusService/getTblFnrstrnStusInfo', serviceKey)
  Object.entries({ resultType: 'json', numOfRows: '1000', pageNo: '1' }).forEach(([key, value]) => url.searchParams.set(key, value))
  return itemsFrom(await fetchJson(url)).flatMap((item): PublicPlace[] => {
    const title = pick(item, 'rstrtNm', 'RSTR_NM', '업소명', 'bsshNm', 'MAIN_TITLE')
    const address = pick(item, 'addr', 'ADDR', '소재지', 'roadNmAddr', 'ADDR1')
    const latitude = Number(pick(item, 'lat', 'LAT', 'latitude', '위도')), longitude = Number(pick(item, 'lng', 'LNG', 'longitude', '경도'))
    if (!title || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !latitude || !longitude) return []
    return [{ provider: 'BUSAN_MODEL_FOOD', sourceId: String(pick(item, 'rstrtSn', 'RSTR_SN', '관리번호', 'idx') || `${title}:${address}`),
      title: String(title), category: '맛집', address: String(address), latitude, longitude,
      telephone: String(pick(item, 'tel', 'TEL', '전화번호')), imageUrl: '', sourceUrl: 'https://www.busan.go.kr/',
      officialTags: ['부산광역시 모범음식점'], sourceModifiedAt: String(pick(item, 'dsgnYmd', 'DSGN_YMD', '지정일자')) }]
  })
}

async function savePlaces(db: D1Database, provider: string, places: PublicPlace[]) {
  const now = Math.floor(Date.now() / 1000)
  const statements = places.map((place) => db.prepare(`INSERT INTO public_places
    (provider,source_id,title,category,address,latitude,longitude,telephone,image_url,source_url,official_tags,source_modified_at,synced_at,active,event_start_date,event_end_date)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,1,?14,?15)
    ON CONFLICT(provider,source_id) DO UPDATE SET title=excluded.title,category=excluded.category,address=excluded.address,
    latitude=excluded.latitude,longitude=excluded.longitude,telephone=excluded.telephone,image_url=excluded.image_url,
    source_url=excluded.source_url,official_tags=excluded.official_tags,source_modified_at=excluded.source_modified_at,synced_at=excluded.synced_at,
    active=1,event_start_date=excluded.event_start_date,event_end_date=excluded.event_end_date`)
    .bind(place.provider, place.sourceId, place.title, place.category, place.address, place.latitude, place.longitude,
      place.telephone, place.imageUrl, place.sourceUrl, JSON.stringify(place.officialTags), place.sourceModifiedAt ?? null, now,
      place.eventStartDate ?? '', place.eventEndDate ?? ''))
  for (let index = 0; index < statements.length; index += 50) await db.batch(statements.slice(index, index + 50))
  await db.prepare('UPDATE public_places SET active=0 WHERE provider=?1 AND synced_at < ?2').bind(provider, now).run()
  await markReady(db, provider, places.length, now)
}

async function enrichTourDetails(db: D1Database, serviceKey: string, limit = 15) {
  const stale = Math.floor(Date.now() / 1000) - 30 * 86400
  const rows = await db.prepare(`SELECT source_id,category FROM public_places WHERE provider='TOUR_API' AND active=1
    AND (detail_synced_at IS NULL OR detail_synced_at < ?1) ORDER BY COALESCE(detail_synced_at,0), id LIMIT ?2`).bind(stale, limit).all<any>()
  const now = Math.floor(Date.now() / 1000)
  for (const row of rows.results) {
    const commonUrl = publicUrl('/B551011/KorService2/detailCommon2', serviceKey)
    Object.entries({ MobileOS: 'ETC', MobileApp: 'Moyeo', _type: 'json', contentId: String(row.source_id), defaultYN: 'Y' })
      .forEach(([key, value]) => commonUrl.searchParams.set(key, value))
    const common = itemsFrom(await fetchJson(commonUrl))[0] ?? {}
    const introUrl = publicUrl('/B551011/KorService2/detailIntro2', serviceKey)
    Object.entries({ MobileOS: 'ETC', MobileApp: 'Moyeo', _type: 'json', contentId: String(row.source_id), contentTypeId: Object.keys(TOUR_TYPES).find((key) => TOUR_TYPES[key] === row.category) ?? '' })
      .forEach(([key, value]) => introUrl.searchParams.set(key, value))
    const intro = itemsFrom(await fetchJson(introUrl))[0] ?? {}
    await db.prepare(`UPDATE public_places SET overview=?1,opening_hours=?2,rest_date=?3,fee_info=?4,detail_synced_at=?5 WHERE provider='TOUR_API' AND source_id=?6`)
      .bind(clean(common.overview), clean(pick(intro, 'usetime', 'playtime', 'opentimefood', 'usetimeculture', 'usetimeleports', 'saleitemcost')),
        clean(pick(intro, 'restdate', 'restdatefood', 'restdateculture', 'restdateshopping', 'restdateleports')),
        clean(pick(intro, 'usefee', 'usefeeleports', 'parkingfee', 'firstmenu')), now, row.source_id).run()
  }
  await markReady(db, 'TOUR_DETAIL', rows.results.length, now)
}

async function syncBusanExhibitions(db: D1Database, serviceKey: string) {
  const url = publicUrl('/6260000/BusanCultureExhibitDetailService/getBusanCultureExhibitDetail', serviceKey)
  Object.entries({ resultType: 'json', numOfRows: '1000', pageNo: '1' }).forEach(([key, value]) => url.searchParams.set(key, value))
  const events = itemsFrom(await fetchJson(url)), now = Math.floor(Date.now() / 1000)
  const statements = events.flatMap((item) => {
    const id = pick(item, 'res_no'), title = pick(item, 'title')
    if (!id || !title) return []
    return [db.prepare(`INSERT INTO public_events (provider,source_id,title,venue_name,start_date,end_date,opening_hours,fee_info,source_url,synced_at,active)
      VALUES ('BUSAN_EXHIBITION',?1,?2,?3,?4,?5,?6,?7,?8,?9,1)
      ON CONFLICT(provider,source_id) DO UPDATE SET title=excluded.title,venue_name=excluded.venue_name,start_date=excluded.start_date,
      end_date=excluded.end_date,opening_hours=excluded.opening_hours,fee_info=excluded.fee_info,source_url=excluded.source_url,synced_at=excluded.synced_at,active=1`)
      .bind(String(id), clean(title), clean(item.place_nm), String(item.op_st_dt ?? ''), String(item.op_ed_dt ?? ''), clean(item.showtime), clean(item.price), clean(item.dabom_url), now)]
  })
  for (let index = 0; index < statements.length; index += 50) await db.batch(statements.slice(index, index + 50))
  await db.prepare("UPDATE public_events SET active=0 WHERE provider='BUSAN_EXHIBITION' AND synced_at < ?1").bind(now).run()
  await markReady(db, 'BUSAN_EXHIBITION', statements.length, now)
}

function latestWeatherBase(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600_000 - 10 * 60_000)
  const baseHours = [2, 5, 8, 11, 14, 17, 20, 23]
  let hour = [...baseHours].reverse().find((value) => value <= kst.getUTCHours())
  if (hour === undefined) { kst.setUTCDate(kst.getUTCDate() - 1); hour = 23 }
  const date = `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(kst.getUTCDate()).padStart(2, '0')}`
  return { date, time: `${String(hour).padStart(2, '0')}00` }
}

async function syncWeather(db: D1Database, serviceKey: string) {
  const base = latestWeatherBase()
  const url = publicUrl('/1360000/VilageFcstInfoService_2.0/getVilageFcst', serviceKey)
  Object.entries({ pageNo: '1', numOfRows: '1000', dataType: 'JSON', base_date: base.date, base_time: base.time, nx: '98', ny: '76' })
    .forEach(([key, value]) => url.searchParams.set(key, value))
  const grouped = new Map<string, Record<string, number>>()
  for (const item of itemsFrom(await fetchJson(url))) {
    const key = `${item.fcstDate}${item.fcstTime}`
    const row = grouped.get(key) ?? {}
    row[String(item.category)] = Number(item.fcstValue)
    grouped.set(key, row)
  }
  const now = Math.floor(Date.now() / 1000)
  const statements = [...grouped].map(([at, row]) => db.prepare(`INSERT INTO weather_forecasts
    (forecast_at,forecast_date,forecast_time,temperature,rain_probability,precipitation_type,sky,wind_speed,fetched_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(forecast_at) DO UPDATE SET temperature=excluded.temperature,
    rain_probability=excluded.rain_probability,precipitation_type=excluded.precipitation_type,sky=excluded.sky,wind_speed=excluded.wind_speed,fetched_at=excluded.fetched_at`)
    .bind(at, at.slice(0, 8), at.slice(8), row.TMP ?? null, row.POP ?? null, row.PTY ?? null, row.SKY ?? null, row.WSD ?? null, now))
  for (let index = 0; index < statements.length; index += 50) await db.batch(statements.slice(index, index + 50))
  await db.prepare('DELETE FROM weather_forecasts WHERE forecast_date < ?1').bind(base.date).run()
  await markReady(db, 'KMA_FORECAST', statements.length, now)
}

async function markReady(db: D1Database, provider: string, count: number, now = Math.floor(Date.now() / 1000)) {
  await db.prepare(`INSERT INTO public_data_sync (provider,status,last_started_at,last_completed_at,item_count,error_message)
    VALUES (?1,'ready',?2,?2,?3,NULL) ON CONFLICT(provider) DO UPDATE SET status='ready',last_completed_at=?2,item_count=?3,error_message=NULL`)
    .bind(provider, now, count).run()
}

export async function syncPublicData(env: PublicDataEnv) {
  if (!env.PUBLIC_DATA_SERVICE_KEY) return { enabled: false, synced: [] }
  const key = env.PUBLIC_DATA_SERVICE_KEY, synced: string[] = []
  const tasks: Array<{ id: string; run: () => Promise<void> }> = [
    { id: 'TOUR_API', run: async () => savePlaces(env.DB, 'TOUR_API', await tourPlaces(key)) },
    { id: 'BUSAN_FOOD', run: async () => savePlaces(env.DB, 'BUSAN_FOOD', await busanFoodPlaces(key)) },
    { id: 'BUSAN_MODEL_FOOD', run: async () => savePlaces(env.DB, 'BUSAN_MODEL_FOOD', await modelRestaurantPlaces(key)) },
    { id: 'TOUR_DETAIL', run: () => enrichTourDetails(env.DB, key) },
    { id: 'BUSAN_EXHIBITION', run: () => syncBusanExhibitions(env.DB, key) },
    { id: 'KMA_FORECAST', run: () => syncWeather(env.DB, key) },
  ]
  for (const task of tasks) {
    const now = Math.floor(Date.now() / 1000)
    await env.DB.prepare(`INSERT INTO public_data_sync (provider,status,last_started_at,item_count) VALUES (?1,'syncing',?2,0)
      ON CONFLICT(provider) DO UPDATE SET status='syncing',last_started_at=?2,error_message=NULL`).bind(task.id, now).run()
    try { await task.run(); synced.push(task.id) }
    catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason)
      console.error('public-data-sync-failed', { provider: task.id, message })
      await env.DB.prepare("UPDATE public_data_sync SET status='failed',error_message=?1 WHERE provider=?2").bind(message.slice(0, 500), task.id).run()
    }
  }
  return { enabled: true, synced }
}

export async function nearbyPublicPlaces(db: D1Database, center: { latitude: number; longitude: number }, radiusKm: number, limit = 120, travelDate?: string) {
  const latDelta = radiusKm / 111, lonDelta = radiusKm / (111 * Math.max(.2, Math.cos(center.latitude * Math.PI / 180)))
  const nowKst = new Date(Date.now() + 9 * 3600_000)
  const today = `${nowKst.getUTCFullYear()}${String(nowKst.getUTCMonth() + 1).padStart(2, '0')}${String(nowKst.getUTCDate()).padStart(2, '0')}`
  const date = travelDate ? travelDate.replace(/-/g, '') : today
  const result = await db.prepare(`SELECT p.provider,p.source_id,p.title,p.category,p.address,p.latitude,p.longitude,p.source_url,p.official_tags,
    p.source_modified_at,p.overview,p.opening_hours,p.rest_date,p.fee_info,p.event_start_date,p.event_end_date,
    e.title event_title,e.opening_hours event_hours,e.fee_info event_fee
    FROM public_places p LEFT JOIN public_events e ON e.active=1 AND e.venue_name<>''
      AND (instr(lower(p.title),lower(e.venue_name))>0 OR instr(lower(e.venue_name),lower(p.title))>0)
      AND (?1='' OR (replace(e.start_date,'-','')<=?1 AND replace(e.end_date,'-','')>=?1))
    WHERE p.active=1
      AND (p.category<>'공연·축제' OR (p.event_start_date<>'' AND p.event_end_date<>'' AND p.event_start_date<=?1 AND p.event_end_date>=?1))
      AND p.latitude BETWEEN ?2 AND ?3 AND p.longitude BETWEEN ?4 AND ?5 LIMIT ?6`)
    .bind(date, center.latitude - latDelta, center.latitude + latDelta, center.longitude - lonDelta, center.longitude + lonDelta, limit).all<any>()
  return result.results
}

export async function weatherRiskForDate(db: D1Database, travelDate?: string) {
  if (!travelDate) return false
  const date = travelDate.replace(/-/g, '')
  const row = await db.prepare(`SELECT MAX(COALESCE(rain_probability,0)) rain,MAX(COALESCE(precipitation_type,0)) precipitation,
    MAX(COALESCE(wind_speed,0)) wind FROM weather_forecasts WHERE forecast_date=?1`).bind(date).first<any>()
  return Boolean(row && (Number(row.rain) >= 60 || Number(row.precipitation) > 0 || Number(row.wind) >= 10))
}

export async function publicDataStatus(db: D1Database) {
  return (await db.prepare('SELECT provider,status,last_completed_at,item_count,error_message FROM public_data_sync ORDER BY provider').all()).results
}
