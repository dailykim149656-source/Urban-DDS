# Google OAuth + 사용자별 분석기록 분리 구현 내역

기준일: 2026-02-28  
대상 저장소: `Urban-DDS`

## 1) 구현 결과

1. Google OAuth 로그인 기반 세션 처리 추가
2. 분석 저장 API(`/api/analysis/report`) 인증 필수화
3. 분석 이력 조회 API(`/api/analysis/reports`) 인증 필수화
4. Firestore 저장/조회를 로그인 사용자 기준(`ownerUserId`)으로 분리

## 2) 변경 파일

신규:
1. `app/api/auth/[...nextauth]/route.ts`
2. `app/providers.tsx`
3. `lib/server/authOptions.ts`
4. `GOOGLE_OAUTH_DB_PARTITION_IMPLEMENTATION_2026-02-28.md`

수정:
1. `app/layout.tsx`
2. `app/page.tsx`
3. `app/api/analysis/report/route.ts`
4. `app/api/analysis/reports/route.ts`
5. `lib/server/reportRepository.ts`
6. `.env.example`
7. `README.md`
8. `package.json`
9. `package-lock.json`

## 3) 동작 방식

1. 로그인
- Auth.js(NextAuth v4) + Google Provider 사용
- 인증 엔드포인트: `/api/auth/*`

2. 저장
- `POST /api/analysis/report` 호출 시 세션 확인
- 세션 없으면 `401 Authentication required`
- 세션 있으면 Firestore 문서에 아래 필드 저장
  - `ownerUserId` (현재 사용자 이메일 기반)
  - `ownerEmail`
  - 기존 분석 메타(`regionCode`, `summary`, `metrics`, `createdAt` 등)

3. 조회
- `GET /api/analysis/reports` 호출 시 세션 확인
- 세션 없으면 `401 Authentication required`
- 세션 있으면 `where('ownerUserId', '==', currentUser)` 조건으로 사용자 데이터만 조회

## 4) 환경변수

`.env.example`에 아래 항목 추가됨:

1. `AUTH_SECRET`
2. `NEXTAUTH_SECRET`
3. `NEXTAUTH_URL`
4. `GOOGLE_CLIENT_ID`
5. `GOOGLE_CLIENT_SECRET`

## 5) 프론트 변경

`app/page.tsx`에서:

1. `useSession`, `signIn`, `signOut` 연동
2. 상단에 현재 로그인 상태(`USER`) 및 로그인/로그아웃 버튼 표시
3. 로그인하지 않으면 분석 실행 버튼 실질 비활성(실행 시 에러 메시지 안내)
4. 로그인하지 않으면 최근 분석 이력은 비움 처리

## 6) 주의사항

1. Firestore 인덱스
- `where(ownerUserId) + orderBy(createdAt)` 조합에 대해 Firestore가 인덱스를 요구할 수 있음
- 에러가 발생하면 콘솔 링크를 통해 composite index 생성 필요

2. 사용자 식별자 정책
- 현재 `ownerUserId`는 이메일 기반
- 장기적으로는 OAuth subject(`sub`) 기반 고정 식별자로 전환 권장

3. 문서 생성 API
- `/api/analysis/document`는 현재 인증 필수화 대상에 포함하지 않음
- 필요 시 동일 패턴으로 세션 검증 추가 가능

## 7) 다음 권장 작업

1. `ownerUserId`를 `sub` 기반으로 전환
2. `/api/analysis/document`도 사용자별 저장/이력 정책에 맞춰 인증/저장 확장
3. Firestore 인덱스/운영 알림 문서화
