import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: '모두의 여행',
  description: '취향을 모아 부산 당일치기 코스를 만들고 함께 결정하는 여행 서비스',
  alternates: { canonical: '/app' },
}

export default function ServiceLayout({ children }: { children: ReactNode }) {
  return children
}
