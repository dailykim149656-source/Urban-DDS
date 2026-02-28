# Urban-DDS 분석기록 저장 + Google OAuth 사용자 분리 가능성 검토

기준일: 2026-02-28  
검토 대상: 현재 `Urban-DDS` 코드베이스(App Router + Route Handler + Firestore Admin)

## 1) 결론 요약

1. 분석 기록 DB 저장
- **현재 이미 가능/구현됨**.
- `FIREBASE_USE_FIRESTORE=true` + Firebase 설정 시 `analysis_reports` 컬렉션에 저장됨.

2. Google OAuth 기반 사용자별 DB 분리
- **현재는 미구현**.
- 하지만 현재 구조(Route Handler 중심)에서 **구현 가능**하며, 난이도는 중간 수준.

판정:
- 저장 기능: `가능(완료)`
- 사용자별 분리: `가능(미구현)`

## 2) 현재 구조 확인 근거

1. 저장 경로 존재
- `POST /api/analysis/report`에서 `persistAnalysisReport()` 호출
- 파일: `app/api/analysis/report/route.ts`

2. Firestore 저장 구현
- `analysis_reports` 컬렉션에 문서 `add`
- 파일: `lib/server/reportRepository.ts`

3. 목록 조회 구현
- `analysis_reports` 전체를 `createdAt desc`로 조회
- 사용자 필터 없음
- 파일: `app/api/analysis/reports/route.ts`, `lib/server/reportRepository.ts`

4. 인증 계층 부재
- `next-auth`/OAuth 관련 의존성, 인증 라우트, 세션 검증 로직 없음
- 파일: `package.json`, `app/api/**`, `lib/**` 기준 검색 결과

## 3) 현재 상태에서의 한계

1. 사용자 식별자 없음
- 저장 문서에 `userId`, `userEmail`, `tenantId` 같은 필드가 없음.

2. 조회 분리 없음
- 모든 사용자의 분석 기록이 같은 기준으로 조회될 수 있는 구조.

3. API 접근 제어 없음
- `/api/analysis/report`, `/api/analysis/reports`에 로그인 요구 없음.

## 4) 구현 가능 시나리오

## 시나리오 A (권장): Auth.js(NextAuth) + Google OAuth + Firestore 파티셔닝

목표:
- Google 로그인 후 서버(Route Handler)에서 사용자 세션을 기준으로 저장/조회 분리

핵심 변경:
1. 인증 도입
- `next-auth` 설치
- Google Provider 설정
- `auth.ts` 및 `app/api/auth/[...nextauth]/route.ts` 추가

2. API 인증 강제
- `POST /api/analysis/report`, `GET /api/analysis/reports`에서 세션 확인
- 비로그인 시 `401`

3. 저장 스키마 확장
- 저장 시 `ownerUserId`, `ownerEmail` 필드 추가

4. 조회 필터
- `where('ownerUserId', '==', currentUserId)` + `orderBy('createdAt', 'desc')`
- 필요 시 Firestore composite index 추가

장점:
- 현재 서버 중심 구조와 잘 맞음
- 기존 Firestore Admin 로직 재사용 가능

## 시나리오 B: Firebase Auth(Google) + ID Token 검증

목표:
- 클라이언트에서 Firebase Google 로그인 후 ID Token 전송
- 서버에서 `firebase-admin`으로 토큰 검증 후 사용자 분리

핵심 변경:
1. 클라이언트 Firebase Auth SDK 도입
2. API 요청에 `Authorization: Bearer <idToken>` 추가
3. 서버에서 `verifyIdToken`으로 사용자 식별
4. 저장/조회 시 사용자 필터 적용

장점:
- Firebase 생태계 일관성

주의:
- 클라이언트 인증 로직 추가로 프론트 복잡도 상승

## 5) DB 분리 방식 선택지

1. 논리 분리(빠른 적용)
- 단일 컬렉션 `analysis_reports` 유지
- 문서에 `ownerUserId` 저장 후 쿼리 필터

2. 경로 분리(강한 분리)
- `users/{uid}/analysis_reports` 서브컬렉션 구조
- 사용자 단위 분리 명확

권장:
- 1차는 논리 분리로 빠르게 적용
- 추후 필요 시 경로 분리로 마이그레이션

## 6) 예상 변경 파일(시나리오 A 기준)

신규:
1. `auth.ts`
2. `app/api/auth/[...nextauth]/route.ts`

수정:
1. `app/api/analysis/report/route.ts`
2. `app/api/analysis/reports/route.ts`
3. `lib/server/reportRepository.ts`
4. `types/contract.ts` (필요 시 응답 타입 메타 확장)
5. `app/page.tsx` (로그인 상태/버튼 반영)
6. `.env.example` (OAuth 환경변수)

## 7) 운영/보안 체크포인트

1. OAuth 시크릿 관리
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`를 Secret Manager/Vercel Secret로 관리

2. 최소 권한
- Firestore는 서버에서만 접근 유지
- 클라이언트 직접 Firestore 접근은 당장은 비활성 유지

3. 감사 추적
- 문서에 `ownerUserId`, `traceId`, `createdAt`를 함께 저장

4. 오류 정책
- 미인증: `401`
- 권한 불일치 접근: `403`

## 8) 구현 난이도/소요(대략)

1. 최소 기능(MVP)
- 로그인 + 사용자별 저장/조회 분리: **0.5~1.0일**

2. 운영 품질 포함
- 에러 UX, 인덱스, 문서화, 배포 변수 정리: **1.0~2.0일**

## 9) 최종 판단

1. “분석 기록을 DB로 저장”
- 현재 구조에서 이미 동작하는 기능.

2. “Google OAuth를 적용해 사용자별로 DB 분리”
- 현재 구조에서 구현 가능.
- 단, 인증 계층과 사용자 필드/쿼리 필터를 추가해야 하며 현재는 아직 미적용.
