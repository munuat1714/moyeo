import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { Share } from '@capacitor/share'
import type { Stop } from './types'

const RECENT_ROOMS_KEY = 'moyeo-recent-rooms-v1'
const NOTIFICATION_KEY = 'moyeo-notifications-enabled'
const SAVED_TRIPS_KEY = 'moyeo-saved-trips-v1'

export type RecentRoom = {
  id: string
  name: string
  startDate: string
  expiresAt: number
  savedAt: number
}

export type SavedTrip = {
  id: string
  roomId: string
  name: string
  courseTitle: string
  startDate: string
  memberCount: number
  days: Stop[][]
  savedAt: number
}

export const isNativeApp = () => Capacitor.isNativePlatform()

export async function recentRooms() {
  try {
    const { value } = await Preferences.get({ key: RECENT_ROOMS_KEY })
    const rooms = JSON.parse(value ?? '[]') as RecentRoom[]
    const now = Date.now() / 1000
    return rooms.filter((room) => room.expiresAt > now).sort((a, b) => b.savedAt - a.savedAt).slice(0, 20)
  } catch {
    return []
  }
}

export async function rememberRoom(room: Omit<RecentRoom, 'savedAt'>) {
  const current = await recentRooms()
  const next = [{ ...room, savedAt: Date.now() }, ...current.filter((item) => item.id !== room.id)].slice(0, 20)
  await Preferences.set({ key: RECENT_ROOMS_KEY, value: JSON.stringify(next) })
}

export async function forgetRoom(roomId: string) {
  const current = await recentRooms()
  await Preferences.set({ key: RECENT_ROOMS_KEY, value: JSON.stringify(current.filter((room) => room.id !== roomId)) })
}

export async function savedTrips() {
  try {
    const { value } = await Preferences.get({ key: SAVED_TRIPS_KEY })
    return (JSON.parse(value ?? '[]') as SavedTrip[]).sort((a, b) => b.savedAt - a.savedAt).slice(0, 50)
  } catch {
    return []
  }
}

export async function saveTrip(trip: Omit<SavedTrip, 'savedAt'>) {
  const current = await savedTrips()
  const next = [{ ...trip, savedAt: Date.now() }, ...current.filter((item) => item.id !== trip.id)].slice(0, 50)
  await Preferences.set({ key: SAVED_TRIPS_KEY, value: JSON.stringify(next) })
  return next[0]
}

export async function deleteSavedTrip(id: string) {
  const current = await savedTrips()
  await Preferences.set({ key: SAVED_TRIPS_KEY, value: JSON.stringify(current.filter((trip) => trip.id !== id)) })
}

export async function hasSavedTrip(id: string) {
  return (await savedTrips()).some((trip) => trip.id === id)
}

export async function notificationsEnabled() {
  return (await Preferences.get({ key: NOTIFICATION_KEY })).value === 'true'
}

export async function setNotificationsEnabled(enabled: boolean) {
  try {
    if (enabled) {
      const permission = await LocalNotifications.requestPermissions()
      enabled = permission.display === 'granted'
    }
    await Preferences.set({ key: NOTIFICATION_KEY, value: String(enabled) })
    if (!enabled) {
      const pending = (await LocalNotifications.getPending()).notifications
      if (pending.length > 0) await LocalNotifications.cancel({ notifications: pending })
    }
    return enabled
  } catch {
    await Preferences.set({ key: NOTIFICATION_KEY, value: 'false' }).catch(() => undefined)
    return false
  }
}

const notificationId = (roomId: string, offset: number) => Math.abs([...roomId].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) | 0, offset)) % 2_000_000_000

export async function scheduleTripNotifications(room: Omit<RecentRoom, 'savedAt'>) {
  if (!isNativeApp() || !await notificationsEnabled()) return false
  try {
    const permission = await LocalNotifications.checkPermissions()
    if (permission.display !== 'granted') {
      await Preferences.set({ key: NOTIFICATION_KEY, value: 'false' })
      return false
    }
    const notifications: Array<{ id: number; title: string; body: string; schedule: { at: Date }; extra: { roomId: string } }> = []
    const travelAt = new Date(`${room.startDate}T09:00:00+09:00`)
    const dayBefore = new Date(travelAt.getTime() - 24 * 60 * 60 * 1000)
    if (dayBefore.getTime() > Date.now()) notifications.push({
      id: notificationId(room.id, 11), title: '내일 여행이 시작돼요', body: `${room.name}의 확정 경로를 확인해 보세요.`,
      schedule: { at: dayBefore }, extra: { roomId: room.id },
    })
    const expiryAt = new Date((room.expiresAt - 24 * 60 * 60) * 1000)
    if (expiryAt.getTime() > Date.now()) notifications.push({
      id: notificationId(room.id, 29), title: '여행방이 하루 뒤 삭제돼요', body: `${room.name}의 일정을 미리 확인하거나 복사해 주세요.`,
      schedule: { at: expiryAt }, extra: { roomId: room.id },
    })
    if (notifications.length > 0) await LocalNotifications.schedule({ notifications })
    return true
  } catch {
    return false
  }
}

export async function shareInvite(url: string, roomName?: string) {
  if (isNativeApp()) {
    await Share.share({ title: roomName ?? '모행', text: '같이 여행 코스를 골라봐요.', url, dialogTitle: '여행방 초대하기' })
    return true
  }
  return false
}
