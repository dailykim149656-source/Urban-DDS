# 구 단위 지도/스트리트뷰 반영 계획

작성일: 2026-02-28

## 1. 목표
- 구 단위 조회 시 지도와 스트리트뷰가 같은 기준 좌표를 사용해 일관되게 갱신되도록 개선
- 사용자가 “구 단위로 반영되었다”를 화면에서 즉시 확인 가능하도록 시각 피드백 강화

## 2. 현재 코드 기준 진단
- `lib/server/regionService.ts`: `summary.center`를 그대로 내려줌
- `app/page.tsx`: `RegionMapPanel`, `StreetViewPanel`에 `summary.center` 전달
- `app/ui/map/RegionMapPanel.tsx`: 좌표 중심 점(마커)만 표시, 구 경계(폴리곤) 없음
- `app/ui/analysis/StreetViewPanel.tsx`: 요청 좌표 기준 이미지/메타 조회는 수행, 파노라마 실제 좌표(메타 location) 반영 UI 부족

핵심 갭:
- 구 경계 시각화 부재로 “구 단위 반영” 체감이 약함
- 스트리트뷰는 요청 좌표와 실제 파노라마 좌표가 다를 수 있는데 UI에서 구분되지 않음

## 3. 구현 계획

### 3.1 백엔드/데이터 레이어
1. 구 경계 데이터 소스 정의
- `regionCode -> GeoJSON polygon` 매핑 데이터 준비
- 최소 범위: 현재 지원 중인 구(강남/마포/해운대/연수/유성 등)부터 우선 적용

2. 응답 스키마 확장
- `types/contract.ts`의 `RegionSummaryResponse`에 필드 추가
- `mapGeometry`(GeoJSON), `mapCenterSource`(`seed|geometry-centroid`)
- `streetViewRequestedCenter`, `streetViewResolvedCenter`(optional)

3. Street View metadata 정규화
- metadata 응답에서 `status`, `location.lat/lng`, `pano_id`, `date`를 표준 DTO로 반환
- `ZERO_RESULTS`를 명시적으로 구분

### 3.2 지도 UI 반영
1. `app/ui/map/RegionMapPanel.tsx` 개선
- 폴리곤 있으면 폴리곤 우선 렌더
- 폴리곤 경계 기준 `fitBounds` 적용
- 폴리곤 없으면 기존 포인트 마커 fallback 유지

2. 반영 상태 표시
- 패널 상단에 `Resolved: {regionName} ({regionCode}, {level})`
- `Center Source` 배지(`seed`, `geometry-centroid`) 표시

3. 재렌더 안정화
- `center` 변경뿐 아니라 `regionCode` 변경 기준으로 뷰 갱신
- 이전 region의 잔상 방지(레이어 클리어)

### 3.3 스트리트뷰 UI 반영
1. `app/ui/analysis/StreetViewPanel.tsx` 개선
- 요청 좌표와 실제 파노라마 좌표를 모두 표시
- `status=OK`면 실제 좌표 기준으로 메타 표시
- `status=ZERO_RESULTS`면 명확한 안내 문구 출력

2. 좌표 동기화
- map 패널과 동일한 `resolvedRegion` 기준 상태를 사용
- 필요 시 `streetViewResolvedCenter`를 map 패널에 보조 마커로 표시(옵션)

3. 실패 처리
- 이미지 실패 시 단순 오류 대신 `status`, `reason`, `retry` 안내 표준화

### 3.4 페이지 상태 모델 정리
1. `app/page.tsx`에서 공통 뷰 상태 도입
- `resolvedRegionCode`, `resolvedLevel`, `mapCenter`, `mapGeometry`
- `streetViewRequestedCenter`, `streetViewResolvedCenter`, `streetViewStatus`

2. 두 패널이 같은 상태를 참조하도록 단일화
- 지도/스트리트뷰 간 좌표 불일치 방지

## 4. Terminal A/B 작업 분리

### Terminal A (구현)
1. 응답 스키마 확장 및 region summary payload 확장
2. 구 경계 데이터 연결(`mapGeometry`)
3. `RegionMapPanel` 폴리곤 렌더 + fitBounds 구현
4. `StreetViewPanel` 메타 기반 실제 좌표/상태 표시 구현

### Terminal B (검증)
1. 주소별 매핑 검증
- 서울 강남구, 서울 마포구, 부산 해운대구, 인천 연수구, 대전 유성구
2. 지도 검증
- region 변경 시 지도 중심/경계가 바뀌는지
- 폴리곤 없을 때 마커 fallback 동작 확인
3. 스트리트뷰 검증
- metadata `status`/`location` 표출 확인
- 요청 좌표 vs 실제 좌표 표시 확인
4. 회귀 검증
- `hasTrade`, `buildingFactsStatus`, `analysis/report(aiSource=gemini)` 정상 유지

## 5. 완료 기준 (DoD)
- 구 단위 5개 샘플에서 지도 패널이 구 경계 또는 구 중심을 명확히 반영
- 스트리트뷰 패널이 metadata 상태와 실제 좌표를 표시
- 지도/스트리트뷰가 동일 regionCode 기준으로 동기화
- 기존 분석/실거래가/건축물 기능 회귀 없음

## 6. 리스크 및 대응
- 리스크: 구 경계 데이터 품질 불균일
- 대응: 우선 지원 구부터 적용, 미지원 구는 center 마커 fallback

- 리스크: 스트리트뷰 미지원 좌표
- 대응: `ZERO_RESULTS` 상태 표준 노출 + 재시도 UX 제공
