# YouVoca 개발 순서

## 1. 프로젝트 기반

- Backend: NestJS `/api` prefix, CORS, 환경변수, ValidationPipe
- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- 완료 조건: lint, typecheck, build, health check 통과

## 2. 데이터베이스

- PostgreSQL 연결 및 Prisma schema/migration
- 단어는 전역 `Vocabulary` 한 건, 영상 속 등장은 `TranscriptVocabulary`로 분리
- 사용자가 저장한 등장 문장은 `UserVocabularyExample`로 연결
- 완료 조건: schema validate/generate 및 migration 성공

## 3. 인증과 사용자

- 로컬 회원가입/로그인, bcrypt, JWT guard, 현재 사용자 decorator
- provider/providerId로 소셜 로그인 확장성 유지
- 완료 조건: 회원가입 → 로그인 → 보호 API e2e 통과

## 4. 대본 수집

- 직접 업로드/상세 조회를 먼저 구현
- YouTube URL 검증, 영상 메타데이터/자막 추출 adapter 구현
- 완료 조건: 영상과 대본 중복 방지, segment 보존

## 5. AI 단어 분석

- OpenAI structured output으로 뜻·품사·CEFR·문장 번역 분석
- 동일 단어는 upsert하고 등장 문장만 추가
- 완료 조건: JSON 검증, 오류 처리, 결과 저장 테스트

## 6. 개인 단어장

- 저장/목록/상태 변경/상세 조회
- 중복 단어에는 “문장 추가하기”, “복습에 추가” 제공
- 완료 조건: Vocabulary/UserVocabulary 중복 제약 테스트

## 7. 복습과 통계

- 복습 카드, 결과 저장, 상태 전환
- 사용자 수준 분포와 대본 난이도 계산
- 완료 조건: 집계 및 복습 이력 테스트

## 8. Frontend 연동

- 인증 → URL/업로드 → 대본 → 분석 → 분류 → 단어장 → 복습 → 통계
- API client, 인증 상태, 로딩/오류/빈 상태 공통 처리
- 완료 조건: 핵심 사용자 흐름 e2e 통과

## 9. 배포

- Frontend Vercel, Backend Railway/Render, DB Supabase/Neon
- 환경변수, migration 배포, 모니터링과 보안 점검
