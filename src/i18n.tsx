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

type LocalizedCopy = [en: string, traditionalChinese: string, simplifiedChinese: string, ja: string]

// 화면 전환 뒤에 나타나는 문구와 오류 문구까지 한곳에서 보완합니다. 장소의 공식 상호명은
// 검색 결과와 지도에서 대조할 수 있도록 원문을 유지하고, 서비스 UI 문구만 번역합니다.
const supplemental: Record<string, LocalizedCopy> = {
  '작성 중인 내용을 지우고 처음부터 다시 시작할까요?': ['Discard your changes and start over?', '要捨棄目前內容並重新開始嗎？', '要放弃当前内容并重新开始吗？', '入力中の内容を破棄して最初からやり直しますか？'],
  '코스 추천 방식': ['Route planning method', '路線推薦方式', '路线推荐方式', 'コース提案方法'],
  '방식': ['Method', '方式', '方式', '方法'],
  '님의 취향': ["'s preferences", '的偏好', '的偏好', 'さんの好み'],
  '여행 장소가 정해졌는지 알려주세요.': ['Tell us whether you already have places in mind.', '請告訴我們是否已決定旅遊地點。', '请告诉我们是否已经决定旅行地点。', '行きたい場所が決まっているか教えてください。'],
  '정한 장소 사이에서 실제 장소를 추천해요.': ['We recommend real places between your selected points.', '在所選地點之間推薦實際景點。', '在所选地点之间推荐实际地点。', '指定した場所の間にある実在スポットを提案します。'],
  '출발·도착 없이 이동이 짧은 권역을 찾아요.': ['Find a compact area without setting start and end points.', '不設定起終點，尋找移動較短的區域。', '无需设置起终点，寻找移动较短的区域。', '出発・到着地を決めず、移動の短いエリアを探します。'],
  '모르면 상관없음을 선택해 주세요.': ["Choose 'Any area' if you are unsure.", '不確定時請選擇「不限」。', '不确定时请选择“不限”。', '迷った場合は「指定なし」を選んでください。'],
  '부산의 실제 장소를 검색해서 선택해 주세요.': ['Search and select a real place in Busan.', '請搜尋並選擇釜山的實際地點。', '请搜索并选择釜山的实际地点。', '釜山の実在する場所を検索して選んでください。'],
  '입력 지우기': ['Clear', '清除輸入', '清除输入', '入力を消去'],
  '검색 결과에서 실제 장소를 선택해야 다음 단계로 이동할 수 있어요.': ['Select a place from the results to continue.', '請從搜尋結果選擇實際地點後繼續。', '请从搜索结果中选择实际地点后继续。', '検索結果から実在する場所を選ぶと次へ進めます。'],
  '이동수단': ['Transportation', '交通方式', '交通方式', '移動手段'],
  '대중교통 기준': ['By public transit', '以大眾運輸為準', '以公共交通为准', '公共交通を基準'],
  '여행방 정보를 알려주세요': ['Tell us about your trip room', '請輸入旅程房間資訊', '请输入行程房间信息', '旅行ルームの情報を入力してください'],
  '친구들이 알아보기 쉬운 이름과 여행 날짜를 정해 주세요.': ['Choose an easy-to-recognize name and travel date.', '請設定方便朋友辨識的名稱與旅遊日期。', '请设置方便朋友识别的名称和旅行日期。', '友達に分かりやすい名前と旅行日を設定してください。'],
  '이 내용으로 여행방을 만들까요?': ['Create the trip room with these details?', '要用這些內容建立旅程房間嗎？', '要使用这些内容创建行程房间吗？', 'この内容で旅行ルームを作成しますか？'],
  '잘못 입력한 내용은 항목별로 돌아가 수정할 수 있어요.': ['You can go back to edit any item.', '可返回各項目修改輸入內容。', '可以返回各项修改输入内容。', '各項目に戻って入力内容を修正できます。'],
  '처음부터 다시 시작': ['Start over', '重新開始', '重新开始', '最初からやり直す'],
  '앱 메뉴': ['App menu', '應用程式選單', '应用菜单', 'アプリメニュー'],
  '전송하지 못했어요. 잠시 후 다시 시도해 주세요.': ['Could not send. Please try again shortly.', '無法送出，請稍後再試。', '无法发送，请稍后再试。', '送信できませんでした。しばらくしてからもう一度お試しください。'],
  '여행방을 불러오지 못했습니다.': ['Could not load the trip room.', '無法載入旅程房間。', '无法加载行程房间。', '旅行ルームを読み込めませんでした。'],
  '추천 요청이 많아 처리 순서를 기다리고 있어요. 잠시 후 다시 시도해 주세요.': ['Recommendations are busy. Please try again shortly.', '目前推薦請求較多，請稍後再試。', '当前推荐请求较多，请稍后再试。', 'おすすめ作成が混み合っています。しばらくしてからもう一度お試しください。'],
  '경로 주변 추천을 만들지 못했습니다.': ['Could not create recommendations near the route.', '無法建立路線周邊推薦。', '无法生成路线周边推荐。', 'ルート周辺のおすすめを作成できませんでした。'],
  '최종 일정을 불러오지 못했습니다.': ['Could not load the final itinerary.', '無法載入最終行程。', '无法加载最终行程。', '最終日程を読み込めませんでした。'],
  '여행방에 참여하지 못했습니다.': ['Could not join the trip room.', '無法加入旅程房間。', '无法加入行程房间。', '旅行ルームに参加できませんでした。'],
  '취향을 저장하지 못했습니다.': ['Could not save your preferences.', '無法儲存偏好。', '无法保存偏好。', '好みを保存できませんでした。'],
  '여행방을 삭제하지 못했습니다.': ['Could not delete the trip room.', '無法刪除旅程房間。', '无法删除行程房间。', '旅行ルームを削除できませんでした。'],
  '현재 인원으로 시작하지 못했습니다.': ['Could not start with the current group.', '目前人數無法開始。', '当前人数无法开始。', '現在の人数では開始できませんでした。'],
  '투표를 저장하지 못했습니다.': ['Could not save your vote.', '無法儲存投票。', '无法保存投票。', '投票を保存できませんでした。'],
  '투표 결과를 확정하지 못했습니다.': ['Could not confirm the vote result.', '無法確認投票結果。', '无法确认投票结果。', '投票結果を確定できませんでした。'],
  '경로를 저장하지 못했습니다.': ['Could not save the route.', '無法儲存路線。', '无法保存路线。', 'ルートを保存できませんでした。'],
  '여행방을 만들지 못했습니다.': ['Could not create the trip room.', '無法建立旅程房間。', '无法创建行程房间。', '旅行ルームを作成できませんでした。'],
  '장소를 검색하지 못했습니다.': ['Could not search for places.', '無法搜尋地點。', '无法搜索地点。', '場所を検索できませんでした。'],
  '요청을 처리하지 못했습니다.': ['Could not process the request.', '無法處理請求。', '无法处理请求。', 'リクエストを処理できませんでした。'],
  '아래 초대 링크를 복사해 주세요.': ['Please copy the invitation link below.', '請複製下方邀請連結。', '请复制下方邀请链接。', '下の招待リンクをコピーしてください。'],
  '여행방 관리': ['Trip room controls', '旅程房間管理', '行程房间管理', '旅行ルーム管理'],
  '친구 초대 링크 복사': ['Copy invitation link', '複製好友邀請連結', '复制好友邀请链接', '招待リンクをコピー'],
  '초대 링크 복사 완료': ['Invitation link copied', '已複製邀請連結', '已复制邀请链接', '招待リンクをコピーしました'],
  '복사 완료': ['Copied', '已複製', '已复制', 'コピー済み'],
  '초대': ['Invite', '邀請', '邀请', '招待'],
  '새 여행방 만들기': ['Create another trip', '建立新旅程', '创建新行程', '新しい旅行を作る'],
  '현재 여행방 삭제': ['Delete this trip room', '刪除此旅程房間', '删除此行程房间', 'この旅行ルームを削除'],
  '여행방 삭제 중': ['Deleting trip room', '正在刪除旅程房間', '正在删除行程房间', '旅行ルームを削除中'],
  '실시간 여행방': ['Live trip room', '即時旅程房間', '实时行程房间', 'リアルタイム旅行ルーム'],
  '여행방 코드': ['Trip room code', '旅程房間代碼', '行程房间代码', '旅行ルームコード'],
  '부산 소권역 추천': ['Busan area recommendation', '釜山區域推薦', '釜山区域推荐', '釜山エリアのおすすめ'],
  '참여하는 중…': ['Joining…', '正在加入…', '正在加入…', '参加中…'],
  '여행방 참여하기': ['Join trip room', '加入旅程房間', '加入行程房间', '旅行ルームに参加'],
  '취향 입력 완료': ['Preferences complete', '偏好輸入完成', '偏好填写完成', '好みの入力完了'],
  '취향 입력 대기 중': ['Waiting for preferences', '等待輸入偏好', '等待填写偏好', '好みの入力待ち'],
  '대기': ['Waiting', '等待中', '等待中', '待機中'],
  '변경 중…': ['Updating…', '更新中…', '更新中…', '変更中…'],
  '좋아하는 음식 · 복수 선택': ['Favorite foods · Select multiple', '喜歡的食物・可複選', '喜欢的食物・可多选', '好きな食べ物・複数選択'],
  '원하는 분위기 · 복수 선택': ['Preferred mood · Select multiple', '偏好氛圍・可複選', '偏好氛围・可多选', '希望の雰囲気・複数選択'],
  '저장 중…': ['Saving…', '儲存中…', '保存中…', '保存中…'],
  '취향 저장하기': ['Save preferences', '儲存偏好', '保存偏好', '好みを保存'],
  '대중교통 이동이 짧은 부산 권역을 찾고 있어요': ['Finding Busan areas with shorter transit time', '正在尋找大眾運輸移動較短的釜山區域', '正在寻找公共交通时间较短的釜山区域', '公共交通で移動しやすい釜山エリアを検索中'],
  '공동 1위 결선투표': ['Runoff for tied routes', '並列第一名決選', '并列第一名决选', '同率1位の決選投票'],
  '우리 경로에 맞는 코스 3가지': ['Three routes matched to your trip', '符合旅程的三條路線', '符合行程的三条路线', '旅程に合う3つのコース'],
  '동률인 코스 중 하나를 다시 골라 주세요.': ['Choose again from the tied routes.', '請從同票路線中再選一次。', '请从同票路线中再次选择。', '同票のコースからもう一度選んでください。'],
  '이 코스 선택': ['Choose this route', '選擇此路線', '选择此路线', 'このコースを選ぶ'],
  '이 코스에 투표': ['Vote for this route', '投給此路線', '投票给此路线', 'このコースに投票'],
  '익명 투표 보내기': ['Submit anonymous vote', '送出匿名投票', '提交匿名投票', '匿名投票を送信'],
  '최종 코스 확정하기': ['Confirm final route', '確認最終路線', '确认最终路线', '最終コースを確定'],
  '마이페이지에 저장됨': ['Saved to My trips', '已儲存至我的旅程', '已保存到我的行程', 'マイ旅程に保存済み'],
  '새 장소': ['New place', '新地點', '新地点', '新しい場所'],
  '저장하고 새 여행 만들기': ['Save and create a new trip', '儲存並建立新旅程', '保存并创建新行程', '保存して新しい旅行を作る'],
  '켜짐': ['On', '開啟', '开启', 'オン'], '꺼짐': ['Off', '關閉', '关闭', 'オフ'],
  '마이페이지': ['My trips', '我的旅程', '我的行程', 'マイ旅程'],
  '저장한 여행': ['Saved trips', '已儲存旅程', '已保存行程', '保存した旅行'],
  '진행 중인 여행방': ['Active trip rooms', '進行中的旅程房間', '进行中的行程房间', '進行中の旅行ルーム'],
  '저장한 여행이 없어요': ['No saved trips yet', '尚無已儲存旅程', '暂无已保存行程', '保存した旅行はありません'],
  '아직 저장된 여행이 없어요': ['No trips yet', '尚無旅程', '暂无行程', '旅行はまだありません'],
  '여행방을 확인하고 있어요.': ['Checking trip rooms.', '正在確認旅程房間。', '正在检查行程房间。', '旅行ルームを確認中です。'],
  '어떤 방식으로 여행할까요?': ['How would you like to plan?', '想用哪種方式規劃？', '想用哪种方式规划？', 'どの方法で計画しますか？'],
  '출발·도착 직접 설정': ['Set start and end points', '自行設定起點與終點', '自行设置起点和终点', '出発・到着地を指定'],
  '어느 지역을 여행하고 싶나요?': ['Which area would you like to visit?', '想去哪個區域？', '想去哪个区域？', 'どのエリアを旅行しますか？'],
  '어디서 어디로 여행할까요?': ['Where will your trip start and end?', '旅程從哪裡到哪裡？', '行程从哪里到哪里？', 'どこからどこまで旅行しますか？'],
  '출발 장소': ['Starting place', '出發地點', '出发地点', '出発場所'], '도착 장소': ['Ending place', '到達地點', '到达地点', '到着場所'],
  '식당·숙소·역 이름 검색': ['Search a restaurant, hotel, or station', '搜尋餐廳、住宿或車站', '搜索餐厅、住宿或车站', '飲食店・宿泊施設・駅を検索'],
  '검색 결과가 없습니다. 더 정확한 장소명을 입력해 주세요.': ['No results. Enter a more specific place name.', '找不到結果，請輸入更精確的地點名稱。', '未找到结果，请输入更准确的地点名称。', '検索結果がありません。より正確な場所名を入力してください。'],
  '주소 정보 없음': ['No address available', '無地址資訊', '无地址信息', '住所情報なし'],
  '장소 추가': ['Add place', '新增地點', '添加地点', '場所を追加'],
  '경로에 추가할 실제 장소를 검색하세요.': ['Search for a real place to add to the route.', '搜尋要加入路線的實際地點。', '搜索要添加到路线的实际地点。', 'ルートに追加する実在の場所を検索してください。'],
  '아직 입력하지 않았어요': ['Not entered yet', '尚未輸入', '尚未填写', '未入力'], '입력하기': ['Enter now', '輸入', '填写', '入力する'],
  '우리 취향 분석하기': ['Analyze group preferences', '分析大家的偏好', '分析大家的偏好', 'みんなの好みを分析'],
  '그룹 취향 분석': ['Group preference summary', '團體偏好分析', '团队偏好分析', 'グループの好み分析'],
  '맞춤 코스 추천': ['Personalized routes', '個人化路線推薦', '个性化路线推荐', 'おすすめコース'],
  '내 마음에 드는 코스는?': ['Which route do you prefer?', '你喜歡哪條路線？', '你喜欢哪条路线？', 'どのコースが気に入りましたか？'],
  '최대 계획 가능 날짜': ['Latest available date', '最晚可規劃日期', '最晚可规划日期', '計画可能な最終日'],
  '함께 갈 인원': ['Number of travelers', '同行人數', '同行人数', '旅行人数'],
  '방장': ['Host', '房主', '房主', 'ホスト'], '변경': ['Change', '變更', '更改', '変更'],
  '구간별 예상 이동': ['Estimated travel by segment', '各區間預計移動', '各区间预计移动', '区間ごとの移動目安'],
  '순서를 바꿀 수 있는 장소 카드': ['Reorderable place card', '可調整順序的地點卡片', '可调整顺序的地点卡片', '並べ替え可能な場所カード'],
  '확인 중…': ['Checking…', '確認中…', '检查中…', '確認中…'],
  '네이버 최신정보 확인': ['Check current details on Naver', '在 NAVER 查看最新資訊', '在 NAVER 查看最新信息', 'NAVERで最新情報を確認'],
  '부산시 모범음식점': ['Busan Certified Restaurant', '釜山市模範餐廳', '釜山市示范餐厅', '釜山市模範飲食店'],
  '도보': ['Walk', '步行', '步行', '徒歩'], '버스·도보': ['Bus + walk', '公車＋步行', '公交＋步行', 'バス＋徒歩'], '지하철·버스': ['Subway + bus', '地鐵＋公車', '地铁＋公交', '地下鉄＋バス'],
  '맛집': ['Food', '美食', '美食', 'グルメ'], '감성 카페': ['Atmospheric cafés', '特色咖啡廳', '氛围咖啡馆', '雰囲気の良いカフェ'], '사진 명소': ['Photo spots', '拍照景點', '拍照景点', '写真スポット'], '액티비티': ['Activities', '體驗活動', '体验活动', 'アクティビティ'], '역사·문화': ['History & culture', '歷史文化', '历史文化', '歴史・文化'], '쇼핑': ['Shopping', '購物', '购物', 'ショッピング'],
  '한식': ['Korean', '韓式料理', '韩餐', '韓国料理'], '고기·구이': ['BBQ & grilled meat', '烤肉', '烤肉', '肉・焼き物'], '해산물': ['Seafood', '海鮮', '海鲜', '海鮮'], '일식': ['Japanese', '日式料理', '日餐', '日本料理'], '중식': ['Chinese', '中式料理', '中餐', '中華料理'], '양식': ['Western', '西式料理', '西餐', '洋食'], '분식': ['Korean snacks', '韓式小吃', '韩式小吃', '韓国軽食'], '디저트·베이커리': ['Dessert & bakery', '甜點與烘焙', '甜点与烘焙', 'デザート・ベーカリー'], '채식': ['Vegetarian', '蔬食', '素食', 'ベジタリアン'],
  '감성적인': ['Atmospheric', '有氛圍', '有氛围', '雰囲気重視'], '활기찬': ['Lively', '熱鬧', '热闹', '活気のある'], '조용한': ['Quiet', '安靜', '安静', '静か'], '로컬': ['Local', '在地', '本地', 'ローカル'],
  '카페': ['Café', '咖啡廳', '咖啡馆', 'カフェ'], '숙소': ['Accommodation', '住宿', '住宿', '宿泊'], '교통': ['Transit', '交通', '交通', '交通'], '산책': ['Walk', '散步', '散步', '散策'], '관광': ['Sightseeing', '觀光', '观光', '観光'],
}

const localeIndex: Record<Exclude<Locale, 'ko'>, number> = { en: 0, 'zh-TW': 1, 'zh-CN': 2, ja: 3 }
const translatedCopy = Object.fromEntries((Object.keys(localeIndex) as Array<Exclude<Locale, 'ko'>>).map((locale) => [
  locale,
  { ...copy[locale], ...Object.fromEntries(Object.entries(supplemental).map(([ko, values]) => [ko, values[localeIndex[locale]]])) },
])) as Record<Exclude<Locale, 'ko'>, Record<string, string>>

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
  const entries = Object.entries(translatedCopy[locale]).sort((a, b) => b[0].length - a[0].length)
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
