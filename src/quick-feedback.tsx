'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, MessageCircle, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { track } from './analytics'
import { useI18n } from './i18n'
import { isNativeApp } from './mobile'
import { apiUrl } from './runtime'
import type { AppState } from './types'

export function QuickFeedback({ screen }: { screen: AppState['step'] }) {
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
