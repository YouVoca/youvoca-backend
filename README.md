# YouVoca Backend

NestJS, Prisma, PostgreSQL 기반의 YouVoca API 서버입니다.

## 시작하기

```bash
cp .env.example .env
npm install
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3001/api`에서 실행됩니다.

## 확인 명령어

```bash
npm run lint
npm run typecheck
npm run build
```

헬스 체크 엔드포인트: `GET /api/health`

## Chrome Extension 자막 업로드

Vercel IP가 YouTube에서 제한될 수 있으므로, Chrome Extension은 브라우저에서
직접 자막을 추출한 뒤 `POST /api/transcripts/youtube`로 전송합니다. 백엔드는
YouTube에 직접 요청하지 않고 전달받은 transcript를 영상과 연결해 저장합니다.
이후 기존 `POST /api/vocabularies/analyze`에 `transcriptId`를 넘기면 단어 분석이
진행됩니다.

확장 프로그램 origin은 기본적으로 `chrome-extension://...` 형식을 허용합니다.
운영에서 명시적으로 관리하고 싶다면 `EXTENSION_ORIGINS`에 쉼표로 구분해 추가할
수 있습니다.

로컬 PostgreSQL은 Docker의 `postgres:17-alpine` 이미지를 사용하며 데이터는
`youvoca-postgres-data` 볼륨에 유지됩니다. 기존 로컬 PostgreSQL과 충돌하지
않도록 호스트에서는 `localhost:5433`으로 연결합니다.

전체 구현 순서는 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)를 참고하세요.
