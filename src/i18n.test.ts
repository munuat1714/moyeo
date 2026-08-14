import { describe, expect, it } from 'vitest'
import { translateCopy } from './i18n'

describe('internationalized interface copy', () => {
  it.each([
    ['en', 'Try MOHANG on the web'],
    ['zh-TW', '在網頁版使用 MOHANG'],
    ['zh-CN', '使用 MOHANG 网页版'],
    ['ja', 'ウェブ版 MOHANG を使う'],
  ] as const)('translates the primary action to %s', (locale, expected) => {
    expect(translateCopy('웹에서 모행 써보기', locale)).toBe(expected)
  })

  it('keeps Korean place names while translating surrounding route copy', () => {
    expect(translateCopy('해운대 · 3개 장소', 'en')).toBe('해운대 · 3 stops')
  })
})
