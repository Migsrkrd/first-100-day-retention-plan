// Platform-owned: do not edit. The platform runs drizzle-kit; migrations land in ./drizzle.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./server/db/accounts.ts', './server/db/schema.ts'],
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
});
