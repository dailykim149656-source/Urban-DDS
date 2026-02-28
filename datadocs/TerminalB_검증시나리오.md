# Terminal B 검증 시나리오 (공공데이터 + OAuth + GIS)

## 1. 범위
- 건축물대장 API 연동 검증
- 아파트 매매 실거래 API 연동 검증
- 사용자별 분석 기록 분리 검증
- F/E GIS 표시 검증

## 2. 역할 분리
- Terminal A (구현): 기능 개발, 서버 실행, 핫픽스 반영
- Terminal B (검증): API 응답 확인, DB 저장/분리 확인, UI 표시 검증, 이슈 기록

## 3. 사전조건
- `.env`에 아래 값 설정
- `REALDATA_ENABLED=true`
- `DATA_GO_KR_SERVICE_KEY` 유효값
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`
- Firestore 사용 시 `FIREBASE_USE_FIRESTORE=true`와 admin 키 설정

## 4. 실행 절차
1. Terminal A에서 `npm run dev` 실행
2. Terminal B에서 `/api/health` 확인
3. Terminal B에서 `/api/region/summary?address=...` 3개 샘플 주소 호출
4. Terminal B에서 로그인 사용자 A/B 각각 보고서 생성 후 목록 조회
5. 브라우저에서 지도와 요약 카드 표시 확인

## 5. 검증 케이스
| ID | 검증 항목 | 입력 | 기대 결과 |
| --- | --- | --- | --- |
| B-01 | 건축물대장 조회 성공 | 서울/강남/강북 주소 | `buildingFacts.sampleSize > 0` 또는 데이터 없음 사유 로그 |
| B-02 | 실거래 조회 성공 | 동일 주소 + 최근 3개월 | `tradeFacts.dealCount > 0` 또는 데이터 없음 사유 로그 |
| B-03 | 외부소스 병합 | 요약 API 응답 | `dataSource`에 building/trade 소스 문자열 포함 |
| B-04 | 사용자 분리 저장 | 사용자 A, B 각각 분석 실행 | A 목록에 B 데이터 미노출, B 목록에 A 데이터 미노출 |
| B-05 | GIS 표시 | 주소 조회 후 메인 화면 | 지도 타일, 마커, 좌표값 정상 표시 |
| B-06 | 인증 실패 처리 | 비로그인 상태에서 보고서 요청 | `401 Authentication required` |
| B-07 | 오류 복구 | 잘못된 서비스키 | API 실패 시 서버 중단 없이 경고 로그/빈 외부데이터 처리 |

## 6. 이슈 기록 포맷
- 제목: `[검증][B-xx] 한 줄 요약`
- 재현 절차: 요청 URL/입력값/계정
- 실제 결과: 상태코드, 오류 메시지, 화면 캡처 위치
- 기대 결과: 기준 문구
- 심각도: `S1`, `S2`, `S3`

## 7. 합격 기준
- B-01 ~ B-07 중 S1 이슈 0건
- 사용자 분리 검증(B-04) 통과
- 지도 표시(B-05) 통과
- 실패 케이스도 예측 가능한 메시지/로그로 종료

## 8. 현재 코드 기준 즉시 확인 포인트
- 실거래/건축물 API는 현재 페이지네이션 1페이지만 조회함
- JSON 전용 파싱 구조라 XML 응답 시 실패 가능성 있음
- 사용자 식별은 현재 이메일 기반 저장이므로 `token.sub` 전환 여부 확인 필요
