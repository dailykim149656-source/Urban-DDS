# Firebase 인프라 구축 + 구현 가이드 (Urban-DDS)

기준일: 2026-02-28
대상: Next.js (`app/api/*`) + Vercel 배포 구조

## 1) 목표

- 기존 분석 API(`/api/analysis/report`) 결과를 Firestore에 저장
- 해커톤 데모에서 분석 히스토리/추적 가능하도록 인프라 최소 구성
- 클라이언트 키 노출 없이 서버(Route Handler)에서만 Firebase Admin 사용

## 2) 권장 아키텍처

1. 브라우저 -> Next.js Route Handler (`app/api/analysis/report`)
2. Route Handler -> 분석 서비스(`lib/server/analysisService.ts`)
3. Route Handler -> Firestore 저장(`firebase-admin`)
4. Firestore는 `analysis_reports` 컬렉션에 기록

핵심 원칙:
- Firebase Admin SDK는 서버 코드에서만 사용
- 서비스 계정 키는 Vercel 환경변수로만 주입
- 저장 실패가 분석 API 자체 실패로 이어지지 않도록 비차단 처리

## 3) Firebase 인프라 구축 절차

## 3.1 Firebase 프로젝트 생성

1. Firebase Console에서 새 프로젝트 생성
2. `Build > Firestore Database` 활성화
3. 모드: 해커톤은 `Production` 권장(규칙 즉시 적용 가능)

## 3.2 서비스 계정 발급

1. `Project settings > Service accounts`
2. `Generate new private key`로 JSON 발급
3. 아래 값 추출:
   - `project_id`
   - `client_email`
   - `private_key`

## 3.3 Firestore 컬렉션 설계

컬렉션: `analysis_reports`

문서 권장 필드:
- `regionCode` (string)
- `regionName` (string)
- `priorityScore` (number)
- `recommendedScenario` (string)
- `summary` (string)
- `metrics` (map)
- `weightedScores` (map)
- `createdAt` (timestamp)
- `source` (string, 예: `api-analysis-report`)

## 3.4 보안 규칙(최소안)

해커톤 최소안(클라이언트 직접 접근 금지, Admin만 쓰기/읽기):

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

설명:
- 현재 구조에서는 서버(Admin SDK)가 규칙을 우회하므로 API 경유 접근만 허용됨
- 추후 클라이언트 읽기 필요 시, 인증 기반으로 좁혀서 열 것

## 3.5 Vercel 환경변수 설정

아래 값을 Vercel Project Settings > Environment Variables에 등록:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_USE_FIRESTORE` (`true`/`false`)

주의:
- `FIREBASE_PRIVATE_KEY`는 JSON 개행(`\n`)을 포함한 원문을 넣어야 함
- 코드에서 `\\n` -> 실제 개행으로 변환 처리

## 4) 코드 구현 방법

## 4.1 의존성

- `firebase-admin` 설치

## 4.2 서버 초기화 모듈

- 파일: `lib/server/firebaseAdmin.ts`
- 역할:
  - env 검증
  - singleton으로 Admin App 생성
  - Firestore 인스턴스 반환

## 4.3 저장소 레이어

- 파일: `lib/server/reportRepository.ts`
- 역할:
  - 분석 결과를 Firestore에 저장
  - Firestore 비활성/미설정 시 no-op 처리
  - 저장 실패 시 에러를 throw하지 않고 로깅

## 4.4 API 라우트 연동

- 파일: `app/api/analysis/report/route.ts`
- 처리 순서:
  1. 분석 결과 생성
  2. Firestore 저장 시도 (비차단)
  3. 저장 성공 여부 메타를 헤더에 포함(옵션)
  4. 분석 결과 응답

## 5) 운영 체크리스트

1. `npm run typecheck` 통과
2. `FIREBASE_USE_FIRESTORE=true`에서 저장 성공 로그 확인
3. Firestore 문서 생성 확인
4. Firebase 키 제거 시에도 API 정상 응답(저장만 skip) 확인

## 6) 해커톤 운영 팁

1. 초반에는 Firestore 저장만 붙이고 조회 API는 후순위로 둔다.
2. 저장 실패를 사용자 오류로 노출하지 않는다(데모 끊김 방지).
3. `source`, `createdAt`, `regionCode`를 반드시 기록해 발표 시 추적 가능하게 한다.
