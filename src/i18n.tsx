'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Languages } from 'lucide-react'
import { apiUrl } from './runtime'

export type Locale = 'ko' | 'en' | 'zh-TW' | 'zh-CN' | 'ja'

const LANGUAGE_KEY = 'mohang-language-v1'
const labels: Record<Locale, string> = { ko: '한국어', en: 'English', 'zh-TW': '繁體中文', 'zh-CN': '简体中文', ja: '日本語' }

const copy: Record<Exclude<Locale, 'ko'>, Record<string, string>> = {
  en: {
    '모행': 'MOHANG', '홈': 'Home', '마이': 'My trips', '설정': 'Settings', '여행 만들기': 'Plan a trip', '여행방': 'Trip room', '내 취향': 'My preferences', '우리 취향': 'Group preferences', '추천 코스': 'Suggested routes', '코스 투표': 'Route vote', '최종 여행': 'Final route',
    '뒤로 가기': 'Go back', '앱 홈': 'App home', '랜딩': 'Landing', '인터넷 연결을 확인해 주세요.': 'Check your internet connection.',
    '친구 취향으로 완성하는 여행': 'A Busan day trip everyone can agree on', '여행 계획,': 'Plan Busan,', '모두의 취향': 'together', '에서 시작해요.': 'from everyone’s preferences.', '친구들의 취향을 모아 가까운 부산 코스를 추천하고, 투표로 함께 결정하는 당일치기 여행 서비스예요.': 'Choose what each person likes, compare nearby Busan routes, and decide together.',
    '취향 선택': 'Choose preferences', '각자 원하는 여행을 골라요': 'Everyone selects what they like', '코스 추천': 'Compare routes', '가까운 실제 장소를 모아요': 'Real places with shorter travel', '함께 결정': 'Decide together', '투표로 최종 경로를 정해요': 'Vote on the final route', '웹에서 모행 써보기': 'Try MOHANG on the web', 'Android와 iPhone에서 설치 없이 이용할 수 있어요': 'Works on Android and iPhone without installation',
    '우리 취향으로': 'Based on our choices', '부산 하루 여행': 'A day in Busan', '친구와 취향을 모으고 가까운 실제 장소로 여행 코스를 완성해요.': 'Combine preferences and build a route with nearby real places.', '새 여행 만들기': 'Plan a new trip', '출발지 또는 부산 권역부터 시작해요': 'Start from locations or a Busan area', '초대 코드로 참여': 'Join with a code', '친구에게 받은 방 코드를 입력해 주세요.': 'Enter the room code shared by a friend.', '방 코드': 'Room code', '참여': 'Join', '최근 여행': 'Recent trips',
    '어떤 방식으로 여행할까요?': 'How would you like to plan?', '부산 코스부터 추천': 'Start with a Busan area', '여행 경로': 'Choose start and end points', '선호 권역': 'Preferred area', '여행방 정보': 'Trip details', '입력 내용 확인': 'Review', '다음': 'Next', '이전': 'Back', '여행방 만들기': 'Create trip room', '생성 후 7일 뒤 자동 삭제': 'Automatically deleted after 7 days', '여행 날짜': 'Travel date', '방문 장소 수': 'Number of stops', '내 별명': 'Your nickname', '여행방 이름': 'Trip name',
    '마음에 드는 항목을 여러 개 골라 주세요': 'Choose everything you like', '가장 가고 싶은 장소': 'Places you want to visit', '좋아하는 음식': 'Food you like', '여행 분위기': 'Travel mood', '맞춤 코스 3개 보기': 'See 3 matching routes', '상세 경로 보기': 'View route details', '상세 경로 접기': 'Hide route details', '투표하기': 'Vote', '결과 확인하기': 'View results',
    '일정': 'Schedule', '동선': 'Map', '예약': 'Details', '예상 이동': 'Estimated travel', '개 장소': ' stops', '실제 길찾기': 'Open directions', '장소 변경': 'Change place', '일정에서 삭제': 'Remove from route', '마이페이지에 경로 저장': 'Save to My trips', '전체 일정 복사하기': 'Copy schedule',
    '의견 보내기': 'Send feedback', '이 화면은 어떠셨나요?': 'How was this screen?', '도움 됐어요': 'Helpful', '아쉬워요': 'Needs improvement', '어떤 점이 좋았나요?': 'What worked well?', '어떤 점이 아쉬웠나요?': 'What could be better?', '취향에 맞아요': 'Matched my preferences', '동선이 좋아요': 'Good route', '장소가 좋아요': 'Good places', '거리가 멀어요': 'Too far', '취향과 달라요': 'Did not match', '장소 정보가 틀려요': 'Incorrect place info', '이동이 불편해요': 'Difficult to travel', '기타': 'Other', '더 알려주실 내용이 있나요?': 'Anything else?', '선택': 'Optional', '개인정보는 적지 말아 주세요.': 'Please do not include personal information.', '익명으로 의견 보내기': 'Send anonymously', '의견을 익명으로 전달했어요. 고맙습니다.': 'Thanks. Your feedback was sent anonymously.', '닫기': 'Close',
  },
  'zh-TW': {
    '모행':'MOHANG','홈':'首頁','마이':'我的旅程','설정':'設定','여행 만들기':'規劃旅程','여행방':'旅程房間','내 취향':'我的喜好','우리 취향':'大家的喜好','추천 코스':'推薦路線','코스 투표':'路線投票','최종 여행':'最終路線','뒤로 가기':'返回','앱 홈':'應用程式首頁','랜딩':'首頁','인터넷 연결을 확인해 주세요.':'請確認網路連線。',
    '친구 취향으로 완성하는 여행':'一起決定釜山一日遊','여행 계획,':'釜山行程，','모두의 취향':'從大家的喜好','에서 시작해요.':'開始。','친구들의 취향을 모아 가까운 부산 코스를 추천하고, 투표로 함께 결정하는 당일치기 여행 서비스예요.':'收集同行者的喜好，比較移動距離較短的釜山路線，再一起投票決定。','취향 선택':'選擇喜好','각자 원하는 여행을 골라요':'每個人選擇想要的行程','코스 추천':'比較路線','가까운 실제 장소를 모아요':'以真實景點和短距離為主','함께 결정':'一起決定','투표로 최종 경로를 정해요':'投票決定最終路線','웹에서 모행 써보기':'在網頁版使用 MOHANG','Android와 iPhone에서 설치 없이 이용할 수 있어요':'Android 與 iPhone 皆可免安裝使用',
    '우리 취향으로':'依照大家的選擇','부산 하루 여행':'釜山一日遊','친구와 취향을 모으고 가까운 실제 장소로 여행 코스를 완성해요.':'整合同行者喜好，用鄰近的真實景點完成路線。','새 여행 만들기':'建立新旅程','출발지 또는 부산 권역부터 시작해요':'從地點或釜山區域開始','초대 코드로 참여':'使用邀請碼加入','친구에게 받은 방 코드를 입력해 주세요.':'輸入朋友分享的房間代碼。','방 코드':'房間代碼','참여':'加入','최근 여행':'最近旅程',
    '어떤 방식으로 여행할까요?':'想用哪種方式規劃？','부산 코스부터 추천':'從釜山區域推薦','여행 경로':'選擇起點與終點','선호 권역':'偏好區域','여행방 정보':'旅程資訊','입력 내용 확인':'確認內容','다음':'下一步','이전':'返回','여행방 만들기':'建立旅程房間','생성 후 7일 뒤 자동 삭제':'建立 7 天後自動刪除','여행 날짜':'旅遊日期','방문 장소 수':'景點數量','내 별명':'你的暱稱','여행방 이름':'旅程名稱','마음에 드는 항목을 여러 개 골라 주세요':'可複選喜歡的項目','가장 가고 싶은 장소':'最想去的景點','좋아하는 음식':'喜歡的食物','여행 분위기':'旅遊風格','맞춤 코스 3개 보기':'查看 3 條推薦路線','상세 경로 보기':'查看詳細路線','상세 경로 접기':'收合路線','투표하기':'投票','결과 확인하기':'查看結果','일정':'行程','동선':'地圖','예약':'詳細資訊','예상 이동':'預計移動','개 장소':' 個景點','실제 길찾기':'開啟導航','장소 변경':'更換景點','일정에서 삭제':'從路線移除','마이페이지에 경로 저장':'儲存到我的旅程','전체 일정 복사하기':'複製完整行程',
    '의견 보내기':'提供意見','이 화면은 어떠셨나요?':'你覺得這個畫面如何？','도움 됐어요':'有幫助','아쉬워요':'需要改善','어떤 점이 좋았나요?':'哪一點做得好？','어떤 점이 아쉬웠나요?':'哪一點需要改善？','취향에 맞아요':'符合喜好','동선이 좋아요':'路線順暢','장소가 좋아요':'景點很好','거리가 멀어요':'距離太遠','취향과 달라요':'不符合喜好','장소 정보가 틀려요':'景點資訊有誤','이동이 불편해요':'交通不方便','기타':'其他','더 알려주실 내용이 있나요?':'還有其他意見嗎？','선택':'選填','개인정보는 적지 말아 주세요.':'請勿填寫個人資料。','익명으로 의견 보내기':'匿名送出','의견을 익명으로 전달했어요. 고맙습니다.':'感謝你，意見已匿名送出。','닫기':'關閉',
  },
  'zh-CN': {
    '모행':'MOHANG','홈':'首页','마이':'我的行程','설정':'设置','여행 만들기':'规划行程','여행방':'行程房间','내 취향':'我的偏好','우리 취향':'大家的偏好','추천 코스':'推荐路线','코스 투표':'路线投票','최종 여행':'最终路线','뒤로 가기':'返回','앱 홈':'应用首页','랜딩':'首页','인터넷 연결을 확인해 주세요.':'请检查网络连接。',
    '친구 취향으로 완성하는 여행':'一起决定釜山一日游','여행 계획,':'釜山行程，','모두의 취향':'从大家的偏好','에서 시작해요.':'开始。','친구들의 취향을 모아 가까운 부산 코스를 추천하고, 투표로 함께 결정하는 당일치기 여행 서비스예요.':'收集同行者的偏好，比较距离较近的釜山路线，再一起投票决定。','취향 선택':'选择偏好','각자 원하는 여행을 골라요':'每个人选择想要的行程','코스 추천':'比较路线','가까운 실제 장소를 모아요':'以真实景点和短距离为主','함께 결정':'一起决定','투표로 최종 경로를 정해요':'投票决定最终路线','웹에서 모행 써보기':'使用 MOHANG 网页版','Android와 iPhone에서 설치 없이 이용할 수 있어요':'Android 与 iPhone 均可免安装使用',
    '우리 취향으로':'根据大家的选择','부산 하루 여행':'釜山一日游','친구와 취향을 모으고 가까운 실제 장소로 여행 코스를 완성해요.':'整合同行者偏好，用附近的真实景点完成路线。','새 여행 만들기':'创建新行程','출발지 또는 부산 권역부터 시작해요':'从地点或釜山区域开始','초대 코드로 참여':'使用邀请码加入','친구에게 받은 방 코드를 입력해 주세요.':'输入朋友分享的房间代码。','방 코드':'房间代码','참여':'加入','최근 여행':'最近行程','어떤 방식으로 여행할까요?':'想用哪种方式规划？','부산 코스부터 추천':'从釜山区域推荐','여행 경로':'选择起点和终点','선호 권역':'偏好区域','여행방 정보':'行程信息','입력 내용 확인':'确认内容','다음':'下一步','이전':'返回','여행방 만들기':'创建行程房间','생성 후 7일 뒤 자동 삭제':'创建 7 天后自动删除','여행 날짜':'旅行日期','방문 장소 수':'景点数量','내 별명':'你的昵称','여행방 이름':'行程名称','마음에 드는 항목을 여러 개 골라 주세요':'可多选喜欢的项目','가장 가고 싶은 장소':'最想去的景点','좋아하는 음식':'喜欢的食物','여행 분위기':'旅行风格','맞춤 코스 3개 보기':'查看 3 条推荐路线','상세 경로 보기':'查看详细路线','상세 경로 접기':'收起路线','투표하기':'投票','결과 확인하기':'查看结果','일정':'行程','동선':'地图','예약':'详细信息','예상 이동':'预计移动','개 장소':' 个景点','실제 길찾기':'打开导航','장소 변경':'更换景点','일정에서 삭제':'从路线移除','마이페이지에 경로 저장':'保存到我的行程','전체 일정 복사하기':'复制完整行程','의견 보내기':'提供反馈','이 화면은 어떠셨나요?':'你觉得这个页面怎么样？','도움 됐어요':'有帮助','아쉬워요':'需要改进','어떤 점이 좋았나요?':'哪一点做得好？','어떤 점이 아쉬웠나요?':'哪一点需要改进？','취향에 맞아요':'符合偏好','동선이 좋아요':'路线合理','장소가 좋아요':'景点很好','거리가 멀어요':'距离太远','취향과 달라요':'不符合偏好','장소 정보가 틀려요':'景点信息有误','이동이 불편해요':'交通不便','기타':'其他','더 알려주실 내용이 있나요?':'还有其他意见吗？','선택':'选填','개인정보는 적지 말아 주세요.':'请勿填写个人信息。','익명으로 의견 보내기':'匿名发送','의견을 익명으로 전달했어요. 고맙습니다.':'感谢你，反馈已匿名发送。','닫기':'关闭',
  },
  ja: {
    '모행':'MOHANG','홈':'ホーム','마이':'マイ旅程','설정':'設定','여행 만들기':'旅行を作る','여행방':'旅行ルーム','내 취향':'自分の好み','우리 취향':'みんなの好み','추천 코스':'おすすめコース','코스 투표':'コース投票','최종 여행':'最終ルート','뒤로 가기':'戻る','앱 홈':'アプリホーム','랜딩':'トップ','인터넷 연결을 확인해 주세요.':'インターネット接続を確認してください。',
    '친구 취향으로 완성하는 여행':'みんなで決める釜山日帰り旅行','여행 계획,':'釜山の旅を、','모두의 취향':'みんなの好み','에서 시작해요.':'から始めよう。','친구들의 취향을 모아 가까운 부산 코스를 추천하고, 투표로 함께 결정하는 당일치기 여행 서비스예요.':'同行者の好みを集め、移動しやすい釜山コースを比較して投票で決めます。','취향 선택':'好みを選択','각자 원하는 여행을 골라요':'それぞれの希望を選びます','코스 추천':'コースを比較','가까운 실제 장소를 모아요':'実在する近い場所を優先','함께 결정':'みんなで決定','투표로 최종 경로를 정해요':'投票で最終ルートを決定','웹에서 모행 써보기':'ウェブ版 MOHANG を使う','Android와 iPhone에서 설치 없이 이용할 수 있어요':'Android・iPhoneでインストール不要',
    '우리 취향으로':'みんなの希望で','부산 하루 여행':'釜山日帰り旅行','친구와 취향을 모으고 가까운 실제 장소로 여행 코스를 완성해요.':'好みをまとめ、近くの実在スポットでコースを作ります。','새 여행 만들기':'新しい旅行を作る','출발지 또는 부산 권역부터 시작해요':'場所または釜山のエリアから開始','초대 코드로 참여':'招待コードで参加','친구에게 받은 방 코드를 입력해 주세요.':'友達から届いたルームコードを入力してください。','방 코드':'ルームコード','참여':'参加','최근 여행':'最近の旅行','어떤 방식으로 여행할까요?':'どの方法で計画しますか？','부산 코스부터 추천':'釜山エリアからおすすめ','여행 경로':'出発・到着地を選択','선호 권역':'希望エリア','여행방 정보':'旅行情報','입력 내용 확인':'入力内容の確認','다음':'次へ','이전':'戻る','여행방 만들기':'旅行ルームを作る','생성 후 7일 뒤 자동 삭제':'作成から7日後に自動削除','여행 날짜':'旅行日','방문 장소 수':'訪問スポット数','내 별명':'ニックネーム','여행방 이름':'旅行名','마음에 드는 항목을 여러 개 골라 주세요':'好きな項目を複数選べます','가장 가고 싶은 장소':'行きたい場所','좋아하는 음식':'好きな食べ物','여행 분위기':'旅行スタイル','맞춤 코스 3개 보기':'3つのコースを見る','상세 경로 보기':'詳細ルートを見る','상세 경로 접기':'詳細を閉じる','투표하기':'投票する','결과 확인하기':'結果を見る','일정':'日程','동선':'地図','예약':'詳細','예상 이동':'移動目安','개 장소':'か所','실제 길찾기':'経路を開く','장소 변경':'場所を変更','일정에서 삭제':'ルートから削除','마이페이지에 경로 저장':'マイ旅程に保存','전체 일정 복사하기':'日程をコピー','의견 보내기':'フィードバック','이 화면은 어떠셨나요?':'この画面はいかがでしたか？','도움 됐어요':'役に立った','아쉬워요':'改善が必要','어떤 점이 좋았나요?':'良かった点は？','어떤 점이 아쉬웠나요?':'改善してほしい点は？','취향에 맞아요':'好みに合った','동선이 좋아요':'移動しやすい','장소가 좋아요':'場所が良い','거리가 멀어요':'距離が遠い','취향과 달라요':'好みと違う','장소 정보가 틀려요':'場所情報が違う','이동이 불편해요':'移動しにくい','기타':'その他','더 알려주실 내용이 있나요?':'ほかにご意見はありますか？','선택':'任意','개인정보는 적지 말아 주세요.':'個人情報は入力しないでください。','익명으로 의견 보내기':'匿名で送信','의견을 익명으로 전달했어요. 고맙습니다.':'匿名で送信しました。ありがとうございます。','닫기':'閉じる',
  },
}

const I18nContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: (source: string) => string }>({ locale: 'ko', setLocale: () => undefined, t: (source) => source })
const originalText = new WeakMap<Text, string>()
const originalAttributes = new WeakMap<Element, Map<string, string>>()

function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'ko'
  const value = navigator.language
  if (/^zh-(TW|HK|MO)/i.test(value)) return 'zh-TW'
  if (/^zh/i.test(value)) return 'zh-CN'
  if (/^ja/i.test(value)) return 'ja'
  if (/^en/i.test(value)) return 'en'
  return 'ko'
}

export function translateCopy(source: string, locale: Locale) {
  if (locale === 'ko') return source
  const entries = Object.entries(copy[locale]).sort((a, b) => b[0].length - a[0].length)
  return entries.reduce((value, [ko, target]) => value.split(ko).join(target), source)
}

function translateTree(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    if (node.parentElement?.closest('script,style')) continue
    if (!originalText.has(node)) originalText.set(node, node.nodeValue ?? '')
    const source = originalText.get(node) ?? ''
    const next = translateCopy(source, locale)
    if (node.nodeValue !== next) node.nodeValue = next
  }
  root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach((element) => {
    let originals = originalAttributes.get(element)
    if (!originals) { originals = new Map(); originalAttributes.set(element, originals) }
    for (const attribute of ['placeholder', 'aria-label', 'title']) {
      if (!element.hasAttribute(attribute)) continue
      if (!originals.has(attribute)) originals.set(attribute, element.getAttribute(attribute) ?? '')
      element.setAttribute(attribute, translateCopy(originals.get(attribute) ?? '', locale))
    }
  })
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'ko'
    return (localStorage.getItem(LANGUAGE_KEY) as Locale | null) ?? detectLocale()
  })
  const setLocale = (value: Locale) => { localStorage.setItem(LANGUAGE_KEY, value); setLocaleState(value) }
  useEffect(() => {
    document.documentElement.lang = locale
    translateTree(document.body, locale)
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => { if (node.nodeType === Node.ELEMENT_NODE) translateTree(node as Element, locale); else if (node.nodeType === Node.TEXT_NODE && node.parentElement) translateTree(node.parentElement, locale) })
    }))
    observer.observe(document.body, { childList: true, subtree: true })
    const sessionKey = `mohang-usage:${locale}:${location.pathname.startsWith('/demo') ? 'demo' : location.pathname.startsWith('/app') ? 'service' : 'landing'}`
    if (sessionStorage.getItem(sessionKey) !== '1') {
      sessionStorage.setItem(sessionKey, '1')
      void fetch(apiUrl('/api/usage'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale, surface: location.pathname.startsWith('/demo') ? 'demo' : location.pathname.startsWith('/app') ? 'service' : 'landing' }) }).catch(() => sessionStorage.removeItem(sessionKey))
    }
    return () => observer.disconnect()
  }, [locale])
  const value = useMemo(() => ({ locale, setLocale, t: (source: string) => translateCopy(source, locale) }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n()
  return <label className={`language-select ${compact ? 'compact' : ''}`}><Languages size={15} aria-hidden="true" /><span className="sr-only">Language</span><select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label="언어 선택">{(Object.keys(labels) as Locale[]).map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
}
