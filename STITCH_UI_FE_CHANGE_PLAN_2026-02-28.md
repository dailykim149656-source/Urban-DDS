# Urban-DDS Stitch 기반 F/E UI 변경 계획서

기준일: 2026-02-28  
레퍼런스: `stitch/code.html`, `stitch/screen.png`  
대상 화면: `app/page.tsx` (메인 대시보드), `app/globals.css` (전역 UI 토큰/스타일)

## 1) 목적

1. 현재 Urban-DDS 대시보드를 `stitch`의 Ops Center 스타일로 전환한다.
2. 기존 기능(지역 조회, 분석 실행, 이력 조회)은 유지한다.
3. 해커톤 데모 기준으로 시각 완성도와 상태 전달력(로딩/오류/헬스)을 높인다.

## 2) 목표 디자인 요약

1. 다크 HUD 톤
- 블랙 계열 배경 + 시안 포인트 + 모노 상태 텍스트
- 그리드 패턴, 스캔라인, 약한 글로우

2. 정보 구조
- 상단 고정 헤더: 브랜드, 시스템 티커, NET/AI/DB 상태
- 중앙 커맨드 입력: 주소/지역 검색의 핵심 인터랙션
- 중단 빠른 타깃 버튼: 퀵 주소 실행
- 하단 분석/로그 패널: 결과 리포트 + 최근 이력

3. 상호작용
- 입력 포커스, 활성 타깃, 로딩/오류를 HUD 스타일로 통일
- `health`, `loadingSummary`, `loadingReport`, `error` 상태를 시각적으로 직접 반영

## 3) 적용 범위

필수 변경 파일:
1. `app/page.tsx`
2. `app/globals.css`

선택(리팩터링 시):
1. `components/ui/OpsHeader.tsx`
2. `components/ui/CommandInput.tsx`
3. `components/ui/QuickTargetGrid.tsx`
4. `components/ui/ReportPanel.tsx`
5. `components/ui/ActivityLog.tsx`

비범위:
1. API 계약 변경
2. 백엔드 비즈니스 로직 변경
3. Firestore 저장 스키마 변경

## 4) 디자인 토큰 계획

1. 컬러 토큰(초안)
- `--bg: #050505`
- `--surface: #0A0A0A`
- `--line: #151515`
- `--primary: #06E8F9`
- `--success: #00FF94`
- `--alert: #FF003C`
- `--text-main: #E0E0E0`
- `--text-muted: #404040`

2. 폰트 역할
- Display: `Space Grotesk`
- Body: `Noto Sans KR`
- Mono: `JetBrains Mono`

3. 효과 토큰
- `--glow-primary`: primary 글로우
- `--scanline-opacity`: 스캔라인 강도
- `--grid-size`: 배경 그리드 간격

## 5) 화면 구조 변경안

1. Top Header (`60px` 고정)
- 좌측: 로고/버전
- 중앙: 시스템 티커 텍스트
- 우측: `NET`, `AI`, `DB` 상태 + 설정 버튼 자리

2. Main Command Area
- 좌우 여백 확보된 중앙 정렬 컨테이너
- 프롬프트형 입력(`>` 접두) + 커서 블링크
- 보조 메타라인: `INPUT MODE`, `MAX RESULTS`

3. Quick Access Targets
- 기존 `QUICK_ADDRESSES`를 카드형 토글로 변환
- 선택 중 타깃은 `primary` 채움 상태로 강조

4. Analysis/History Panels
- 분석 리포트: 시나리오, 점수, 신뢰도, 요약, 근거, 리스크, 액션플랜
- 최근 이력: 시간/모델/버전 중심의 모노 로그 스타일

5. Bottom Utility (선택)
- 메모리/좌표 등 보조 HUD 요소를 장식적으로 배치
- 모바일에서는 자동 숨김 또는 축약

## 6) 상태 매핑 규칙

1. Health 상태
- `health.status === "ok"`: `success` 점등
- 그 외/미확인: muted 또는 alert

2. 요약 로딩
- 조회 버튼 비활성 + 입력 라인 강조 애니메이션

3. 분석 로딩
- 분석 버튼 로딩 문구 + 상단 progress bar 진행 상태 표현

4. 오류 상태
- HUD 경고 패널(`alert` 컬러)로 표시
- 기존 메시지 텍스트는 그대로 사용

## 7) 반응형 기준

1. Desktop (>= 920px)
- 헤더 전체 요소 표시
- 메인 영역 2단 또는 1단+보조패널 구성

2. Mobile (< 920px)
- 티커 축약/숨김
- 입력/버튼/결과를 세로 스택
- 하단 장식 HUD 요소 축소

## 8) 구현 단계

## Phase 1. 스타일 시스템 전환
1. `app/globals.css` 토큰/기본 배경/애니메이션 정의
2. 공통 컴포넌트 클래스(`hud-panel`, `hud-chip`, `hud-input`) 작성

## Phase 2. 레이아웃 골격 전환
1. `app/page.tsx`를 Header + Command + Panels 구조로 재배치
2. 기존 상태/이벤트 핸들러는 유지하여 기능 회귀 방지

## Phase 3. 상태 시각화 연결
1. `health`, `loading*`, `error`와 HUD UI를 연결
2. 퀵타깃 active 상태/hover 상태 확정

## Phase 4. 반응형/마감 정리
1. 모바일 레이아웃 미세 조정
2. 텍스트 대비/포커스 링/키보드 접근성 확인

## 9) 완료 기준 (DoD)

1. 기존 사용자 플로우 유지
- 주소/타깃 선택 -> 지역 조회 -> Gemini 분석 -> 결과 확인

2. UI 목표 달성
- `stitch` 톤(다크 HUD + 시안 강조 + 모노 로그) 반영
- 레이아웃 의도(헤더/커맨드/패널) 반영

3. 품질 기준
- 데스크톱/모바일 모두 레이아웃 깨짐 없음
- 로딩/오류/빈 상태가 시각적으로 구분됨

4. 기술 기준
- `npm run typecheck` 통과
- `npm run build` 통과

## 10) 리스크 및 대응

1. 리스크: 스타일 전환 중 가독성 저하
- 대응: 본문/보조 텍스트 대비값 최소 기준 유지

2. 리스크: 과한 애니메이션으로 성능 저하
- 대응: 애니메이션 수를 핵심 2~3개로 제한

3. 리스크: 기능 회귀
- 대응: UI 구조만 변경, API 호출 함수/상태 로직은 최대한 유지

## 11) 작업 분담 제안 (Terminal A/B + 검증)

1. Terminal A (UI 구현)
- `app/page.tsx` 구조 재작성
- `app/globals.css` 스타일 시스템 적용

2. Terminal B (UI 세부 완성)
- 반응형/미세 인터랙션/문구 톤 정리
- 최근 이력/리포트 가독성 개선

3. 검증(Codex)
- 타입/빌드 검증 게이트
- `stitch` 레퍼런스 대비 반영률 체크
- 회귀 포인트(API 흐름) 점검

## 12) 바로 실행할 1차 태스크

1. `app/globals.css` 토큰을 stitch 팔레트로 교체
2. `app/page.tsx` 상단 헤더 + 중앙 커맨드 블록으로 재배치
3. 기존 `QUICK_ADDRESSES`를 타깃 카드형 버튼으로 변경
4. 분석/이력 패널을 HUD 스타일로 통일
