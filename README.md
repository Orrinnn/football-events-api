# Football Events API

REST API for football events built with Hono, TypeScript, Prisma and PostgreSQL.

## Tech stack

- Hono
- TypeScript
- Prisma
- PostgreSQL (Neon)
- JWT authentication
- Vitest

## Setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
npm run dev