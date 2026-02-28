# Vertex AI + Gemini 추천/분석 문서 생성 계획

기준일: 2026-02-28  
대상 시스템: Urban-DDS (Next.js `app/api/*`, Firestore 연동 구조)

## 1) 목표

- Vertex AI 기반 Gemini를 연동해 `정비 우선순위 추천 + 분석 문서 자동 생성` 기능을 추가
- 결과는 사람이 읽기 좋은 문서(요약/근거/시나리오/리스크/실행안)로 생성
- 해커톤 기준으로는 먼저 `신뢰 가능한 구조화 결과(JSON)`를 생성하고, 문서 형태(PDF/Markdown)는 후처리로 안정화

## 2) 현재 구조에서의 적합성

- 현재 `/api/analysis/report`가 이미 분석 결과를 반환하므로, LLM 레이어만 Vertex AI로 교체/확장하면 됨
- Firestore 저장 로직이 있으므로 생성 문서 메타/버전 관리도 바로 가능
- GCP(Cloud Run) 배포 계획과도 자연스럽게 맞물림

## 3) 모델 전략 (안정성 우선)

## 권장 기본 모델

1. `gemini-2.5-flash`
   - 이유: 속도/비용/성능 균형이 좋아 API 기반 실시간 추천에 적합
2. `gemini-2.5-pro` (선택)
   - 이유: 복잡한 정책 문서 해석/장문 보고서 품질 강화용

## 프리뷰 모델 사용 원칙

- `Gemini 3* preview`는 기능 실험(예: 최신 grounding 옵션)에는 좋지만, 해커톤 본선 데모는 안정 모델(2.5 계열) 우선

## 4) 기능 범위 정의

## A. LLM 추천/분석 API

- 입력:
  - `regionCode`, `regionName`
  - 정량 지표(`agingScore`, `infraRisk`, `marketScore`, `policyFit`)
  - 보조 컨텍스트(실거래 요약, 건축물 정보, 정책 룰)
- 출력:
  - 추천 시나리오
  - 핵심 근거 3~5개
  - 리스크/가정
  - 실행 우선순위 액션

## B. 문서 생성 API

- LLM이 `response_schema` 기반 JSON 출력
- 서버에서 템플릿 렌더링:
  - v1: Markdown/HTML
  - v2: PDF(Cloud Run 내 렌더링 또는 별도 워커)
- 산출물 저장:
  - Firestore: 문서 메타
  - Cloud Storage(선택): PDF 원본

## 5) 권장 아키텍처

1. 클라이언트 -> `POST /api/analysis/report`
2. 서버가 내부 데이터 집계 + 점수 계산
3. Vertex AI Gemini 호출(구조화 출력 강제)
4. 응답 JSON 검증
5. 문서 템플릿 생성(`/api/analysis/document`)
6. Firestore/Storage 저장 후 URL 반환

## 6) 프롬프트/출력 설계

## 시스템 프롬프트 원칙

1. 정책 자문 톤 고정
2. 근거 없는 단정 금지
3. 입력 지표 범위(0~100) 해석 규칙 명시
4. 반드시 `근거`, `리스크`, `실행 단계` 포함

## 출력 스키마(예시)

```json
{
  "recommendedScenario": "full_redevelopment | selective_redevelopment | phased_redevelopment",
  "executiveSummary": "string",
  "evidence": ["string"],
  "risks": ["string"],
  "actionPlan": [
    {
      "phase": "1",
      "task": "string",
      "owner": "string",
      "timeline": "string"
    }
  ],
  "confidence": 0
}
```

설명:
- 자유 텍스트만 받지 말고 스키마 출력으로 고정해야 품질 편차를 줄일 수 있음

## 7) Grounding/RAG 전략

## MVP (해커톤)

- 내부 API에서 수집한 데이터(실거래/건축/지표)를 직접 프롬프트 컨텍스트로 주입
- 필요 시 Google Search grounding을 제한적으로 사용(최신 공공 이슈 보강)

## 확장 단계

1. Vertex AI Search에 법령/조례/내부 문서 인덱싱
2. Gemini grounding with Vertex AI Search 적용
3. 추론 근거 citation 필드 저장

## 8) 구현 단계 (8시간 기준)

## 0:00-1:00

- Vertex AI 인증/환경변수 세팅
- 기존 Gemini 호출부를 Vertex AI SDK 호출부로 분리

## 1:00-2:30

- `response_schema` 기반 JSON 출력 구현
- 파서/검증기(`zod` 또는 수동 validator) 추가

## 2:30-4:00

- `/api/analysis/document` 추가
- JSON -> Markdown 템플릿 생성

## 4:00-5:30

- Firestore 문서 메타 저장
- 실패 시 fallback(룰 기반 요약)

## 5:30-7:00

- UI 연결(문서 미리보기, 재생성 버튼, 버전 표시)
- 로깅/에러 UX 정리

## 7:00-8:00

- E2E 점검(분석 -> 문서생성 -> 저장)
- 데모 시나리오 리허설

## 9) 운영/보안 계획

1. 비밀키는 Secret Manager 사용, 코드/클라이언트 노출 금지
2. 모델/프롬프트 버전 필드 저장(재현성 확보)
3. API 타임아웃 및 재시도 정책(LLM 장애 대비)
4. 비용 가드레일:
   - max tokens 제한
   - 요청당 문서 길이 제한
   - 사용자별 생성 횟수 제한(선택)

## 10) 성공 기준 (Definition of Done)

1. `/api/analysis/report`가 Vertex AI 기반 추천 결과를 반환
2. `/api/analysis/document`가 구조화 결과를 문서화해 반환
3. Firestore에 분석 결과 + 문서 메타 저장
4. 오류 시 fallback 응답으로 데모 플로우가 끊기지 않음
5. 3개 이상의 지역 샘플에서 일관된 품질 확인

## 11) 기술 선택안

## Option A (권장): `@google/genai` + Vertex AI

- 장점: Gemini API/Vertex 전환 유연성, 최신 기능 반영이 빠름
- 단점: 팀 내 SDK 표준 합의 필요

## Option B: `@google-cloud/vertexai`

- 장점: GCP 네이티브 SDK로 운영 친화적
- 단점: 일부 최신 기능 예제/패턴이 분산되어 있을 수 있음

## 12) 참고 문서 (공식)

1. 모델 버전/수명주기  
   <https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions>
2. Gemini 모델 목록(Vertex AI)  
   <https://cloud.google.com/vertex-ai/generative-ai/docs/models>
3. Structured output (`response_schema`)  
   <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output>
4. Function calling  
   <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling>
5. Grounding with Google Search  
   <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search>
6. Grounding with Vertex AI Search  
   <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-vertex-ai-search>
7. Google Gen AI SDK 개요  
   <https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview>

