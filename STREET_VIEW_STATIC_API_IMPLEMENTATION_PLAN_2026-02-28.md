# Street View Static API 기반 "노후화 분석 뷰" 구현 계획

작성일: 2026-02-28  
버전: v1.0  
범위: `app/`, `lib/`, `types/`, `.env.example`

## 1) 목표

- 지역 검색 결과에 실제 지도뷰 기반 이미지를 추가해 기존 카드형 분석 UI를 보강
- 사용자 입력(주소/지역) → 중심좌표 기반으로 Street View 이미지를 호출
- API 키 노출 없이 서버에서 이미지를 제공(프록시)하고, 클라이언트는 `<img src="/api/...">`로 표시
- 노후화 판단 보조 지표를 위해 화면 상에서 "Aged" 분위기/필터 옵션 지원
- 실패/빈 값/요청제한 상황에서 기본 대체 UI 제공

## 2) 현재 구조와 결합 포인트(현재 코드 기준)

### 2-1) 기존 데이터 소스
- `app/api/region/summary/route.ts` -> `lib/server/regionService.ts` -> `lib/adapters/regionDataAdapter.ts`
- 지역 요약은 `mockRegions`의 `center: { lat, lng }`를 이미 보유
- 현재 Frontend `app/page.tsx`는 `/api/region/summary` 응답을 받아 `summary`를 표시

### 2-2) 표시 위치 후보
- `app/page.tsx`의 `hud-grid-main` 영역 옆에 `Report`와 병렬/하단의 "Scene" 패널 추가
- `app/ui/map/RegionMapPanel.tsx`가 이미 `center`, `regionName`, `loading` props를 받으므로 재사용 가능

### 2-3) 공통 제약
- 현재 타입(`types/contract.ts`)에 지도 좌표가 노출되지 않아, 타입 정합성 보정 필요
- Frontend `app/globals.css`에 HUD 스타일이 존재하므로 새 패널/스켈레톤/에러 배지는 기존 톤으로 통일 가능

## 3) API 설계

### 3-1) 새 API 라우트
- 경로: `app/api/visual/street-view/route.ts` (예시)
- 입력:
  - `lat`(필수), `lng`(필수), `size`(선택, 기본 1024x576),
  - `heading`, `pitch`, `fov`(선택),
  - `mode`(선택: `current | aged`)
- 처리:
  - 좌표 유효성 검사(숫자 범위 검증)
  - Google Street View Static API URL 생성
  - 서버 fetch(서버 키 사용) 후 원본 JPEG를 그대로 응답
- 출력:
  - `image/jpeg` 응답 스트림
  - 에러 시 JSON 폴백 메시지 (`error`, `code`, `status`)

### 3-2) API 키/환경변수
- `.env` / `.env.example`에 새 키 추가:
  - `GOOGLE_MAPS_API_KEY=...`
  - 선택: `GOOGLE_MAPS_API_URL_STREETVIEW`, `GOOGLE_MAPS_API_URL_STREETVIEW_META` (기본값 사용 가능)
- 키는 클라이언트로 전달 금지, Route 내부에서만 사용

## 4) 구현 단계

### Phase 1. 타입 + 데이터 정합화 (1차)

1. `types/contract.ts`
   - `RegionSummaryResponse`에 좌표/맵 메타(optional) 정식 반영
     - `center?: { lat: number; lng: number }`
     - `sceneImageHint?: string`(선택)
   - 분석 패널에서 필요한 scene 상태 타입 추가
     - `StreetViewStatus` 타입(optional, 사용성 목적)

2. `lib/server/regionService.ts`
   - `getRegionSummary()` 반환 객체에서 `center`가 누락되지 않도록 타입 일치 점검
   - 요약 API에서 좌표를 확실히 내려주도록 단언/포맷 정리

3. `app/api/region/summary/route.ts`
   - summary 응답 구조가 프런트 계약과 일치하는지 테스트/정렬

### Phase 2. Street View 프로바이더 서비스 분리 (2차)

4. `lib/server/streetViewService.ts` 신규 생성
   - Street View URL 생성기
   - 이미지 URL 호출 규칙(크기/회전/기울기/시야각) 정규화
   - 실패 시 Fallback URL 또는 placeholder hash 반환
   - 캐시 키 생성(`lat/lng/size/heading/pitch/fov`)

5. `app/api/visual/street-view/route.ts` 신규 생성
   - Query 값 검증
   - 서버 key로 Google API 호출
   - `image/jpeg`로 pass-through 반환
   - `Cache-Control` 및 `ETag`/`Last-Modified` 고려

6. (선택) 메타 API 분리
   - 날짜/파노라마 id 추출용 `app/api/visual/street-view-meta/route.ts`
   - 실제 과거 pano 연동이 가능할 경우 사용

### Phase 3. UI 컴포넌트 (3차)

7. `app/ui/analysis/StreetViewPanel.tsx` 신규 생성
   - props:
     - `center`, `regionName`, `loading`, `mode`
   - 상태:
     - 로딩 스켈레톤
     - 실패 메시지
     - 주소/좌표 라벨
     - 다시시도 버튼
   - 이미지 노출:
     - `img` 또는 `Image` 태그로 `/api/visual/street-view?...` 사용

8. `app/page.tsx`
   - summary 조회 성공 시 `summary.center`로 `StreetViewPanel` 호출
   - `mode`를 `current | aged` 토글로 상태 관리
   - quick target 선택/입력 변경과 연동해 panel 자동 업데이트

9. `app/globals.css`
   - `hud-street-view`, `hud-street-view-toolbar`, `hud-street-view-fallback` 스타일 추가
   - "노후화 뷰" 토글용 배지/버튼 디자인 추가

## 5) 노후화 느낌 처리(핵심 UX 설계)

- 실제 과거 이미지 사용 가능성이 낮을 때를 위한 fallback 전략:
  1) 우선 `mode=current`: 기본 Street View 표시
  2) `mode=aged`: 시각 효과(저채도, 대비 상승, 그레인, 약한 노이즈 오버레이)
  3) 이후 정책상 과거 pano 연동 가능 시 metadata 기반으로 기존 panorama 교체
- 과도한 시각 효과는 접근성 대비 저하를 방지하기 위해 사용 안 함/저해상도 모드에서 비활성

## 6) 에러 처리 및 보안

- 좌표 누락:
  - `summary.center` 미존재 시 "위치 기반 이미지 준비 중" placeholder
- API key 미설정:
  - 500/401 에러를 식별하고 사용자 텍스트로 안내
- 레이트 제한:
- 요청 폭주 시 서버에서 간단한 캐시 TTL 적용
- 개인정보/권리:
  - 사용자의 로컬 이미지 캐시 정책 공지

## 7) 성능/비용 최적화

- 요청 크기 고정 제한(`size=960x540` 권장)로 요금/트래픽 제어
- 동일 좌표 중복 호출 방지(메모리 캐시/LRU + HTTP 캐시 헤더)
- 페이지 진입 시 즉시 로드가 아닌 사용자가 패널 진입 시 지연 로딩 적용

## 8) 테스트/검증 체크리스트

1. 정상 동작
- 서울/강남/강북 샘플 3개 지역에서 이미지 노출 확인
2. 경계 케이스
- 존재하지 않는 좌표, 네트워크 단절, API key 누락
3. 모바일
- 390/768/1024에서 카드 비율 유지 및 렌더링 깨짐 없음
4. 가시성
- 로딩, 에러, 빈 상태 메시지 일관성
5. 배포 전
- `npm run typecheck`
- `npm run build`

## 9) 산출물 / 작업 대상 파일 목록

- `types/contract.ts`
- `lib/server/streetViewService.ts` (신규)
- `app/api/visual/street-view/route.ts` (신규)
- `app/ui/analysis/StreetViewPanel.tsx` (신규)
- `app/page.tsx`
- `app/globals.css`
- `.env.example`

## 10) 리스크

- Google Street View API quota/요금: 사용량 관리(크기/요청 횟수 제한) 필요
- 실제 역사 이미지 접근성: 과거 시점 매칭은 추가 확인 필요
- 현재 `RegionSummaryResponse` 타입과 실제 요약 객체의 정렬 이슈 존재 가능성: Phase 1에서 선행 정리 필수

