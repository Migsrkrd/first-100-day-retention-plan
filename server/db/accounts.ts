// Platform-owned: do not edit. The app's accounts, used by server/auth.ts.
// Reference a person from your own tables in server/db/schema.ts:
//   import { appUsers } from './accounts';
//   ownerId: uuid('owner_id').notNull().references(() => appUsers.id, { onDelete: 'cascade' }),
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const appUsers = pgTable('app_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appSessions = pgTable(
  'app_sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('app_sessions_user_id_idx').on(table.userId)],
);
