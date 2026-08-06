import { Capacitor } from '@capacitor/core'

export const SERVICE_ORIGIN = 'https://mohang.moyo-ra.workers.dev'

export function resolveApiUrl(path: string, native: boolean) {
  if (!native || !path.startsWith('/')) return path
  return `${SERVICE_ORIGIN}${path}`
}

export function apiUrl(path: string) {
  return resolveApiUrl(path, Capacitor.isNativePlatform())
}
