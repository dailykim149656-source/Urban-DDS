# Urban-DDS GIS 지도 표시 기능 통합 계획

기준일: 2026-02-28  
목표: 현재 대시보드에 지역 GIS 지도를 표시하고, 조회한 지역의 위치를 시각적으로 확인 가능하게 한다.

## 1) 현재 상태 진단

1. F/E에 지도 컴포넌트 없음
- 현재 화면 구성: 입력/HUD 상태/점수/리포트/최근 이력
- 지도 렌더링 라이브러리(`leaflet`, `react-leaflet`) 미도입

2. 데이터 모델에 좌표 정보 없음
- `types/domain.ts`의 `RegionDataRecord`에 `lat/lng` 또는 경계(bbox) 필드 없음
- `region summary` 응답(`types/contract.ts`)에도 좌표 정보 없음

3. API는 텍스트 기반 지역 응답까지만 제공
- `/api/region/summary`로 지역 메타/지표는 내려오지만 지도 중심좌표는 없음

결론:
- “GIS가 안 보이는” 상태는 정상이며, 지도 표시를 위해 FE+타입+데이터를 함께 확장해야 함.

## 2) 구현 전략 (권장)

## MVP (빠른 적용)

1. 지도 엔진
- `react-leaflet + leaflet` 사용 (오픈소스 타일, 빠른 적용)

2. 좌표 소스
- 우선 `mock region` 데이터에 중심좌표(`center`)를 하드코딩
- 주소 검색 결과 지역의 중심점으로 지도 이동/마커 표시

3. UI 위치
- 현재 `Region Search / Summary` 패널 하단 또는 좌측에 `Map Panel` 추가
- 모바일에서는 점수 카드 아래로 스택

## 확장 (2차)

1. 주소 정밀 좌표화
- 외부 지오코딩 API(`vworld/juso`) 연동

2. 영역 시각화
- 중심점 + 경계 폴리곤/GeoJSON 표시

3. 히스토리 연동
- 최근 분석 기록 클릭 시 해당 지역으로 지도 포커싱

## 3) 데이터/계약 변경안

1. `types/domain.ts`
- `RegionDataRecord`에 위치 필드 추가:
  - `center: { lat: number; lng: number }`
  - (선택) `bounds?: [[number, number], [number, number]]`

2. `types/contract.ts`
- `RegionSummaryResponse`에 위치 필드 추가:
  - `center: { lat: number; lng: number }`

3. `lib/adapters/regionDataAdapter.ts`
- mock 데이터(`서울`, `강남구 대치동`, `강북구 미아동`)에 중심좌표 입력

4. `lib/server/regionService.ts`
- summary 응답에 `center` 포함

## 4) FE 구성 변경안

1. 의존성 추가
- `leaflet`
- `react-leaflet`
- `@types/leaflet` (TS 안정성)

2. 신규 컴포넌트
- `app/ui/map/RegionMapPanel.tsx`
  - props:
    - `center?: { lat: number; lng: number }`
    - `regionName?: string`
    - `loading?: boolean`
  - 동작:
    - center 존재 시 해당 좌표로 이동 + 마커 표시
    - 없으면 기본 좌표(서울) + 안내 문구

3. 스타일
- `app/globals.css`에 HUD 톤에 맞는 map 패널 스타일 추가
- Leaflet default CSS 로딩 처리

4. 페이지 연결
- `app/page.tsx`에서 `summary?.center`를 지도 패널에 전달
- `onQuickTargetSelect`, `fetchSummary`와 자동 동기화

## 5) 단계별 실행 계획

## Phase 1. 타입/데이터 정비
1. `RegionDataRecord`, `RegionSummaryResponse`에 `center` 필드 정의
2. mock region 데이터에 좌표 입력
3. `/api/region/summary` 응답에 좌표 포함

## Phase 2. 지도 컴포넌트 추가
1. 라이브러리 설치
2. `RegionMapPanel` 구현
3. `app/page.tsx`에 패널 배치

## Phase 3. UX 정리
1. 로딩/빈 상태/오류 상태 UI 추가
2. 모바일 반응형 최적화
3. quick target 클릭 시 지도 포커스 애니메이션

## Phase 4. 검증
1. `npm run typecheck`
2. `npm run build`
3. 조회 시 지도 이동/마커 렌더링 수동 검증

## 6) 완료 기준 (DoD)

1. 지역 조회 성공 시 지도에 해당 지역 마커가 보인다.
2. quick target 변경 시 지도가 해당 좌표로 이동한다.
3. 비조회 상태에서도 지도 컴포넌트가 깨지지 않는다.
4. 데스크톱/모바일에서 레이아웃 깨짐 없이 표시된다.
5. 타입체크/빌드가 통과한다.

## 7) 리스크 및 대응

1. 타일 서버 정책/속도 이슈
- 대응: 기본 OSM 사용 + 필요 시 자체 타일 또는 다른 provider로 교체

2. SSR/CSR 충돌 (`window` 의존)
- 대응: 지도 컴포넌트는 클라이언트 컴포넌트로 분리하고 dynamic import 사용

3. 좌표 품질 부족
- 대응: 1차는 mock 중심좌표, 2차에 지오코딩 API로 정밀화

## 8) 작업 분담 제안 (Terminal A/B + 검증)

1. Terminal A (API/데이터)
- 타입/summary 응답 확장
- mock 좌표 입력

2. Terminal B (FE/UI)
- 지도 컴포넌트 구현/배치
- HUD 스타일 통합

3. 검증(Codex)
- 타입/빌드 게이트
- 지도 표시/이동 시나리오 검증

## 9) 바로 시작 가능한 최소 태스크

1. `types/domain.ts`, `types/contract.ts`에 `center` 필드 추가
2. `regionDataAdapter` mock 데이터에 좌표 입력
3. `regionService` summary 응답에 `center` 전달
4. `RegionMapPanel` 추가 후 `app/page.tsx`에 연결
