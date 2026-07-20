import type { Member } from './types'

export function allPreferencesComplete(members: Member[]) {
  return members.length > 0 && members.every((member) => Boolean(member.preference))
}

export function aggregateThemes(members: Member[]) {
  const counts: Record<string, number> = {}
  members.forEach((member) => {
    member.preference?.themes.forEach((theme) => {
      counts[theme] = (counts[theme] ?? 0) + 1
    })
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .map(([theme, count]) => ({ theme, count }))
}

export function tallyVotes(votes: Record<string, string>) {
  const counts: Record<string, number> = {}
  Object.values(votes).forEach((courseId) => {
    counts[courseId] = (counts[courseId] ?? 0) + 1
  })
  const max = Math.max(0, ...Object.values(counts))
  const winners = Object.keys(counts).filter((id) => counts[id] === max)
  return { counts, winners, tied: winners.length > 1 }
}

export function formatPrice(price: number) {
  return `${price.toLocaleString('ko-KR')}원`
}
