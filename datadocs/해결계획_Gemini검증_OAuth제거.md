# Gemini 분석 장애 검증 + OAuth 제거 해결 계획

## 1) 검증 결과 요약
- `GET /api/health`: 정상 (`200`)
- `POST /api/analysis/report` (비로그인): 실패 (`401 Authentication required`)
- `POST /api/analysis/document?format=json` (비로그인): 정상 (`200`)

결론:
- 현재 "분석 버튼 미작동"의 1차 원인은 `report` API가 OAuth 인증을 강제하기 때문.
- Gemini 호출 자체는 가능하지만, 응답은 fallback 문서가 반복 반환되는 패턴이 확인됨.

## 2) 핵심 원인

### 2.1 OAuth 강제 차단
- 파일: `app/api/analysis/report/route.ts`
- 현재 로직: `getServerSession(authOptions)` 결과가 없으면 즉시 `401`
- 영향: 로그인 제거/미사용 환경에서 분석 버튼이 항상 실패

### 2.2 Gemini fallback 고정 반환 가능성
- 파일: `lib/services/gemini.ts`
- 관찰:
  - 직접 Gemini API 호출은 `200`으로 성공
  - 앱 분석 결과는 `confidence=62` 등 fallback 패턴이 반복
- 코드 상 구조적 문제:
  - `buildPrompt()`는 반환 키를 `executiveSummary/risks/actionPlan/confidence` 중심으로 요구
  - `normalizePolicyDocument()`는 `summary/evidence/risks/actionPlan/confidence`를 모두 사실상 요구
  - 필수 키 불일치 시 fallback 반환

## 3) 해결 목표
- Google OAuth 완전 제거 후에도 `/api/analysis/report`가 바로 동작
- Gemini 결과가 fallback이 아닌 실제 생성 결과로 반영
- 실패 시에도 이유가 명확히 드러나는 관측성 확보

## 4) 구현 계획

### Phase A. OAuth 제거 (필수)
1. API 인증 제거
- 대상:
  - `app/api/analysis/report/route.ts`
  - `app/api/analysis/reports/route.ts` (필요 시 guest 정책으로 전환)
- 변경:
  - `getServerSession`/`authOptions` 의존 제거
  - `report`는 익명 요청 허용

2. UI 인증 의존 제거
- 대상:
  - `app/page.tsx`
  - `app/providers.tsx`
  - `app/api/auth/[...nextauth]/route.ts` (삭제)
  - `lib/server/authOptions.ts` (삭제)
- 변경:
  - 로그인 버튼/세션 상태/분석 버튼 인증 조건 제거
  - `SessionProvider` 제거

3. 패키지 정리
- 대상: `package.json`
- 변경: `next-auth` 제거

### Phase B. Gemini fallback 해소 (필수)
1. 프롬프트-스키마 정합성 수정
- 대상: `lib/services/gemini.ts`
- 변경:
  - `buildPrompt()`에 `summary`, `evidence` 요구 키를 명시
  - 또는 `normalizePolicyDocument()`가 누락 필드를 최소 보정(합성)하도록 완화

2. 파싱 실패 관측성 추가
- 대상: `lib/services/gemini.ts`, `types/contract.ts`
- 변경:
  - 응답 메타 필드 추가: `aiSource: gemini|fallback`, `fallbackReason`
  - 로그에 실패 타입(JSON 파싱 실패/스키마 누락/API 오류) 기록

3. API 응답에 상태 노출
- 대상: `app/api/analysis/report/route.ts`, `app/api/analysis/document/route.ts`
- 변경:
  - 헤더 또는 JSON에 `x-ai-source`, `x-ai-fallback-reason` 제공

### Phase C. 저장 정책 정리 (선택)
1. Firestore 유지 시
- 익명 분석은 저장 비활성화 또는 `ownerUserId='anonymous'` 분리 저장
2. Firestore 미사용 시
- 저장 관련 헤더만 유지하고 기능은 비활성 상태 명확화

## 5) 검증 시나리오 (완료 기준)
1. 비로그인 상태에서 `POST /api/analysis/report`가 `200` 반환
2. 같은 입력 2회 호출 시 `aiSource=gemini`가 확인되고 결과가 fallback 고정 패턴이 아님
3. `GEMINI_API_KEY` 제거 테스트 시 `aiSource=fallback`과 실패 사유가 명시
4. 메인 UI에서 로그인 없이 분석 버튼 동작

## 6) 작업 순서 권장
1. Phase A(OAuth 제거) 먼저 완료
2. Phase B(프롬프트/파서 정합) 적용
3. 검증 시나리오 실행 후 문서 업데이트
