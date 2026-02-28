# Urban-DDS 코드 검증/리뷰 (2026-02-28)

## Findings

### [Critical] 프로덕션 빌드 불가: App Router 루트 레이아웃 누락
- 증상: `npm run build` 실패
- 로그 핵심: `page.tsx doesn't have a root layout`
- 영향: Vercel 배포 불가(해커톤 데모 차단)
- 근거 파일:
  - `app/page.tsx:1` (페이지만 존재)
  - `app/layout.tsx` 파일 자체가 없음
- 권장 조치:
  - 최소 루트 레이아웃 `app/layout.tsx` 추가
  - `<html><body>{children}</body></html>` 형태로 즉시 복구 가능

### [High] 주소 매칭 정확도 저하: 지역명/주소 힌트 문자열 인코딩 손상
- 증상: Mock 지역명/주소가 깨진 문자열로 저장되어 한글 주소 검색이 정상 매칭되지 않을 가능성 높음
- 영향: `/api/region/summary?address=...` 결과 신뢰도 하락, 데모 품질 저하
- 근거 파일:
  - `lib/adapters/regionDataAdapter.ts:21`
  - `lib/adapters/regionDataAdapter.ts:23`
  - `lib/adapters/regionDataAdapter.ts:36`
  - `lib/adapters/regionDataAdapter.ts:39`
  - `lib/adapters/regionDataAdapter.ts:52`
  - `lib/adapters/regionDataAdapter.ts:55`
- 권장 조치:
  - UTF-8 정상 문자열로 교체(예: `서울`, `강남 대치`, `서울 강남구 대치동`)
  - 에디터/저장 인코딩 고정(`UTF-8`)

### [Medium] API 계약 혼선: `regionId` 입력을 코드 조회 함수로 처리
- 증상: 분석 API 요청은 `regionId`를 받는데, 내부에서는 `getRegionByCode`로 조회
- 영향: 추후 `id`와 `code` 체계가 분리되면 조회 실패/오탐 가능
- 근거 파일:
  - `types/contract.ts:38` (`AnalysisReportRequest.regionId`)
  - `lib/server/analysisService.ts:35` (`getRegionByCode(body.regionId)`)
- 권장 조치:
  - 계약을 `regionCode`로 통일하거나
  - `getRegionById` 추가 후 `regionId`를 그대로 조회

### [Medium] 주소 입력 정규화 취약점: 특수문자 입력 시 첫 지역으로 오탐 가능
- 증상: 주소가 `!!!` 같은 문자열이면 정규화 후 빈 문자열이 될 수 있음
- 영향: `includes('')`가 참이 되어 첫 항목 반환 가능성
- 근거 파일:
  - `lib/adapters/regionDataAdapter.ts:75`
  - `lib/adapters/regionDataAdapter.ts:78`
  - `lib/adapters/regionDataAdapter.ts:79`
  - `lib/adapters/regionDataAdapter.ts:80`
- 권장 조치:
  - `normalized.length === 0`이면 즉시 `undefined` 반환
  - 라우트 레이어에서 주소 패턴 최소 검증 추가

### [Medium] 의존성 보안 리스크: Next.js 버전 경고
- 증상: `npm install` 시 `next@14.2.5` 보안 취약 경고(critical) 출력
- 영향: 배포 시 보안/심사 리스크
- 근거 파일:
  - `package.json:13`
- 권장 조치:
  - 패치 버전으로 업데이트 후 빌드/회귀 테스트

## 검증 실행 결과

1. `npm run typecheck`
   - 결과: 성공
2. `npm run build`
   - 결과: 실패 (루트 레이아웃 누락)
3. `npm run lint`
   - 결과: 실행 차단(ESLint 초기 설정 대화형 프롬프트)
   - 참고: `next lint` 실행 시 `tsconfig.json` 자동 수정이 발생할 수 있으므로 CI에서는 비대화형 설정 필요

## 검증 범위

- `app/**`, `lib/**`, `types/**`, `package.json`, `tsconfig.json`
- 런타임 E2E는 빌드 실패로 진행하지 못함

## 우선 수정 순서 (실행 권장)

1. `app/layout.tsx` 추가 후 `npm run build` 복구
2. `regionDataAdapter`의 인코딩 손상 데이터 교정
3. `AnalysisReportRequest` 식별자 계약(`regionId` vs `regionCode`) 정리
4. 입력 정규화 방어 로직(빈 토큰 차단) 추가
5. Next.js 패치 버전 업데이트
