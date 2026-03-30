# Website (`website/`)

Next.js app + Prisma + MySQL.

```bash
# from monorepo root
npm install
cd website
copy .env.example .env.local   # Windows; or: cp .env.example .env.local
# edit .env.local — set DATABASE_URL, JWT_SECRET, AUTH_DEV_OTP_BYPASS=true
cd ..
npm run db:push
npm run db:seed
npm run dev:web
```

Prisma schema: `prisma/schema.prisma`  
Seed: `npm run db:seed`

Panels: `/login`, `/admin`, `/store`, `/delivery`.
