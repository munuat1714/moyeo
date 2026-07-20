import { describe, expect, it } from 'vitest'
import { aggregateThemes, allPreferencesComplete, tallyVotes } from './logic'
import type { Member } from './types'

const preference = { themes: ['맛집', '사진'], pace: '적당하게', food: '한식', mood: '감성적인', constraint: '' }

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
      { theme: '사진', count: 1 },
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
})
