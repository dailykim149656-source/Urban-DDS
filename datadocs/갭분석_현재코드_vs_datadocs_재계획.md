# 갭 분석: 현재 코드 vs datadocs 재계획

## 1. 요약
- 결론: 기본 연동 골격은 구현됨
- 상태: `부분 적용`
- 핵심 미완료: PK 전환, 통합분류코드 매핑, XML fallback, 페이지네이션, 사용자 식별키 안정화

## 2. 항목별 갭
| 영역 | 현재 상태 | 갭 | 우선순위 |
| --- | --- | --- | --- |
| 건축물 API 호출 | `buildingLedgerAdapter` 구현됨 | `pageNo=1` 고정, 다중 페이지 수집 없음 | 높음 |
| 실거래 API 호출 | `apartmentTradeAdapter` 구현됨 | `pageNo=1` 고정, `numOfRows=999` 사용, 다중 페이지 수집 없음 | 높음 |
| 응답 파싱 | JSON 파싱 중심 | XML 응답 fallback 없음 | 높음 |
| PK 전환 규칙 | 코드 없음 | 첨부1 기준 변환 유틸 부재 | 높음 |
| 통합분류코드 매핑 | 코드 없음 | 첨부2 기반 매핑 테이블 부재 | 높음 |
| 주소/지역 매핑 | `regionDataAdapter` mock 기반 | 실운영 주소-코드 정합 로직 부족 | 중간 |
| 분석 저장 분리 | Firestore에서 `ownerUserId` 필터 있음 | `ownerUserId`가 이메일 기반, OAuth `sub` 기반으로 고정 필요 | 높음 |
| GIS UI | Leaflet 지도/마커 표시 구현됨 | 폴리곤/건축물/실거래 레이어 없음, 데이터 누락 사유 표시 약함 | 중간 |
| 스냅샷 저장 | 분석 리포트 저장됨 | building/trade 원본 스냅샷 테이블(컬렉션) 미구현 | 중간 |
| 운영 제어 | 기본 타임아웃 env 있음 | retry/rate-limit/env 적용 로직 미구현 | 중간 |

## 3. 코드 근거 파일
- `lib/adapters/public/publicDataHttp.ts`
- `lib/adapters/public/buildingLedgerAdapter.ts`
- `lib/adapters/public/apartmentTradeAdapter.ts`
- `lib/server/externalDataService.ts`
- `lib/adapters/regionDataAdapter.ts`
- `lib/server/reportRepository.ts`
- `app/api/analysis/report/route.ts`
- `app/api/analysis/reports/route.ts`
- `app/ui/map/RegionMapPanel.tsx`
- `app/layout.tsx`
- `.env.example`

## 4. 바로 수정해야 할 우선 작업
1. `requestPublicDataJson`에 재시도/백오프/레이트리밋 추가
2. 건축물/실거래 API 페이지네이션 루프 구현
3. XML 파서 fallback 추가
4. PK 전환 유틸 + 통합분류코드 매핑 테이블 추가
5. `ownerUserId`를 `session.user.id`(OAuth sub) 기준으로 전환
6. building/trade 스냅샷 저장 구조 추가

## 5. 리스크
- 현재 상태로는 지역별 실제 데이터 누락 확률이 높음
- 이메일 기반 사용자 식별은 계정 변경/다중 로그인 시 일관성 저하 가능
- 문서 기반 PK/코드 전환 미적용으로 데이터 조인 실패 위험 존재
