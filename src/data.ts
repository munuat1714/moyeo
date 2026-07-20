import type { AppState, Course, Preference } from './types'

export const themes = ['맛집', '감성 카페', '사진', '산책', '액티비티', '역사']
export const paces = ['여유롭게', '적당하게', '알차게']
export const foods = ['한식', '베이커리', '고기', '채식']
export const moods = ['감성적인', '활기찬', '조용한', '로컬']

export const demoPreferences: Record<string, Preference> = {
  minji: { themes: ['맛집', '감성 카페', '사진'], pace: '적당하게', food: '한식', mood: '감성적인', constraint: '' },
  seojun: { themes: ['맛집', '산책', '역사'], pace: '알차게', food: '고기', mood: '로컬', constraint: '' },
  yuna: { themes: ['감성 카페', '사진', '산책'], pace: '여유롭게', food: '베이커리', mood: '감성적인', constraint: '견과류 알레르기' },
  hyunwoo: { themes: ['맛집', '액티비티', '사진'], pace: '적당하게', food: '한식', mood: '활기찬', constraint: '' },
}

export const initialState: AppState = {
  step: 'home',
  trip: {
    name: '우리들의 경주 한바퀴',
    origin: '부산',
    destination: '경주',
    startDate: '2026-08-15',
    endDate: '2026-08-16',
    transport: '대중교통',
    stay: '감성 숙소',
  },
  members: [
    { id: 'minji', name: '민지', color: '#ff6b4a', host: true },
    { id: 'seojun', name: '서준', color: '#3f7cff' },
    { id: 'yuna', name: '유나', color: '#9b6bdf' },
    { id: 'hyunwoo', name: '현우', color: '#18a778' },
  ],
  activeMemberId: 'minji',
  votes: {},
  voteRound: 1,
  runoffCourseIds: [],
  booked: [],
}

const sharedDay1 = [
  { time: '09:00', title: '부산역 출발', category: '교통', duration: '55분', price: 11000, shared: true, reservable: true, description: 'KTX로 빠르고 편하게 경주까지 이동해요.' },
  { time: '10:20', title: '황리단길 산책', category: '관광', duration: '1시간', price: 0, shared: true, description: '한옥 골목과 작은 상점을 천천히 둘러봐요.' },
  { time: '12:00', title: '교리김밥 본점', category: '맛집', duration: '50분', price: 11000, shared: true, description: '그룹 최다 취향인 맛집을 반영했어요.' },
]

const sharedDay2 = [
  { time: '09:30', title: '대릉원 돌담길', category: '산책', duration: '1시간', price: 3000, shared: true, description: '아침의 여유를 즐기는 공통 산책 코스예요.' },
  { time: '12:30', title: '경주 원조콩국', category: '맛집', duration: '1시간', price: 13000, shared: true, description: '가볍고 든든한 경주 로컬 한식이에요.' },
  { time: '17:10', title: '신경주역 출발', category: '교통', duration: '55분', price: 11000, shared: true, reservable: true, description: '부산으로 돌아가는 KTX예요.' },
]

export const courses: Course[] = [
  {
    id: 'balance',
    title: '모두의 취향 밸런스',
    label: '가장 추천',
    emoji: '🍊',
    description: '맛집·카페·사진 취향을 고르게 담은 실패 없는 코스',
    match: 92,
    tags: ['맛집', '감성 카페', '사진'],
    totalPrice: 128000,
    travelMinutes: 118,
    days: [
      [...sharedDay1, { time: '14:00', title: '카페 올리브', category: '카페', duration: '1시간 20분', price: 8500, shared: false, description: '3명이 선택한 감성 카페 취향을 반영했어요.' }, { time: '16:00', title: '첨성대 노을 스냅', category: '사진', duration: '1시간 30분', price: 0, shared: false, description: '사진 취향을 위한 골든아워 코스예요.' }, { time: '19:00', title: '황남관 한옥스테이', category: '숙소', duration: '1박', price: 74000, shared: false, reservable: true, description: '감성적인 분위기의 도심 한옥 숙소예요.' }],
      [...sharedDay2, { time: '11:00', title: '월정교 포토워크', category: '사진', duration: '1시간', price: 0, shared: false, description: '산책과 사진을 함께 즐겨요.' }, { time: '14:00', title: '국립경주박물관', category: '역사', duration: '1시간 30분', price: 0, shared: false, description: '소수의 역사 취향도 놓치지 않았어요.' }],
    ],
  },
  {
    id: 'slow',
    title: '카페와 산책 사이',
    label: '여유 충전',
    emoji: '🌿',
    description: '머무는 시간을 늘리고 이동은 가볍게 줄인 감성 코스',
    match: 87,
    tags: ['감성 카페', '산책', '사진'],
    totalPrice: 121000,
    travelMinutes: 92,
    days: [
      [...sharedDay1, { time: '14:00', title: '카페 능', category: '카페', duration: '2시간', price: 9000, shared: false, description: '오래 머물기 좋은 한옥 카페예요.' }, { time: '16:30', title: '계림 숲길', category: '산책', duration: '1시간 20분', price: 0, shared: false, description: '붐비지 않는 숲길을 천천히 걸어요.' }, { time: '19:00', title: '소소한옥', category: '숙소', duration: '1박', price: 69000, shared: false, reservable: true, description: '조용히 쉬기 좋은 독채형 숙소예요.' }],
      [...sharedDay2, { time: '11:00', title: '교촌마을 산책', category: '산책', duration: '1시간 30분', price: 0, shared: false, description: '전통 담장길을 따라 여유롭게 걸어요.' }, { time: '14:30', title: '오릉 피크닉', category: '휴식', duration: '1시간 20분', price: 4000, shared: false, description: '여행 마지막을 가볍게 마무리해요.' }],
    ],
  },
  {
    id: 'active',
    title: '경주 꽉 찬 모험',
    label: '에너지 MAX',
    emoji: '⚡',
    description: '활동적인 체험과 대표 명소를 빠짐없이 넣은 알찬 코스',
    match: 81,
    tags: ['액티비티', '맛집', '역사'],
    totalPrice: 149000,
    travelMinutes: 146,
    days: [
      [...sharedDay1, { time: '14:00', title: '보문호 자전거', category: '액티비티', duration: '1시간 30분', price: 12000, shared: false, reservable: true, description: '소수의 액티비티 취향을 확실하게 반영했어요.' }, { time: '16:20', title: '경주월드 드라켄', category: '액티비티', duration: '2시간', price: 26000, shared: false, reservable: true, description: '짧지만 강렬한 대표 체험이에요.' }, { time: '20:00', title: '보문 스테이', category: '숙소', duration: '1박', price: 65000, shared: false, reservable: true, description: '다음 날 이동이 편한 실용적인 숙소예요.' }],
      [...sharedDay2, { time: '11:00', title: '불국사 미션 투어', category: '역사', duration: '1시간 30분', price: 6000, shared: false, reservable: true, description: '역사 취향을 재미있는 미션으로 즐겨요.' }, { time: '14:30', title: '동궁과 월지', category: '관광', duration: '1시간', price: 3000, shared: false, description: '경주의 대표 명소까지 알차게 챙겨요.' }],
    ],
  },
]
