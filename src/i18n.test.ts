import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import ts from 'typescript'
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

  it.each([
    ['en', 'Our Busan Day Trip'],
    ['zh-TW', '我們的釜山一日遊'],
    ['zh-CN', '我们的釜山一日游'],
    ['ja', 'みんなの釜山一日旅'],
  ] as const)('localizes the untouched sample trip name to %s', (locale, expected) => {
    expect(translateCopy('우리들의 부산 한바퀴', locale)).toBe(expected)
  })

  it.each(['en', 'zh-TW', 'zh-CN', 'ja'] as const)('fully translates late-screen interface copy to %s', (locale) => {
    const phrases = [
      '작성 중인 내용을 지우고 처음부터 다시 시작할까요?',
      '방식',
      '코스 추천 방식',
      '여행방을 불러오지 못했습니다.',
      '좋아하는 음식 · 복수 선택',
      '대중교통 이동이 짧은 부산 권역을 찾고 있어요',
      '전송하지 못했어요. 잠시 후 다시 시도해 주세요.',
      '광안리·수영 천천히 머무는 동네 여행',
      '광안리·수영 소권역 안에서 대중교통 누적 이동을 줄인 당일치기 코스',
    ]
    for (const phrase of phrases) expect(translateCopy(phrase, locale)).not.toMatch(/[가-힣]/)
  })

  it('reports every Korean interface literal that still needs localization', () => {
    const source = ts.createSourceFile('main.tsx', fs.readFileSync('src/main.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const values = new Set<string>()
    const visit = (node: ts.Node) => {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) && /[가-힣]/.test(node.text)) values.add(node.text.trim())
      ts.forEachChild(node, visit)
    }
    visit(source)
    for (const locale of ['en', 'zh-TW', 'zh-CN', 'ja'] as const) {
      const untranslated = [...values].filter((value) => /[가-힣]/.test(translateCopy(value, locale)))
      expect(untranslated, `untranslated ${locale} copy`).toEqual([])
    }
  })
})
