# Frontend Structure & Rendering Guide (Current)

## 1) 전체 F/E 구조 개요

- 앱은 Next.js App Router 기반 단일 페이지 구조입니다.
- 최상위 렌더 트리
  - `app/layout.tsx`
  - `app/page.tsx`
  - `app/globals.css`
- 백엔드 API는 같은 `app/api/**` 아래 라우트로 존재하지만, 화면에서 직접 소비되는 건 일부입니다.

## 2) 핵심 파일/역할

- `app/layout.tsx`
  - `Noto_Sans_KR`(본문), `Space_Grotesk`(포인트 폰트) Google Fonts 설정
  - HTML `lang="ko"`
  - `<body>`에 CSS 변수 클래스를 주입해 전체 스타일 토큰 연결
- `app/page.tsx`
  - 클라이언트 컴포넌트(`'use client'`)
  - 화면 전체 UI, 상태, API 호출, 조건부 렌더를 담당
  - 화면 섹션: 헤더 → 영역 검색/요약 패널 → AI 리포트 패널 → 최근 분석 기록 섹션
- `app/globals.css`
  - 전역 디자인 토큰(`--bg`, `--text`, `--good`, `--warn`, `--bad`) 및 다크 톤 그라디언트 UI 스타일 정의
  - 패널, 버튼, 상태칩, 메트릭 카드, 리포트, 최근 목록, 반응형 스타일 담당

## 3) 화면 상태(state) 구성

- 입력/표시 상태
  - `address`: 검색어(지역명/주소)
  - `health`: `/api/health` 응답 상태
  - `summary`: `/api/region/summary` 결과
  - `report`: `/api/analysis/report` 결과
  - `recentReports`: `/api/analysis/reports` 목록
- 로딩 상태
  - `loadingSummary`, `loadingReport`, `loadingRecentReports`
- 에러 상태
  - `error` 문자열
- 파생 상태
  - `canAnalyze = summary가 존재 && !loadingReport`

## 4) 데이터 흐름(현재)

### 4.1 지역 조회 흐름
1. 사용자가 주소 입력 후 폼 제출
2. `GET /api/region/summary?address=...` 호출
3. 성공 시 `summary` 상태 반영
4. `/api/health` 재조회로 서비스 상태 동기 갱신

### 4.2 분석 실행 흐름
1. `summary` 존재할 때 `Gemini 분석 시작` 버튼 활성화
2. `POST /api/analysis/report` 호출
  - Payload: `{ regionCode, metrics }`
3. 성공 시 `report` 반영 + 최근 기록 갱신 + `health` 갱신

### 4.3 최근 분석 로드
1. 페이지 진입 시 `useEffect`에서
2. `GET /api/analysis/reports?limit=5`
3. `recentReports` 렌더링

## 5) 현재 렌더/표현 방식

- 레이아웃
  - 헤더 + 2열 그리드(`urban-grid`, 반응형에서 1열로 전환)
- 시각 언어
  - 다크 계열, 블러 패널, 라인 보더, 포인트 컬러 강조
  - 상태/등급 색상
    - `good`: 초록 (`--good`)
    - `warn`: 주황 (`--warn`)
    - `bad`: 빨강 (`--bad`)
- 입력/행동 요소
  - 검색 입력 + 제출 버튼
  - 퀵 주소 칩 버튼(서울/강남구/해운대구)
  - Gemini 분석 시작 버튼
- 메트릭 표현
  - 4개 점수 카드(aging / infraRisk / marketScore / policyFit)
  - 점수 임계치 기반 클래스(`getMetricClass`)로 색상 자동 적용
- 조건부 메시지
  - 에러 박스
  - 요약 미조회/분석 미실행/히스토리 없음 등 빈 상태 메시지
- 리포트 렌더
  - 제목/요약/메타(KV 형식)/근거 리스트/리스크/실행계획(phase/task/owner/timeline) 순서
- 최근 기록
  - 제목, 메타(점수/신뢰도/모델/버전), 요약, 생성 시간

## 6) 사용하는 API 타입(요약)

- 위치 요약
  - `RegionSummaryResponse`
  - 표시 항목: `name`, `regionCode`, `metrics`, `priorityScore`, `summary`, `updatedAt`
- 분석 결과
  - `AnalysisReportResponse`
  - 표시 항목: `recommendedScenario`, `priorityScore`, `confidence`, `executiveSummary/summary`, `evidence`, `risks`, `actionPlan`, `model`, `generatedAt`, `traceId`, `reportVersion`
- 최근 기록
  - `AnalysisReportListItem`
  - 표시 항목: `regionName`, `regionCode`, `recommendedScenario`, `priorityScore`, `confidence`, `model`, `reportVersion`, `summary`, `createdAt`

## 7) API endpoint 소비 정리

- 화면에서 직접 호출
  - `GET /api/health`
  - `GET /api/region/summary`
  - `POST /api/analysis/report`
  - `GET /api/analysis/reports`
- 참고(현재 화면 직접 사용 없음)
  - `GET /api/region/metrics`
  - `POST /api/analysis/document`
- 호출 유틸
  - `toApiUrl`로 `NEXT_PUBLIC_API_BASE_URL` 기반 base path 조합
  - 에러는 `error` 필드 기반 메시지 파싱으로 처리

## 8) 리디자인 시 보존 우선순위

- 기능 보존 필수
  1) 지역 조회 후 분석 가능
  2) 메트릭 색상 임계치 규칙
  3) 리포트 출력 체계(요약/근거/리스크/실행계획/메타)
  4) 최근 분석 조회 및 표시
- 교체 가능 영역(디자인 개선 포인트)
  - 기존 클래스 기반 레이아웃을 유지하면서 CSS 토큰만 재정의하거나,
  - 섹션/카드/버튼/칩 컴포넌트를 분리해 컴포넌트화 후 스타일 계층화
  - 현재 일부 인라인 스타일을 `css class`로 이전하면 유지보수성이 높아짐

## 9) 주의할 점

- 현재 단일 파일 컴포넌트(`app/page.tsx`)에 UI 로직 집중
  - 상태/렌더 분기가 많아져 스타일 변경 시 예외 경로 누락 가능성 존재
- 공백/에러/로딩 UI가 조건부 렌더로 분산되어 있어 재사용 가능한 상태 컴포넌트(예: Loading/Empty/Error 패턴) 분리가 유리

## 10) 변경 제안(디자인 입문용 체크리스트)

- 1차: 컬러 토큰만 교체 (`--bg`, `--panel`, `--line`, `--good`, `--warn`, `--bad`)
- 2차: 폰트/타이포 계층 (`--font-accent`, `--font-base`) 확정
- 3차: 카드/버튼/칩 컴포넌트를 3개 클래스로 통일
- 4차: 반응형 간격/패널 넓이 최적화(모바일/태블릿 분기 강화)
