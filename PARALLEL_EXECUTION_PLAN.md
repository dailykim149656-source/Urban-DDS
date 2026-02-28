# Urban-DDS 병렬 개발 분할안 (검증 전담 포함)

기준: 8시간 해커톤, React + Next.js + Vercel

## 1) 역할 분담

## Terminal A (Codex-A): 데이터/백엔드 담당

- Next.js Route Handler 구현
- 외부 API 연동 (실거래가, 건축물대장, 주소/좌표)
- 데이터 정규화 DTO
- 우선순위 점수 계산 엔진
- Gemini 분석 API 서버 호출부

## Terminal B (Codex-B): 프론트엔드/UX 담당

- 지도 화면 (Leaflet)
- 주소 검색 UI
- 우선순위 패널/지표 카드
- 정책 리포트 페이지
- 로딩/에러/빈 상태 UI

## Terminal C (나): 검증 전담

- API 계약서(요청/응답) 고정
- 브랜치/머지 순서 관리
- 코드 리뷰 및 회귀 검증
- 빌드/배포 검증
- 데모 시나리오 검증

---

## 2) 브랜치 전략

- `main`: 배포 기준
- `feat/api-core` (A 전용)
- `feat/ui-core` (B 전용)
- 통합 시 `integration/mvp` 브랜치 생성 후 최종 `main` 머지

규칙:
- A/B는 서로 브랜치 직접 수정 금지
- 공통 계약 파일 변경은 검증 담당 승인 후 반영

---

## 3) 파일 소유권 (충돌 방지)

## A 전용

- `app/api/**`
- `lib/server/**`
- `lib/scoring/**`
- `lib/adapters/**`
- `.env.example` (서버 변수 정의)

## B 전용

- `app/(dashboard)/**`
- `components/**`
- `lib/client/**`
- `styles/**`

## 공통 (수정 시 사전 합의 필수)

- `types/contract.ts`
- `types/domain.ts`

---

## 4) API 계약 (먼저 고정)

아래 3개 엔드포인트를 먼저 확정하고 병렬 시작:

1. `GET /api/region/summary?address=...`
2. `GET /api/region/metrics?regionCode=...`
3. `POST /api/analysis/report`

`POST /api/analysis/report` 예시:

```json
{
  "regionId": "gangnam-daechi",
  "metrics": {
    "agingScore": 82,
    "infraRisk": 74,
    "marketScore": 68,
    "policyFit": 77
  }
}
```

응답 예시:

```json
{
  "priorityScore": 75.55,
  "recommendedScenario": "full_redevelopment",
  "summary": "노후도와 인프라 위험도가 높아 전면 정비가 유리합니다.",
  "evidence": [
    "준공 후 30년 초과 건물 비율 높음",
    "최근 실거래 회전율 낮음"
  ]
}
```

---

## 5) 8시간 작업 타임라인

## 0:00-0:30 (공통)

- 계약 파일(`types/contract.ts`) 확정
- 환경변수 키 이름 확정

## 0:30-3:00 (병렬 1차)

- A: API 3개 + DTO/점수 엔진 구현
- B: 지도/검색/패널 UI 구현, API Mock 연결

## 3:00-4:00 (통합 1차)

- B가 실제 API로 스위치
- A/B 통합 smoke test

## 4:00-6:00 (병렬 2차)

- A: Gemini 리포트 품질 개선 + 예외처리
- B: 정책 리포트 차트/상태 UX 정리

## 6:00-7:00 (통합 2차)

- 성능/에러/빈데이터 검증
- 배포 전 빌드 점검

## 7:00-8:00 (마감)

- Vercel 배포
- 시연 플로우 점검
- 발표용 체크리스트 확인

---

## 6) 검증 게이트 (내가 확인할 항목)

1. `npm run build` 성공
2. 타입 에러 0건 (`tsc --noEmit`)
3. API 실패 시 UI fallback 동작
4. Gemini 키/공공 API 키 클라이언트 노출 없음
5. 주소 검색 -> 지도 이동 -> 분석 리포트까지 E2E 동작

---

## 7) 각 터미널 보고 포맷 (고정)

각 작업 완료 시 아래 형식으로 보고:

```text
[Terminal A or B]
- 완료 항목:
- 변경 파일:
- 미완료/리스크:
- 다음 30분 계획:
```

이 포맷으로 받으면 검증 담당이 즉시 병목 없이 다음 판단 가능.

---

## 8) 오늘 운영 규칙

- 계약 변경은 반드시 사전 공유
- 서로의 브랜치에 직접 커밋 금지
- 큰 기능보다 "끊기지 않는 데모 플로우" 우선
- 최종 1시간은 기능 추가 금지, 안정화만 수행

