import type { Course, Member } from './types'

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

export function recommendCourses(baseCourses: Course[], members: Member[]) {
  const preferences = members.flatMap((member) => member.preference ? [member.preference] : [])
  if (preferences.length === 0) return baseCourses
  return baseCourses.map((course) => {
    const personalMatches = preferences.map((preference) => {
      const matches = preference.themes.filter((theme) => course.tags.includes(theme)).length
      return matches / Math.max(1, preference.themes.length)
    })
    const average = personalMatches.reduce((sum, value) => sum + value, 0) / personalMatches.length
    const leastSatisfied = Math.min(...personalMatches)
    const coveredThemes = new Set(preferences.flatMap((preference) => preference.themes).filter((theme) => course.tags.includes(theme))).size
    const match = Math.round(Math.min(99, 55 + average * 30 + leastSatisfied * 10 + Math.min(5, coveredThemes)))
    return { ...course, match }
  }).sort((a, b) => b.match - a.match || a.id.localeCompare(b.id))
}
