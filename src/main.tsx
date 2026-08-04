'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ChevronRight, ChevronUp, CircleDollarSign,
  Clock3, Coffee, Compass, Copy, ExternalLink, Home, Map, MapPin, MessageCircle,
  RotateCcw, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TrainFront, Trash2,
  UserRound, UsersRound, Utensils, Vote, WalletCards, X,
} from 'lucide-react'
import { courses, demoPreferences, foods, initialState, moods, themes } from './data'
import { aggregateThemes, allPreferencesComplete, formatPrice, recommendCourses, tallyVotes } from './logic'
import { clearRoomToken, createLiveRoom, deleteLiveRoom, fetchLiveItinerary, fetchLiveRecommendations, fetchLiveRoom, joinLiveRoom, resolveLiveVote, saveLiveItinerary, saveLivePreference, saveRoomToken, submitLiveVote } from './live'
import type { LiveSnapshot } from './live'
import type { AppState, Course, Preference, Stop } from './types'
import './styles.css'

const STORAGE_KEY = 'modu-trip-state-v1'
const EVENT_KEY = 'modu-trip-anonymous-events-v1'

type AnonymousEvent = { name: string; at: string }

const toggleSelection = (selected: string[], value: string) => selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
const asSelection = (value: string[] | string | undefined) => Array.isArray(value) ? value : value ? [value] : []
const normalizePreference = (preference: Preference | undefined): Preference | undefined => preference ? {
  ...preference,
  food: asSelection(preference.food),
  mood: asSelection(preference.mood),
} : undefined

function track(name: string) {
  try {
    const events = JSON.parse(localStorage.getItem(EVENT_KEY) ?? '[]') as AnonymousEvent[]
    localStorage.setItem(EVENT_KEY, JSON.stringify([...events.slice(-49), { name, at: new Date().toISOString() }]))
  } catch {
    // 체험은 분석 기록에 실패해도 계속 진행됩니다.
  }
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
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

export function App({ mode = 'landing' }: { mode?: 'landing' | 'demo' }) {
  const [liveRoomId] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('room') ?? '')
  if (liveRoomId) return <LiveRoomApp roomId={liveRoomId} />
  const isDemo = mode === 'demo'
  const [state, setState] = useState<AppState>(() => isDemo
    ? { ...initialState, trip: { ...initialState.trip }, members: initialState.members.map((member) => ({ ...member })), step: 'create' }
    : { ...loadState(), step: 'home' })
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0].id)
  const [finalTab, setFinalTab] = useState<'schedule' | 'map' | 'booking'>('schedule')
  const recommendedCourses = useMemo(() => recommendCourses(courses, state.members), [state.members])
  const selectedCourse = recommendedCourses.find((course) => course.id === selectedCourseId) ?? recommendedCourses[0]

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state])
  useEffect(() => { track('landing_view') }, [])

  const update = (patch: Partial<AppState>) => setState((current) => ({ ...current, ...patch }))
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ ...initialState, trip: { ...initialState.trip }, members: initialState.members.map((member) => ({ ...member })), step: isDemo ? 'create' : 'home' })
    setSelectedCourseId(courses[0].id)
  }

  const headerBack: Partial<Record<AppState['step'], AppState['step']>> = {
    create: 'home', room: 'create', preferences: 'room', analysis: 'room',
    courses: 'analysis', vote: 'courses', final: 'vote',
  }

  return (
    <div className={`app-shell ${state.step === 'home' ? 'landing-mode' : ''}`}>
      <header className="app-header">
        {state.step !== 'home' ? (
          <button className="icon-button" aria-label="뒤로 가기" onClick={() => update({ step: headerBack[state.step] ?? 'home' })}>
            <ArrowLeft size={21} />
          </button>
        ) : <div className="brand-mark">ㅁ</div>}
        <div className="header-title">{state.step === 'home' ? '모두의 여행' : stepTitle[state.step]}</div>
        {state.step !== 'home' && (isDemo
          ? <a className="demo-home-link" href="/"><Home size={15} /> 랜딩</a>
          : <button className="icon-button subtle" aria-label="처음부터 다시 시작" onClick={reset}><RotateCcw size={18} /></button>)}
      </header>

      <main>
        {state.step === 'home' && <HomeScreen />}
        {state.step === 'create' && <CreateTrip state={state} setState={setState} />}
        {state.step === 'room' && <Room state={state} setState={setState} />}
        {state.step === 'preferences' && <Preferences state={state} setState={setState} />}
        {state.step === 'analysis' && <Analysis state={state} onNext={() => update({ step: 'courses' })} />}
        {state.step === 'courses' && <Courses courses={recommendedCourses} selected={selectedCourse} setSelected={(course) => setSelectedCourseId(course.id)} onVote={() => update({ step: 'vote' })} />}
        {state.step === 'vote' && <Voting courses={recommendedCourses} state={state} setState={setState} />}
        {state.step === 'final' && <FinalTrip courses={recommendedCourses} state={state} setState={setState} tab={finalTab} setTab={setFinalTab} />}
      </main>
    </div>
  )
}

const stepTitle: Record<AppState['step'], string> = {
  home: '모두의 여행', create: '여행 만들기', room: '여행방', preferences: '내 취향',
  analysis: '우리 취향', courses: '추천 코스', vote: '코스 투표', final: '최종 여행',
}

function LiveRoomApp({ roomId }: { roomId: string }) {
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
  const [itinerary, setItinerary] = useState<Stop[][] | null>(null)
  const [editingStop, setEditingStop] = useState<{ day: number; index: number } | null>(null)
  const [itinerarySaving, setItinerarySaving] = useState(false)
  const [showFinalRoute, setShowFinalRoute] = useState(false)
  const [expandedCourseId, setExpandedCourseId] = useState('')

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

  const requester = snapshot?.members.find((member) => member.id === snapshot.requesterMemberId)
  const allJoined = Boolean(snapshot && snapshot.members.length === snapshot.room.expectedMembers)
  const allReady = Boolean(snapshot && allJoined && snapshot.members.every((member) => member.preferenceComplete))
  const recommended = useMemo(() => snapshot && routeCourses ? recommendCourses(routeCourses, snapshot.members) : [], [routeCourses, snapshot])
  const availableCourses = snapshot?.room.voteRound === 2
    ? recommended.filter((course) => snapshot.room.runoffCourseIds.includes(course.id))
    : recommended
  const finalCourse = recommended.find((course) => course.id === snapshot?.room.finalCourseId)

  const loadRecommendations = async () => {
    setRecommendationLoading(true); setRecommendationError('')
    try {
      const result = await fetchLiveRecommendations(roomId)
      setRouteCourses(result.courses)
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

  const join = async () => {
    if (!name.trim()) return
    setJoining(true); setError('')
    try {
      const result = await joinLiveRoom(roomId, name.trim())
      saveRoomToken(roomId, result.token)
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
    const invite = `${window.location.origin}/demo?room=${roomId}`
    try { await navigator.clipboard.writeText(invite) } catch { window.prompt('아래 초대 링크를 복사해 주세요.', invite) }
    setCopied(true); window.setTimeout(() => setCopied(false), 1600)
  }

  const removeRoom = async () => {
    if (!window.confirm('이 여행방을 삭제할까요? 참여자 취향과 투표도 모두 삭제되며 복구할 수 없습니다.')) return
    setDeleting(true); setError('')
    try {
      await deleteLiveRoom(roomId)
      clearRoomToken(roomId)
      window.location.assign('/demo')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '여행방을 삭제하지 못했습니다.')
      setDeleting(false)
    }
  }

  const vote = async () => {
    if (!selectedCourseId) return
    setWorking(true); setError('')
    try { await submitLiveVote(roomId, selectedCourseId); setSelectedCourseId(''); await refresh() }
    catch (reason) { setError(reason instanceof Error ? reason.message : '투표를 저장하지 못했습니다.') }
    finally { setWorking(false) }
  }

  const resolve = async () => {
    setWorking(true); setError('')
    try { await resolveLiveVote(roomId); await refresh() }
    catch (reason) { setError(reason instanceof Error ? reason.message : '투표 결과를 확정하지 못했습니다.') }
    finally { setWorking(false) }
  }

  const persistItinerary = async (next: Stop[][]) => {
    setItinerarySaving(true); setError('')
    try { await saveLiveItinerary(roomId, next); setItinerary(next) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '경로를 저장하지 못했습니다.') }
    finally { setItinerarySaving(false) }
  }

  const moveStop = (day: number, index: number, direction: -1 | 1) => {
    const source = itinerary ?? finalCourse?.days
    if (!source) return
    const target = index + direction
    if (target < 0 || target >= source[day].length) return
    const next = source.map((items) => items.map((item) => ({ ...item })))
    const times = next[day].map((item) => item.time)
    ;[next[day][index], next[day][target]] = [next[day][target], next[day][index]]
    next[day] = next[day].map((item, position) => ({ ...item, time: times[position] }))
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

  if (loading) return <div className="app-shell"><main className="live-state"><Sparkles /><b>여행방을 불러오는 중이에요</b></main></div>
  if (!snapshot) return <div className="app-shell"><main className="live-state"><Clock3 /><h2>여행방을 열 수 없어요</h2><p>{error}</p><a className="primary-button" href="/demo">새 여행방 만들기</a></main></div>

  const expires = new Date(snapshot.room.expiresAt * 1000).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const voteCounts = Object.values(snapshot.votes).reduce<Record<string, number>>((counts, id) => ({ ...counts, [id]: (counts[id] ?? 0) + 1 }), {})
  const roomControls = <>
    <section className="live-card invite-card"><div><b>친구 초대 링크</b><span>인증정보가 포함되지 않은 안전한 링크예요.</span></div><button onClick={copyInvite}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? '복사됨' : '링크 복사'}</button></section>
    <section className="room-management" aria-label="여행방 관리"><a href="/demo"><RotateCcw size={16} /> 새 여행방 만들기</a>{requester?.host && <button disabled={deleting} onClick={removeRoom}><Trash2 size={16} /> {deleting ? '삭제 중…' : '현재 여행방 삭제'}</button>}</section>
  </>

  return <div className="app-shell live-room-shell">
    <header className="app-header"><a className="icon-button" href="/demo" aria-label="데모 홈"><Home size={18} /></a><div className="header-title">실시간 여행방</div><span className="live-code">{roomId}</span></header>
    <main className="page">
      <div className="trip-summary live-trip"><span className="eyebrow dark"><CalendarDays size={14} /> {snapshot.room.startDate}</span><h2>{snapshot.room.name}</h2><div className="trip-meta"><span><MapPin size={15} /> {snapshot.room.origin} → {snapshot.room.destination}</span><span><UsersRound size={15} /> {snapshot.members.length}/{snapshot.room.expectedMembers}명</span></div></div>
      <div className="expiry-notice"><Clock3 size={16} /><span><b>{expires}</b>까지 이용할 수 있으며 이후 자동 삭제됩니다.</span></div>
      {error && <div className="form-error" role="alert">{error}</div>}

      {!snapshot.requesterMemberId ? <section className="live-card join-card"><span className="result-icon"><UsersRound /></span><h2>친구들과 여행을 준비해요</h2><p>연락처 없이 별명만 입력하면 참여할 수 있어요.</p><label>내 별명<input maxLength={20} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void join()} placeholder="예: 민지" /></label><button className="primary-button" disabled={!name.trim() || joining} onClick={join}>{joining ? '참여하는 중…' : '여행방 참여하기'} <ArrowRight size={18} /></button></section> : <>
        {!finalCourse && roomControls}
        {!finalCourse && <section className="live-section"><div className="section-title-row"><h3>함께 가는 친구</h3><span className="count-badge">{snapshot.members.length}/{snapshot.room.expectedMembers}</span></div><div className="member-list">{snapshot.members.map((member) => <div className="member-row" key={member.id}><Avatar member={member} /><div className="member-info"><b>{member.name}{member.id === snapshot.requesterMemberId && <small>나</small>}</b><span>{member.preferenceComplete ? '취향 입력 완료' : '취향 입력 대기 중'}</span></div><span className={member.preferenceComplete ? 'complete-badge' : 'waiting-badge'}>{member.preferenceComplete ? <><Check size={13} /> 완료</> : '대기'}</span></div>)}</div>{!allJoined && <div className="lock-note"><UsersRound size={18} /><div><b>{snapshot.room.expectedMembers - snapshot.members.length}명을 더 기다리고 있어요</b><span>위 초대 링크를 친구에게 보내 주세요.</span></div></div>}</section>}

        {requester && !requester.preferenceComplete && <section className="live-card live-preferences"><div className="section-heading"><h2>{requester.name}님의 여행 취향</h2><p>마음에 드는 항목을 여러 개 골라 주세요.</p></div><PreferenceGroup title="가장 가고 싶은 장소" options={themes} selected={preference.themes} onSelect={toggleTheme} icons /><PlaceCountControl value={preference.placeCount} onChange={(placeCount) => setPreference((current) => ({ ...current, placeCount }))} /><PreferenceGroup title="좋아하는 음식 · 복수 선택" options={foods} selected={preference.food} onSelect={(value) => setPreference((current) => ({ ...current, food: toggleSelection(current.food, value) }))} /><PreferenceGroup title="원하는 분위기 · 복수 선택" options={moods} selected={preference.mood} onSelect={(value) => setPreference((current) => ({ ...current, mood: toggleSelection(current.mood, value) }))} /><button className="primary-button" disabled={preference.themes.length === 0 || saving} onClick={savePreference}>{saving ? '저장 중…' : '취향 저장하기'} <Check size={18} /></button></section>}

        {!allReady && requester?.preferenceComplete && <div className="lock-note live-wait"><Sparkles size={18} /><div><b>모두의 취향을 기다리는 중이에요</b><span>모든 인원이 참여하고 입력하면 추천 코스가 공개됩니다.</span></div></div>}

        {allReady && recommendationLoading && <div className="lock-note live-wait"><Sparkles size={18} /><div><b>{snapshot.room.origin} → {snapshot.room.destination} 주변을 찾고 있어요</b><span>실제 장소 좌표와 이동 거리를 비교해 가까운 코스를 구성합니다.</span></div></div>}
        {allReady && recommendationError && <div className="live-card recommendation-error"><b>경로 기반 추천을 만들지 못했어요</b><span>{recommendationError}</span><button className="secondary-button" onClick={() => { setRecommendationError(''); void loadRecommendations() }}>다시 추천하기</button></div>}
        {allReady && routeCourses && !finalCourse && <section className="live-section"><div className="section-heading"><h2>{snapshot.room.voteRound === 2 ? '공동 1위 결선투표' : '우리 경로에 맞는 코스 3가지'}</h2><p>{snapshot.room.voteRound === 2 ? '동률인 코스 중 하나를 다시 골라 주세요.' : `${snapshot.room.origin}에서 ${snapshot.room.destination}까지 가까운 실제 장소를 우선했어요.`}</p></div><div className="live-course-list">{availableCourses.map((course) => <div key={course.id}><CourseCard course={course} expanded={expandedCourseId === course.id} onToggle={() => setExpandedCourseId((current) => current === course.id ? '' : course.id)} />{!snapshot.hasVoted && <button className={`live-vote-choice ${selectedCourseId === course.id ? 'selected' : ''}`} onClick={() => setSelectedCourseId(course.id)}>{selectedCourseId === course.id && <Check size={15} />} 이 코스에 투표</button>}</div>)}</div>{snapshot.hasVoted && !snapshot.allVoted && <div className="lock-note"><Vote size={18} /><div><b>내 투표를 저장했어요</b><span>모두 투표할 때까지 선택은 공개되지 않습니다.</span></div></div>}{!snapshot.hasVoted && <button className="primary-button sticky-action" disabled={!selectedCourseId || working} onClick={vote}>익명 투표 보내기 <Vote size={18} /></button>}{snapshot.allVoted && <><div className="result-list">{availableCourses.map((course) => <div key={course.id}><span>{course.emoji}</span><div><b>{course.title}</b><div className="vote-bar"><i style={{ width: `${((voteCounts[course.id] ?? 0) / snapshot.members.length) * 100}%` }} /></div></div><strong>{voteCounts[course.id] ?? 0}표</strong></div>)}</div><button className="primary-button sticky-action" disabled={working} onClick={resolve}>{snapshot.room.voteRound === 1 ? '결과 확인하기' : '최종 코스 확정하기'} <ArrowRight size={18} /></button></>}</section>}

        {finalCourse && !showFinalRoute && <section className="live-section"><button className="confirmed-route-card" onClick={() => setShowFinalRoute(true)}><span className="result-icon"><Check /></span><span><small>취향 분석과 투표가 끝났어요</small><b>확정된 경로 보기</b><em>{finalCourse.title} · 취향 일치 {finalCourse.match}%</em></span><ArrowRight size={20} /></button></section>}
        {finalCourse && showFinalRoute && <section className="live-section"><div className="final-hero live-final"><span className="eyebrow dark"><Check size={14} /> 투표로 확정된 당일치기 여행</span><h2>{finalCourse.title}</h2><p>{snapshot.room.startDate} · {snapshot.members.length}명 · 취향 일치 {finalCourse.match}%</p></div><div className="final-route-heading"><Map size={16} /><b>최종 경로</b></div><RouteMap stops={(itinerary ?? finalCourse.days)[finalDay]} />{(itinerary ?? finalCourse.days).length > 1 ? <div className="day-switch">{(itinerary ?? finalCourse.days).map((_, index) => <button key={index} className={finalDay === index ? 'active' : ''} onClick={() => { setFinalDay(index); setEditingStop(null) }}>DAY {index + 1}</button>)}</div> : <div className="single-day-label"><CalendarDays size={15} /> 당일 일정</div>}{requester?.host && <div className="route-edit-notice"><Sparkles size={15} /><span>화살표로 순서를 바꾸거나 `장소 변경`으로 실제 장소를 검색할 수 있어요.{itinerarySaving ? ' 저장 중…' : ''}</span></div>}<Timeline stops={(itinerary ?? finalCourse.days)[finalDay]} onMove={requester?.host ? (index, direction) => moveStop(finalDay, index, direction) : undefined} onEdit={requester?.host ? (index) => setEditingStop({ day: finalDay, index }) : undefined} disabled={itinerarySaving} />{editingStop?.day === finalDay && <RoutePlaceEditor current={(itinerary ?? finalCourse.days)[finalDay][editingStop.index]} onCancel={() => setEditingStop(null)} onSelect={replaceStop} />}</section>}
        {finalCourse && <div className="final-room-controls">{roomControls}</div>}
      </>}
    </main>
  </div>
}

function HomeScreen() {
  const [interest, setInterest] = useState<'yes' | 'not-yet' | null>(() => {
    if (typeof localStorage === 'undefined') return null
    const saved = localStorage.getItem('modu-trip-landing-interest-v1')
    return saved === 'yes' || saved === 'not-yet' ? saved : null
  })
  const answer = (value: 'yes' | 'not-yet') => {
    setInterest(value)
    localStorage.setItem('modu-trip-landing-interest-v1', value)
    track(value === 'yes' ? 'landing_interest_yes' : 'landing_interest_not_yet')
  }
  return (
    <div className="simple-landing">
      <section className="simple-hero">
        <span className="eyebrow"><Sparkles size={14} /> 친구 취향으로 완성하는 여행</span>
        <h1>여행 계획,<br /><em>모두의 취향</em>에서 시작해요.</h1>
        <p>각자 가고 싶은 곳과 여행 스타일을 고르면, 친구 모두가 만족할 코스를 정리하고 투표로 결정하는 여행 계획 서비스입니다.</p>
        <div className="concept-flow" aria-label="모두의 여행 이용 개요">
          <article><span><UsersRound size={20} /></span><div><b>취향을 모으고</b><small>맛집·카페·사진·산책 등 각자의 선택</small></div></article>
          <i><ArrowRight size={17} /></i>
          <article><span><Sparkles size={20} /></span><div><b>코스를 만들고</b><small>공통점과 차이를 반영한 여행 일정</small></div></article>
          <i><ArrowRight size={17} /></i>
          <article><span><Vote size={20} /></span><div><b>함께 결정해요</b><small>눈치 보지 않는 투표로 최종 선택</small></div></article>
        </div>
      </section>

      <section className="interest-survey" aria-labelledby="interest-title">
        <div><span>한 가지만 알려주세요</span><h2 id="interest-title">이런 서비스가 있다면 사용해보고 싶나요?</h2><p>개인정보나 연락처는 받지 않습니다. 선택한 답변은 이 브라우저에만 저장됩니다.</p></div>
        <div className="survey-actions">
          <button className={interest === 'yes' ? 'selected' : ''} onClick={() => answer('yes')}><Check size={18} /> 네, 사용해보고 싶어요</button>
          <button className={interest === 'not-yet' ? 'selected' : ''} onClick={() => answer('not-yet')}><CircleDollarSign size={18} /> 아직은 잘 모르겠어요</button>
        </div>
        {interest && <div className="survey-thanks" role="status"><Check size={16} /><span>답변해주셔서 고마워요. 개인정보는 전송되지 않았습니다.</span></div>}
      </section>

      <footer className="simple-footer"><div><span className="brand-mark">ㅁ</span><b>모두의 여행</b></div><p>친구들의 취향을 모아 완성하는 여행 계획 서비스</p><small>© 2026 모두의 여행 팀</small></footer>
    </div>
  )
}

function CreateTrip({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const setTrip = (field: string, value: string) => setState((s) => ({ ...s, trip: { ...s.trip, [field]: value } }))
  const [hostName, setHostName] = useState('민지')
  const [expectedMembers, setExpectedMembers] = useState(4)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [originSelected, setOriginSelected] = useState(false)
  const [destinationSelected, setDestinationSelected] = useState(false)
  const createRoom = async () => {
    setCreating(true); setError('')
    try {
      const result = await createLiveRoom(state.trip, hostName, expectedMembers)
      saveRoomToken(result.roomId, result.token)
      window.location.assign(`/demo?room=${result.roomId}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '여행방을 만들지 못했습니다.')
      setCreating(false)
    }
  }
  return (
    <section className="page">
      <Progress current={1} total={4} label="여행 기본 정보" />
      <div className="section-heading">
        <h2>어디서 어디로 떠날까요?</h2>
        <p>출발 장소와 도착 장소를 직접 입력해 주세요.</p>
      </div>
      <div className="form-card">
        <label>여행방 이름<input value={state.trip.name} onChange={(e) => setTrip('name', e.target.value)} /></label>
        <div className="route-input-heading"><b>여행 경로</b><button type="button" onClick={() => { setTrip('origin', ''); setTrip('destination', ''); setOriginSelected(false); setDestinationSelected(false) }}>입력 지우기</button></div>
        <div className="field-row route-fields">
          <LocationSearchField label="출발 장소" placeholder="식당·숙소·역 이름 검색" value={state.trip.origin} onChange={(value) => setTrip('origin', value)} selected={originSelected} onSelectedChange={setOriginSelected} />
          <ArrowRight size={19} className="field-arrow" />
          <LocationSearchField label="도착 장소" placeholder="식당·숙소·역 이름 검색" value={state.trip.destination} onChange={(value) => setTrip('destination', value)} selected={destinationSelected} onSelectedChange={setDestinationSelected} />
        </div>
        <small className="route-data-note">검색 결과에서 실제 장소를 선택해 주세요. 현재 부산 지역 장소를 지원합니다.</small>
        <label>여행 날짜<input type="date" value={state.trip.startDate} onChange={(e) => { setTrip('startDate', e.target.value); setTrip('endDate', e.target.value) }} /></label>
        <label>이동수단
          <div className="segmented">
            {['대중교통', '자동차'].map((item) => <button className={state.trip.transport === item ? 'active' : ''} onClick={() => setTrip('transport', item)} key={item}>{item === '대중교통' ? <TrainFront size={17} /> : <Compass size={17} />}{item}</button>)}
          </div>
        </label>
        <label>내 별명<input maxLength={20} value={hostName} onChange={(e) => setHostName(e.target.value)} /></label>
        <label>함께 갈 인원
          <div className="segmented member-count">
            {[1, 2, 3, 4, 5, 6].map((count) => <button type="button" className={expectedMembers === count ? 'active' : ''} onClick={() => setExpectedMembers(count)} key={count}>{count}명</button>)}
          </div>
        </label>
        <div className="expiry-notice"><Clock3 size={16} /><span>여행방과 별명·취향·투표 데이터는 생성일로부터 <b>7일 후 자동 삭제</b>됩니다.</span></div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button sticky-action" disabled={creating || !originSelected || !destinationSelected || !state.trip.startDate || !hostName.trim()} onClick={createRoom}>{creating ? '여행방 만드는 중…' : '여행방 만들기'} <ArrowRight size={18} /></button>
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
        const response = await fetch(`/api/naver/local?query=${encodeURIComponent(`부산 ${value.trim()}`)}`, { signal: controller.signal })
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
    {open && items.length > 0 && <div className="location-results" role="listbox">{items.map((item, index) => <button type="button" role="option" key={`${item.title}-${index}`} onClick={() => choose(item)}><MapPin size={15} /><span><b>{item.title}</b><small>{item.roadAddress || item.address || '주소 정보 없음'}</small></span></button>)}</div>}
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

function RoutePlaceEditor({ current, onSelect, onCancel }: { current: Stop; onSelect: (place: LocationSuggestion) => void; onCancel: () => void }) {
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
        const response = await fetch(`/api/naver/local?query=${encodeURIComponent(`부산 ${query.trim()}`)}`, { signal: controller.signal })
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
  return <section className="route-place-editor"><div className="route-editor-title"><div><b>장소 변경</b><span>{current.title} 대신 방문할 실제 장소를 검색하세요.</span></div><button onClick={onCancel}><X size={16} /></button></div><span className="route-editor-search"><MapPin size={16} /><input autoFocus type="search" autoComplete="off" placeholder="식당·카페·숙소 이름 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></span>{loading && <small>검색 중…</small>}{message && <small className="error">{message}</small>}<div className="route-editor-results">{items.map((item, index) => <button key={`${item.title}-${index}`} onClick={() => onSelect(item)}><b>{item.title}</b><span>{item.roadAddress || item.address}</span></button>)}</div></section>
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
  const member = state.members.find((m) => m.id === state.activeMemberId)!
  const [form, setForm] = useState<Preference>(normalizePreference(member.preference) ?? { themes: [], placeCount: 4, food: [], mood: [] })
  const toggle = (theme: string) => setForm((f) => ({ ...f, themes: toggleSelection(f.themes, theme) }))
  const save = () => setState((s) => ({ ...s, step: 'room', members: s.members.map((m) => m.id === member.id ? { ...m, preference: form } : m) }))
  return (
    <section className="page">
      <Progress current={2} total={4} label={`${member.name}님의 취향`} />
      <div className="profile-heading"><Avatar member={member} /><div><h2>{member.name}님은 어떤 여행이 좋아요?</h2><p>마음에 드는 항목을 여러 개 골라주세요.</p></div></div>
      <PreferenceGroup title="가장 가고 싶은 장소" options={themes} selected={form.themes} onSelect={toggle} icons />
      <PlaceCountControl value={form.placeCount} onChange={(placeCount) => setForm((current) => ({ ...current, placeCount }))} />
      <PreferenceGroup title="좋아하는 음식 · 복수 선택" options={foods} selected={form.food} onSelect={(value) => setForm((f) => ({ ...f, food: toggleSelection(f.food, value) }))} />
      <PreferenceGroup title="원하는 분위기 · 복수 선택" options={moods} selected={form.mood} onSelect={(value) => setForm((f) => ({ ...f, mood: toggleSelection(f.mood, value) }))} />
      <button className="primary-button sticky-action" disabled={form.themes.length === 0} onClick={save}>취향 저장하기 <Check size={18} /></button>
    </section>
  )
}

function PreferenceGroup({ title, options, selected, onSelect, icons }: { title: string; options: string[]; selected: string[]; onSelect: (value: string) => void; icons?: boolean }) {
  const iconMap: Record<string, React.ReactNode> = { '맛집': <Utensils />, '감성 카페': <Coffee />, '사진 명소': <Sparkles />, '액티비티': <TrainFront />, '역사·문화': <Home />, '쇼핑': <WalletCards /> }
  return <div className="preference-group"><h3>{title}</h3><div className={icons ? 'choice-grid' : 'choice-chips'}>{options.map((option) => <button key={option} className={selected.includes(option) ? 'selected' : ''} onClick={() => onSelect(option)}>{icons && iconMap[option]}{option}</button>)}</div></div>
}

function PlaceCountControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const ranges = [{ label: '1~2곳', value: 2, caption: '가볍게' }, { label: '3~4곳', value: 4, caption: '적당히' }, { label: '5~6곳', value: 6, caption: '알차게' }]
  return <div className="preference-group"><h3>방문 장소 수</h3><div className="place-count-ranges">{ranges.map((range) => <button type="button" key={range.value} className={value === range.value ? 'selected' : ''} onClick={() => onChange(range.value)}><b>{range.label}</b><span>{range.caption}</span></button>)}</div><small className="place-count-note">출발·도착 장소는 개수에서 제외해요.</small></div>
}

function Analysis({ state, onNext }: { state: AppState; onNext: () => void }) {
  const aggregated = aggregateThemes(state.members)
  const top = aggregated[0]
  return (
    <section className="page analysis-page">
      <Progress current={3} total={4} label="그룹 취향 분석" />
      <div className="section-heading center"><span className="result-icon"><Sparkles /></span><h2>우리 취향이 모였어요!</h2><p>4명의 선택에서 공통점과 특별한 취향을 찾았어요.</p></div>
      <div className="taste-chart">
        {aggregated.map(({ theme, count }, index) => (
          <div className="taste-row" key={theme}>
            <div><span>{index === 0 ? '🏆' : index === 1 ? '✨' : '·'}</span><b>{theme}</b><small>{count}명 선택</small></div>
            <div className="taste-bar"><i style={{ width: `${count / state.members.length * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="insight-card"><div className="insight-title"><Sparkles size={17} /> 분석 한 줄</div><p><b>{top?.theme}</b>은 모두가 좋아하고, 감성 카페와 사진도 인기예요. 현우의 액티비티와 서준의 역사 취향은 특별 옵션으로 챙겼어요.</p></div>
      <button className="primary-button sticky-action" onClick={onNext}>맞춤 코스 3개 보기 <ArrowRight size={18} /></button>
    </section>
  )
}

function Courses({ courses, selected, setSelected, onVote }: { courses: Course[]; selected: Course; setSelected: (c: Course) => void; onVote: () => void }) {
  const [detail, setDetail] = useState(false)
  return (
    <section className="page courses-page">
      <Progress current={4} total={4} label="맞춤 코스 추천" />
      <div className="section-heading"><h2>우리에게 맞는 3가지 코스</h2><p><b>60%는 함께</b>, 나머지 40%는 취향에 따라 달라요.</p></div>
      <div className="course-tabs">
        {courses.map((course) => <button key={course.id} className={selected.id === course.id ? 'active' : ''} onClick={() => { setSelected(course); setDetail(false) }}><span>{course.emoji}</span>{course.title.split(' ')[0]}</button>)}
      </div>
      <CourseCard course={selected} expanded={detail} onToggle={() => setDetail(!detail)} />
      <div className="common-note"><span>60%</span><div><b>세 코스가 함께 가는 곳</b><p>감천문화마을 · 자갈치시장 · 전포카페거리 · 광안리해수욕장</p></div></div>
      <div className="data-notice"><ShieldCheck size={15} /><span>공식 관광정보를 바탕으로 구성했으며, 운영시간·요금·교통은 네이버지도에서 방문 전에 다시 확인해 주세요.</span></div>
      <button className="primary-button sticky-action" onClick={onVote}>친구들과 투표하기 <Vote size={18} /></button>
    </section>
  )
}

function CourseCard({ course, expanded, onToggle }: { course: Course; expanded: boolean; onToggle: () => void }) {
  return (
    <article className="course-card">
      <div className="course-hero">
        <span className="course-emoji">{course.emoji}</span>
        <div><span className="course-label">{course.label}</span><h3>{course.title}</h3><p>{course.description}</p></div>
        <div className="match-score"><b>{course.match}%</b><span>취향 일치</span></div>
      </div>
      <div className="tag-row">{course.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
      <div className="course-stats"><span><WalletCards size={17} /> 1인 {formatPrice(course.totalPrice)}</span><span><TrainFront size={17} /> 이동 {course.travelMinutes}분</span></div>
      <button className="outline-button" onClick={onToggle}>{expanded ? '상세 경로 접기' : '상세 경로 보기'} <ChevronRight size={17} /></button>
      {expanded && <div className="mini-timeline">{course.days[0].map((stop) => <div key={stop.time + stop.title}><time>{stop.time}</time><i className={stop.shared ? 'shared' : ''} /><span><b>{stop.title}</b><small>{stop.shared ? '공통 일정' : '이 코스만의 일정'}</small></span></div>)}</div>}
    </article>
  )
}

function Voting({ courses, state, setState }: { courses: Course[]; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
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
  }
  return (
    <section className="page">
      <div className="vote-banner"><Vote /><div><b>{state.voteRound === 2 ? '공동 1위 결선투표' : '내 마음에 드는 코스는?'}</b><span>{state.voteRound === 2 ? '공동 1위 코스 중 하나를 다시 골라주세요.' : '모두 투표할 때까지 선택은 비공개예요.'}</span></div></div>
      {!allVoted ? <>
        <div className="voter-select"><span>지금 투표하는 친구</span><div>{state.members.map((member) => <button key={member.id} className={voterId === member.id ? 'active' : ''} disabled={Boolean(state.votes[member.id])} onClick={() => setVoterId(member.id)}><Avatar member={member} compact />{state.votes[member.id] && <Check size={12} />}</button>)}</div></div>
        <div className="vote-options">{voteCourses.map((course) => <button key={course.id} className={selectedId === course.id ? 'selected' : ''} onClick={() => setSelectedId(course.id)}><span className="course-emoji">{course.emoji}</span><div><small>{course.label} · 취향 {course.match}%</small><b>{course.title}</b><span>{course.tags.join(' · ')}</span></div><i>{selectedId === course.id && <Check size={16} />}</i></button>)}</div>
        <button className="secondary-button" onClick={fillVotes}>데모 투표 한 번에 채우기</button>
        <button className="primary-button sticky-action" disabled={!selectedId} onClick={submit}>{state.members.find((m) => m.id === voterId)?.name}님의 한 표 보내기 <Vote size={18} /></button>
      </> : <>
        <div className="section-heading center"><span className="result-icon coral"><Check /></span><h2>투표가 끝났어요!</h2><p>친구들의 선택을 지금 공개할게요.</p></div>
        <div className="result-list">{courses.map((course) => <div key={course.id} className={result.winners.includes(course.id) ? 'winner' : ''}><span>{course.emoji}</span><div><b>{course.title}</b><div className="vote-bar"><i style={{ width: `${((result.counts[course.id] ?? 0) / state.members.length) * 100}%` }} /></div></div><strong>{result.counts[course.id] ?? 0}표</strong></div>)}</div>
        {result.tied && <div className="safety-note"><b>공동 1위예요</b><span>{state.voteRound === 1 ? '공동 1위 코스만 남겨 결선투표를 진행해요.' : '결선도 동률이라 취향 일치율이 높은 코스를 추천해요.'}</span></div>}
        {result.tied && state.voteRound === 1
          ? <button className="primary-button sticky-action" onClick={startRunoff}>결선투표 시작하기 <Vote size={18} /></button>
          : <button className="primary-button sticky-action" onClick={finalize}>{result.tied ? '추천 코스로 확정하기' : '1위 코스로 확정하기'} <ArrowRight size={18} /></button>}
      </>}
    </section>
  )
}

function FinalTrip({ courses, state, setState, tab, setTab }: { courses: Course[]; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; tab: 'schedule' | 'map' | 'booking'; setTab: (t: 'schedule' | 'map' | 'booking') => void }) {
  const course = courses.find((c) => c.id === state.finalCourseId) ?? courses[0]
  const [day, setDay] = useState(0)
  const [schedule, setSchedule] = useState<Stop[][]>(() => course.days.map((items) => [...items]))
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [interest, setInterest] = useState<'beta' | 'interview' | null>(null)
  const reservable = course.days.flat().filter((stop) => stop.reservable)
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
  const answerFeedback = (value: 'up' | 'down') => {
    setFeedback(value)
    localStorage.setItem('modu-trip-feedback-v1', value)
    track(value === 'up' ? 'feedback_helpful' : 'feedback_not_helpful')
  }
  const chooseInterest = (value: 'beta' | 'interview') => {
    setInterest(value)
    localStorage.setItem('modu-trip-interest-v1', value)
    track(value === 'beta' ? 'beta_interest' : 'interview_interest')
  }
  return (
    <section className="final-page">
      <div className="final-hero">
        <span className="eyebrow dark"><Check size={14} /> 투표로 확정된 여행</span>
        <h2>{state.trip.destination}, 우리답게!</h2>
        <p>{course.title} · 취향 일치 {course.match}%</p>
        <div className="final-people">{state.members.map((m) => <Avatar key={m.id} member={m} compact />)}<span>{state.members.length}명이 함께</span></div>
      </div>
      <div className="final-tabs">
        <button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}><Clock3 size={17} />일정</button>
        <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}><Map size={17} />동선</button>
        <button className={tab === 'booking' ? 'active' : ''} onClick={() => setTab('booking')}><WalletCards size={17} />예약</button>
      </div>
      {tab === 'schedule' && <div className="final-content"><div className="day-switch"><button className={day === 0 ? 'active' : ''} onClick={() => setDay(0)}>DAY 1 <small>8.15 토</small></button><button className={day === 1 ? 'active' : ''} onClick={() => setDay(1)}>DAY 2 <small>8.16 일</small></button></div><Timeline stops={schedule[day]} onRemove={removeStop} /><button className="outline-button copy-plan" onClick={copyPlan}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? '일정을 복사했어요' : '전체 일정 복사하기'}</button></div>}
      {tab === 'map' && <div className="final-content"><RouteMap stops={schedule[day]} /><div className="map-summary"><b>DAY {day + 1} 이동 요약</b><span><TrainFront size={15} /> 예상 {day === 0 ? 72 : 46}분 · {schedule[day].length}개 장소</span></div><p className="map-disclaimer">표시된 선은 장소 순서를 나타냅니다. 실제 도보·대중교통 경로와 시간은 네이버지도에서 확인해 주세요.</p></div>}
      {tab === 'booking' && <div className="final-content"><div className="section-title-row"><h3>예약이 필요한 항목</h3><span className="count-badge">{state.booked.length}/{reservable.length}</span></div><div className="booking-list">{reservable.map((stop) => <div key={stop.title}><span className="booking-icon">{stop.category === '교통' ? <TrainFront /> : stop.category === '숙소' ? <Home /> : <Compass />}</span><div><small>{stop.category} · {stop.time}</small><b>{stop.title}</b><span>{formatPrice(stop.price)}</span></div>{state.booked.includes(stop.title) ? <span className="booked"><Check size={14} /> 완료</span> : <button onClick={() => book(stop.title)}>예약 연결</button>}</div>)}</div><div className="booking-notice">실제 결제는 진행되지 않는 MVP 시뮬레이션입니다.</div></div>}
      <div className="validation-panel">
        <section className="feedback-card">
          <span>30초만 도와주세요</span><h3>이 일정이 실제 여행 계획에 도움이 됐나요?</h3>
          <div><button className={feedback === 'up' ? 'selected' : ''} onClick={() => answerFeedback('up')}><ThumbsUp size={18} /> 도움 됐어요</button><button className={feedback === 'down' ? 'selected' : ''} onClick={() => answerFeedback('down')}><ThumbsDown size={18} /> 아쉬워요</button></div>
          {feedback && <p><Check size={14} /> 답변이 이 기기에 익명으로 저장됐어요.</p>}
        </section>
        <section className="interest-card">
          <span className="eyebrow dark"><Sparkles size={14} /> 다음 단계에 함께해요</span>
          <h3>모두의 여행을 더 먼저 만나보세요.</h3><p>연락처를 받지 않고 관심 의사만 확인합니다. 정식 모집 링크가 준비되면 이 화면에 연결할 예정이에요.</p>
          <div className="interest-actions"><button onClick={() => chooseInterest('beta')}><ExternalLink size={17} /> 베타 참여에 관심 있어요</button><button onClick={() => chooseInterest('interview')}><MessageCircle size={17} /> 15분 인터뷰에 관심 있어요</button></div>
          {interest && <div className="interest-confirm"><Check size={16} /><span>{interest === 'beta' ? '베타 참여' : '인터뷰 참여'} 관심을 표시했어요. 개인정보는 전송되지 않았습니다.</span></div>}
          <small><ShieldCheck size={14} /> 여행 정보와 응답은 현재 사용 중인 브라우저에만 저장됩니다.</small>
        </section>
      </div>
    </section>
  )
}

function Timeline({ stops, onRemove, onMove, onEdit, disabled }: { stops: Stop[]; onRemove?: (index: number) => void; onMove?: (index: number, direction: -1 | 1) => void; onEdit?: (index: number) => void; disabled?: boolean }) {
  if (stops.length === 0) return <div className="empty-schedule"><CalendarDays size={22} /><b>이 날짜의 일정이 비었어요.</b><span>처음부터 다시 시작하면 원래 추천 일정을 불러올 수 있어요.</span></div>
  return <div className="timeline">{stops.map((stop, index) => <div className="timeline-stop" key={`${stop.time}-${stop.title}-${index}`}><time>{stop.time}</time><div className="timeline-pin"><i className={stop.shared ? 'shared' : ''}>{iconFor(stop.category)}</i>{index < stops.length - 1 && <span />}</div><div className="stop-card"><div><small>{stop.category} · {stop.duration}</small><span className="stop-tools">{stop.shared && <em>공통</em>}{onMove && <><button disabled={disabled || index === 0} aria-label={`${stop.title} 위로 이동`} onClick={() => onMove(index, -1)}><ChevronUp size={14} /></button><button disabled={disabled || index === stops.length - 1} aria-label={`${stop.title} 아래로 이동`} onClick={() => onMove(index, 1)}><ChevronDown size={14} /></button></>}{onRemove && <button aria-label={`${stop.title} 일정에서 삭제`} onClick={() => onRemove(index)}><Trash2 size={14} /></button>}</span></div><b>{stop.title}</b><p>{stop.description}</p>{onEdit && <button className="replace-place-button" disabled={disabled} onClick={() => onEdit(index)}><MapPin size={13} /> 장소 변경</button>}<div className="stop-footer"><small>{stop.source ?? '운영자 검수'}{stop.verifiedAt ? ` · ${stop.verifiedAt} 확인` : ''}</small></div><PlaceLookup stop={stop} /></div></div>)}</div>
}

function RouteMap({ stops }: { stops: Stop[] }) {
  const container = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapUnavailable, setMapUnavailable] = useState(false)
  useEffect(() => {
    let cancelled = false
    const points = stops.filter((stop) => stop.latitude && stop.longitude)
    if (!container.current || points.length === 0) return
    const initialize = async () => {
      try {
        const config = await fetch('/api/naver/config').then((response) => response.json()) as { enabled: boolean; clientId?: string }
        if (!config.enabled || !config.clientId) throw new Error('not-configured')
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
        new maps.Polyline({ map, path: coords, strokeColor: '#1769aa', strokeWeight: 4, strokeOpacity: 0.8 })
        const bounds = new maps.LatLngBounds(); coords.forEach((coord: unknown) => bounds.extend(coord)); map.fitBounds(bounds, { top: 45, right: 30, bottom: 45, left: 30 })
        setMapReady(true)
      } catch { if (!cancelled) setMapUnavailable(true) }
    }
    initialize()
    return () => { cancelled = true }
  }, [stops])
  return <div className="route-map-wrap"><div ref={container} className={`route-map naver-map ${mapReady ? 'ready' : ''}`} />{!mapReady && <div className="route-map route-map-fallback"><div className="map-grid" /><div className="route-path" />{stops.slice(0, 5).map((stop, i) => <div key={stop.title} className={`map-stop stop-${i}`}><i>{i + 1}</i><span>{stop.title}</span></div>)}</div>}{mapUnavailable && <span className="map-fallback-note">네이버 지도 키를 설정하면 실제 지도가 표시됩니다.</span>}</div>
}

function PlaceLookup({ stop }: { stop: Stop }) {
  const [result, setResult] = useState<{ title: string; roadAddress?: string; link?: string } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const lookup = async () => {
    setStatus('loading')
    try {
      const response = await fetch(`/api/naver/local?query=${encodeURIComponent(`부산 ${stop.title}`)}`)
      if (!response.ok) throw new Error('lookup-failed')
      const data = await response.json() as { items?: Array<{ title: string; roadAddress?: string; link?: string }> }
      setResult(data.items?.[0] ?? null)
      setStatus(data.items?.length ? 'idle' : 'error')
    } catch { setStatus('error') }
  }
  return <div className="place-lookup"><button onClick={lookup} disabled={status === 'loading'}>{status === 'loading' ? '확인 중…' : '네이버 최신정보 확인'}</button><a href={result?.link || stop.placeUrl || `https://map.naver.com/p/search/${encodeURIComponent(stop.title)}`} target="_blank" rel="noreferrer"><ExternalLink size={12} /> 네이버지도</a>{result && <small>{result.title}{result.roadAddress ? ` · ${result.roadAddress}` : ''}</small>}{status === 'error' && <small>API 연결 전이거나 검색 결과가 없습니다. 지도에서 직접 확인해 주세요.</small>}</div>
}

function iconFor(category: string) {
  if (category === '맛집') return <Utensils size={15} />
  if (category === '카페') return <Coffee size={15} />
  if (category === '교통') return <TrainFront size={15} />
  if (category === '숙소') return <Home size={15} />
  return <MapPin size={15} />
}

function Progress({ current, total, label }: { current: number; total: number; label: string }) {
  return <div className="step-progress"><span>{label}</span><div>{Array.from({ length: total }, (_, i) => <i key={i} className={i < current ? 'active' : ''} />)}</div><small>{current}/{total}</small></div>
}

function Avatar({ member, compact }: { member: AppState['members'][number]; compact?: boolean }) {
  return <span className={`avatar ${compact ? 'compact' : ''}`} style={{ background: member.color }}><UserRound size={compact ? 14 : 19} />{member.host && !compact && <i>★</i>}</span>
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('root')
  if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}
