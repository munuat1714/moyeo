import type { Stop } from './types'

export type SourceLocale = 'ko' | 'en' | 'zh-TW' | 'zh-CN' | 'ja'

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

const sourceLabels: Record<string, Record<SourceLocale, string>> = {
  '한국관광공사·부산관광포털': { ko: '한국관광공사·부산관광포털', en: 'Korea Tourism Organization · Visit Busan', 'zh-TW': '韓國觀光公社・釜山觀光入口網站', 'zh-CN': '韩国观光公社・釜山旅游门户', ja: '韓国観光公社・釜山観光ポータル' },
  '한국관광공사 TourAPI': { ko: '한국관광공사 TourAPI', en: 'Korea Tourism Organization TourAPI', 'zh-TW': '韓國觀光公社 TourAPI', 'zh-CN': '韩国观光公社 TourAPI', ja: '韓国観光公社 TourAPI' },
  '부산광역시 맛집정보': { ko: '부산광역시 맛집정보', en: 'Busan restaurant data', 'zh-TW': '釜山市美食資料', 'zh-CN': '釜山市美食数据', ja: '釜山市グルメデータ' },
  '부산광역시 모범음식점': { ko: '부산광역시 모범음식점', en: 'Busan Certified Restaurants', 'zh-TW': '釜山市模範餐廳', 'zh-CN': '釜山市示范餐厅', ja: '釜山市模範飲食店' },
  '국가유산청 공식 데이터': { ko: '국가유산청 공식 데이터', en: 'Korea Heritage Service data', 'zh-TW': '韓國國家遺產廳官方資料', 'zh-CN': '韩国国家遗产厅官方数据', ja: '韓国国家遺産庁公式データ' },
  '네이버 지역검색': { ko: '네이버 지역검색', en: 'Naver Local Search', 'zh-TW': 'NAVER 地區搜尋', 'zh-CN': 'NAVER 地区搜索', ja: 'NAVER ローカル検索' },
  '운영자 검수': { ko: '운영자 검수', en: 'Editorial review', 'zh-TW': '營運團隊審核', 'zh-CN': '运营团队审核', ja: '運営チーム確認' },
}

const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function formatSourceDate(value?: string, locale: SourceLocale = 'ko') {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 6) return null
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  if (year < 2000 || month < 1 || month > 12) return null
  const day = digits.length >= 8 ? Number(digits.slice(6, 8)) : 0
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : -1
  const localizedMonth = locale === 'en' ? englishMonths[month - 1] : `${month}`
  const short = locale === 'ko' ? `${year}년 ${month}월 기준`
    : locale === 'en' ? `As of ${localizedMonth} ${year}`
      : locale === 'ja' ? `${year}年${month}月時点`
        : locale === 'zh-TW' ? `截至 ${year} 年 ${month} 月`
          : `截至 ${year} 年 ${month} 月`
  const hasDay = day >= 1 && day <= 31
  const detail = locale === 'ko' ? (hasDay ? `${year}년 ${month}월 ${day}일${hour >= 0 && hour <= 23 ? ` ${hour}시` : ''} 갱신` : `${year}년 ${month}월 갱신`)
    : locale === 'en' ? (hasDay ? `Updated ${localizedMonth} ${day}, ${year}${hour >= 0 && hour <= 23 ? ` at ${hour}:00` : ''}` : `Updated ${localizedMonth} ${year}`)
      : locale === 'ja' ? (hasDay ? `${year}年${month}月${day}日${hour >= 0 && hour <= 23 ? `${hour}時` : ''}更新` : `${year}年${month}月更新`)
        : locale === 'zh-TW' ? (hasDay ? `${year} 年 ${month} 月 ${day} 日${hour >= 0 && hour <= 23 ? ` ${hour} 時` : ''}更新` : `${year} 年 ${month} 月更新`)
          : (hasDay ? `${year} 年 ${month} 月 ${day} 日${hour >= 0 && hour <= 23 ? ` ${hour} 时` : ''}更新` : `${year} 年 ${month} 月更新`)
  return { short, detail }
}

export function sourceDisplay(source?: string, verifiedAt?: string, locale: SourceLocale = 'ko') {
  const date = formatSourceDate(verifiedAt, locale)
  const rawSource = source || '운영자 검수'
  const localizedSource = sourceLabels[rawSource]?.[locale] ?? rawSource
  return {
    text: [localizedSource, date?.short].filter(Boolean).join(' · '),
    title: date ? (locale === 'ko' ? `원본 데이터 ${date.detail}` : locale === 'en' ? `Source data: ${date.detail}` : locale === 'ja' ? `元データ：${date.detail}` : locale === 'zh-TW' ? `原始資料：${date.detail}` : `原始数据：${date.detail}`) : undefined,
  }
}

export function naverRouteUrl(leg: TransitLeg) {
  const action = leg.mode === '도보' ? 'walk' : 'public'
  const start = `${leg.from.longitude},${leg.from.latitude},${encodeURIComponent(leg.from.title)},-`
  const destination = `${leg.to.longitude},${leg.to.latitude},${encodeURIComponent(leg.to.title)},-`
  return `https://map.naver.com/p/directions/${start}/${destination}/-/${action}`
}
