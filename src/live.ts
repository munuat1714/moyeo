import type { Course, Member, Preference, Trip } from './types'

export type LiveRoom = Trip & {
  id: string
  expectedMembers: number
  voteRound: 1 | 2
  runoffCourseIds: string[]
  finalCourseId: string | null
  createdAt: number
  expiresAt: number
}

export type LiveMember = Member & { preferenceComplete: boolean }

export type LiveSnapshot = {
  room: LiveRoom
  members: LiveMember[]
  requesterMemberId: string | null
  hasVoted: boolean
  allVoted: boolean
  votes: Record<string, string>
}

const tokenKey = (roomId: string) => `moyeo-room-${roomId}-token`

export function getRoomToken(roomId: string) {
  return localStorage.getItem(tokenKey(roomId)) ?? ''
}

export function saveRoomToken(roomId: string, token: string) {
  localStorage.setItem(tokenKey(roomId), token)
}

async function request<T>(path: string, init: RequestInit = {}, roomId?: string): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (roomId) {
    const token = getRoomToken(roomId)
    if (token) headers.set('X-Moyeo-Member-Token', token)
  }
  const response = await fetch(path, { ...init, headers })
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '요청을 처리하지 못했습니다.')
  return data
}

export async function createLiveRoom(trip: Trip, hostName: string, expectedMembers: number) {
  return request<{ roomId: string; memberId: string; token: string; expiresAt: number }>('/api/rooms', {
    method: 'POST', body: JSON.stringify({ ...trip, hostName, expectedMembers }),
  })
}

export function fetchLiveRoom(roomId: string) {
  return request<LiveSnapshot>(`/api/rooms/${roomId}`, {}, roomId)
}

export function joinLiveRoom(roomId: string, name: string) {
  return request<{ memberId: string; token: string }>(`/api/rooms/${roomId}/members`, {
    method: 'POST', body: JSON.stringify({ name }),
  })
}

export function saveLivePreference(roomId: string, preference: Preference) {
  return request<{ ok: true }>(`/api/rooms/${roomId}/preferences`, {
    method: 'PUT', body: JSON.stringify({ preference }),
  }, roomId)
}

export function fetchLiveRecommendations(roomId: string) {
  return request<{ courses: Course[] }>(`/api/rooms/${roomId}/recommendations`, {}, roomId)
}

export function submitLiveVote(roomId: string, courseId: string) {
  return request<{ ok: true }>(`/api/rooms/${roomId}/votes`, {
    method: 'POST', body: JSON.stringify({ courseId }),
  }, roomId)
}

export function resolveLiveVote(roomId: string) {
  return request<{ status: 'runoff' | 'final'; courseIds?: string[]; courseId?: string }>(`/api/rooms/${roomId}/resolve`, {
    method: 'POST', body: '{}',
  }, roomId)
}
