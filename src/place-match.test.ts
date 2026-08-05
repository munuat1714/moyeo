import { describe, expect, it } from 'vitest'
import { selectBestPlaceMatch } from '../worker/recommendations'

describe('selectBestPlaceMatch', () => {
  const expected = { title: '남포 돌솥밥집', latitude: 35.098, longitude: 129.03 }

  it('검색 순서보다 상호명과 추천 좌표를 우선한다', () => {
    const result = selectBestPlaceMatch([
      { title: '남포 돌솥밥집', latitude: 35.157, longitude: 129.059 },
      { title: '남포돌솥밥집', latitude: 35.099, longitude: 129.031 },
    ], expected)
    expect(result?.latitude).toBe(35.099)
  })

  it('추천 위치에서 멀거나 상호가 다른 결과는 채택하지 않는다', () => {
    const result = selectBestPlaceMatch([
      { title: '서면 돌솥밥집', latitude: 35.157, longitude: 129.059 },
      { title: '다른 식당', latitude: 35.099, longitude: 129.031 },
    ], expected)
    expect(result).toBeNull()
  })
})
