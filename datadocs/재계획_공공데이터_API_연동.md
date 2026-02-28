# 공공데이터 API 연동 재계획 (datadocs 기준)

## 1. 목표
- `국토교통부_건축물대장정보 서비스`와 `국토교통부_아파트매매 실거래 상세 자료`를 실제 데이터로 연동한다.
- 현재 Urban-DDS 구조에서 `분석 기록 저장`과 `사용자별 데이터 분리`(OAuth 기반) 흐름에 맞게 외부 데이터 수집/정규화/저장을 완성한다.
- F/E에서 GIS 맵 + 건축물/실거래 지표가 함께 보이도록 UI를 연결한다.

## 2. datadocs 기반 핵심 제약

### 2.1 건축물대장(OpenAPI활용가이드)
- 주요 요청 파라미터: `sigunguCd`, `bjdongCd`, `platGbCd`, `bun`, `ji`, `serviceKey`
- 페이지 제한: `numOfRows` 최대 100 기준으로 페이징 처리 필요
- 응답 활용 필드(예): 준공/사용승인일, 연면적, 용적률(`vlRat`), 기타 개요 정보
- JSON/XML 지원 여부를 환경별로 확인하고, 파서는 XML 기본 대응을 포함한다.

### 2.2 아파트 매매 실거래가(기술문서)
- 엔드포인트: `RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade`
- 요청 파라미터: `LAWD_CD`(5자리), `DEAL_YMD`(YYYYMM), `pageNo`, `numOfRows`, `serviceKey`
- 응답 활용 필드(예): `dealAmount`, `buildYear`, `excluUseAr`, 법정동/시군구 정보, 거래일자
- 호출 한도/에러코드 대응(재시도/백오프/부분 실패 허용) 필수

### 2.3 PK 전환 규칙(첨부1) + 통합분류코드(첨부2)
- 기존 건축데이터 PK → 신규 22자리 일련번호 체계 전환 규칙 반영 필요
- 유형2 전환은 `통합분류코드` 매핑이 필요하며, 시군구코드 기반 변환 테이블을 코드화해야 함
- 비자치구/예외 케이스를 별도 매핑 규칙으로 분리 저장

## 3. 아키텍처 반영 계획

## 3.1 수집 레이어(Adapters)
- `buildingLedgerAdapter`: 건축물대장 조회 파라미터를 표준화하고 응답 파싱(날짜/면적/용적률 정규화)
- `apartmentTradeAdapter`: 월별 실거래가 조회, 페이지 루프, 거래금액 숫자 변환
- `publicDataHttp`: 공통 타임아웃, 재시도, 레이트리밋 가드, 에러코드 매핑

## 3.2 정규화 레이어
- 공통 지역키: `region_code`(LAWD_CD/시군구코드 정합)
- 필지키: `platGbCd + bun + ji` 정규화(`bun/ji` zero-pad)
- PK 전환: 첨부1 규칙에 따른 `legacy_pk -> new_pk_22` 변환 유틸
- 통합분류코드: 첨부2 기반 정적 매핑 테이블(JSON 또는 DB seed)

## 3.3 저장 레이어(DB)
- `building_snapshots`
  - 주요 컬럼: `region_code`, `parcel_key`, `approval_date`, `total_floor_area`, `floor_area_ratio`, `raw_payload`, `fetched_at`
- `trade_snapshots`
  - 주요 컬럼: `region_code`, `deal_ymd`, `deal_date`, `deal_amount`, `exclusive_area`, `price_per_m2`, `raw_payload`, `fetched_at`
- `analysis_runs`
  - 사용자별(`user_id`) 결과에 `building_snapshot_id`, `trade_snapshot_id`를 연결
- 사용자 분리
  - Google OAuth `sub`를 내부 `user_id`에 매핑, 모든 분석/스냅샷 조회는 `user_id` 스코프 적용

## 4. 분석 로직 반영

### 4.1 노후도 기반 정비 시급성
- 입력: 준공/사용승인일, 연면적, 용적률
- 예시 점수식:
  - `age_score`: 건축연한 구간 점수
  - `far_pressure_score`: 용적률 구간 점수
  - `scale_score`: 연면적/필지규모 기반 점수
- 최종 `urgency_score` 산출 후 등급화(A/B/C)

### 4.2 공사비/분담금 추정 보조 지표
- 입력: 최근 N개월 실거래가
- 산출:
  - `median_price_per_m2`, `recent_trend`(상승/보합/하락), `outlier_ratio`
- 기존 추정 알고리즘에 보정계수로 연결

## 5. F/E UI 변경 계획 (GIS 포함)

## 5.1 지도 레이어
- 지역 선택 시:
  - 건축물 요약(준공연도, 연면적, 용적률)
  - 실거래 요약(최근 월 중앙값, 평단가 추이)
- 데이터 없을 때는 원인 구분 노출:
  - `조회 파라미터 불일치`
  - `API 응답 없음`
  - `호출 제한/오류`

## 5.2 분석 화면
- 카드 1: `정비 시급성 점수`
- 카드 2: `실거래 기반 비용지표`
- 카드 3: `데이터 신뢰도`(수집 시점, 표본 수, 누락 여부)
- 사용자별 저장된 분석 히스토리에서 동일 UI 재조회 가능

## 6. Terminal A/B 업무 분리

## 6.1 Terminal A (구현)
- Adapter 파라미터/파서 보강(XML 우선 대응)
- PK 전환 유틸 + 통합분류코드 매핑 테이블 구현
- DB 스키마/저장 로직 연결
- API route에서 분석 파이프라인 연결
- F/E 지도/분석 카드 데이터 바인딩

## 6.2 Terminal B (검증, 본 담당)
- 문서 파라미터 대비 실제 요청값 정합 검증
- 지역 3곳 샘플 호출로 응답 필드 검증
- PK 전환 결과(유형1/유형2) 케이스별 비교 검증
- 사용자 A/B 계정 데이터 격리 검증
- F/E GIS 표시 여부와 오류 상태 메시지 검증
- 실패 시 재현 가능한 로그 포맷으로 이슈 문서화

## 7. 구현 순서(권장)
1. 통합분류코드/PK 전환 유틸을 먼저 고정한다.
2. 건축물대장 Adapter를 붙이고 DB 적재를 완료한다.
3. 실거래가 Adapter를 붙이고 월별 집계를 완성한다.
4. 분석 점수 계산에 두 데이터 소스를 결합한다.
5. F/E 지도/분석 카드에 연결하고 사용자별 히스토리와 묶는다.
6. Terminal B 검증 시나리오를 통과하면 운영 플래그를 연다.

## 8. 환경변수 권장안 (.env)
- `DATA_GO_KR_SERVICE_KEY_ENCODED`
- `DATA_GO_KR_SERVICE_KEY_DECODED` (필요 시)
- `PUBLIC_API_TIMEOUT_MS`
- `PUBLIC_API_RETRY_MAX`
- `PUBLIC_API_RATE_LIMIT_PER_MIN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

## 9. 리스크와 대응
- 리스크: XML/JSON 포맷 차이, 주소/필지 파라미터 오정합, 호출량 제한
- 대응:
  - 파서 이중화(XML 우선 + JSON fallback)
  - 파라미터 정규화 유틸 단일화
  - 캐시/배치 수집과 재시도 정책 적용
  - 사용자 화면에 데이터 신뢰도/누락 원인 표시

## 10. 완료 기준(Definition of Done)
- 두 API 모두 실제 키로 호출되어 DB 적재가 성공한다.
- 분석 결과에 건축물/실거래 지표가 반영된다.
- 사용자별 데이터가 서로 조회되지 않는다.
- GIS 화면에서 지역별 요약 데이터가 정상 표출된다.
- 검증 문서에 성공/실패 기준과 재현 절차가 정리된다.
