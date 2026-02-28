# Urban-DDS 검증 결과 및 후속 작업 (2026-02-28)

## 1) 검증 범위

- 코드/구성 파일
  - `app/**`, `lib/**`, `types/**`
  - `package.json`, `next.config.js`, `Dockerfile`
  - `cloudbuild.yaml`, `.github/workflows/gcp-cloud-build.yml`
  - `scripts/deploy-gcp.sh`, `scripts/smoke-test-gcp.sh`
- 실행 검증
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - API 런타임 스모크 (`/api/health`, `/api/region/*`, `/api/analysis/report`)

## 2) 실행 결과

1. `npm run typecheck` 통과
2. `npm run lint` 통과
3. `npm run build` 통과
4. 프로덕션 런타임 스모크(standalone 서버 경로) 통과
   - `GET /api/health` 정상
   - `GET /api/region/summary?address=서울` 정상
   - `GET /api/region/metrics?regionCode=seoul` 정상
   - `POST /api/analysis/report` 정상

요약:
- 현재 브랜치 상태는 해커톤 데모/배포 준비 수준으로 **정상 진행**입니다.

## 3) 주요 확인 포인트

1. Cloud Run 컨테이너 실행 경로는 적절합니다.
   - `next.config.js`에서 `output: 'standalone'` 설정: [next.config.js](F:\gemini-hackaton\Urban-DDS\next.config.js:3)
   - `Dockerfile`에서 `node server.js` 실행: [Dockerfile](F:\gemini-hackaton\Urban-DDS\Dockerfile:29)
2. 분석 API에서 Firestore 저장 훅이 정상적으로 연결되어 있습니다.
   - [report route](F:\gemini-hackaton\Urban-DDS\app\api\analysis\report\route.ts:26)
3. Firebase Admin은 ADC 우선 + env fallback 전략으로 구현되어 있습니다.
   - [firebaseAdmin.ts](F:\gemini-hackaton\Urban-DDS\lib\server\firebaseAdmin.ts:41)
4. `.gitignore` 보강이 반영되어 캐시/빌드 산출물 오염 위험이 줄었습니다.
   - [.gitignore](F:\gemini-hackaton\Urban-DDS\.gitignore:1)

## 4) 잔여 리스크

### [Medium] `start` 스크립트와 standalone 설정 간 실행 방식 불일치

- 현재 `package.json`의 `start`는 `next start`입니다: [package.json](F:\gemini-hackaton\Urban-DDS\package.json:8)
- 그러나 standalone 구성에서는 `node .next/standalone/server.js` 경로가 운영 기준입니다.
- 영향:
  - 로컬/운영자 테스트 시 혼선 가능
- 권장:
  - `start`를 standalone 경로로 정리하거나 `start:standalone` 스크립트 추가

### [Medium] 의존성 보안 경고

- `npm audit --omit=dev` 결과: `next` 관련 high 취약점 1건
- 영향:
  - 운영 환경 보안 리스크, 릴리즈 심사 리스크
- 권장:
  - Next.js 보안 패치 가능 버전 검토 후 업그레이드 브랜치에서 회귀 테스트

### [Low] 계약/호환성 정리 필요

- 계약 타입은 `regionCode`를 요구하지만, 구현은 `regionId` fallback도 허용
  - 계약: [types/contract.ts](F:\gemini-hackaton\Urban-DDS\types\contract.ts:38)
  - 구현: [analysisService.ts](F:\gemini-hackaton\Urban-DDS\lib\server\analysisService.ts:25)
- 권장:
  - 공식 계약을 하나로 고정하고 README 예시와 일치시킬 것

## 5) 추후 작업 정리 (Terminal A/B)

## Terminal A: 인프라/배포 안정화

1. 배포 실행 스크립트 정리
   - `package.json`에 `start:standalone` 추가 또는 `start` 정합화
2. CI/CD 사전 검증 단계 강화
   - Cloud Build 전 secrets/vars 존재 체크 단계 추가
3. 배포 후 자동 스모크
   - `scripts/smoke-test-gcp.sh`를 CI 단계로 연결
4. 운영 문서 보강
   - 장애 대응(롤백/리비전 고정) 절차를 README에 추가

## Terminal B: 분석/문서 생성 기능 확장

1. Vertex AI 연동 준비
   - `lib/services/gemini.ts`를 Vertex 호출 레이어로 분리
2. 분석 문서 생성 API 추가
   - `/api/analysis/document` 스캐폴드
3. 응답 스키마 고정
   - 추천/근거/리스크/액션 플랜 JSON schema 적용
4. Firestore 문서 메타 확장
   - `reportVersion`, `model`, `generatedAt`, `traceId` 필드 추가

## 6) 다음 검증 게이트

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`
4. standalone 런타임 스모크
5. GCP 배포 후 원격 스모크(`scripts/smoke-test-gcp.sh`)
