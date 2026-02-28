# Urban-DDS 실데이터 연동 계획 (건축물대장 + 아파트 실거래가)

기준일: 2026-02-28  
목표: mock 중심 지표 계산을 공공데이터포털(data.go.kr) 실데이터 기반으로 전환

## 1) 왜 지금 이 계획이 핵심인지

1. 현재 점수 산정은 `mock` 기반이라 정책 신뢰도 한계가 큼.
2. 정비 시급성(노후도)과 사업성(시장성)은 아래 2개 소스가 핵심 근거.
- 건축물대장: 준공연도, 연면적, 용적률
- 아파트 매매 실거래: 최근 거래가격/거래량/추세

## 2) 확인된 대상 API (data.go.kr)

1. 국토교통부_건축HUB_건축물대장정보 서비스  
- https://www.data.go.kr/data/15134735/openapi.do
- JSON/XML 지원 (`_type=json` 가능)

2. 국토교통부_아파트 매매 실거래가 자료  
- https://www.data.go.kr/data/15126469/openapi.do
- 포털 화면의 “상세기능”에서 상세 조회 파라미터 사용

참고:
- 포털 명칭은 “상세 자료/자료”가 혼용됨. 실제 구현은 위 API 페이지의 상세기능 명세 기준으로 고정.

## 3) 현재 코드 기준 통합 지점

1. 데이터 어댑터 레이어
- `lib/adapters/**` 확장

2. 지역 요약 API
- `app/api/region/summary/route.ts`
- `lib/server/regionService.ts`

3. 분석 점수 계산
- `lib/scoring/calc.ts`
- `lib/server/analysisService.ts`

4. 저장소
- `lib/server/reportRepository.ts` (Firestore 저장 필드 확장)

## 4) 구현 단계

## Phase 0. 계약/환경변수 정리

1. `.env.example` 확장
- `DATA_GO_KR_SERVICE_KEY`
- `DATA_GO_KR_TIMEOUT_MS` (기본 8000)
- `REALDATA_ENABLED=true|false`

2. 타입 확장 (`types/domain.ts`, `types/contract.ts`)
- `BuildingFacts`
  - `avgCompletionYear`
  - `avgGrossArea`
  - `avgFloorAreaRatio`
  - `sampleSize`
- `TradeFacts`
  - `avgDealAmount`
  - `medianDealAmount`
  - `dealCount`
  - `priceTrend3m`
  - `period`

## Phase 1. API 어댑터 구현

1. 신규 파일
- `lib/adapters/public/buildingLedgerAdapter.ts`
- `lib/adapters/public/apartmentTradeAdapter.ts`
- `lib/adapters/public/publicDataHttp.ts` (공통 재시도/타임아웃)

2. 공통 규칙
- 서버에서만 호출 (API 키 클라이언트 노출 금지)
- 실패 시 에러 throw 대신 “부분 실패 상태” 반환
- 호출 결과 normalize 후 내부 타입으로 변환

## Phase 2. 지역코드/주소 매핑

1. 필요한 매핑 테이블 도입
- 법정동 코드/시군구 코드 매핑 파일 또는 API 연동

2. 현재 `regionCode`(`seoul`, `gangnam-daechi`)와 공공코드 연결
- `lib/adapters/regionDataAdapter.ts`에 `lawdCode`, `legalDongCode` 필드 추가

## Phase 3. 점수 알고리즘 실데이터 반영

1. 노후도(`agingScore`) 보정
- 준공연도 기반 건축 연령 지수
- 용적률/연면적 기반 정비 난이도 가중

2. 시장성(`marketScore`) 보정
- 최근 6개월 평균 거래금액
- 거래량(유동성)과 3개월 추세 반영

3. 계산식 버전 고정
- `reportVersion` 상향 (예: `3`)
- 계산식 변경 로그 문서화

## Phase 4. API 응답/저장 확장

1. `GET /api/region/summary` 응답 확장
- `buildingFacts`, `tradeFacts`, `dataFreshness`, `source`

2. `POST /api/analysis/report` 저장 확장
- Firestore 문서에 `externalData` 블록 저장

## Phase 5. F/E 노출

1. `app/page.tsx`
- “건축물 정보” 카드
- “실거래 요약” 카드
- “데이터 수집 시각/출처” 뱃지

2. GIS와 결합
- 지도 선택 지역과 동일 데이터 세트 표시

## 5) 캐시/성능/안정성

1. 캐시
- 키: `{lawdCode}:{yyyymm}:{dataset}`
- TTL: 24시간 (해커톤 기준)

2. 요청 제한 대응
- 429/5xx 시 지수 백오프(최대 2회)
- 부분 실패 시 mock fallback + UI 경고

3. 로깅
- `traceId` 단위로 외부 API 성공/실패 기록

## 6) Terminal A/B 분리

## Terminal A (백엔드/데이터)

1. data.go.kr 어댑터 2종 구현
2. 주소↔법정동 코드 매핑
3. 점수식 반영 및 API 응답/저장 확장

## Terminal B (프론트)

1. 실데이터 카드 UI 추가
2. GIS 패널과 데이터 카드 연동
3. 실패/지연 상태 UX 처리

## 검증(Codex)

1. 계약 타입-구현 일치 검증
2. `typecheck/build` 게이트
3. 샘플 지역 3곳 실데이터 응답 검증
4. fallback 시나리오 검증

## 7) 완료 기준 (DoD)

1. `REALDATA_ENABLED=true`에서 `summary/report`가 실데이터 기반 지표 사용
2. 건축물/실거래 요약이 UI에 표시
3. 외부 API 실패 시 서비스 전체는 중단되지 않고 fallback 동작
4. `npm run typecheck`, `npm run build` 통과

## 8) 즉시 착수 순서 (오늘)

1. API 키 발급/승인 상태 확인 (두 API 모두)
2. `Phase 0` 타입/환경변수 반영
3. `Phase 1` 어댑터 골격 + 샘플 1지역 호출 성공
4. `Phase 3` 점수식 최소 반영
5. `Phase 5` 카드 2개 UI 노출
