# Backend

The NestJS API for the Cyber Learning Platform. Setup, configuration, commands and design notes are in the
[main README](../README.md).

Quick reference (from this folder):

```bash
npm install
npx prisma migrate deploy && npx prisma generate
npm run start:dev      # http://localhost:3000
npm test               # no database needed
```

Settings are in `.env` (copy `.env.example`).
