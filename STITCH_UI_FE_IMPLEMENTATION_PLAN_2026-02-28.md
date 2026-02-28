# STITCH 기반 F/E 변경 실행 계획 (2026-02-28)

## 1) 의도/범위

- 목적: 현재 Urban-DDS SPA를 `stitch/code.html`의 Ops Center HUD 톤으로 재디자인
- 범위: 화면 기능은 기존 유지, 표현 방식만 변경
  - 데이터 소스/API는 `app/page.tsx`의 기존 플로우 유지
  - 컴포넌트 분리/스타일 토큰 재정의 중심으로 구현
- 직접 참조 기준:
  - `STITCH_UI_FE_CHANGE_PLAN_2026-02-28.md`
  - `stitch/code.html`

## 2) 현재 상태 대비 설계 방향

- 현재
  - 단일 파일 `app/page.tsx`에서 모든 UI 로직 및 렌더 수행
  - 다크톤 카드형 레이아웃(`app/globals.css`) + 간단한 버튼/리스트 구성
  - 상태: `summary`, `report`, `recentReports`, `health`, `loading*`, `error`
- 목표
  - 스티치 느낌의 상단 헤더 + 중앙 명령 영역 + 퀵 타겟 + 분석/히스토리 패널 + 하단 HUD 계열 배치
  - 기존 상태를 그대로 쓰되 시각 표현만 HUD 스타일로 재해석
  - 기능 훼손 방지(주소 검색 → 요약 조회 → 분석 실행 → 최근 이력 조회)

## 3) 데이터/로직 유지 범위 (중요)

- 유지 API
  - `GET /api/health`
  - `GET /api/region/summary`
  - `POST /api/analysis/report`
  - `GET /api/analysis/reports`
- 유지 상태/트리거
  - `fetchSummary(address)` 호출 트리거
  - `requestAnalysis()` 호출 트리거
  - `health` 재조회 시점(요약/분석 후)
  - 최근 분석 5건 조회 로직(`limit=5`)
- 유지 에러/로딩 플래그 의미
  - `loadingSummary`, `loadingReport`, `loadingRecentReports`, `error`
- 입력/호환성
  - 기존 `QUICK_ADDRESSES` 버튼 동작 유지
  - `summary` 존재 시 분석 버튼 활성 조건은 그대로 유지

## 4) 구조 변경안 (컴포넌트 분해)

현재는 `components` 폴더가 없으므로, 다음과 같이 새 폴더 추가가 선행됩니다.

1. `app/ui/hud/HudStatusBar.tsx`
   - NET/AI/DB 상태칩, 설정 버튼, Health 상태 표시
2. `app/ui/hud/CommandInputPanel.tsx`
   - 입력창, INPUT MODE/MAX RESULTS 메타, submit 핸들러 위임
3. `app/ui/hud/QuickTargetGrid.tsx`
   - 기존 `QUICK_ADDRESSES` 렌더(현재 버튼 3개 → 4개 확장 가능)
4. `app/ui/metrics/ScoreGrid.tsx`
   - 기존 metric card 4개(aging/infra/market/policy)
5. `app/ui/analysis/ReportPanel.tsx`
   - executive summary, evidence, risks, actionPlan 렌더
6. `app/ui/analysis/RecentActivityPanel.tsx`
   - 기존 최근 분석 목록을 `Recent System Activity` 느낌(타임스탬프 스타일) + 실제 데이터 유지
7. `app/ui/hud/HudBottomUtility.tsx`
   - 하단 메모리/좌표 표시(문자열형/더미 또는 실제값)

## 5) `stitch/code.html` 기준 디자인 토큰 매핑

- 컬러/테마
  - `--background-dark: #050505`
  - `--surface-dark: #0A0A0A`
  - `--line: #151515`
  - `--primary: #06E8F9`
  - `--success: #00FF94`
  - `--alert: #FF003C`
  - `--text-main: #E0E0E0`
  - `--text-muted: #404040`
- 폰트
  - Display: `Space Grotesk`
  - Body: `Noto Sans KR`
  - Mono: `JetBrains Mono`
  - 추가: Material Symbols Outlined 아이콘(헤더/상태 표시 아이콘)
- 장식/효과
  - 배경: 40px 그리드 패턴 오버레이(현재의 radial gradient 대비 강화형)
  - scanline, flicker, glow, corner bracket(모서리 라인) 효과
  - 입력 커서 blink + placeholder overlay 논리(실제 값 입력 시 숨김)
- 레이아웃 규칙
  - Desktop: 헤더 60px 고정, 상단 바 + 중앙 커맨드 + 하단 유틸
  - Mobile: 단일 컬럼/패널 세로 정렬로 정리

## 6) 단계별 작업 계획

### Phase 0. 베이스 준비 (Day 1)
- `app/layout.tsx`
  - `JetBrains Mono` preload font 추가 (`next/font/google`)
  - 전역 class 적용은 기존 유지 + HUD에 맞는 font 변수 보강
- `app/globals.css`
  - 위 토큰을 기준으로 변수 교체/추가
  - 공통 유틸 클래스 추가: `.hud-shell`, `.hud-panel`, `.hud-chip`, `.hud-border-corner`, `.scanline-overlay`, `.hud-input`, `.status-pill`, `.metric-good/warn/bad`

### Phase 1. 화면 구조 재조립 (Day 1~2)
- `app/page.tsx`에서 기능성 로직 분리
  - API 호출 함수/상태/형변환은 그대로 유지
  - 상단 헤더, 커맨드, 퀵 타겟, 리포트, 히스토리 UI를 컴포넌트로 추출
  - 인라인 스타일을 클래스로 이동(기존 `style={{ ... }}` 최소화)

### Phase 2. HUD 비주얼 적용 (Day 2~3)
- 상단 헤더 구현
  - 좌측 로고/버전/좌우 상태칩 배치
  - 중앙 틱커/스캔라인/상태 문자열은 고정 문자열 + 실시간 값 바인딩
- 중앙 커맨드 존
  - `>` 프리픽스, 대형 입력 텍스트(키보드 UX 강화)
  - placeholder blink cursor 구현(단순 JS 없이 `useEffect` + state 토글 가능)
- 퀵 타겟
  - 기존 3개 버튼 + 지역 라벨/코드 표시 패턴 추가
- 분석/히스토리 패널
  - 기존 값맵핑(요약/메타/리스크/액션플랜)은 유지하되 HUD card 스타일 적용
- 하단 유틸
  - 메모리 바/좌표 영역은 현재 값 미사용이면 placeholder 또는 mock로 시작 후 추후 실 데이터 연동

### Phase 3. 동작 보강/접근성 (Day 4)
- 로딩/에러 상태를 HUD 표기 규칙으로 통일
  - `loadingSummary`: 입력 커맨드/버튼/칩 dim 처리
  - `loadingReport`: Analysis panel 상단 진행 라인
  - `error`: 경고 색(alert) 박스와 아이콘
- 키보드 UX
  - Enter 즉시 검색 유지
  - 버튼 focus-visible 스타일 강화
- `npm run typecheck` + `npm run build` 통과 확인

### Phase 4. QA 및 롤아웃 (Day 4~5)
- 기능 회귀 테스트 시나리오
  1. 검색/요약 정상 렌더
  2. 분석 실행 후 리포트 저장 헤더 및 근거/리스크 렌더
  3. 최근 이력(limit=5) 표시
  4. health 확인(`status ok/error`) 표기
  5. 모바일 폭(<920)에서 단일 컬럼 정렬 및 오버플로우 점검
- 성능/가독성
  - 애니메이션 과다면 `prefers-reduced-motion` 대응 추가

## 7) 구현 산출물

- 파일 변경 예상
  - 수정: `app/page.tsx`, `app/globals.css`, `app/layout.tsx`
  - 신규: `app/ui/hud/*`, `app/ui/metrics/*`, `app/ui/analysis/*` (최소 6~7개 컴포넌트)
- 산출물 문서
  - `frontend_structure_and_rendering_guide.md`와 본 계획서로 정합성 업데이트 필요

## 8) 리스크/의사결정 포인트

- 리스크: 단일 파일 리팩터링 시 상태 prop 전달 증가 → 컴포넌트 경계 설계 실수 가능
- 대응: `app/page.tsx`를 먼저 상태 허브로 두고, dumb component를 먼저 2~3개만 분리 후 점진 확장
- 리스크: HUD 애니메이션 과다로 낮은 성능 이슈
- 대응: 애니메이션은 `scanline`/`blink`만 핵심 사용, 기본 패널은 CSS 최적화
- 리스크: 사용자 정보 밀도 과다
- 대응: 모바일에서 핵심 정보 3세트만 노출 + 펼침형 섹션 도입

## 9) 바로 시작할 우선순위

1. 폰트/토큰 갱신 (`layout.tsx`, `globals.css`)
2. 헤더 + 입력 + 퀵 타겟의 HUD 뼈대 렌더
3. metric card + report panel 스타일 이전
4. 최근 분석 목록 + 상태 표시 마무리
5. 반응형 및 접근성 마무리
