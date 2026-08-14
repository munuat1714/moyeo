# 디자인 협업 안내

이 브랜치는 디자이너가 화면과 브랜드 표현을 독립적으로 개선하기 위한 작업 공간입니다. 기능·서버 변경은 `main` 또는 기술 브랜치에서 진행합니다.

## 주로 수정할 파일

- `src/styles.css`: 색상, 타이포그래피, 간격, 반응형 레이아웃, 컴포넌트 스타일
- `src/landing.tsx`: 랜딩 페이지의 문구와 화면 구성
- `src/main.tsx`: `/demo`, `/app` 화면 마크업과 접근성 레이블
- `src/date-picker.tsx`: 날짜 선택 UI
- `src/i18n.tsx`: 화면 문구의 다국어 번역
- `public/icons/`, `public/social/`, `public/og.png`: 브랜드 이미지와 공유 이미지
- `design.md`: 디자인 원칙과 결정 기록

## 변경하지 않을 파일

- `worker/`, `migrations/`: API와 데이터베이스
- `src/logic.ts`, `src/live.ts`, `src/mobile.ts`: 추천·동기화·모바일 기능
- `wrangler.jsonc`, `.openai/hosting.json`: 운영·배포 설정

## 확인 기준

- 대표 모바일 화면: 390 × 844px
- 터치 영역: 최소 44 × 44px
- 색상 외에도 아이콘이나 문구로 상태 구분
- `/`, `/demo`, `/app`에서 가로 스크롤과 잘린 주요 버튼이 없어야 함
- 한국어 수정 시 영어·중국어 번체·중국어 간체·일본어 번역도 함께 확인

디자인 작업은 이 브랜치에서 커밋한 뒤 `main`을 대상으로 Pull Request를 열어 리뷰합니다. 기능 코드와 충돌하면 시각적 의도를 PR 설명에 남기고 기술 브랜치에서 통합합니다.
