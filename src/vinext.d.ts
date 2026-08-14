declare module '*.css'

declare module 'next' {
  export type Metadata = {
    [key: string]: unknown
    title?: string
    description?: string
    manifest?: string
    icons?: Record<string, string>
    openGraph?: Record<string, unknown>
    twitter?: Record<string, unknown>
    appleWebApp?: Record<string, unknown>
  }
}

declare module 'next/headers' {
  export function headers(): Promise<{ get(name: string): string | null }>
}
