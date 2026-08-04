export type Preference = {
  themes: string[]
  placeCount: number
  pace?: string
  food: string[]
  mood: string[]
}

export type Member = {
  id: string
  name: string
  color: string
  host?: boolean
  preference?: Preference
}

export type Stop = {
  time: string
  title: string
  category: string
  duration: string
  price: number
  shared: boolean
  reservable?: boolean
  description: string
  latitude?: number
  longitude?: number
  source?: '한국관광공사·부산관광포털' | '네이버 지역검색' | '운영자 검수'
  verifiedAt?: string
  placeUrl?: string
}

export type Course = {
  id: string
  title: string
  label: string
  emoji: string
  description: string
  match: number
  tags: string[]
  totalPrice: number
  travelMinutes: number
  days: Stop[][]
}

export type Trip = {
  name: string
  origin: string
  destination: string
  startDate: string
  endDate: string
  transport: string
  stay: string
}

export type AppState = {
  step: 'home' | 'create' | 'room' | 'preferences' | 'analysis' | 'courses' | 'vote' | 'final'
  trip: Trip
  members: Member[]
  activeMemberId: string
  votes: Record<string, string>
  voteRound: 1 | 2
  runoffCourseIds: string[]
  finalCourseId?: string
  booked: string[]
}
