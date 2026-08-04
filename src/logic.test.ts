import { describe, expect, it } from 'vitest'
import { aggregateThemes, allPreferencesComplete, recommendCourses, tallyVotes } from './logic'
import type { Course, Member } from './types'

const preference = { themes: ['맛집', '사진 명소'], placeCount: 4, food: ['한식'], mood: ['감성적인'] }

describe('여행 그룹 핵심 로직', () => {
  it('전원이 취향을 입력해야 완료된다', () => {
    const members: Member[] = [
      { id: '1', name: '민지', color: '#fff', preference },
      { id: '2', name: '서준', color: '#000' },
    ]
    expect(allPreferencesComplete(members)).toBe(false)
    expect(allPreferencesComplete(members.map((m) => ({ ...m, preference })))).toBe(true)
  })

  it('선택 인원이 많은 취향부터 정렬한다', () => {
    const members: Member[] = [
      { id: '1', name: '민지', color: '#fff', preference },
      { id: '2', name: '서준', color: '#000', preference: { ...preference, themes: ['맛집'] } },
    ]
    expect(aggregateThemes(members)).toEqual([
      { theme: '맛집', count: 2 },
      { theme: '사진 명소', count: 1 },
    ])
  })

  it('단독 1위와 동률을 구분한다', () => {
    expect(tallyVotes({ a: 'balance', b: 'balance', c: 'slow' })).toMatchObject({
      winners: ['balance'],
      tied: false,
    })
    expect(tallyVotes({ a: 'balance', b: 'slow' })).toMatchObject({
      winners: ['balance', 'slow'],
      tied: true,
    })
  })

  it('그룹 취향과 가장 낮은 개인 만족도를 함께 반영한다', () => {
    const sample = (id: string, tags: string[]): Course => ({ id, title: id, label: '', emoji: '', description: '', match: 0, tags, totalPrice: 0, travelMinutes: 0, days: [[], []] })
    const members: Member[] = [
      { id: '1', name: '민지', color: '#fff', preference: { ...preference, themes: ['맛집', '사진'] } },
      { id: '2', name: '서준', color: '#000', preference: { ...preference, themes: ['맛집', '쇼핑'] } },
    ]
    const ranked = recommendCourses([sample('photo', ['사진']), sample('balanced', ['맛집', '산책'])], members)
    expect(ranked[0].id).toBe('balanced')
    expect(ranked[0].match).toBeGreaterThan(ranked[1].match)
  })
})
