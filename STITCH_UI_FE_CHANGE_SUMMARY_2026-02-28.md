# STITCH UI F/E 변경 정리 (2026-02-28)

작성일: 2026-02-28  
대상:
- `STITCH_UI_FE_CHANGE_PLAN_2026-02-28.md`
- `app/page.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `app/ui/*` 컴포넌트

## 1) 현재 구조(구성)

### 1-1. 페이지 진입점
- `app/page.tsx`
  - 전체 상태 기획/데이터 흐름/이벤트 핸들러 중심의 컨테이너.
  - 화면 렌더링은 하위 UI 컴포넌트로 위임.
  - API 호출/에러/로딩/요약/리포트/최근이력 상태를 중앙에서 관리.

### 1-2. 레이아웃/폰트
- `app/layout.tsx`
  - `Noto Sans KR`, `Space Grotesk`, `JetBrains Mono`를 CSS 변수(`--font-base`, `--font-accent`, `--font-code`)로 주입.
  - 메타데이터 description 값 반영.

### 1-3. 디자인 토큰 + 공통 스타일
- `app/globals.css`
  - STITCH 느낌의 HUD 토큰과 오버레이(그리드/스캔라인/글로우) 정의.
  - 상태 바, 입력 패널, 패널, 버튼, 메트릭, 타임라인 등 핵심 클래스 포함.
  - 미디어 쿼리(`max-width: 920px`)와 `prefers-reduced-motion` 대응 포함.

### 1-4. UI 컴포넌트 분해
- `app/ui/hud/HudStatusBar.tsx`  
  - 헤더 영역: 브랜드/티커/NET·AI·DB 상태 펄스 표시.
- `app/ui/hud/CommandInputPanel.tsx`  
  - 입력 폼(`>` 프롬프트), 입력 모드 라벨, quick target 칩 렌더링.
- `app/ui/hud/HudBottomUtility.tsx`  
  - 하단 유틸(메모리/좌표/운영 상태) 영역.
- `app/ui/metrics/ScoreGrid.tsx`  
  - Aging/Infra/Market/Policy score 카드 렌더링.
- `app/ui/analysis/ReportPanel.tsx`  
  - Gemini 분석 리포트(요약/증거/위험/액션플랜).
- `app/ui/analysis/RecentActivityPanel.tsx`  
  - 최근 분석 이력 타임라인 스타일 목록으로 구현.

## 2) 데이터/상태 관리 및 기능 동작

### 2-1. 핵심 상태
- `address`: 검색 대상 주소/지역명.
- `health`: `/api/health` 응답 저장.
- `summary`: `/api/region/summary` 결과.
- `report`: `/api/analysis/report` 결과.
- `recentReports`: `/api/analysis/reports`(limit=5) 결과.
- `loadingSummary`, `loadingReport`, `loadingRecentReports`: 각 API 로딩 플래그.
- `error`: 에러 메시지 공통 표시.
- `isOnline`: 브라우저 online/offline 이벤트 기반.

### 2-2. API 호출 플로우
- `fetchHealth()`: `/api/health` 호출로 시스템 상태 반영.
- `fetchSummary(address)`:
  - summary 조회 후 성공 시 health 재확인.
  - 실패 시 error 세팅.
- `requestAnalysis()`:
  - 현재 `summary` 기반으로 `/api/analysis/report` POST.
  - 성공 시 최근이력 갱신 + health 갱신.
- `fetchRecentReports()`:
  - `/api/analysis/reports?limit=5` 호출 후 이력 업데이트.

### 2-3. 표현 방식(명령형 HUD)
- 상단 ticker: health 상태/REVISION/노드지연 텍스트를 조합해 실시간처럼 노출.
- 상태칩:
  - `NET`: 온라인/오프라인 상태.
  - `AI`: health status 기반 연결 상태.
  - `DB`: firestore 동기화 여부 표시.
- 입력 영역:
  - `HUD_COMMAND` 스타일 입력창과 overlay placeholder/커서.
  - `QUICK` 타겟 선택 시 즉시 조회 실행.
  - 현재 입력값과 일치하는 Quick target 칩을 강조(`hud-chip-active`).
- 분석/요약 패널:
  - 좌측: 지역 요약 + 메트릭 카드 + 분석 요청 버튼.
  - 우측: `ReportPanel`에 AI 추천 결과 표시.
- 최근 활동:
  - 리스트형에서 타임라인형으로 변경(마커 + 우측 상세 카드 + 시간정보).

## 3) 구현된 변경(지금까지 완료된 항목)

### 3-1. 화면/디자인
- STITCH 기반 다크 HUD 스타일 적용.
- 스캔라인·그리드·글로우 애니메이션 계열 추가.
- 카드/칩/상태창/로그 타임라인 스타일 규칙 적용.

### 3-2. 컴포넌트화
- 상단 상태, 입력 패널, 하단 유틸, 점수, 리포트, 최근이력 분리.
- `page.tsx`는 흐름 제어와 상태관리 역할로 정리됨.

### 3-3. 기능성 보강
- Online/Offline 감지 처리 추가.
- quick target active 매핑.
- 최근 분석 이력 타임라인 형태 적용.
- health 토글 텍스트/리비전(있을 경우) 반영.

## 4) 남은 과제(추천 다음 단계)

1. 텍스트 깨짐(인코딩) 정리
- 일부 문장에 깨짐 가능성이 남아있을 수 있어, 한글 리소스 정합성 점검 필요.

2. 건강 상태 타입 정합성
- `HealthResponse` 정의와 실제 API 응답 필드(예: revision) 재확인 필요.

3. 모바일 UX 추가 다듬기
- 920px 미만에서 타임라인 가독성/버튼 비율/타이포 간격 최종 점검.

4. 접근성 및 상태 메시지
- `role`, `aria-live`, focus 이동 방식 점검.

5. 배포 전 검증
- `npm run typecheck`, `npm run build` 실행 권장.

## 5) 작업 반영 여부 체크리스트

- [x] PLAN 기반 HUD 테마 기본 반영
- [x] `app/page.tsx`/`app/globals.css` 중심 재구성
- [x] HUD 컴포넌트 분해 적용
- [x] quick target active highlight 반영
- [x] Recent history timeline 전환
- [ ] 타입/실데이터 기반 세부 검증
- [ ] 전체 QA (반응형/접근성/엔드포인트 오류 처리) 마무리

## 6) 변경 파일 요약
- `app/layout.tsx`
- `app/globals.css`
- `app/page.tsx`
- `app/ui/hud/HudStatusBar.tsx`
- `app/ui/hud/CommandInputPanel.tsx`
- `app/ui/hud/HudBottomUtility.tsx`
- `app/ui/metrics/ScoreGrid.tsx`
- `app/ui/analysis/ReportPanel.tsx`
- `app/ui/analysis/RecentActivityPanel.tsx`

## 7) PR/변경 제출용 요약

### 요약
- STITCH 스타일의 HUD/콘솔형 F/E를 적용하고 `app/page.tsx` 중심의 상태 머신을 유지한 채 컴포넌트 분할을 완성했습니다.
- Quick target 활성 상태 하이라이트와 최근 분석 이력 타임라인 UX를 추가했습니다.
- 명령형 운영 화면(입력, 상태, 패널, 하단 유틸)을 하나의 흐름으로 정리했습니다.

### 주요 변경 내역
- `app/globals.css`
  - HUD 테마 토큰, 스캔라인/글로우 오버레이, 타임라인(마커/세로줄) 클래스 추가
  - quick chip 활성 스타일 및 상태/메트릭/리스트 계열 정리
- `app/page.tsx`
  - health 상태/로딩/에러/요약/리포트/최근이력 상태 정리
  - 네트워크 상태 감지 등록(`online`/`offline`)
  - quick target active 대상 값을 입력값 기반으로 전달
- `app/ui/hud/CommandInputPanel.tsx`
  - `activeTarget` prop 추가 및 quick chip 활성 토글 처리
- `app/ui/analysis/RecentActivityPanel.tsx`
  - 일반 목록에서 타임라인 형태로 변경(타임라인 마커, 정렬 가독성 개선)
- `app/layout.tsx`
  - Space Grotesk / Noto Sans KR / JetBrains Mono 폰트 변수화 반영

### 검증 포인트
- 로컬에서 다음 체크를 권장:
  - summary 조회 성공 시 패널/메트릭/버튼 상태 정상 여부
  - 분석 실행 후 리포트/최근이력 갱신 여부
  - quick target 선택 시 해당 칩 하이라이트 여부
  - 모바일 폭에서 레이아웃 중첩 여부

### 리스크/주의사항
- `app/page.tsx`에서 정의한 `HealthResponse`와 실제 API 응답 필드 정합성 점검 필요
- 한글 텍스트 인코딩 잔여 깨짐 여부 점검
- `.next`/빌드 캐시 영향으로 스타일 변경 미적용 이슈가 발생할 경우 정적 빌드 재실행 필요

### 롤백 플랜(최소 영향)
- 기능/스타일 분리된 구조를 유지하므로 롤백은 다음 단위로 수행 가능:
  1) `app/page.tsx`의 컴포넌트 조합만 이전 버전으로 교체
  2) `app/globals.css`에서 HUD/타임라인 신규 클래스를 제거
  3) `app/ui/*` 컴포넌트 교체 또는 삭제

## 8) 실행 우선순위(권장)

1. `npm run typecheck`, `npm run build`
2. quick target 5종 케이스(현재값/미일치/클릭/중복클릭/초기상태) 확인
3. 최근 이력 0건/1건/다건/네트워크 실패 시 메시지 정합성 확인
4. 모바일 390/768/920- 브레이크포인트에서 터치 타겟과 타임라인 가독성 최종 확인
