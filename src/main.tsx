'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ChevronRight, ChevronUp,
  Bell, BusFront, Clock3, Coffee, Compass, Copy, ExternalLink, Footprints, Home, Map, MapPin, MessageCircle, Plus,
  RotateCcw, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TrainFront, Trash2,
  Save, Settings, UserRound, UsersRound, Utensils, Vote, WalletCards, WifiOff, X,
} from 'lucide-react'
import { courses, demoPreferences, foods, initialState, moods, themes } from './data'
import { aggregateThemes, allPreferencesComplete, recommendCourses, reorderStops, tallyVotes } from './logic'
import { clearRoomToken, createLiveRoom, deleteLiveRoom, fetchLiveItinerary, fetchLiveRecommendations, fetchLiveRoom, joinLiveRoom, resolveLiveVote, saveLiveItinerary, saveLivePreference, saveRoomToken, startLiveRoomWithCurrentMembers, submitLiveVote } from './live'
import type { LiveSnapshot } from './live'
import type { AppState, Course, Preference, Stop } from './types'
import { deleteSavedTrip, forgetRoom, hasSavedTrip, isNativeApp, notificationsEnabled, recentRooms, rememberRoom, savedTrips, saveTrip, scheduleTripNotifications, setNotificationsEnabled, shareInvite } from './mobile'
import type { RecentRoom, SavedTrip } from './mobile'
import { apiUrl } from './runtime'
import { track } from './analytics'
import { AppErrorBoundary } from './error-boundary'
import { DatePicker } from './date-picker'
import { naverRouteUrl, sourceDisplay, transitLeg, transitLegs } from './route-display'
import { LanguageSelect, LocaleProvider, translatePresetName, useI18n } from './i18n'
import './styles.css'

const SERVICE_STORAGE_KEY = 'moyeo-service-state-v1'
const DEMO_STORAGE_KEY = 'moyeo-demo-state-v1'
const toggleSelection = (selected: string[], value: string) => selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
const asSelection = (value: string[] | string | undefined) => Array.isArray(value) ? value : value ? [value] : []
const normalizePreference = (preference: Preference | undefined): Preference | undefined => preference ? {
  ...preference,
  food: asSelection(preference.food),
  mood: asSelection(preference.mood),
} : undefined

function loadState(storageKey = SERVICE_STORAGE_KEY): AppState {
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return initialState
    const parsed = JSON.parse(saved) as Partial<AppState>
    return {
      ...initialState,
      ...parsed,
      trip: { ...initialState.trip, ...parsed.trip },
      members: (parsed.members ?? initialState.members).map((member) => ({ ...member, preference: normalizePreference(member.preference) })),
    }
  } catch {
    return initialState
  }
}

export function App({ mode }: { mode: 'demo' | 'service' }) {
  return <LocaleProvider><AppErrorBoundary><AppContent mode={mode} /></AppErrorBoundary></LocaleProvider>
}

function AppContent({ mode }: { mode: 'demo' | 'service' }) {
  const [liveRoomId] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('room') ?? '')
  const [nativeMode] = useState(() => typeof window !== 'undefined' && isNativeApp())
  const appMode = mode === 'service' || nativeMode
  const basePath = appMode ? '/app' : '/demo'
  const storageKey = appMode ? SERVICE_STORAGE_KEY : DEMO_STORAGE_KEY
  if (liveRoomId) return <LiveRoomApp roomId={liveRoomId} appMode={appMode} nativeMode={nativeMode} basePath={basePath} />
  const isDemo = mode === 'demo'
  const [state, setState] = useState<AppState>(() => isDemo && !appMode
    ? { ...initialState, trip: { ...initialState.trip }, members: initialState.members.map((member) => ({ ...member })), step: 'create' }
    : { ...loadState(storageKey), step: 'home' })
  const [appTab, setAppTab] = useState<'home' | 'my' | 'settings'>('home')
  const [online, setOnline] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0].id)
  const [finalTab, setFinalTab] = useState<'schedule' | 'map' | 'booking'>('schedule')
  const [createStage, setCreateStage] = useState(1)
  const recommendedCourses = useMemo(() => recommendCourses(courses, state.members), [state.members])
  const selectedCourse = recommendedCourses.find((course) => course.id === selectedCourseId) ?? recommendedCourses[0]

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* Device storage is optional. */ } }, [state, storageKey])
  useEffect(() => { track(appMode ? 'app_view' : isDemo ? 'demo_view' : 'landing_view') }, [isDemo, appMode])
  useEffect(() => {
    if (!nativeMode) return
    let cleanup: () => void = () => undefined
    void import('@capacitor/network').then(async ({ Network }) => {
      setOnline((await Network.getStatus()).connected)
      const listener = await Network.addListener('networkStatusChange', (status) => setOnline(status.connected))
      cleanup = () => { void listener.remove() }
    })
    return () => cleanup()
  }, [nativeMode])
  useEffect(() => {
    if (!nativeMode) return
    let cleanup: () => void = () => undefined
    void import('@capacitor/app').then(async ({ App: NativeApp }) => {
      const back = await NativeApp.addListener('backButton', () => {
        if (state.step === 'create' && createStage > 1) return setCreateStage((stage) => stage - 1)
        if (state.step !== 'home') return update({ step: headerBack[state.step] ?? 'home' })
        void NativeApp.exitApp()
      })
      const links = await NativeApp.addListener('appUrlOpen', ({ url }) => {
        const roomId = new URL(url).searchParams.get('room') ?? url.match(/room\/([a-z0-9]+)/)?.[1]
        if (roomId) window.location.assign(`/app?room=${roomId}`)
      })
      cleanup = () => { void back.remove(); void links.remove() }
    })
    return () => cleanup()
  }, [nativeMode, state.step, createStage])
  useEffect(() => {
    if (!nativeMode) return
    let cleanup: () => void = () => undefined
    void import('@capacitor/local-notifications').then(async ({ LocalNotifications }) => {
      const listener = await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
        const roomId = String(notification.extra?.roomId ?? '')
        if (roomId) window.location.assign(`/app?room=${roomId}`)
      })
      cleanup = () => { void listener.remove() }
    })
    return () => cleanup()
  }, [nativeMode])

  const update = (patch: Partial<AppState>) => setState((current) => ({ ...current, ...patch }))
  const reset = () => {
    localStorage.removeItem(storageKey)
    setState({ ...initialState, trip: { ...initialState.trip }, members: initialState.members.map((member) => ({ ...member })), step: isDemo && !appMode ? 'create' : 'home' })
    setSelectedCourseId(courses[0].id)
    setCreateStage(1)
  }
  const confirmReset = () => {
    if (window.confirm('작성 중인 내용을 지우고 처음부터 다시 시작할까요?')) reset()
  }

  const headerBack: Partial<Record<AppState['step'], AppState['step']>> = {
    create: 'home', room: 'create', preferences: 'room', analysis: 'room',
    courses: 'analysis', vote: 'courses', final: 'vote',
  }

  return (
    <div className={`app-shell ${state.step === 'home' ? 'landing-mode' : ''} ${appMode ? 'native-app-mode' : ''}`}>
      {nativeMode && !online && <div className="native-offline"><WifiOff size={15} /> 인터넷 연결을 확인해 주세요.</div>}
      <header className="app-header">
        {state.step !== 'home' ? (
          <button className="icon-button" aria-label="뒤로 가기" onClick={() => {
            if (state.step === 'create' && createStage > 1) return setCreateStage((stage) => stage - 1)
            if (appMode && state.step === 'create') return update({ step: 'home' })
            if (isDemo && state.step === 'create') return window.location.assign('/')
            update({ step: headerBack[state.step] ?? 'home' })
          }}>
            <ArrowLeft size={21} />
          </button>
        ) : <img className="brand-logo" src="/social/moyeo-profile.png" alt="모행" />}
        <div className="header-title">{state.step === 'home' ? '모행' : stepTitle[state.step]}</div>
        <div className="header-tools"><LanguageSelect compact />{state.step !== 'home' && (appMode
          ? <button className="icon-button subtle" aria-label="앱 홈" onClick={() => update({ step: 'home' })}><Home size={18} /></button>
          : isDemo
          ? <a className="demo-home-link" href="/"><Home size={15} /> 랜딩</a>
          : <button className="icon-button subtle" aria-label="처음부터 다시 시작" onClick={confirmReset}><RotateCcw size={18} /></button>)}</div>
      </header>

      <main>
        {state.step === 'home' && <MobileHomeScreen tab={appTab} nativeMode={nativeMode} onCreate={() => { setCreateStage(1); update({ step: 'create' }) }} />}
        {state.step === 'create' && <CreateTrip state={state} setState={setState} stage={createStage} setStage={setCreateStage} appMode={appMode} nativeMode={nativeMode} basePath={basePath} />}
        {state.step === 'room' && <Room state={state} setState={setState} />}
        {state.step === 'preferences' && <Preferences state={state} setState={setState} />}
        {state.step === 'analysis' && <Analysis state={state} onNext={() => update({ step: 'courses' })} />}
        {state.step === 'courses' && <Courses courses={recommendedCourses} selected={selectedCourse} setSelected={(course) => setSelectedCourseId(course.id)} onVote={() => update({ step: 'vote' })} />}
        {state.step === 'vote' && <Voting courses={recommendedCourses} state={state} setState={setState} />}
        {state.step === 'final' && <FinalTrip courses={recommendedCourses} state={state} setState={setState} tab={finalTab} setTab={setFinalTab} />}
      </main>
      {appMode && state.step === 'home' && <nav className="native-tab-bar" aria-label="앱 메뉴">
        <button className={appTab === 'home' ? 'active' : ''} onClick={() => setAppTab('home')}><Home size={20} /><span>홈</span></button>
        <button className={appTab === 'my' ? 'active' : ''} onClick={() => setAppTab('my')}><UserRound size={20} /><span>마이</span></button>
        <button className={appTab === 'settings' ? 'active' : ''} onClick={() => setAppTab('settings')}><Settings size={20} /><span>설정</span></button>
      </nav>}
      {(appMode || isDemo) && <QuickFeedback screen={state.step} />}
    </div>
  )
}

function QuickFeedback({ screen }: { screen: AppState['step'] }) {
  const { locale, t } = useI18n()
  const launcherRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [sentiment, setSentiment] = useState<'up' | 'down' | null>(null)
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [submissionKey, setSubmissionKey] = useState('')
  const clientKind = () => isNativeApp() ? 'android_app' : /Android/i.test(navigator.userAgent) ? 'web_android' : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'web_ios' : 'web_desktop'
  const send = async (value: 'up' | 'down', nextReason = reason, nextComment = comment) => {
    const key = submissionKey || globalThis.crypto?.randomUUID?.() || `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`
    if (!submissionKey) setSubmissionKey(key)
    setSentiment(value); setStatus('sending')
    try {
      const response = await fetch(apiUrl('/api/feedback'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        sentiment: value === 'up' ? 'helpful' : 'not_helpful', reason: nextReason, comment: nextComment,
        surface: location.pathname.startsWith('/demo') ? 'demo' : 'service', clientKind: clientKind(), submissionKey: key, screen, locale,
      }) })
      if (!response.ok) throw new Error('feedback-failed')
      if (!submissionKey) track(value === 'up' ? 'feedback_helpful' : 'feedback_not_helpful')
      setStatus('sent')
    } catch { setStatus('error') }
  }
  const close = () => { setOpen(false); setSentiment(null); setReason(''); setComment(''); setStatus('idle'); setSubmissionKey(''); requestAnimationFrame(() => launcherRef.current?.focus()) }
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open])
  const reasonOptions = sentiment === 'up'
    ? [['taste', '취향에 맞아요'], ['route', '동선이 좋아요'], ['places', '장소가 좋아요']]
    : [['distance', '거리가 멀어요'], ['taste', '취향과 달라요'], ['wrong_place', '장소 정보가 틀려요'], ['route', '이동이 불편해요'], ['other', '기타']]
  return <>
    <div className="feedback-dock"><button ref={launcherRef} className="feedback-launcher" aria-label={t('의견 보내기')} onClick={() => setOpen(true)}><MessageCircle size={18} /><span>{t('의견 보내기')}</span></button></div>
    {open && <div className="feedback-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <button ref={closeRef} className="feedback-modal-close" aria-label={t('닫기')} onClick={close}><X size={19} /></button>
      <small>MOHANG FEEDBACK</small><h2 id="feedback-title">{t('이 화면은 어떠셨나요?')}</h2>
      <div className="feedback-quick-actions"><button className={sentiment === 'up' ? 'selected' : ''} onClick={() => void send('up')}><ThumbsUp size={18} /> {t('도움 됐어요')}</button><button className={sentiment === 'down' ? 'selected' : ''} onClick={() => void send('down')}><ThumbsDown size={18} /> {t('아쉬워요')}</button></div>
      {sentiment && <div className="feedback-followup"><p>{t(sentiment === 'up' ? '어떤 점이 좋았나요?' : '어떤 점이 아쉬웠나요?')}</p><div>{reasonOptions.map(([value, label]) => <button key={value} className={reason === value ? 'selected' : ''} onClick={() => { setReason(value); void send(sentiment, value, comment) }}>{t(label)}</button>)}</div><label><span>{t('더 알려주실 내용이 있나요?')} <small>{t('선택')}</small></span><textarea maxLength={300} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t('개인정보는 적지 말아 주세요.')} /></label><button className="feedback-detail-submit" disabled={!comment.trim() || status === 'sending'} onClick={() => void send(sentiment, reason, comment)}>{t('익명으로 의견 보내기')}</button></div>}
      {status === 'sent' && <p className="feedback-success"><Check size={15} /> {t('의견을 익명으로 전달했어요. 고맙습니다.')}</p>}{status === 'error' && <p className="feedback-error">{t('전송하지 못했어요. 잠시 후 다시 시도해 주세요.')}</p>}
    </section></div>}
  </>
}

const stepTitle: Record<AppState['step'], string> = {
  home: '모행', create: '여행 만들기', room: '여행방', preferences: '내 취향',
  analysis: '우리 취향', courses: '추천 코스', vote: '코스 투표', final: '최종 여행',
}

function LiveRoomApp({ roomId, appMode = false, nativeMode = false, basePath = '/demo' }: { roomId: string; appMode?: boolean; nativeMode?: boolean; basePath?: string }) {
  const { locale, t } = useI18n()
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)
  const [preference, setPreference] = useState<Preference>({ themes: [], placeCount: 4, food: [], mood: [] })
  const [saving, setSaving] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [working, setWorking] = useState(false)
  const [finalDay, setFinalDay] = useState(0)
  const [routeCourses, setRouteCourses] = useState<Course[] | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [startingCurrent, setStartingCurrent] = useState(false)
  const [itinerary, setItinerary] = useState<Stop[][] | null>(null)
  const [editingStop, setEditingStop] = useState<{ day: number; index: number } | null>(null)
  const [itinerarySaving, setItinerarySaving] = useState(false)
  const [showFinalRoute, setShowFinalRoute] = useState(false)
  const [expandedCourseId, setExpandedCourseId] = useState('')
  const [addingStop, setAddingStop] = useState(false)
  const [routeSaved, setRouteSaved] = useState(false)
  const [savingRoute, setSavingRoute] = useState(false)
  const [showNewTripPrompt, setShowNewTripPrompt] = useState(false)

  const refresh = async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const next = await fetchLiveRoom(roomId)
      setSnapshot(next)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '여행방을 불러오지 못했습니다.')
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(true), 5000)
    return () => window.clearInterval(timer)
  }, [roomId])

  useEffect(() => {
    if (!appMode || !snapshot?.requesterMemberId) return
    const room = { id: roomId, name: snapshot.room.name, startDate: snapshot.room.startDate, expiresAt: snapshot.room.expiresAt }
    void rememberRoom(room).then(() => scheduleTripNotifications(room))
  }, [appMode, roomId, snapshot?.requesterMemberId, snapshot?.room.name, snapshot?.room.startDate, snapshot?.room.expiresAt])

  const requester = snapshot?.members.find((member) => member.id === snapshot.requesterMemberId)
  const allJoined = Boolean(snapshot && snapshot.members.length === snapshot.room.expectedMembers)
  const allReady = Boolean(snapshot && allJoined && snapshot.members.every((member) => member.preferenceComplete))
  const recommended = useMemo(() => snapshot && routeCourses ? recommendCourses(routeCourses, snapshot.members) : [], [routeCourses, snapshot])
  const availableCourses = snapshot?.room.voteRound === 2
    ? recommended.filter((course) => snapshot.room.runoffCourseIds.includes(course.id))
    : recommended
  const finalCourse = recommended.find((course) => course.id === snapshot?.room.finalCourseId)
  const soloTrip = snapshot?.room.expectedMembers === 1
  const recommendationSummary = snapshot?.room.routeMode === 'open'
    ? `${snapshot.room.preferredArea === '상관없음' ? '부산의 서로 다른 권역' : snapshot.room.preferredArea}에서 이동이 짧은 실제 장소를 우선했어요.`
    : `${snapshot?.room.origin}에서 ${snapshot?.room.destination}까지 가까운 실제 장소를 우선했어요.`

  const loadRecommendations = async () => {
    setRecommendationLoading(true); setRecommendationError('')
    try {
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const result = await fetchLiveRecommendations(roomId)
        if (result.courses) {
          setRouteCourses(result.courses)
          track(appMode ? 'recommendations_viewed' : 'demo_recommendations_viewed')
          return
        }
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(5000, result.retryAfterMs ?? 1500)))
      }
      throw new Error('추천 요청이 많아 처리 순서를 기다리고 있어요. 잠시 후 다시 시도해 주세요.')
    } catch (reason) {
      setRecommendationError(reason instanceof Error ? reason.message : '경로 주변 추천을 만들지 못했습니다.')
    } finally { setRecommendationLoading(false) }
  }

  useEffect(() => {
    if (allReady && snapshot?.requesterMemberId && !routeCourses && !recommendationLoading && !recommendationError) void loadRecommendations()
  }, [allReady, snapshot?.requesterMemberId, routeCourses, recommendationLoading, recommendationError])

  useEffect(() => {
    if (!showFinalRoute || !finalCourse || itinerary) return
    void fetchLiveItinerary(roomId).then((result) => setItinerary(result.days)).catch((reason) => setError(reason instanceof Error ? reason.message : '최종 일정을 불러오지 못했습니다.'))
  }, [showFinalRoute, finalCourse?.id, itinerary, roomId])

  useEffect(() => {
    if (!appMode || !finalCourse) return
    void hasSavedTrip(roomId).then(setRouteSaved)
  }, [appMode, finalCourse?.id, roomId])

  const join = async () => {
    if (!name.trim()) return
    setJoining(true); setError('')
    try {
      const result = await joinLiveRoom(roomId, name.trim())
      saveRoomToken(roomId, result.token)
      if (appMode && snapshot) {
        const room = { id: roomId, name: snapshot.room.name, startDate: snapshot.room.startDate, expiresAt: snapshot.room.expiresAt }
        await rememberRoom(room)
        if (nativeMode) {
          await setNotificationsEnabled(true)
          await scheduleTripNotifications(room)
        }
      }
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '여행방에 참여하지 못했습니다.')
    } finally { setJoining(false) }
  }

  const toggleTheme = (theme: string) => setPreference((current) => ({
    ...current,
    themes: toggleSelection(current.themes, theme),
  }))

  const savePreference = async () => {
    setSaving(true); setError('')
    try {
      await saveLivePreference(roomId, preference)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '취향을 저장하지 못했습니다.')
    } finally { setSaving(false) }
  }

  const copyInvite = async () => {
    const invite = `${window.location.origin}${basePath}?room=${roomId}`
    if (appMode && await shareInvite(invite, snapshot?.room.name)) return
    try { await navigator.clipboard.writeText(invite) } catch { window.prompt('아래 초대 링크를 복사해 주세요.', invite) }
    setCopied(true); window.setTimeout(() => setCopied(false), 1600)
  }

  const removeRoom = async () => {
    if (!window.confirm('이 여행방을 삭제할까요? 참여자 취향과 투표도 모두 삭제되며 복구할 수 없습니다.')) return
    setDeleting(true); setError('')
    try {
      await deleteLiveRoom(roomId)
      clearRoomToken(roomId)
      if (appMode) await forgetRoom(roomId)
      window.location.assign(basePath)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '여행방을 삭제하지 못했습니다.')
      setDeleting(false)
    }
  }

  const startWithCurrentMembers = async () => {
    if (!window.confirm(`현재 참여한 ${snapshot?.members.length ?? 0}명으로 시작할까요? 이후에는 새 친구가 참여할 수 없습니다.`)) return
    setStartingCurrent(true); setError('')
    try { await startLiveRoomWithCurrentMembers(roomId); await refresh() }
    catch (reason) { setError(reason instanceof Error ? reason.message : '현재 인원으로 시작하지 못했습니다.') }
    finally { setStartingCurrent(false) }
  }

  const vote = async () => {
    if (!selectedCourseId) return
    setWorking(true); setError('')
    try {
      await submitLiveVote(roomId, selectedCourseId)
      setSelectedCourseId('')
      if (snapshot?.room.expectedMembers === 1) {
        await resolveLiveVote(roomId)
        track(appMode ? 'final_route_confirmed' : 'demo_final_route_confirmed')
        setShowFinalRoute(true)
      }
      await refresh()
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : '투표를 저장하지 못했습니다.') }
    finally { setWorking(false) }
  }

  const resolve = async () => {
    setWorking(true); setError('')
    try { const result = await resolveLiveVote(roomId); if (result.status === 'final') track(appMode ? 'final_route_confirmed' : 'demo_final_route_confirmed'); await refresh() }
    catch (reason) { setError(reason instanceof Error ? reason.message : '투표 결과를 확정하지 못했습니다.') }
    finally { setWorking(false) }
  }

  const persistItinerary = async (next: Stop[][]) => {
    setItinerarySaving(true); setError('')
    try { await saveLiveItinerary(roomId, next); setItinerary(next); setRouteSaved(false) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '경로를 저장하지 못했습니다.') }
    finally { setItinerarySaving(false) }
  }

  const moveStop = (day: number, index: number, direction: number) => {
    const source = itinerary ?? finalCourse?.days
    if (!source) return
    const target = index + direction
    if (target < 0 || target >= source[day].length) return
    const next = source.map((items) => items.map((item) => ({ ...item })))
    next[day] = reorderStops(next[day], index, target)
    setEditingStop(null)
    void persistItinerary(next)
  }


  const replaceStop = (place: LocationSuggestion) => {
    const source = itinerary ?? finalCourse?.days
    if (!source || !editingStop) return
    const next = source.map((items) => items.map((item) => ({ ...item })))
    const current = next[editingStop.day][editingStop.index]
    next[editingStop.day][editingStop.index] = {
      ...current, title: place.title, category: categoryFromPlace(place.category),
      description: `${place.category || '장소'} · ${place.roadAddress || place.address || '주소는 네이버지도에서 확인해 주세요.'}`,
      latitude: Number(place.mapy) / 10_000_000, longitude: Number(place.mapx) / 10_000_000,
      source: '네이버 지역검색', verifiedAt: new Date().toISOString().slice(0, 10),
      placeUrl: `https://map.naver.com/p/search/${encodeURIComponent(place.title)}`,
    }
    setEditingStop(null)
    void persistItinerary(next)
  }

  const removeStop = (day: number, index: number) => {
    const source = itinerary ?? finalCourse?.days
    if (!source || source[day].length <= 1) return setError('경로에는 장소가 한 곳 이상 필요합니다.')
    if (!window.confirm(`${source[day][index].title}을(를) 경로에서 삭제할까요?`)) return
    const next = source.map((items) => items.map((item) => ({ ...item })))
    next[day].splice(index, 1)
    setEditingStop(null); setAddingStop(false)
    void persistItinerary(next)
  }

  const addStop = (place: LocationSuggestion) => {
    const source = itinerary ?? finalCourse?.days
    if (!source) return
    const next = source.map((items) => items.map((item) => ({ ...item })))
    const previous = next[finalDay].at(-1)?.time ?? '17:00'
    const [hours, minutes] = previous.split(':').map(Number)
    const total = ((hours || 17) * 60 + (minutes || 0) + 90) % (24 * 60)
    next[finalDay].push({
      time: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
      title: place.title, category: categoryFromPlace(place.category), duration: '1시간', price: 0, shared: false,
      description: `${place.category || '장소'} · ${place.roadAddress || place.address || '주소는 네이버지도에서 확인해 주세요.'}`,
      latitude: Number(place.mapy) / 10_000_000, longitude: Number(place.mapx) / 10_000_000,
      source: '네이버 지역검색', verifiedAt: new Date().toISOString().slice(0, 10),
      placeUrl: `https://map.naver.com/p/search/${encodeURIComponent(place.title)}`,
    })
    setAddingStop(false)
    void persistItinerary(next)
  }

  const saveCurrentRoute = async () => {
    if (!snapshot || !finalCourse) return false
    setSavingRoute(true); setError('')
    try {
      await saveTrip({
        id: roomId, roomId, name: snapshot.room.name, courseTitle: finalCourse.title,
        startDate: snapshot.room.startDate, memberCount: snapshot.members.length,
        days: (itinerary ?? finalCourse.days).map((day) => day.map((stop) => ({ ...stop }))),
      })
      setRouteSaved(true)
      return true
    } catch {
      setError('확정 경로를 기기에 저장하지 못했습니다.')
      return false
    } finally { setSavingRoute(false) }
  }

  const requestNewTrip = () => {
    if (appMode && finalCourse && !routeSaved) setShowNewTripPrompt(true)
    else window.location.assign(basePath)
  }

  const saveAndStartNew = async () => {
    if (await saveCurrentRoute()) window.location.assign(basePath)
  }

  if (loading) return <div className="app-shell"><main className="live-state"><Clock3 /><b>여행방을 불러오는 중이에요</b></main></div>
  if (!snapshot) return <div className="app-shell"><main className="live-state"><Clock3 /><h2>여행방을 열 수 없어요</h2><p>{error}</p><a className="primary-button" href={basePath}>새 여행방 만들기</a></main></div>

  const expires = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(snapshot.room.expiresAt * 1000))
  const expiryMessage = locale === 'ko' ? `${expires}까지 이용할 수 있으며 이후 자동 삭제됩니다.`
    : locale === 'en' ? `Available until ${expires}. It will be deleted automatically afterward.`
    : locale === 'zh-TW' ? `可使用至 ${expires}，之後將自動刪除。`
    : locale === 'zh-CN' ? `可使用至 ${expires}，之后将自动删除。`
    : `${expires}まで利用可能で、その後自動削除されます。`
  const voteCounts = Object.values(snapshot.votes).reduce<Record<string, number>>((counts, id) => ({ ...counts, [id]: (counts[id] ?? 0) + 1 }), {})
  const roomControls = <section className="room-action-icons" aria-label="여행방 관리">
    <button type="button" onClick={copyInvite} aria-label={copied ? '초대 링크 복사 완료' : '친구 초대 링크 복사'}>{copied ? <Check size={19} /> : <Copy size={19} />}<span>{copied ? '복사 완료' : '초대'}</span></button>
    <button type="button" onClick={requestNewTrip} aria-label="새 여행방 만들기"><RotateCcw size={19} /><span>새 여행</span></button>
    {requester?.host && <button type="button" className="delete-room-icon" disabled={deleting} onClick={removeRoom} aria-label={deleting ? '여행방 삭제 중' : '현재 여행방 삭제'}><Trash2 size={19} /><span>삭제</span></button>}
  </section>

  return <div className="app-shell live-room-shell">
    <header className="app-header"><a className="icon-button" href={basePath} aria-label={appMode ? '앱 홈' : '데모 홈'}><Home size={18} /></a><div className="header-title">{appMode ? '여행방' : '실시간 여행방'}</div><div className="header-tools"><span className="live-code" title="여행방 코드">{roomId}</span><LanguageSelect compact /></div></header>
    <main className="page">
      <div className="trip-summary live-trip"><span className="eyebrow dark"><CalendarDays size={14} /> {snapshot.room.startDate}</span><h2>{translatePresetName(snapshot.room.name, locale)}</h2><div className="trip-meta"><span>{snapshot.room.routeMode === 'open' ? <><TrainFront size={15} /> {t(snapshot.room.preferredArea === '상관없음' ? '부산 소권역 추천' : snapshot.room.preferredArea)}</> : <><MapPin size={15} /><span data-no-translate>{snapshot.room.origin} → {snapshot.room.destination}</span></>}</span><span><UsersRound size={15} /> {snapshot.members.length}/{snapshot.room.expectedMembers}명</span></div></div>
      <div className="expiry-notice"><Clock3 size={16} /><span data-no-translate>{expiryMessage}</span></div>
      {error && <div className="form-error" role="alert">{error}</div>}

      {!snapshot.requesterMemberId ? <section className="live-card join-card"><span className="result-icon"><UsersRound /></span><h2>친구들과 여행을 준비해요</h2><p>연락처 없이 별명만 입력하면 참여할 수 있어요.</p><div className="join-privacy-note"><ShieldCheck size={15} /><span>초대 링크를 아는 사람에게 별명과 참여 상태가 보입니다. 링크를 공개 게시물에 공유하지 마세요.</span></div><label>내 별명<input maxLength={20} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void join()} placeholder="예: 민지" /></label><button className="primary-button" disabled={!name.trim() || joining} onClick={join}>{joining ? '참여하는 중…' : '여행방 참여하기'} <ArrowRight size={18} /></button></section> : <>
        {!finalCourse && roomControls}
        {!finalCourse && <section className="live-section"><div className="section-title-row"><h3>함께 가는 친구</h3><span className="count-badge">{snapshot.members.length}/{snapshot.room.expectedMembers}</span></div><div className="member-list">{snapshot.members.map((member) => <div className="member-row" key={member.id}><Avatar member={member} /><div className="member-info"><b>{translatePresetName(member.name, locale)}{member.id === snapshot.requesterMemberId && <small>나</small>}</b><span>{member.preferenceComplete ? '취향 입력 완료' : '취향 입력 대기 중'}</span></div><span className={member.preferenceComplete ? 'complete-badge' : 'waiting-badge'}>{member.preferenceComplete ? <><Check size={13} /> 완료</> : '대기'}</span></div>)}</div>{!allJoined && <div className="lock-note capacity-note"><UsersRound size={18} /><div><b>{snapshot.room.expectedMembers - snapshot.members.length}명을 더 기다리고 있어요</b><span>초대 링크를 보내거나 현재 참여 인원으로 시작할 수 있어요.</span>{requester?.host && <button type="button" disabled={startingCurrent} onClick={startWithCurrentMembers}>{startingCurrent ? '변경 중…' : `현재 ${snapshot.members.length}명으로 시작`}</button>}</div></div>}</section>}

        {requester && !requester.preferenceComplete && <section className="live-card live-preferences"><div className="section-heading"><h2>{requester.name}님의 여행 취향</h2><p>마음에 드는 항목을 여러 개 골라 주세요.</p></div><PreferenceGroup title="가장 가고 싶은 장소" options={themes} selected={preference.themes} onSelect={toggleTheme} icons /><PlaceCountControl openRoute={snapshot.room.routeMode === 'open'} value={preference.placeCount} onChange={(placeCount) => setPreference((current) => ({ ...current, placeCount }))} /><PreferenceGroup title="좋아하는 음식 · 복수 선택" options={foods} selected={preference.food} onSelect={(value) => setPreference((current) => ({ ...current, food: toggleSelection(current.food, value) }))} /><PreferenceGroup title="원하는 분위기 · 복수 선택" options={moods} selected={preference.mood} onSelect={(value) => setPreference((current) => ({ ...current, mood: toggleSelection(current.mood, value) }))} /><button className="primary-button" disabled={preference.themes.length === 0 || saving} onClick={savePreference}>{saving ? '저장 중…' : '취향 저장하기'} <Check size={18} /></button></section>}

        {!allReady && requester?.preferenceComplete && <div className="lock-note live-wait"><UsersRound size={18} /><div><b>모두의 취향을 기다리는 중이에요</b><span>모든 인원이 참여하고 입력하면 추천 코스가 공개됩니다.</span></div></div>}

        {allReady && recommendationLoading && <div className="lock-note live-wait"><MapPin size={18} /><div><b>{snapshot.room.routeMode === 'open' ? '대중교통 이동이 짧은 부산 권역을 찾고 있어요' : `${snapshot.room.origin} → ${snapshot.room.destination} 주변을 찾고 있어요`}</b><span>실제 장소 좌표와 이동 거리를 비교해 가까운 코스를 구성합니다.</span></div></div>}
        {allReady && recommendationError && <div className="live-card recommendation-error"><b>경로 기반 추천을 만들지 못했어요</b><span>{recommendationError}</span><button className="secondary-button" onClick={() => { setRecommendationError(''); void loadRecommendations() }}>다시 추천하기</button></div>}
        {allReady && routeCourses && !finalCourse && <section className="live-section"><div className="section-heading"><h2>{snapshot.room.voteRound === 2 ? '공동 1위 결선투표' : '우리 경로에 맞는 코스 3가지'}</h2><p>{snapshot.room.voteRound === 2 ? '동률인 코스 중 하나를 다시 골라 주세요.' : t(recommendationSummary)}</p></div><div className="live-course-list">{availableCourses.map((course) => <div key={course.id}><CourseCard course={course} expanded={expandedCourseId === course.id} onToggle={() => setExpandedCourseId((current) => current === course.id ? '' : course.id)} />{!snapshot.hasVoted && <button className={`live-vote-choice ${selectedCourseId === course.id ? 'selected' : ''}`} onClick={() => setSelectedCourseId(course.id)}>{selectedCourseId === course.id && <Check size={15} />} {soloTrip ? '이 코스 선택' : '이 코스에 투표'}</button>}</div>)}</div>{snapshot.hasVoted && !snapshot.allVoted && <div className="lock-note"><Vote size={18} /><div><b>내 투표를 저장했어요</b><span>모두 투표할 때까지 선택은 공개되지 않습니다.</span></div></div>}{!snapshot.hasVoted && <button className="primary-button sticky-action" disabled={!selectedCourseId || working} onClick={vote}>{soloTrip ? '투표하기' : '익명 투표 보내기'} <Vote size={18} /></button>}{snapshot.allVoted && <><div className="result-list">{availableCourses.map((course) => <div key={course.id}><span>{course.emoji}</span><div><b>{t(course.title)}</b><div className="vote-bar"><i style={{ width: `${((voteCounts[course.id] ?? 0) / snapshot.members.length) * 100}%` }} /></div></div><strong>{voteCounts[course.id] ?? 0}표</strong></div>)}</div><button className="primary-button sticky-action" disabled={working} onClick={resolve}>{snapshot.room.voteRound === 1 ? '결과 확인하기' : '최종 코스 확정하기'} <ArrowRight size={18} /></button></>}</section>}

        {finalCourse && !showFinalRoute && <section className="live-section"><button className="confirmed-route-card" onClick={() => setShowFinalRoute(true)}><span className="result-icon"><Check /></span><span><small>모든 투표가 끝났어요</small><b>확정된 경로 보기</b><em>{t(finalCourse.title)} · {finalCourse.days[0].length}개 장소</em></span><ArrowRight size={20} /></button></section>}
        {finalCourse && showFinalRoute && <section className="live-section"><div className="final-hero live-final"><span className="eyebrow dark"><Check size={14} /> 투표로 확정된 당일치기 여행</span><h2>{t(finalCourse.title)}</h2><p>{snapshot.room.startDate} · {snapshot.members.length}명 · 선택 조건 반영</p></div>{appMode && <button className={`save-route-button ${routeSaved ? 'saved' : ''}`} disabled={savingRoute} onClick={() => void saveCurrentRoute()}>{routeSaved ? <Check size={17} /> : <Save size={17} />}{routeSaved ? '마이페이지에 저장됨' : savingRoute ? '저장 중…' : '마이페이지에 경로 저장'}</button>}<div className="final-route-heading"><Map size={16} /><b>최종 경로</b></div><RouteMap stops={(itinerary ?? finalCourse.days)[finalDay]} />{(itinerary ?? finalCourse.days).length > 1 ? <div className="day-switch">{(itinerary ?? finalCourse.days).map((_, index) => <button key={index} className={finalDay === index ? 'active' : ''} onClick={() => { setFinalDay(index); setEditingStop(null); setAddingStop(false) }}>DAY {index + 1}</button>)}</div> : <div className="single-day-label"><CalendarDays size={15} /> 당일 일정</div>}{requester?.host && <div className="route-edit-notice"><MapPin size={15} /><span>장소 순서를 바꾸거나 실제 장소를 추가·변경·삭제할 수 있어요.{itinerarySaving ? ' 저장 중…' : ''}</span></div>}<Timeline stops={(itinerary ?? finalCourse.days)[finalDay]} onMove={requester?.host ? (index, direction) => moveStop(finalDay, index, direction) : undefined} onEdit={requester?.host ? (index) => { setAddingStop(false); setEditingStop({ day: finalDay, index }) } : undefined} onRemove={requester?.host ? (index) => removeStop(finalDay, index) : undefined} disabled={itinerarySaving} renderAfter={(index) => editingStop?.day === finalDay && editingStop.index === index ? <RoutePlaceEditor current={(itinerary ?? finalCourse.days)[finalDay][index]} onCancel={() => setEditingStop(null)} onSelect={replaceStop} /> : null} />{requester?.host && <><button className="add-route-stop-button" disabled={itinerarySaving} onClick={() => { setEditingStop(null); setAddingStop(true) }}><Plus size={17} /> 장소 추가</button>{addingStop && <RoutePlaceEditor current={{ ...(itinerary ?? finalCourse.days)[finalDay].at(-1)!, title: '새 장소' }} onCancel={() => setAddingStop(false)} onSelect={addStop} />}</>}</section>}
        {finalCourse && <div className="final-room-controls">{roomControls}</div>}
      </>}
    </main>
    {showNewTripPrompt && <div className="save-before-new-backdrop" role="presentation" onClick={() => setShowNewTripPrompt(false)}><section className="save-before-new-dialog" role="dialog" aria-modal="true" aria-labelledby="save-before-new-title" onClick={(event) => event.stopPropagation()}><span className="result-icon"><Save /></span><h2 id="save-before-new-title">확정 경로를 저장할까요?</h2><p>여행방은 7일 뒤 삭제됩니다. 마이페이지에 저장하면 이 기기에서 계속 확인할 수 있어요.</p><button className="primary-button" disabled={savingRoute} onClick={() => void saveAndStartNew()}>{savingRoute ? '저장 중…' : '저장하고 새 여행 만들기'}</button><button className="outline-button" onClick={() => window.location.assign(basePath)}>저장하지 않고 새 여행 만들기</button><button className="text-button" onClick={() => setShowNewTripPrompt(false)}>취소</button></section></div>}
    <QuickFeedback screen={finalCourse ? 'final' : routeCourses ? 'courses' : 'room'} />
  </div>
}

function MobileHomeScreen({ tab, nativeMode, onCreate }: { tab: 'home' | 'my' | 'settings'; nativeMode: boolean; onCreate: () => void }) {
  const [rooms, setRooms] = useState<RecentRoom[]>([])
  const [saved, setSaved] = useState<SavedTrip[]>([])
  const [roomCode, setRoomCode] = useState('')
  const [notificationOn, setNotificationOn] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(true)
  useEffect(() => {
    void recentRooms().then((items) => { setRooms(items); setLoadingRooms(false) })
    void savedTrips().then(setSaved)
    void notificationsEnabled().then(setNotificationOn)
  }, [])
  const openRoom = (roomId: string) => window.location.assign(`/app?room=${roomId}`)
  const joinRoom = () => {
    const code = roomCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (code) openRoom(code)
  }
  if (tab === 'settings') return <section className="native-home-page native-settings-page">
    <div className="native-page-heading"><span>APP SETTINGS</span><h1>설정</h1><p>필요한 알림만 받고 여행 데이터는 기기에 최소한으로 보관해요.</p></div>
    {nativeMode ? <div className="native-setting-card"><div><Bell size={20} /><span><b>여행 알림</b><small>여행 전날과 여행방 삭제 하루 전에 알려드려요.</small></span></div><button role="switch" aria-checked={notificationOn} className={notificationOn ? 'active' : ''} onClick={() => void setNotificationsEnabled(!notificationOn).then(setNotificationOn)}>{notificationOn ? '켜짐' : '꺼짐'}</button></div>
      : <div className="native-setting-card static install-guide"><div><Plus size={20} /><span><b>iPhone 홈 화면에 설치</b><small>Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하면 앱처럼 실행할 수 있어요.</small></span></div></div>}
    <div className="native-setting-card static"><div><ShieldCheck size={20} /><span><b>데이터 보관</b><small>여행방은 생성 후 7일 뒤 삭제되며 계정이나 연락처를 수집하지 않아요.</small></span></div></div>
    <div className="native-app-version">모행 v1.0 · {nativeMode ? 'Android 앱' : '웹앱'}</div>
  </section>

  if (tab === 'my') return <section className="native-home-page my-page">
    <div className="native-page-heading"><span>MY PAGE</span><h1>마이페이지</h1><p>저장한 확정 경로와 진행 중인 여행방을 이 기기에서 확인해요. 앱을 삭제하거나 브라우저 데이터를 지우면 저장 일정도 삭제될 수 있어요.</p></div>
    <div className="my-section-heading"><b>저장한 여행</b><span>{saved.length}개</span></div>
    <SavedTripList trips={saved} onDelete={async (id) => { await deleteSavedTrip(id); setSaved(await savedTrips()) }} />
    <div className="my-section-heading"><b>진행 중인 여행방</b><span>{rooms.length}개</span></div>
    <RecentRoomList rooms={rooms} loading={loadingRooms} onOpen={openRoom} />
    <button className="native-create-secondary" onClick={onCreate}><Plus size={18} /> 새 여행 만들기</button>
  </section>

  return <section className="native-home-page">
    <div className="native-welcome"><span>모행</span><h1>우리 취향으로<br />부산 하루 여행</h1><p>친구와 취향을 모으고 가까운 실제 장소로 여행 코스를 완성해요.</p></div>
    <div className="native-home-actions">
      <button className="native-create-button" onClick={onCreate}><span><Plus size={23} /></span><div><b>새 여행 만들기</b><small>출발지 또는 부산 권역부터 시작해요</small></div><ChevronRight size={20} /></button>
      <div className="native-join-card"><div><b>초대 코드로 참여</b><small>친구에게 받은 방 코드를 입력해 주세요.</small></div><div><input value={roomCode} maxLength={12} autoCapitalize="none" placeholder="방 코드" onChange={(event) => setRoomCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') joinRoom() }} /><button disabled={!roomCode.trim()} onClick={joinRoom}>참여</button></div></div>
    </div>
    {!nativeMode && <a className="ios-install-hint" href="#install" onClick={(event) => { event.preventDefault(); window.alert('iPhone에서는 Safari 하단의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택해 주세요.') }}><Plus size={15} /> iPhone 홈 화면에 추가하는 방법</a>}
    <div className="native-recent-heading"><b>최근 여행</b>{rooms.length > 0 && <span>{rooms.length}개</span>}</div>
    <RecentRoomList rooms={rooms.slice(0, 2)} loading={loadingRooms} onOpen={openRoom} compact />
  </section>
}

function SavedTripList({ trips, onDelete }: { trips: SavedTrip[]; onDelete: (id: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState('')
  if (!trips.length) return <div className="native-room-empty"><Save size={22} /><b>저장한 여행이 없어요</b><span>확정된 경로에서 ‘마이페이지에 경로 저장’을 눌러 주세요.</span></div>
  return <div className="saved-trip-list">{trips.map((trip) => <article key={trip.id} className={expanded === trip.id ? 'expanded' : ''}><button className="saved-trip-summary" onClick={() => setExpanded((current) => current === trip.id ? '' : trip.id)}><span className="native-room-date"><CalendarDays size={15} />{trip.startDate.slice(5).replace('-', '.')}</span><span><b>{trip.name}</b><small>{trip.courseTitle} · {trip.memberCount}명</small></span><ChevronDown size={18} /></button>{expanded === trip.id && <div className="saved-trip-detail"><ol>{trip.days.flat().map((stop, index) => <li key={`${stop.title}-${index}`}><time>{stop.time}</time><span><b>{stop.title}</b><small>{stop.category}</small></span></li>)}</ol><button className="delete-saved-trip" onClick={() => { if (window.confirm('저장한 여행을 마이페이지에서 삭제할까요?')) void onDelete(trip.id) }}><Trash2 size={14} /> 저장 목록에서 삭제</button></div>}</article>)}</div>
}

function RecentRoomList({ rooms, loading, onOpen, compact = false }: { rooms: RecentRoom[]; loading: boolean; onOpen: (id: string) => void; compact?: boolean }) {
  const { locale, t } = useI18n()
  if (loading) return <div className="native-room-empty"><Clock3 size={20} /><span>여행방을 확인하고 있어요.</span></div>
  if (!rooms.length) return <div className="native-room-empty"><Map size={22} /><b>아직 저장된 여행이 없어요</b><span>여행방을 만들거나 초대 코드로 참여해 보세요.</span></div>
  return <div className={`native-room-list ${compact ? 'compact' : ''}`}>{rooms.map((room) => { const deletionDate = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(room.expiresAt * 1000)); return <button key={room.id} onClick={() => onOpen(room.id)}><span className="native-room-date"><CalendarDays size={15} />{room.startDate.slice(5).replace('-', '.')}</span><span><b>{room.name}</b><small><span>{t('방 코드')}</span> {room.id} · <span data-no-translate>{deletionDate}</span> <span>{t('삭제')}</span></small></span><ChevronRight size={19} /></button> })}</div>
}

function CreateTrip({ state, setState, stage, setStage, appMode = false, nativeMode = false, basePath = '/demo' }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; stage: number; setStage: React.Dispatch<React.SetStateAction<number>>; appMode?: boolean; nativeMode?: boolean; basePath?: string }) {
  const { locale, t } = useI18n()
  const setTrip = (field: string, value: string) => setState((s) => ({ ...s, trip: { ...s.trip, [field]: value } }))
  const [hostName, setHostName] = useState(() => t('민지'))
  const hostNameEdited = useRef(false)
  const tripNameEdited = useRef(false)
  const [expectedMembers, setExpectedMembers] = useState(4)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [originSelected, setOriginSelected] = useState(false)
  const [destinationSelected, setDestinationSelected] = useState(false)
  useEffect(() => {
    if (!hostNameEdited.current) setHostName(t('민지'))
    const sampleTripNames = ['우리들의 부산 한바퀴', 'Our Busan Day Trip', '我們的釜山一日遊', '我们的釜山一日游', 'みんなの釜山一日旅']
    if (!tripNameEdited.current && sampleTripNames.includes(state.trip.name)) setTrip('name', t('우리들의 부산 한바퀴'))
  }, [locale])
  const openAreas = ['상관없음', '서면·전포', '광안리·수영', '해운대·청사포', '남포·광복']
  const openRoute = state.trip.routeMode === 'open'
  const maxTravelPlanDays = 365
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const maxTravelDate = (() => {
    const date = new Date(`${today}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + maxTravelPlanDays)
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  })()
  const maxTravelDateLabel = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${maxTravelDate}T00:00:00Z`))
  const validDate = state.trip.startDate >= today && state.trip.startDate <= maxTravelDate
  const stageLabels = ['코스 추천 방식', openRoute ? '선호 권역' : '여행 경로', '여행방 정보', '입력 내용 확인']
  const canContinue = stage === 1
    || (stage === 2 && (openRoute || (originSelected && destinationSelected)))
    || (stage === 3 && Boolean(state.trip.name.trim() && validDate && hostName.trim()))
  const createRoom = async () => {
    setCreating(true); setError('')
    try {
      const result = await createLiveRoom(state.trip, hostName, expectedMembers)
      saveRoomToken(result.roomId, result.token)
      if (appMode) {
        const room = { id: result.roomId, name: state.trip.name, startDate: state.trip.startDate, expiresAt: result.expiresAt }
        await rememberRoom(room)
        if (nativeMode) {
          await setNotificationsEnabled(true)
          await scheduleTripNotifications(room)
        }
      }
      track(appMode ? 'room_created' : 'demo_room_created')
      window.location.assign(`${basePath}?room=${result.roomId}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '여행방을 만들지 못했습니다.')
      setCreating(false)
    }
  }
  const next = () => { setError(''); setStage((current) => Math.min(4, current + 1)) }
  const previous = () => { setError(''); setStage((current) => Math.max(1, current - 1)) }
  return (
    <section className="page create-wizard">
      <Progress current={stage} total={4} label={stageLabels[stage - 1]} />

      {stage === 1 && <>
        <div className="section-heading"><h2>어떤 방식으로 여행할까요?</h2><p>여행 장소가 정해졌는지 알려주세요.</p></div>
        <div className="route-mode-options route-mode-cards" role="radiogroup" aria-label="코스 추천 방식">
          <button type="button" role="radio" aria-checked={!openRoute} className={!openRoute ? 'active' : ''} onClick={() => setTrip('routeMode', 'fixed')}><MapPin size={22} /><span><b>출발·도착 직접 설정</b><small>정한 장소 사이에서 실제 장소를 추천해요.</small></span></button>
          <button type="button" role="radio" aria-checked={openRoute} className={openRoute ? 'active' : ''} onClick={() => { setTrip('routeMode', 'open'); setTrip('transport', '대중교통') }}><TrainFront size={22} /><span><b>부산 코스부터 추천</b><small>출발·도착 없이 이동이 짧은 권역을 찾아요.</small></span></button>
        </div>
      </>}

      {stage === 2 && <>
        <div className="section-heading">
          <h2>{openRoute ? '어느 지역을 여행하고 싶나요?' : '어디서 어디로 여행할까요?'}</h2>
          <p>{openRoute ? '모르면 상관없음을 선택해 주세요.' : '부산의 실제 장소를 검색해서 선택해 주세요.'}</p>
        </div>
        <div className="form-card">
        {!openRoute ? <>
          <div className="route-input-heading"><b>여행 경로</b><button type="button" onClick={() => { setTrip('origin', ''); setTrip('destination', ''); setOriginSelected(false); setDestinationSelected(false) }}>입력 지우기</button></div>
          <div className="field-row route-fields">
            <LocationSearchField label="출발 장소" placeholder="식당·숙소·역 이름 검색" value={state.trip.origin} onChange={(value) => setTrip('origin', value)} selected={originSelected} onSelectedChange={setOriginSelected} />
            <ArrowRight size={19} className="field-arrow" />
            <LocationSearchField label="도착 장소" placeholder="식당·숙소·역 이름 검색" value={state.trip.destination} onChange={(value) => setTrip('destination', value)} selected={destinationSelected} onSelectedChange={setDestinationSelected} />
          </div>
          <small className="route-data-note">검색 결과에서 실제 장소를 선택해야 다음 단계로 이동할 수 있어요.</small>
          <label>이동수단
            <div className="segmented">
              {['대중교통', '자동차'].map((item) => <button type="button" className={state.trip.transport === item ? 'active' : ''} onClick={() => setTrip('transport', item)} key={item}>{item === '대중교통' ? <TrainFront size={17} /> : <Compass size={17} />}{item}</button>)}
            </div>
          </label>
        </> : <>
          <label>선호 권역
            <div className="area-chips area-grid">{openAreas.map((area) => <button type="button" key={area} className={state.trip.preferredArea === area ? 'active' : ''} onClick={() => setTrip('preferredArea', area)}>{area}</button>)}</div>
          </label>
          <div className="transport-summary"><TrainFront size={17} /><span><b>대중교통 기준</b><small>{state.trip.preferredArea === '상관없음' ? '서로 다른 부산 권역에서 이동이 짧은 코스 3개를 만들어요.' : '같은 권역 안에서 도보와 환승을 포함한 가까운 동선을 만들어요.'}</small></span></div>
        </>}
        </div>
      </>}

      {stage === 3 && <>
        <div className="section-heading"><h2>여행방 정보를 알려주세요</h2><p>친구들이 알아보기 쉬운 이름과 여행 날짜를 정해 주세요.</p></div>
        <div className="form-card">
          <label>여행방 이름<input value={state.trip.name} onChange={(event) => { tripNameEdited.current = true; setTrip('name', event.target.value) }} placeholder="예: 우리들의 부산 여행" /></label>
          <div className="travel-date-label form-field"><span className="form-field-label">여행 날짜</span><DatePicker min={today} max={maxTravelDate} value={state.trip.startDate} onChange={(value) => { setTrip('startDate', value); setTrip('endDate', value) }} /><span className="travel-date-limit"><CalendarDays size={14} /> 최대 계획 가능 날짜 <b data-no-translate>{maxTravelDateLabel}</b></span><small className="travel-date-note">오늘부터 365일 뒤까지 계획할 수 있어요. 여행방은 생성 후 7일 뒤 삭제되므로 확정 경로는 마이페이지에 저장해 주세요. 단기예보가 없는 날짜는 날씨를 추천 기준에서 제외해요.</small></div>
          <label>내 별명<input maxLength={20} value={hostName} onChange={(event) => { hostNameEdited.current = true; setHostName(event.target.value) }} placeholder="예: 민지" /></label>
          <label>함께 갈 인원
            <div className="segmented member-count">{[1, 2, 3, 4, 5, 6].map((count) => <button type="button" className={expectedMembers === count ? 'active' : ''} onClick={() => setExpectedMembers(count)} key={count}>{count}명</button>)}</div>
          </label>
          <div className="expiry-notice"><Clock3 size={16} /><span>여행방과 별명·취향·투표 데이터는 생성일로부터 <b>7일 후 자동 삭제</b>됩니다.</span></div>
        </div>
      </>}

      {stage === 4 && <>
        <div className="section-heading"><h2>이 내용으로 여행방을 만들까요?</h2><p>잘못 입력한 내용은 항목별로 돌아가 수정할 수 있어요.</p></div>
        <div className="create-review">
          <article><span><small>코스 추천 방식</small><b>{t(openRoute ? '부산 코스부터 추천' : '출발·도착 직접 설정')}</b><em>{openRoute ? `${t(state.trip.preferredArea)} · ${t('대중교통')}` : <><span data-no-translate>{state.trip.origin} → {state.trip.destination}</span> · {t(state.trip.transport)}</>}</em></span><button type="button" onClick={() => setStage(1)}>변경</button></article>
          <article><span><small>여행방 정보</small><b>{state.trip.name}</b><em>{state.trip.startDate} · {expectedMembers}명</em></span><button type="button" onClick={() => setStage(3)}>변경</button></article>
          <article><span><small>방장</small><b>{hostName}</b><em>생성 후 7일 뒤 자동 삭제</em></span></article>
        </div>
      </>}

      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="wizard-actions">
        {stage > 1 && <button type="button" className="wizard-back" disabled={creating} onClick={previous}>이전</button>}
        {stage < 4
          ? <button type="button" className="primary-button" disabled={!canContinue} onClick={next}>다음 <ArrowRight size={18} /></button>
          : <button type="button" className="primary-button" disabled={creating} onClick={createRoom}>{creating ? '여행방 만드는 중…' : '여행방 만들기'} <ArrowRight size={18} /></button>}
      </div>
    </section>
  )
}

type LocationSuggestion = { title: string; category?: string; roadAddress?: string; address?: string; mapx?: string; mapy?: string }

function LocationSearchField({ label, placeholder, value, onChange, selected, onSelectedChange }: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  selected: boolean
  onSelectedChange: (selected: boolean) => void
}) {
  const [items, setItems] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (selected || value.trim().length < 2) { setItems([]); setMessage(''); return }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setMessage('')
      try {
        const response = await fetch(apiUrl(`/api/naver/local?query=${encodeURIComponent(`부산 ${value.trim()}`)}`), {
          signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' },
        })
        const data = await response.json() as { items?: LocationSuggestion[]; error?: string }
        if (!response.ok) throw new Error(data.error ?? '장소를 검색하지 못했습니다.')
        setItems(data.items ?? [])
        setOpen(true)
        if (!data.items?.length) setMessage('검색 결과가 없습니다. 더 정확한 장소명을 입력해 주세요.')
      } catch (reason) {
        if ((reason as Error).name !== 'AbortError') setMessage(reason instanceof Error ? reason.message : '장소를 검색하지 못했습니다.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 350)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [value, selected])

  const choose = (item: LocationSuggestion) => {
    onChange(item.title)
    onSelectedChange(true)
    setItems([]); setOpen(false); setMessage('')
  }

  return <label className="location-search-field">{label}
    <span className={`location-input ${selected ? 'selected' : ''}`}><MapPin size={17} /><input type="search" autoComplete="off" placeholder={placeholder} value={value} onFocus={() => items.length && setOpen(true)} onChange={(event) => { onChange(event.target.value); onSelectedChange(false); setOpen(true) }} />{selected && <Check size={16} />}</span>
    {loading && <small className="location-status">검색 중…</small>}
    {message && <small className="location-status error">{message}</small>}
    {open && items.length > 0 && <div className="location-results" role="listbox">{items.map((item, index) => <button type="button" role="option" key={`${item.title}-${index}`} onClick={() => choose(item)}><MapPin size={15} /><span data-no-translate><b>{item.title}</b><small>{item.roadAddress || item.address || '주소 정보 없음'}</small></span></button>)}</div>}
  </label>
}

function categoryFromPlace(category = '') {
  if (/카페|커피|베이커리/.test(category)) return '카페'
  if (/음식|한식|중식|일식|양식|고기/.test(category)) return '맛집'
  if (/호텔|숙박|펜션|모텔/.test(category)) return '숙소'
  if (/역|터미널|교통/.test(category)) return '교통'
  if (/공원|산책|자연/.test(category)) return '산책'
  if (/체험|레저|스포츠/.test(category)) return '액티비티'
  return '관광'
}

function RoutePlaceEditor({ current, onSelect, onCancel, mode = 'replace' }: { current: Stop; onSelect: (place: LocationSuggestion) => void; onCancel: () => void; mode?: 'replace' | 'add' }) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (query.trim().length < 2) { setItems([]); setMessage(''); return }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setMessage('')
      try {
        const response = await fetch(apiUrl(`/api/naver/local?query=${encodeURIComponent(`부산 ${query.trim()}`)}`), {
          signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' },
        })
        const data = await response.json() as { items?: LocationSuggestion[]; error?: string }
        if (!response.ok) throw new Error(data.error ?? '장소를 검색하지 못했습니다.')
        const valid = (data.items ?? []).filter((item) => item.mapx && item.mapy)
        setItems(valid)
        if (!valid.length) setMessage('검색 결과가 없습니다. 정확한 상호명을 입력해 주세요.')
      } catch (reason) {
        if ((reason as Error).name !== 'AbortError') setMessage(reason instanceof Error ? reason.message : '장소를 검색하지 못했습니다.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 350)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query])
  const adding = mode === 'add' || current.title === '새 장소'
  return <section className="route-place-editor"><div className="route-editor-title"><div><b>{adding ? '장소 추가' : '장소 변경'}</b><span>{adding ? '경로에 추가할 실제 장소를 검색하세요.' : `${current.title} 대신 방문할 실제 장소를 검색하세요.`}</span></div><button onClick={onCancel}><X size={16} /></button></div><span className="route-editor-search"><MapPin size={16} /><input autoFocus type="search" autoComplete="off" placeholder="식당·카페·숙소 이름 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></span>{loading && <small>검색 중…</small>}{message && <small className="error">{message}</small>}<div className="route-editor-results">{items.map((item, index) => <button key={`${item.title}-${index}`} onClick={() => onSelect(item)}><b>{item.title}</b><span>{item.roadAddress || item.address}</span></button>)}</div></section>
}

function Room({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const completed = state.members.filter((m) => m.preference).length
  const allDone = allPreferencesComplete(state.members)
  const fillDemo = () => setState((s) => ({ ...s, members: s.members.map((m) => ({ ...m, preference: demoPreferences[m.id] })) }))
  return (
    <section className="page">
      <div className="trip-summary">
        <span className="eyebrow dark"><CalendarDays size={14} /> 8월 15일 — 16일</span>
        <h2>{state.trip.name}</h2>
        <div className="trip-meta"><span><MapPin size={15} /> {state.trip.origin} → {state.trip.destination}</span><span><TrainFront size={15} /> {state.trip.transport}</span></div>
      </div>
      <div className="status-card">
        <div className="status-top"><div><b>{completed}/{state.members.length}명</b><span> 취향 입력 완료</span></div><span>{Math.round(completed / state.members.length * 100)}%</span></div>
        <div className="progress-track"><i style={{ width: `${completed / state.members.length * 100}%` }} /></div>
      </div>
      <div className="section-title-row"><h3>함께 가는 친구</h3><button className="small-link">초대 링크 복사</button></div>
      <div className="member-list">
        {state.members.map((member) => (
          <button key={member.id} className="member-row" onClick={() => setState((s) => ({ ...s, activeMemberId: member.id, step: 'preferences' }))}>
            <Avatar member={member} />
            <div className="member-info"><b>{member.name}{member.host && <small>방장</small>}</b><span>{member.preference ? `${member.preference.themes.slice(0, 2).join(' · ')} 선택` : '아직 입력하지 않았어요'}</span></div>
            <span className={member.preference ? 'complete-badge' : 'waiting-badge'}>{member.preference ? <><Check size={13} /> 완료</> : '입력하기'}</span>
          </button>
        ))}
      </div>
      {!allDone && <div className="lock-note"><UsersRound size={18} /><div><b>모두 입력하면 코스를 만들어요</b><span>친구들의 취향이 빠짐없이 반영될 때까지 기다려주세요.</span></div></div>}
      <button className="secondary-button" onClick={fillDemo}>데모 응답 한 번에 채우기</button>
      <button className="primary-button sticky-action" disabled={!allDone} onClick={() => setState((s) => ({ ...s, step: 'analysis' }))}>{allDone ? '우리 취향 분석하기' : `${state.members.length - completed}명의 응답을 기다리는 중`} <ArrowRight size={18} /></button>
    </section>
  )
}

function Preferences({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const { t } = useI18n()
  const member = state.members.find((m) => m.id === state.activeMemberId)!
  const [form, setForm] = useState<Preference>(normalizePreference(member.preference) ?? { themes: [], placeCount: 4, food: [], mood: [] })
  const toggle = (theme: string) => setForm((f) => ({ ...f, themes: toggleSelection(f.themes, theme) }))
  const save = () => setState((s) => ({ ...s, step: 'room', members: s.members.map((m) => m.id === member.id ? { ...m, preference: form } : m) }))
  return (
    <section className="page">
      <Progress current={2} total={4} label={<><span data-no-translate>{member.name}</span>{t('님의 취향')}</>} />
      <div className="profile-heading"><Avatar member={member} /><div><h2><span data-no-translate>{member.name}</span>{t('님은 어떤 여행이 좋아요?')}</h2><p>마음에 드는 항목을 여러 개 골라주세요.</p></div></div>
      <PreferenceGroup title="가장 가고 싶은 장소" options={themes} selected={form.themes} onSelect={toggle} icons />
      <PlaceCountControl openRoute={state.trip.routeMode === 'open'} value={form.placeCount} onChange={(placeCount) => setForm((current) => ({ ...current, placeCount }))} />
      <PreferenceGroup title="좋아하는 음식 · 복수 선택" options={foods} selected={form.food} onSelect={(value) => setForm((f) => ({ ...f, food: toggleSelection(f.food, value) }))} />
      <PreferenceGroup title="원하는 분위기 · 복수 선택" options={moods} selected={form.mood} onSelect={(value) => setForm((f) => ({ ...f, mood: toggleSelection(f.mood, value) }))} />
      <button className="primary-button sticky-action" disabled={form.themes.length === 0} onClick={save}>취향 저장하기 <Check size={18} /></button>
    </section>
  )
}

function PreferenceGroup({ title, options, selected, onSelect, icons }: { title: string; options: string[]; selected: string[]; onSelect: (value: string) => void; icons?: boolean }) {
  const iconMap: Record<string, React.ReactNode> = { '맛집': <Utensils />, '감성 카페': <Coffee />, '사진 명소': <Sparkles />, '액티비티': <TrainFront />, '역사·문화': <Home />, '쇼핑': <WalletCards /> }
  return <div className="preference-group"><h3>{title}</h3><div className={icons ? 'choice-grid' : 'choice-chips'}>{options.map((option) => <button type="button" aria-pressed={selected.includes(option)} key={option} className={selected.includes(option) ? 'selected' : ''} onClick={() => onSelect(option)}>{icons && iconMap[option]}{option}</button>)}</div></div>
}

function PlaceCountControl({ value, onChange, openRoute = false }: { value: number; onChange: (value: number) => void; openRoute?: boolean }) {
  const ranges = [{ label: '1~2곳', value: 2, caption: '가볍게' }, { label: '3~4곳', value: 4, caption: '적당히' }, { label: '5~6곳', value: 6, caption: '알차게' }]
  return <div className="preference-group"><h3>방문 장소 수</h3><div className="place-count-ranges">{ranges.map((range) => <button type="button" aria-pressed={value === range.value} key={range.value} className={value === range.value ? 'selected' : ''} onClick={() => onChange(range.value)}><b>{range.label}</b><span>{range.caption}</span></button>)}</div><small className="place-count-note">{openRoute ? '추천 코스에 포함할 방문 장소 수예요.' : '출발·도착 장소는 개수에서 제외해요.'}</small></div>
}

function Analysis({ state, onNext }: { state: AppState; onNext: () => void }) {
  const aggregated = aggregateThemes(state.members)
  const top = aggregated[0]
  return (
    <section className="page analysis-page">
      <Progress current={3} total={4} label="그룹 취향 분석" />
      <div className="section-heading center"><span className="result-icon"><Check /></span><h2>선택 내용을 정리했어요</h2><p>{state.members.length}명의 응답에서 공통 조건을 확인했어요.</p></div>
      <div className="taste-chart">
        {aggregated.map(({ theme, count }, index) => (
          <div className="taste-row" key={theme}>
            <div><span>{index + 1}</span><b>{theme}</b><small>{count}명 선택</small></div>
            <div className="taste-bar"><i style={{ width: `${count / state.members.length * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="insight-card"><div className="insight-title"><MapPin size={17} /> 추천 기준</div><p><b>{top?.theme}</b> 선호와 방문 장소 수를 먼저 반영하고, 실제 장소 사이의 이동 거리가 짧도록 구성합니다.</p></div>
      <button className="primary-button sticky-action" onClick={onNext}>맞춤 코스 3개 보기 <ArrowRight size={18} /></button>
    </section>
  )
}

function Courses({ courses, selected, setSelected, onVote }: { courses: Course[]; selected: Course; setSelected: (c: Course) => void; onVote: () => void }) {
  const { t } = useI18n()
  const [detail, setDetail] = useState(false)
  return (
    <section className="page courses-page">
      <Progress current={4} total={4} label="맞춤 코스 추천" />
      <div className="section-heading"><h2>조건에 맞는 3가지 코스</h2><p>선택한 취향과 장소 사이의 이동 거리를 함께 비교했어요.</p></div>
      <div className="course-tabs">
        {courses.map((course) => <button aria-pressed={selected.id === course.id} key={course.id} className={selected.id === course.id ? 'active' : ''} onClick={() => { setSelected(course); setDetail(false) }}>{t(course.title).split(' ')[0]}</button>)}
      </div>
      <CourseCard course={selected} expanded={detail} onToggle={() => setDetail(!detail)} />
      <div className="data-notice"><ShieldCheck size={15} /><span>공식 관광정보를 바탕으로 구성했으며, 운영시간·요금·교통은 네이버지도에서 방문 전에 다시 확인해 주세요.</span></div>
      <button className="primary-button sticky-action" onClick={onVote}>친구들과 투표하기 <Vote size={18} /></button>
    </section>
  )
}

function CourseCard({ course, expanded, onToggle }: { course: Course; expanded: boolean; onToggle: () => void }) {
  const { t } = useI18n()
  const modelRestaurantCount = course.days[0].filter(isOfficialModelRestaurant).length
  return (
    <article className="course-card">
      <div className="course-hero">
        <span className="course-emoji">{course.emoji}</span>
        <div><span className="course-label">{t(course.label)}</span><h3>{t(course.title)}</h3><p>{t(course.description)}</p></div>
        <div className="match-score"><b>조건 반영</b><span>{course.tags.length}개 기준</span></div>
      </div>
      <div className="tag-row">{course.tags.map((tag) => <span key={tag}>#{t(tag)}</span>)}</div>
      <div className="course-place-preview"><MapPin size={15} /><div><small>방문 장소</small><p>{course.days[0].map((stop) => stop.title).join(' → ')}</p></div></div>
      {modelRestaurantCount > 0 && <div className="course-official-summary"><ShieldCheck size={14} /> 부산시 모범음식점 {modelRestaurantCount}곳 포함</div>}
      <div className="course-stats"><span><TrainFront size={17} /> 예상 이동 {course.travelMinutes}분</span><span><MapPin size={17} /> {course.days[0].length}개 지점</span></div>
      <button className="outline-button" onClick={onToggle}>{expanded ? '상세 경로 접기' : '상세 경로 보기'} <ChevronRight size={17} /></button>
      {expanded && <div className="course-route-detail"><div className="course-route-heading"><Map size={15} /><b>코스 이동 경로</b></div><RouteMap stops={course.days[0]} /><div className="mini-timeline">{course.days[0].map((stop, index) => <div key={stop.time + stop.title}><time>{stop.time}</time><i className={stop.shared ? 'shared' : ''} /><span><b>{index + 1}. {stop.title}{isOfficialModelRestaurant(stop) && <OfficialRestaurantBadge />}</b><small>{stop.category} · {stop.duration}{stop.shared ? ' · 공통 일정' : ''}</small></span></div>)}</div><p className="map-disclaimer">지도 선은 방문 순서를 나타냅니다. 실제 이동 경로와 시간은 네이버지도에서 다시 확인해 주세요.</p></div>}
    </article>
  )
}

function Voting({ courses, state, setState }: { courses: Course[]; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const { t } = useI18n()
  const [voterId, setVoterId] = useState(state.members.find((m) => !state.votes[m.id])?.id ?? state.members[0].id)
  const [selectedId, setSelectedId] = useState('')
  const allVoted = state.members.every((m) => state.votes[m.id])
  const result = tallyVotes(state.votes)
  const voteCourses = state.voteRound === 2 ? courses.filter((course) => state.runoffCourseIds.includes(course.id)) : courses
  const submit = () => {
    if (!selectedId) return
    const nextVotes = { ...state.votes, [voterId]: selectedId }
    setState((s) => ({ ...s, votes: nextVotes }))
    setSelectedId('')
    const next = state.members.find((m) => !nextVotes[m.id])
    if (next) setVoterId(next.id)
  }
  const fillVotes = () => {
    const available = state.voteRound === 2 ? state.runoffCourseIds : ['balance', 'active']
    setState((s) => ({ ...s, votes: { minji: available[0], seojun: available[1] ?? available[0], yuna: available[0], hyunwoo: available[0] } }))
  }
  const startRunoff = () => {
    setState((s) => ({ ...s, votes: {}, voteRound: 2, runoffCourseIds: result.winners }))
    setVoterId(state.members[0].id)
    setSelectedId('')
  }
  const finalize = () => {
    const winner = result.tied ? [...result.winners].sort((a, b) => courses.find((c) => c.id === b)!.match - courses.find((c) => c.id === a)!.match)[0] : result.winners[0]
    setState((s) => ({ ...s, finalCourseId: winner, step: 'final' }))
    track('final_route_confirmed')
  }
  return (
    <section className="page">
      <div className="vote-banner"><Vote /><div><b>{state.voteRound === 2 ? '공동 1위 결선투표' : '내 마음에 드는 코스는?'}</b><span>{state.voteRound === 2 ? '공동 1위 코스 중 하나를 다시 골라주세요.' : '모두 투표할 때까지 선택은 비공개예요.'}</span></div></div>
      {!allVoted ? <>
        <div className="voter-select"><span>지금 투표하는 친구</span><div>{state.members.map((member) => <button key={member.id} className={voterId === member.id ? 'active' : ''} disabled={Boolean(state.votes[member.id])} onClick={() => setVoterId(member.id)}><Avatar member={member} compact />{state.votes[member.id] && <Check size={12} />}</button>)}</div></div>
        <div className="vote-options">{voteCourses.map((course) => <button key={course.id} className={selectedId === course.id ? 'selected' : ''} onClick={() => setSelectedId(course.id)}><span className="course-emoji">{course.emoji}</span><div><small>{t(course.label)} · 취향 {course.match}%</small><b>{t(course.title)}</b>{course.days[0].some(isOfficialModelRestaurant) && <OfficialRestaurantBadge />}<span data-no-translate>{course.days[0].map((stop) => stop.title).join(' → ')}</span></div><i>{selectedId === course.id && <Check size={16} />}</i></button>)}</div>
        <button className="secondary-button" onClick={fillVotes}>데모 투표 한 번에 채우기</button>
        <button className="primary-button sticky-action" disabled={!selectedId} onClick={submit}>{state.members.find((m) => m.id === voterId)?.name}님의 한 표 보내기 <Vote size={18} /></button>
      </> : <>
        <div className="section-heading center"><span className="result-icon coral"><Check /></span><h2>투표가 끝났어요!</h2><p>친구들의 선택을 지금 공개할게요.</p></div>
        <div className="result-list">{courses.map((course) => <div key={course.id} className={result.winners.includes(course.id) ? 'winner' : ''}><span>{course.emoji}</span><div><b>{t(course.title)}</b><div className="vote-bar"><i style={{ width: `${((result.counts[course.id] ?? 0) / state.members.length) * 100}%` }} /></div></div><strong>{result.counts[course.id] ?? 0}표</strong></div>)}</div>
        {result.tied && <div className="safety-note"><b>공동 1위예요</b><span>{state.voteRound === 1 ? '공동 1위 코스만 남겨 결선투표를 진행해요.' : '결선도 동률이라 선택 조건이 더 많이 반영된 코스를 추천해요.'}</span></div>}
        {result.tied && state.voteRound === 1
          ? <button className="primary-button sticky-action" onClick={startRunoff}>결선투표 시작하기 <Vote size={18} /></button>
          : <button className="primary-button sticky-action" onClick={finalize}>{result.tied ? '추천 코스로 확정하기' : '1위 코스로 확정하기'} <ArrowRight size={18} /></button>}
      </>}
    </section>
  )
}

function FinalTrip({ courses, state, setState, tab, setTab }: { courses: Course[]; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; tab: 'schedule' | 'map' | 'booking'; setTab: (t: 'schedule' | 'map' | 'booking') => void }) {
  const { locale } = useI18n()
  const course = courses.find((c) => c.id === state.finalCourseId) ?? courses[0]
  const day = 0
  const [schedule, setSchedule] = useState<Stop[][]>(() => [course.days[0].map((item) => ({ ...item }))])
  const [copied, setCopied] = useState(false)
  const reservable = course.days.flat().filter((stop) => stop.reservable)
  const preferenceCount = new Set(state.members.flatMap((member) => member.preference ? [...member.preference.themes, ...member.preference.food, ...member.preference.mood] : [])).size
  const travelDateLabel = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${state.trip.startDate}T00:00:00`))
  const book = (title: string) => setState((s) => ({ ...s, booked: s.booked.includes(title) ? s.booked : [...s.booked, title] }))
  const removeStop = (index: number) => {
    setSchedule((current) => current.map((items, dayIndex) => dayIndex === day ? items.filter((_, stopIndex) => stopIndex !== index) : items))
    track('schedule_edit')
  }
  const copyPlan = async () => {
    const text = schedule.map((items, dayIndex) => [
      `DAY ${dayIndex + 1}`,
      ...items.map((stop) => `${stop.time} ${stop.title} · ${stop.duration}`),
    ].join('\n')).join('\n\n')
    try {
      await navigator.clipboard.writeText(`${state.trip.name}\n${state.trip.origin} → ${state.trip.destination}\n\n${text}`)
      setCopied(true)
      track('schedule_copy')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('아래 일정을 복사해 주세요.', text)
    }
  }
  return (
    <section className="final-page">
      <div className="final-hero">
        <span className="eyebrow dark"><Check size={14} /> 최종 여행 경로</span>
        <h2>{state.trip.name}</h2>
        <p>{travelDateLabel} · 선택 조건 {preferenceCount}개 반영</p>
        <div className="final-people">{state.members.map((m) => <Avatar key={m.id} member={m} compact />)}<span>{state.members.length}명이 함께</span></div>
      </div>
      <div className="final-tabs">
        <button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}><Clock3 size={17} />일정</button>
        <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}><Map size={17} />동선</button>
        <button className={tab === 'booking' ? 'active' : ''} onClick={() => setTab('booking')}><WalletCards size={17} />예약</button>
      </div>
      {tab === 'schedule' && <div className="final-content"><div className="single-day-label"><CalendarDays size={16} /><b>{travelDateLabel}</b><span>당일 일정</span></div><Timeline stops={schedule[day]} onRemove={removeStop} /><button className="outline-button copy-plan" onClick={copyPlan}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? '일정을 복사했어요' : '전체 일정 복사하기'}</button></div>}
      {tab === 'map' && <div className="final-content"><RouteMap stops={schedule[day]} /><div className="map-summary"><b>당일 이동 요약</b><span><TrainFront size={15} /> {schedule[day].length}개 장소</span></div><p className="map-disclaimer">도로 경로와 구간별 이동수단을 함께 표시합니다. 출발 전 실제 운행 정보는 지도에서 다시 확인해 주세요.</p></div>}
      {tab === 'booking' && <div className="final-content"><div className="section-title-row"><h3>방문 전 확인할 장소</h3><span className="count-badge">{state.booked.length}/{reservable.length}</span></div><div className="booking-list">{reservable.map((stop) => <div key={stop.title}><span className="booking-icon">{stop.category === '교통' ? <TrainFront /> : stop.category === '숙소' ? <Home /> : <Compass />}</span><div><small>{stop.category} · {stop.time}</small><b>{stop.title}</b></div>{state.booked.includes(stop.title) ? <span className="booked"><Check size={14} /> 확인</span> : <button onClick={() => book(stop.title)}>정보 확인</button>}</div>)}</div><div className="booking-notice">운영시간과 예약 가능 여부는 방문 전 해당 장소에서 확인해 주세요.</div></div>}
    </section>
  )
}

function StopDescription({ stop }: { stop: Stop }) {
  const { t } = useI18n()
  const parts = stop.description.split(' · ')
  const includesSearchAddress = parts.length >= 2 && Boolean(stop.source)
  if (!includesSearchAddress) return <>{t(stop.description)}</>
  return <>{t(parts[0])} · <span data-no-translate>{parts[1]}</span>{parts.length > 2 ? <> · {t(parts.slice(2).join(' · '))}</> : null}</>
}

function Timeline({ stops, onRemove, onMove, onEdit, disabled, renderAfter }: { stops: Stop[]; onRemove?: (index: number) => void; onMove?: (index: number, direction: number) => void; onEdit?: (index: number) => void; disabled?: boolean; renderAfter?: (index: number) => React.ReactNode }) {
  const { locale } = useI18n()
  const [dragSource, setDragSource] = useState<number | null>(null)
  const [dragTarget, setDragTarget] = useState<number | null>(null)
  const dragSourceRef = useRef<number | null>(null)
  const dragTargetRef = useRef<number | null>(null)
  useEffect(() => { dragSourceRef.current = null; dragTargetRef.current = null; setDragSource(null); setDragTarget(null) }, [stops])
  const finishDrag = () => {
    const source = dragSourceRef.current, target = dragTargetRef.current
    if (source !== null && target !== null && source !== target) onMove?.(source, target - source)
    dragSourceRef.current = null; dragTargetRef.current = null
    setDragSource(null); setDragTarget(null)
  }
  const startDrag = (event: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (disabled || !onMove || event.button !== 0 || (event.target as HTMLElement).closest('button,a,input')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragSourceRef.current = index; dragTargetRef.current = index
    setDragSource(index); setDragTarget(index)
  }
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragSourceRef.current === null) return
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-stop-index]')
    if (!target) return
    const index = Number(target.dataset.stopIndex)
    dragTargetRef.current = index; setDragTarget(index)
  }
  if (stops.length === 0) return <div className="empty-schedule"><CalendarDays size={22} /><b>이 날짜의 일정이 비었어요.</b><span>처음부터 다시 시작하면 원래 추천 일정을 불러올 수 있어요.</span></div>
  return <div className="timeline">{onMove && <div className="drag-move-guide"><span><b>끌거나 화살표를 눌러 순서를 바꿔보세요</b><small>카드의 빈 곳을 드래그하거나 위·아래 버튼을 사용할 수 있어요.</small></span></div>}{stops.map((stop, index) => {
    const after = renderAfter?.(index)
    const dragging = dragSource === index
    const dragOver = dragSource !== null && dragTarget === index && !dragging
    const source = sourceDisplay(stop.source, stop.verifiedAt, locale)
    const leg = index < stops.length - 1 ? transitLeg(stop, stops[index + 1]) : null
    return <React.Fragment key={`${stop.time}-${stop.title}-${index}`}><div data-stop-index={index} className={`timeline-stop ${dragging ? 'dragging' : ''} ${dragOver ? 'drag-over' : ''}`}><time>{stop.time}</time><div className="timeline-pin"><i className={stop.shared ? 'shared' : ''}>{iconFor(stop.category)}</i>{index < stops.length - 1 && <span />}</div><div className={`stop-card ${onMove ? 'draggable-stop-card' : ''}`} tabIndex={onMove ? 0 : undefined} aria-roledescription={onMove ? '순서를 바꿀 수 있는 장소 카드' : undefined} onPointerDown={(event) => startDrag(event, index)} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={(event) => { if (!onMove || disabled || !event.altKey) return; if (event.key === 'ArrowUp' && index > 0) { event.preventDefault(); onMove(index, -1) } if (event.key === 'ArrowDown' && index < stops.length - 1) { event.preventDefault(); onMove(index, 1) } }}><div><small>{stop.category} · {stop.duration}</small><span className="stop-tools">{stop.shared && <em>공통</em>}{onMove && <><button type="button" disabled={disabled || index === 0} aria-label={`${stop.title} 위로 이동`} onClick={() => onMove(index, -1)}><ChevronUp size={16} /></button><button type="button" disabled={disabled || index === stops.length - 1} aria-label={`${stop.title} 아래로 이동`} onClick={() => onMove(index, 1)}><ChevronDown size={16} /></button></>}{onRemove && <button aria-label={`${stop.title} 일정에서 삭제`} onClick={() => onRemove(index)}><Trash2 size={14} /></button>}</span></div><div className="stop-title-row"><b>{stop.title}</b>{isOfficialModelRestaurant(stop) && <OfficialRestaurantBadge />}</div><p><StopDescription stop={stop} /></p>{onEdit && <button className="replace-place-button" disabled={disabled} onClick={() => onEdit(index)}><MapPin size={13} /> 장소 변경</button>}<div className="stop-footer"><small data-no-translate title={source.title}>{source.text}</small></div><PlaceLookup stop={stop} /></div></div>{leg && <TransitLegCard leg={leg} />}{after && <div className="inline-route-editor">{after}</div>}</React.Fragment>
  })}</div>
}

function RouteMap({ stops }: { stops: Stop[] }) {
  const container = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapUnavailable, setMapUnavailable] = useState(false)
  const [roadRoute, setRoadRoute] = useState<{ path: number[][]; distanceMeters: number; durationMinutes: number } | null>(null)
  const [routeUnavailable, setRouteUnavailable] = useState(false)
  useEffect(() => {
    let cancelled = false
    const points = stops.filter((stop) => stop.latitude && stop.longitude)
    if (!container.current || points.length === 0) return
    const initialize = async () => {
      try {
        const pointParam = points.map((point) => `${point.longitude},${point.latitude}`).join('|')
        const [config, routeResponse] = await Promise.all([
          fetch(apiUrl('/api/naver/config')).then((response) => response.json()) as Promise<{ enabled: boolean; clientId?: string }>,
          fetchRoadRoute(pointParam),
        ])
        if (!config.enabled || !config.clientId) throw new Error('not-configured')
        const routeData = routeResponse
        if (routeData) setRoadRoute(routeData)
        else setRouteUnavailable(true)
        const load = () => new Promise<void>((resolve, reject) => {
          if ((window as any).naver?.maps) return resolve()
          const existing = document.getElementById('naver-map-sdk') as HTMLScriptElement | null
          if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); existing.addEventListener('error', reject, { once: true }); return }
          const script = document.createElement('script')
          script.id = 'naver-map-sdk'
          script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(config.clientId!)}`
          script.onload = () => resolve(); script.onerror = reject; document.head.appendChild(script)
        })
        await load()
        if (cancelled || !container.current) return
        const maps = (window as any).naver.maps
        const coords = points.map((stop) => new maps.LatLng(stop.latitude, stop.longitude))
        const map = new maps.Map(container.current, { center: coords[0], zoom: 12, zoomControl: true })
        coords.forEach((position: unknown, index: number) => new maps.Marker({ position, map, title: `${index + 1}. ${points[index].title}` }))
        if (routeData) {
          new maps.Polyline({ map, path: routeData.path.map(([lng, lat]) => new maps.LatLng(lat, lng)), strokeColor: '#1769aa', strokeWeight: 5, strokeOpacity: 0.86 })
        }
        const bounds = new maps.LatLngBounds(); coords.forEach((coord: unknown) => bounds.extend(coord)); map.fitBounds(bounds, { top: 45, right: 30, bottom: 45, left: 30 })
        setMapReady(true)
      } catch { if (!cancelled) setMapUnavailable(true) }
    }
    initialize()
    return () => { cancelled = true }
  }, [stops])
  const legs = transitLegs(stops).filter((leg) => leg !== null)
  return <div className="route-map-block"><div className="route-map-wrap"><div ref={container} className={`route-map naver-map ${mapReady ? 'ready' : ''}`} />{!mapReady && <div className="route-map route-map-fallback"><div className="map-grid" />{stops.slice(0, 5).map((stop, i) => <div key={stop.title} className={`map-stop stop-${i}`}><i>{i + 1}</i><span>{stop.title}</span></div>)}</div>}{mapUnavailable && <span className="map-fallback-note">네이버 지도 키를 설정하면 실제 지도가 표시됩니다.</span>}</div>{roadRoute && <div className="road-route-summary"><Map size={14} /><span>도로를 따라 약 {(roadRoute.distanceMeters / 1000).toFixed(1)}km</span><small>대중교통 탑승 경로는 구간별 길찾기에서 확인</small></div>}{routeUnavailable && <div className="route-unavailable-note">도로 경로를 확인할 수 없어 잘못된 연결선은 표시하지 않았어요.</div>}{legs.length > 0 && <div className="map-transit-summary" aria-label="구간별 예상 이동"><span><Footprints size={14} /> 도보</span><span><BusFront size={14} /> 버스</span><span><TrainFront size={14} /> 지하철</span><small>구간별 실제 길찾기 제공</small></div>}</div>
}

function TransitLegCard({ leg }: { leg: NonNullable<ReturnType<typeof transitLeg>> }) {
  const { t } = useI18n()
  const Icon = leg.mode === 'walk' ? Footprints : leg.mode === 'public-near' ? BusFront : TrainFront
  const modeLabel = leg.mode === 'walk' ? t('예상 도보') : t('예상 대중교통')
  const minMinutes = Math.max(1, Math.round(leg.minutes * .8))
  const maxMinutes = Math.max(minMinutes + 1, Math.round(leg.minutes * 1.25))
  return <div className="transit-leg" aria-label={`${leg.from.title}에서 ${leg.to.title} 이동 안내`}><Icon size={15} /><span><b>{modeLabel}</b><small>{t('직선거리 기준')} {leg.distanceKm.toFixed(1)}km · {minMinutes}~{maxMinutes}{t('분 예상')}</small></span><a href={naverRouteUrl(leg)} target="_blank" rel="noreferrer"><ExternalLink size={12} /> {t('네이버지도에서 확인')}</a></div>
}

type RoadRoute = { path: number[][]; distanceMeters: number; durationMinutes: number }
const roadRouteRequests = new globalThis.Map<string, Promise<RoadRoute | null>>()

function fetchRoadRoute(points: string): Promise<RoadRoute | null> {
  const existing = roadRouteRequests.get(points)
  if (existing) return existing
  const request = (async () => {
    const storageKey = `mohang-road-route:${points}`
    try {
      const cached = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as { savedAt: number; route: RoadRoute } | null
      if (cached?.route?.path?.length && Date.now() - cached.savedAt < 7 * 24 * 60 * 60 * 1000) return cached.route
    } catch { /* refresh invalid cache */ }
    try {
      const response = await fetch(apiUrl(`/api/naver/route?points=${encodeURIComponent(points)}`))
      if (!response.ok) return null
      const route = await response.json() as RoadRoute
      if (!route.path?.length) return null
      try { localStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), route })) } catch { /* storage is optional */ }
      return route
    } catch { return null }
  })()
  roadRouteRequests.set(points, request)
  return request
}

function PlaceLookup({ stop }: { stop: Stop }) {
  const [result, setResult] = useState<{ title: string; roadAddress?: string; link?: string } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const district = stop.description.match(/부산(?:광역시)?\s+([가-힣]+(?:구|군))/)?.[1] ?? ''
  const lookupQuery = ['부산', district, stop.title].filter(Boolean).join(' ')
  const lookup = async () => {
    setStatus('loading')
    try {
      const params = new URLSearchParams({
        query: lookupQuery,
        title: stop.title,
      })
      if (Number.isFinite(stop.latitude)) params.set('lat', String(stop.latitude))
      if (Number.isFinite(stop.longitude)) params.set('lng', String(stop.longitude))
      const response = await fetch(apiUrl(`/api/naver/local?${params}`))
      if (!response.ok) throw new Error('lookup-failed')
      const data = await response.json() as { items?: Array<{ title: string; roadAddress?: string; link?: string }> }
      setResult(data.items?.[0] ?? null)
      setStatus(data.items?.length ? 'idle' : 'error')
    } catch { setStatus('error') }
  }
  return <div className="place-lookup"><button onClick={lookup} disabled={status === 'loading'}>{status === 'loading' ? '확인 중…' : '네이버 최신정보 확인'}</button><a href={result?.link || `https://map.naver.com/p/search/${encodeURIComponent(lookupQuery)}`} target="_blank" rel="noreferrer"><ExternalLink size={12} /> 네이버지도</a>{result && <small data-no-translate>{result.title}{result.roadAddress ? ` · ${result.roadAddress}` : ''}</small>}{status === 'error' && <small>추천 위치 주변에서 상호가 일치하는 장소를 찾지 못했습니다. 지도 검색 결과를 직접 확인해 주세요.</small>}</div>
}

function iconFor(category: string) {
  if (category === '맛집') return <Utensils size={15} />
  if (category === '카페') return <Coffee size={15} />
  if (category === '교통') return <TrainFront size={15} />
  if (category === '숙소') return <Home size={15} />
  return <MapPin size={15} />
}

const isOfficialModelRestaurant = (stop: Stop) => stop.source === '부산광역시 모범음식점'

function OfficialRestaurantBadge() {
  return <span className="official-restaurant-badge"><ShieldCheck size={12} /> 부산시 모범음식점</span>
}

function Progress({ current, total, label }: { current: number; total: number; label: React.ReactNode }) {
  return <div className="step-progress"><span>{label}</span><div>{Array.from({ length: total }, (_, i) => <i key={i} className={i < current ? 'active' : ''} />)}</div><small>{current}/{total}</small></div>
}

function Avatar({ member, compact }: { member: AppState['members'][number]; compact?: boolean }) {
  return <span className={`avatar ${compact ? 'compact' : ''}`} style={{ background: member.color }}><UserRound size={compact ? 14 : 19} />{member.host && !compact && <i>★</i>}</span>
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('root')
  if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}
