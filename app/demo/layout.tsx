import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: '모두의 여행 데모',
  description: '친구들의 취향을 모아 여행 코스를 결정하는 모두의 여행 체험판',
  robots: { index: false, follow: false },
}

export default function DemoLayout({ children }: { children: ReactNode }) {
  return children
}
