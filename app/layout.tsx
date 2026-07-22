import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import '../src/styles.css'

const baseMetadata = {
  title: '모두의 여행 | 친구 취향으로 완성하는 여행',
  description: '각자 취향을 고르면 모두가 좋아할 1박 2일 코스를 비교하고 투표로 결정하는 여행 큐레이션 MVP',
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000'
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const imageUrl = `${protocol}://${host}/og.png`
  return {
    ...baseMetadata,
    openGraph: { ...baseMetadata, type: 'website', locale: 'ko_KR', images: [{ url: imageUrl, width: 1200, height: 630, alt: '모두의 여행 서비스 소개' }] },
    twitter: { card: 'summary_large_image', ...baseMetadata, images: [imageUrl] },
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
