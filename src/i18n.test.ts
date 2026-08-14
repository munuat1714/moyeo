import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import ts from 'typescript'
import { translateCopy, translatePresetName } from './i18n'

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

  it('switches already translated interface copy to the newly selected language', () => {
    expect(translateCopy('提供反饋', 'en')).toBe('Send feedback')
    expect(translateCopy('體驗為主', 'en')).toBe('Experience focused')
    expect(translateCopy('美食', 'en')).toBe('Food')
    expect(translateCopy('咖啡廳 · 拍照景點 · 體驗活動', 'en')).toBe('Café · Photo spot · Activity')
  })

  it('switches only known sample names and leaves custom names unchanged', () => {
    expect(translatePresetName('我們的釜山一日遊', 'en')).toBe('Our Busan Day Trip')
    expect(translatePresetName('敏吉', 'en')).toBe('Minji')
    expect(translatePresetName('我的釜山旅行', 'en')).toBe('我的釜山旅行')
  })

  it.each(['en', 'zh-TW', 'zh-CN', 'ja'] as const)('translates every recommendation hashtag to %s', (locale) => {
    const tags = ['맛집', '감성 카페', '사진', '사진 명소', '산책', '액티비티', '체험', '역사·문화', '쇼핑', '한식', '고기·구이', '해산물', '일식', '중식', '양식', '분식', '디저트·베이커리', '채식']
    for (const tag of tags) expect(translateCopy(tag, locale), `${locale}: ${tag}`).not.toMatch(/[가-힣]/)
  })

  it.each(['en', 'zh-TW', 'zh-CN', 'ja'] as const)('translates every known place category before its Korean address to %s', (locale) => {
    const categories = ['문화공간', '복합문화공간', '문화유적', '관광명소', '공연·축제', '전시', '전시관', '박물관', '미술관', '기념관', '도서관', '테마파크', '해수욕장', '전망대', '사찰', '시장', '거리', '공원', '식당', '자연', '레저', '스포츠']
    for (const category of categories) expect(translateCopy(category, locale), `${locale}: ${category}`).not.toMatch(/[가-힣]/)
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
    const values = new Set<string>()
    const visit = (node: ts.Node) => {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) && /[가-힣]/.test(node.text)) values.add(node.text.trim())
      ts.forEachChild(node, visit)
    }
    for (const file of ['src/main.tsx', 'src/landing.tsx', 'src/error-boundary.tsx', 'src/date-picker.tsx']) {
      visit(ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX))
    }
    for (const locale of ['en', 'zh-TW', 'zh-CN', 'ja'] as const) {
      const untranslated = [...values].filter((value) => /[가-힣]/.test(translateCopy(value, locale)))
      expect(untranslated, `untranslated ${locale} copy`).toEqual([])
    }
  })

  it('localizes dynamic course copy while preserving search addresses', () => {
    const source = fs.readFileSync('src/main.tsx', 'utf8')
    expect(source).toContain('{t(finalCourse.title)}')
    expect(source).toContain("t(openRoute ? '부산 코스부터 추천' : '출발·도착 직접 설정')")
    expect(source).toContain('<span data-no-translate>{parts[1]}</span>')
    expect(source).toContain('<small data-no-translate>{result.title}')
  })
})
