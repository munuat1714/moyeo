'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from './i18n'

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function DatePicker({ value, min, max, onChange }: { value: string; min: string; max: string; onChange: (value: string) => void }) {
  const { locale, t } = useI18n()
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => { const date = parseDate(value || min); return new Date(date.getFullYear(), date.getMonth(), 1) })
  const selected = parseDate(value || min)
  const minDate = parseDate(min), maxDate = parseDate(max)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [open])
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }), [locale])
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }), [locale])
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 0, 4 + index))), [locale])
  const firstDay = month.getDay(), daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => index - firstDay + 1)
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1)
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  const canPrevious = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0) >= minDate
  const canNext = nextMonth <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
  return <div className="custom-date-picker" ref={root}>
    <button type="button" className="date-picker-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); setOpen((current) => !current) }}><CalendarDays size={17} aria-hidden="true" /><span>{formatter.format(selected)}</span></button>
    {open && <section className="date-picker-popover" role="dialog" aria-label={t('여행 날짜')}>
      <header><button type="button" aria-label={t('이전')} disabled={!canPrevious} onClick={() => setMonth(previousMonth)}><ChevronLeft size={18} /></button><b>{monthFormatter.format(month)}</b><button type="button" aria-label={t('다음')} disabled={!canNext} onClick={() => setMonth(nextMonth)}><ChevronRight size={18} /></button></header>
      <div className="calendar-weekdays" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-days">{cells.map((day, index) => {
        if (day < 1 || day > daysInMonth) return <span key={`blank-${index}`} />
        const date = new Date(month.getFullYear(), month.getMonth(), day), dateValue = isoDate(date)
        const disabled = date < minDate || date > maxDate, active = dateValue === value
        return <button type="button" key={dateValue} disabled={disabled} aria-pressed={active} className={active ? 'selected' : ''} onClick={() => { onChange(dateValue); setOpen(false) }}>{day}</button>
      })}</div>
    </section>}
  </div>
}
