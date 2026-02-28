# Urban-DDS 최종 검증 요약

작성일: 2026-02-28

## 1. 범위
- 구 단위 조회 확장
- 공공데이터(실거래가/건축물) 연동 안정화
- Gemini 분석 연동 검증
- 디버그 API 추가

## 2. 주요 변경 사항
- `types/domain.ts`
  - `BuildingLookupKey.bjdongCd`를 optional로 변경

- `lib/adapters/public/publicDataHttp.ts`
  - endpoint 쿼리 병합 로직 보강
  - 공공데이터 응답 메타(`resultCode`, `resultMsg`, `totalCount`) 추출 함수 추가
  - `resultCode` 허용값 보강 (`0`, `00`, `000`, `03`)

- `lib/adapters/public/buildingLedgerAdapter.ts`
  - `getBrTitleInfo` + `getBrRecapTitleInfo` fallback 구성
  - `sigunguCd` 단독 조회 fallback 추가
  - 무데이터 메타 로깅 보강

- `lib/adapters/public/apartmentTradeAdapter.ts`
  - 키 인코딩 이슈 정리(유니코드 이스케이프 기반)
  - 월별 요청 실패 시 전체 즉시 실패하지 않도록 보강

- `lib/server/externalDataService.ts`
  - 구 단위 building lookup 후보 다중 생성/순차 fallback
  - 구별 seed(`bjdongCd`) 우선 시도 후 `sigunguCd` fallback
  - 시도 횟수/실패 사유 집계 유지

- `app/api/debug/public-data/route.ts` (신규)
  - 공공데이터 외부 호출 진단 API 추가
  - `mode=all|trade|building-title|building-recap`
  - HTTP 상태, body 길이, 파싱 결과, resultCode/resultMsg, parsedItems 제공

- `datadocs/public_data_debug_endpoint.md` (신규)
  - 디버그 API 사용법 문서

- `datadocs/building_api_diagnosis_checklist.md` (신규)
  - 건축물 API 진단 체크리스트/분업 계획

## 3. 최종 검증 결과
검증 대상 주소:
- 서울 강남구
- 서울 마포구
- 부산 해운대구
- 인천 연수구
- 대전 유성구

검증 결과:
- `/api/region/summary` 모두 `200`
- 모두 `buildingFactsStatus=ok`
- 모두 `hasBuilding=true`
- 모두 `hasTrade=true`

분석 API:
- `POST /api/analysis/report` `200`
- `aiSource=gemini`

## 4. 원인/해결 핵심
- 원인:
  - 구 단위에서는 건축물 API에 필요한 동/번지 정보 부족으로 `no-data` 빈발
  - 일부 응답 코드/인코딩 처리로 실거래가가 false로 떨어지는 회귀 가능성 존재

- 해결:
  - 구별 대표 `bjdongCd` seed + 순차 fallback 도입
  - resultCode 판정/키 인코딩/요청 실패 처리 안정화
  - 디버그 API로 외부 응답 상태 즉시 진단 가능화

## 5. 현재 상태 판정
- 구 단위 조회/분석 파이프라인: 정상
- 실거래가 + 건축물 + Gemini: 동시 정상 동작 확인
- 운영 관점 진단 도구: 준비 완료

## 6. 권장 후속 작업
1. 구별 `buildingLookup` seed를 추가 확장해 적중률 고도화
2. `request-failed` 케이스에 대한 재시도/알림 정책 정의
3. UI에서 `buildingFactsStatus`/`attempts`를 운영자용으로 노출(옵션)
