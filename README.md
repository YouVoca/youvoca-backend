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

로컬 PostgreSQL은 Docker의 `postgres:17-alpine` 이미지를 사용하며 데이터는
`youvoca-postgres-data` 볼륨에 유지됩니다.

전체 구현 순서는 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)를 참고하세요.
