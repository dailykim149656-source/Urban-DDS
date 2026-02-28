# Urban-DDS GCP 배포 계획서

기준 아키텍처: Next.js(App Router + `app/api/*`) + Firestore(Firebase Admin) + Gemini API

## 1) 목표

- 현재 Vercel 중심 구조를 유지한 채 GCP에서도 배포 가능하도록 표준화
- 단기: 해커톤 데모 안정 배포
- 중기: CI/CD, 모니터링, 보안(Secret/IAM)까지 운영 가능한 형태

## 2) 배포 타깃 (권장)

1. 애플리케이션: **Cloud Run**
2. 컨테이너 이미지 저장소: **Artifact Registry**
3. 빌드 파이프라인: **Cloud Build** (GitHub 연동 가능)
4. 비밀키 관리: **Secret Manager**
5. 데이터 저장: **Firestore** (기존 Firebase 프로젝트 연계)
6. 로그/모니터링: **Cloud Logging + Cloud Monitoring**

## 3) 현재 코드 기준 적합성

- 가능 여부: **가능**
- 이유:
  - Next.js 서버 런타임은 Cloud Run 컨테이너로 바로 실행 가능
  - `app/api/*` 라우트는 서버측 처리라 Cloud Run에 적합
  - Firebase Admin은 서버 환경변수/서비스 계정 기반으로 사용 가능

## 4) 구현 범위 (코드 변경 최소)

1. `next.config.js`에 `output: 'standalone'` 적용
2. Cloud Run용 `Dockerfile` 추가
3. Firebase 초기화는 ADC(서비스 계정) 우선 + env fallback 구조로 정리
4. 로컬 `.env` 의존 항목을 Secret Manager 기반으로 치환

## 5) IAM/보안 설계

## 서비스 계정

1. `urban-dds-runner` (Cloud Run 실행용)
2. `urban-dds-builder` (Cloud Build 빌드/배포용)

## 권한(최소 권한 원칙)

1. `urban-dds-runner`
   - `roles/datastore.user` (Firestore 접근)
   - `roles/secretmanager.secretAccessor` (필요 시)
2. `urban-dds-builder`
   - `roles/run.admin`
   - `roles/artifactregistry.writer`
   - `roles/iam.serviceAccountUser` (runner impersonation)

## 6) 환경변수/시크릿 전략

## 일반 env (Cloud Run)

- `NODE_ENV=production`
- `GEMINI_MODEL=gemini-1.5-flash`
- `FIREBASE_USE_FIRESTORE=true`

## Secret Manager 관리

- `GEMINI_API_KEY`
- (필요 시) `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

권장:
- GCP 내부 배포 시 Firebase는 키 문자열 대신 **ADC(서비스 계정)** 사용
- private key 문자열 방식은 로컬/임시 환경에서만 사용

## 7) 배포 절차

## Phase 1. 인프라 준비

1. GCP 프로젝트/결제 활성화
2. API 활성화:
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API
   - Secret Manager API
   - Firestore API
3. Artifact Registry 리포지토리 생성
4. 서비스 계정 및 IAM 권한 부여

## Phase 2. 애플리케이션 컨테이너화

1. `Dockerfile` 작성 (멀티스테이지 권장)
2. `next build` + `next start` 기반 실행 검증
3. 로컬 컨테이너 테스트

## Phase 3. Cloud Run 배포

1. 이미지 빌드/푸시
2. Cloud Run 서비스 생성
3. 시크릿/환경변수 연결
4. 리전/오토스케일/메모리 설정

## Phase 4. 검증

1. `/api/region/summary` 응답 확인
2. `/api/analysis/report` 응답 + Firestore 저장 확인
3. Gemini API 정상 응답 및 fallback 동작 확인

## 8) CI/CD 계획

1. `main` 푸시 시 Cloud Build 트리거
2. 파이프라인:
   - `npm ci`
   - `npm run typecheck`
   - `npm run build`
   - Docker build/push
   - Cloud Run 배포
3. 실패 시 자동 롤백 대신 이전 revision 트래픽 복구 방식 사용

## 9) 운영 계획

1. 모니터링 지표:
   - 요청 수/오류율(5xx)
   - 응답 지연시간(P95)
   - 컨테이너 메모리/CPU
2. 로그:
   - API 에러 로그 구조화(JSON) 권장
   - Firestore 저장 실패 로그 별도 태그
3. 알림:
   - 5xx 급증, 지연시간 급증 시 알림 채널 연결

## 10) 리스크 및 대응

1. Firestore 권한 누락
   - 대응: runner SA 권한 재확인, ADC 경로 테스트
2. 시크릿 주입 오류
   - 대응: Secret Manager 버전 고정 + 배포 후 health check
3. 콜드스타트 지연
   - 대응: 최소 인스턴스 1 설정(데모 시간대)
4. 외부 API 지연(Gemini/공공 API)
   - 대응: 타임아웃 + fallback 메시지 유지

## 11) 완료 기준 (Definition of Done)

1. Cloud Run 공개 URL에서 앱/API 정상 응답
2. 분석 API 호출 시 Firestore 문서 생성 확인
3. Secret Manager 기반 키 주입 확인
4. CI/CD 1회 이상 성공 배포
5. 장애 시 이전 revision으로 5분 내 복구 가능

