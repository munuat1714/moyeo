import type { ReactNode } from 'react'
import '../src/styles.css'

export const metadata = {
  title: '모두의 여행',
  description: '친구들의 취향을 모아 완성하는 1박 2일 여행 큐레이션',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
