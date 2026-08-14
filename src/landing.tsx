'use client'

import { useEffect } from 'react'
import { ArrowRight, Map, MapPin, UsersRound, Vote } from 'lucide-react'
import { track } from './analytics'
import { LanguageSelect, LocaleProvider } from './i18n'
import { AppErrorBoundary } from './error-boundary'
import './styles.css'

function LandingContent() {
  useEffect(() => track('landing_view'), [])
  return <div className="app-shell landing-mode"><header className="app-header"><img className="brand-logo" src="/social/moyeo-profile.png" alt="모행" /><div className="header-title">모행</div><div className="header-tools"><LanguageSelect compact /></div></header><main><div className="simple-landing">
    <section className="simple-hero">
      <div className="landing-brand" aria-label="모행"><img src="/social/moyeo-profile.png" alt="" /><span><b>모행</b><small>MOHANG</small></span></div>
      <span className="eyebrow"><MapPin size={14} /> 친구 취향으로 완성하는 여행</span>
      <h1>여행 계획,<br /><em>모두의 취향</em>에서 시작해요.</h1>
      <p>친구들의 취향을 모아 가까운 부산 코스를 추천하고, 투표로 함께 결정하는 당일치기 여행 서비스예요.</p>
      <div className="concept-flow" aria-label="모행 이용 개요">
        <article><span><UsersRound size={20} /></span><div><b>취향 선택</b><small>각자 원하는 여행을 골라요</small></div></article><i><ArrowRight size={17} /></i>
        <article><span><Map size={20} /></span><div><b>코스 추천</b><small>가까운 실제 장소를 모아요</small></div></article><i><ArrowRight size={17} /></i>
        <article><span><Vote size={20} /></span><div><b>함께 결정</b><small>투표로 최종 경로를 정해요</small></div></article>
      </div>
      <div className="landing-entry-actions"><a className="hero-demo-link" href="/app" onClick={() => track('landing_app_click')}>웹에서 모행 써보기 <ArrowRight size={18} /></a><p className="web-launch-note">Play Store 심사 중 · Android와 iPhone에서 설치 없이 이용할 수 있어요</p></div>
    </section>
    <footer className="simple-footer"><div><img className="footer-brand-logo" src="/social/moyeo-profile.png" alt="" /><b>모행</b></div><p>친구들의 취향을 모아 완성하는 여행 계획 서비스</p><small>© 2026 모행 팀</small></footer>
  </div></main></div>
}

export function LandingApp() { return <LocaleProvider><AppErrorBoundary><LandingContent /></AppErrorBoundary></LocaleProvider> }
