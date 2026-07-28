'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, CircleDollarSign,
  Clock3, Coffee, Compass, Copy, ExternalLink, Home, Map, MapPin, MessageCircle,
  RotateCcw, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TrainFront, Trash2,
  UserRound, UsersRound, Utensils, Vote, WalletCards, X,
} from 'lucide-react'
import { courses, demoPreferences, foods, initialState, moods, paces, themes } from './data'
import { aggregateThemes, allPreferencesComplete, formatPrice, tallyVotes } from './logic'
import type { AppState, Course, Preference, Stop } from './types'
import './styles.css'

const STORAGE_KEY = 'modu-trip-state-v1'
const EVENT_KEY = 'modu-trip-anonymous-events-v1'

type AnonymousEvent = { name: string; at: string }

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
    return { ...initialState, ...parsed, trip: { ...initialState.trip, ...parsed.trip } }
  } catch {
    return initialState
  }
}

export function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [selectedCourse, setSelectedCourse] = useState<Course>(courses[0])
  const [finalTab, setFinalTab] = useState<'schedule' | 'map' | 'booking'>('schedule')

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state])
  useEffect(() => { track('landing_view') }, [])

  const update = (patch: Partial<AppState>) => setState((current) => ({ ...current, ...patch }))
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState(initialState)
    setSelectedCourse(courses[0])
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
        {state.step !== 'home' && <button className="icon-button subtle" aria-label="처음부터 다시 시작" onClick={reset}><RotateCcw size={18} /></button>}
      </header>

      <main>
        {state.step === 'home' && <HomeScreen />}
        {state.step === 'create' && <CreateTrip state={state} setState={setState} />}
        {state.step === 'room' && <Room state={state} setState={setState} />}
        {state.step === 'preferences' && <Preferences state={state} setState={setState} />}
        {state.step === 'analysis' && <Analysis state={state} onNext={() => update({ step: 'courses' })} />}
        {state.step === 'courses' && <Courses selected={selectedCourse} setSelected={setSelectedCourse} onVote={() => update({ step: 'vote' })} />}
        {state.step === 'vote' && <Voting state={state} setState={setState} />}
        {state.step === 'final' && <FinalTrip state={state} setState={setState} tab={finalTab} setTab={setFinalTab} />}
      </main>
    </div>
  )
}

const stepTitle: Record<AppState['step'], string> = {
  home: '모두의 여행', create: '여행 만들기', room: '여행방', preferences: '내 취향',
  analysis: '우리 취향', courses: '추천 코스', vote: '코스 투표', final: '최종 여행',
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
  return (
    <section className="page">
      <Progress current={1} total={4} label="여행 기본 정보" />
      <div className="section-heading">
        <h2>어디로 떠날까요?</h2>
        <p>목적지는 직접 정하고, 세부 코스는 함께 골라요.</p>
      </div>
      <div className="form-card">
        <label>여행방 이름<input value={state.trip.name} onChange={(e) => setTrip('name', e.target.value)} /></label>
        <div className="field-row">
          <label>출발지<input value={state.trip.origin} onChange={(e) => setTrip('origin', e.target.value)} /></label>
          <ArrowRight size={19} className="field-arrow" />
          <label>목적지<input value={state.trip.destination} onChange={(e) => setTrip('destination', e.target.value)} /></label>
        </div>
        <div className="field-row dates">
          <label>가는 날<input type="date" value={state.trip.startDate} onChange={(e) => setTrip('startDate', e.target.value)} /></label>
          <label>오는 날<input type="date" value={state.trip.endDate} onChange={(e) => setTrip('endDate', e.target.value)} /></label>
        </div>
        <label>이동수단
          <div className="segmented">
            {['대중교통', '자동차'].map((item) => <button className={state.trip.transport === item ? 'active' : ''} onClick={() => setTrip('transport', item)} key={item}>{item === '대중교통' ? <TrainFront size={17} /> : <Compass size={17} />}{item}</button>)}
          </div>
        </label>
      </div>
      <button className="primary-button sticky-action" disabled={!state.trip.origin || !state.trip.destination} onClick={() => setState((s) => ({ ...s, step: 'room' }))}>여행방 만들기 <ArrowRight size={18} /></button>
    </section>
  )
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
  const [form, setForm] = useState<Preference>(member.preference ?? { themes: [], pace: '적당하게', food: '한식', mood: '감성적인', constraint: '' })
  const toggle = (theme: string) => setForm((f) => ({ ...f, themes: f.themes.includes(theme) ? f.themes.filter((t) => t !== theme) : f.themes.length < 3 ? [...f.themes, theme] : f.themes }))
  const save = () => setState((s) => ({ ...s, step: 'room', members: s.members.map((m) => m.id === member.id ? { ...m, preference: form } : m) }))
  return (
    <section className="page">
      <Progress current={2} total={4} label={`${member.name}님의 취향`} />
      <div className="profile-heading"><Avatar member={member} /><div><h2>{member.name}님은 어떤 여행이 좋아요?</h2><p>최대 3개까지 골라주세요.</p></div></div>
      <PreferenceGroup title="가장 하고 싶은 것" options={themes} selected={form.themes} onSelect={toggle} icons />
      <PreferenceGroup title="여행 속도" options={paces} selected={[form.pace]} onSelect={(value) => setForm((f) => ({ ...f, pace: value }))} />
      <PreferenceGroup title="좋아하는 음식" options={foods} selected={[form.food]} onSelect={(value) => setForm((f) => ({ ...f, food: value }))} />
      <PreferenceGroup title="원하는 분위기" options={moods} selected={[form.mood]} onSelect={(value) => setForm((f) => ({ ...f, mood: value }))} />
      <label className="constraint-field">알레르기·꼭 피해야 할 것 <span>선택</span><input placeholder="예: 견과류 알레르기" value={form.constraint} onChange={(e) => setForm((f) => ({ ...f, constraint: e.target.value }))} /></label>
      <button className="primary-button sticky-action" disabled={form.themes.length === 0} onClick={save}>취향 저장하기 <Check size={18} /></button>
    </section>
  )
}

function PreferenceGroup({ title, options, selected, onSelect, icons }: { title: string; options: string[]; selected: string[]; onSelect: (value: string) => void; icons?: boolean }) {
  const iconMap: Record<string, React.ReactNode> = { '맛집': <Utensils />, '감성 카페': <Coffee />, '사진': <Sparkles />, '산책': <Compass />, '액티비티': <TrainFront />, '역사': <Home /> }
  return <div className="preference-group"><h3>{title}</h3><div className={icons ? 'choice-grid' : 'choice-chips'}>{options.map((option) => <button key={option} className={selected.includes(option) ? 'selected' : ''} onClick={() => onSelect(option)}>{icons && iconMap[option]}{option}{selected.includes(option) && <Check size={15} />}</button>)}</div></div>
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
      {state.members.some((m) => m.preference?.constraint) && <div className="safety-note"><b>필수 조건도 확인했어요</b><span>유나님의 견과류 알레르기를 모든 장소 추천에 우선 반영해요.</span></div>}
      <button className="primary-button sticky-action" onClick={onNext}>맞춤 코스 3개 보기 <ArrowRight size={18} /></button>
    </section>
  )
}

function Courses({ selected, setSelected, onVote }: { selected: Course; setSelected: (c: Course) => void; onVote: () => void }) {
  const [detail, setDetail] = useState(false)
  return (
    <section className="page courses-page">
      <Progress current={4} total={4} label="맞춤 코스 추천" />
      <div className="section-heading"><h2>우리에게 맞는 3가지 코스</h2><p><b>60%는 함께</b>, 나머지 40%는 취향에 따라 달라요.</p></div>
      <div className="course-tabs">
        {courses.map((course) => <button key={course.id} className={selected.id === course.id ? 'active' : ''} onClick={() => { setSelected(course); setDetail(false) }}><span>{course.emoji}</span>{course.title.split(' ')[0]}</button>)}
      </div>
      <CourseCard course={selected} expanded={detail} onToggle={() => setDetail(!detail)} />
      <div className="common-note"><span>60%</span><div><b>세 코스가 함께 가는 곳</b><p>황리단길 · 교리김밥 · 대릉원 · 경주 원조콩국</p></div></div>
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
      <button className="outline-button" onClick={onToggle}>{expanded ? '일정 접기' : '상세 일정 보기'} <ChevronRight size={17} /></button>
      {expanded && <div className="mini-timeline">{course.days[0].map((stop) => <div key={stop.time + stop.title}><time>{stop.time}</time><i className={stop.shared ? 'shared' : ''} /><span><b>{stop.title}</b><small>{stop.shared ? '공통 일정' : '이 코스만의 일정'}</small></span></div>)}</div>}
    </article>
  )
}

function Voting({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
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

function FinalTrip({ state, setState, tab, setTab }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; tab: 'schedule' | 'map' | 'booking'; setTab: (t: 'schedule' | 'map' | 'booking') => void }) {
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
      {tab === 'map' && <div className="final-content"><RouteMap stops={schedule[day]} /><div className="map-summary"><b>DAY {day + 1} 이동 요약</b><span><TrainFront size={15} /> 총 {day === 0 ? 72 : 46}분 · {schedule[day].length}개 장소</span></div></div>}
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

function Timeline({ stops, onRemove }: { stops: Stop[]; onRemove?: (index: number) => void }) {
  if (stops.length === 0) return <div className="empty-schedule"><CalendarDays size={22} /><b>이 날짜의 일정이 비었어요.</b><span>처음부터 다시 시작하면 원래 추천 일정을 불러올 수 있어요.</span></div>
  return <div className="timeline">{stops.map((stop, index) => <div className="timeline-stop" key={stop.time + stop.title}><time>{stop.time}</time><div className="timeline-pin"><i className={stop.shared ? 'shared' : ''}>{iconFor(stop.category)}</i>{index < stops.length - 1 && <span />}</div><div className="stop-card"><div><small>{stop.category} · {stop.duration}</small><span className="stop-tools">{stop.shared && <em>공통</em>}{onRemove && <button aria-label={`${stop.title} 일정에서 삭제`} onClick={() => onRemove(index)}><Trash2 size={14} /></button>}</span></div><b>{stop.title}</b><p>{stop.description}</p><span>{stop.price === 0 ? '무료' : formatPrice(stop.price)}</span></div></div>)}</div>
}

function RouteMap({ stops }: { stops: Stop[] }) {
  return <div className="route-map"><div className="map-grid" /><div className="route-path" />{stops.slice(0, 5).map((stop, i) => <div key={stop.title} className={`map-stop stop-${i}`}><i>{i + 1}</i><span>{stop.title}</span></div>)}</div>
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
