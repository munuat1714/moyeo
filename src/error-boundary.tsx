'use client'

import React from 'react'

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: unknown) {
    console.error('app-render-failed', error instanceof Error ? error.message : String(error))
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="fatal-error" role="alert"><h1>화면을 불러오지 못했어요</h1><p>작성한 내용은 이 기기에 남아 있습니다. 화면을 다시 불러와 주세요.</p><button className="primary-button" onClick={() => location.reload()}>다시 불러오기</button></main>
  }
}
