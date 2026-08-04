import type { AppState, Course, Preference, Stop } from './types'

export const themes = ['맛집', '감성 카페', '사진 명소', '액티비티', '역사·문화', '쇼핑']
export const foods = ['한식', '고기·구이', '해산물', '일식', '중식', '양식', '분식', '디저트·베이커리', '채식']
export const moods = ['감성적인', '활기찬', '조용한', '로컬']

export const demoPreferences: Record<string, Preference> = {
  minji: { themes: ['맛집', '감성 카페', '사진 명소'], placeCount: 4, food: ['한식', '디저트·베이커리'], mood: ['감성적인'] },
  seojun: { themes: ['맛집', '역사·문화', '쇼핑'], placeCount: 6, food: ['고기·구이'], mood: ['로컬', '활기찬'] },
  yuna: { themes: ['감성 카페', '사진 명소', '쇼핑'], placeCount: 2, food: ['디저트·베이커리', '양식'], mood: ['감성적인', '조용한'] },
  hyunwoo: { themes: ['맛집', '액티비티', '사진 명소'], placeCount: 4, food: ['한식', '해산물'], mood: ['활기찬'] },
}

export const initialState: AppState = {
  step: 'home',
  trip: {
    name: '우리들의 부산 한바퀴',
    origin: '',
    destination: '',
    startDate: '2026-08-15',
    endDate: '2026-08-15',
    transport: '대중교통',
    stay: '감성 숙소',
  },
  members: [
    { id: 'minji', name: '민지', color: '#ff6b4a', host: true },
    { id: 'seojun', name: '서준', color: '#3f7cff' },
    { id: 'yuna', name: '유나', color: '#9b6bdf' },
    { id: 'hyunwoo', name: '현우', color: '#18a778' },
  ],
  activeMemberId: 'minji', votes: {}, voteRound: 1, runoffCourseIds: [], booked: [],
}

const checked = '2026-07-31'
const official = '한국관광공사·부산관광포털' as const
const place = (stop: Stop): Stop => ({ source: official, verifiedAt: checked, ...stop })

const sharedDay1: Stop[] = [
  place({ time: '09:30', title: '부산역', category: '교통', duration: '20분', price: 0, shared: true, description: '부산 원도심 여행을 시작해요. 이동시간은 실시간 길찾기에서 다시 확인해 주세요.', latitude: 35.1151, longitude: 129.0414, placeUrl: 'https://map.naver.com/p/search/부산역' }),
  place({ time: '10:20', title: '감천문화마을', category: '사진', duration: '1시간 30분', price: 0, shared: true, description: '산복도로 풍경과 골목을 담는 부산 대표 사진 코스예요.', latitude: 35.0975, longitude: 129.0106, placeUrl: 'https://map.naver.com/p/search/감천문화마을' }),
  place({ time: '12:30', title: '자갈치시장', category: '맛집', duration: '1시간 20분', price: 20000, shared: true, description: '부산의 로컬 시장을 둘러보고 식사해요. 가격은 메뉴에 따른 1인 예상치예요.', latitude: 35.0967, longitude: 129.0305, placeUrl: 'https://map.naver.com/p/search/자갈치시장' }),
]

const sharedDay2: Stop[] = [
  place({ time: '10:00', title: '전포카페거리', category: '카페', duration: '1시간 30분', price: 8000, shared: true, description: '공구길 골목의 개성 있는 카페를 취향에 맞게 골라요.', latitude: 35.1577, longitude: 129.0630, placeUrl: 'https://map.naver.com/p/search/전포카페거리' }),
  place({ time: '14:00', title: '광안리해수욕장', category: '산책', duration: '1시간 30분', price: 0, shared: true, description: '바다와 광안대교를 보며 천천히 걷는 공통 일정이에요.', latitude: 35.1532, longitude: 129.1187, placeUrl: 'https://map.naver.com/p/search/광안리해수욕장' }),
  place({ time: '17:30', title: '부산역', category: '교통', duration: '20분', price: 0, shared: true, description: '여행을 마무리해요. 출발 전 실제 대중교통 시간을 확인해 주세요.', latitude: 35.1151, longitude: 129.0414, placeUrl: 'https://map.naver.com/p/search/부산역' }),
]

export const courses: Course[] = [
  {
    id: 'balance', title: '바다와 골목 밸런스', label: '가장 추천', emoji: '✨',
    description: '맛집·카페·사진 취향을 고르게 담은 부산 핵심 코스', match: 92,
    tags: ['맛집', '감성 카페', '사진'], totalPrice: 118000, travelMinutes: 128,
    days: [
      [...sharedDay1,
        place({ time: '15:00', title: '흰여울문화마을', category: '사진', duration: '1시간 30분', price: 0, shared: false, description: '바다 절벽과 골목 풍경을 함께 담는 영도 포토워크예요.', latitude: 35.0786, longitude: 129.0443, placeUrl: 'https://map.naver.com/p/search/흰여울문화마을' }),
        place({ time: '18:30', title: '광안리 숙소 체크인', category: '숙소', duration: '1박', price: 90000, shared: false, reservable: true, description: '다음 날 광안리 동선을 줄이는 숙소 권역 제안이에요. 실제 숙소와 가격은 예약 전에 비교하세요.', latitude: 35.1532, longitude: 129.1187, source: '운영자 검수', placeUrl: 'https://map.naver.com/p/search/광안리 숙소' })],
      [...sharedDay2,
        place({ time: '12:00', title: '부산시민공원', category: '산책', duration: '1시간', price: 0, shared: false, description: '전포에서 가까운 도심 속 산책으로 일정의 속도를 조절해요.', latitude: 35.1667, longitude: 129.0571, placeUrl: 'https://map.naver.com/p/search/부산시민공원' }),
        place({ time: '16:00', title: '민락수변공원', category: '사진', duration: '50분', price: 0, shared: false, description: '광안리와 이어지는 바다 풍경을 한 번 더 담아요.', latitude: 35.1555, longitude: 129.1328, placeUrl: 'https://map.naver.com/p/search/민락수변공원' })],
    ],
  },
  {
    id: 'slow', title: '영도에서 천천히', label: '여유 충전', emoji: '🌿',
    description: '영도 바다와 전포 카페에서 머무는 시간을 늘린 감성 코스', match: 87,
    tags: ['감성 카페', '산책', '사진'], totalPrice: 112000, travelMinutes: 104,
    days: [
      [...sharedDay1,
        place({ time: '15:00', title: '태종대유원지', category: '산책', duration: '2시간', price: 0, shared: false, description: '바다와 숲을 함께 즐기는 여유로운 영도 산책이에요.', latitude: 35.0512, longitude: 129.0872, placeUrl: 'https://map.naver.com/p/search/태종대유원지' }),
        place({ time: '18:30', title: '영도 숙소 체크인', category: '숙소', duration: '1박', price: 84000, shared: false, reservable: true, description: '영도에서 이동을 줄이는 숙소 권역 제안이에요. 실제 가격과 운영 여부를 확인하세요.', latitude: 35.0912, longitude: 129.0680, source: '운영자 검수', placeUrl: 'https://map.naver.com/p/search/영도 숙소' })],
      [...sharedDay2,
        place({ time: '12:00', title: 'F1963', category: '관광', duration: '1시간 20분', price: 0, shared: false, description: '전시와 책, 정원을 함께 둘러보는 조용한 문화 공간이에요.', latitude: 35.1776, longitude: 129.1153, placeUrl: 'https://map.naver.com/p/search/F1963' }),
        place({ time: '16:00', title: '수영사적공원', category: '역사', duration: '50분', price: 0, shared: false, description: '광안리 근처에서 부산의 역사 취향도 가볍게 반영해요.', latitude: 35.1710, longitude: 129.1130, placeUrl: 'https://map.naver.com/p/search/수영사적공원' })],
    ],
  },
  {
    id: 'active', title: '해안 액티비티 부산', label: '에너지 MAX', emoji: '⚡',
    description: '송도와 해운대의 해안 체험을 넣은 활동적인 코스', match: 81,
    tags: ['액티비티', '맛집', '사진'], totalPrice: 151000, travelMinutes: 154,
    days: [
      [...sharedDay1,
        place({ time: '15:00', title: '송도해상케이블카', category: '액티비티', duration: '1시간 30분', price: 22000, shared: false, reservable: true, description: '바다 위를 지나며 송도 해안을 보는 체험이에요. 운행 여부와 요금은 방문 전에 확인하세요.', latitude: 35.0764, longitude: 129.0239, placeUrl: 'https://map.naver.com/p/search/송도해상케이블카' }),
        place({ time: '18:30', title: '해운대 숙소 체크인', category: '숙소', duration: '1박', price: 95000, shared: false, reservable: true, description: '둘째 날 동부 해안 일정을 위한 숙소 권역 제안이에요.', latitude: 35.1595, longitude: 129.1604, source: '운영자 검수', placeUrl: 'https://map.naver.com/p/search/해운대 숙소' })],
      [...sharedDay2,
        place({ time: '12:00', title: '해운대 블루라인파크 미포정거장', category: '액티비티', duration: '1시간 30분', price: 16000, shared: false, reservable: true, description: '해안 풍경을 따라 이동하는 체험이에요. 탑승권과 운행시간을 먼저 확인하세요.', latitude: 35.1594, longitude: 129.1637, placeUrl: 'https://map.naver.com/p/search/해운대 블루라인파크 미포정거장' }),
        place({ time: '16:00', title: '청사포 다릿돌전망대', category: '사진', duration: '50분', price: 0, shared: false, description: '청사포 바다를 가까이서 보는 사진 일정이에요.', latitude: 35.1612, longitude: 129.1915, placeUrl: 'https://map.naver.com/p/search/청사포 다릿돌전망대' })],
    ],
  },
]
