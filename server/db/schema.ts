// The app's tables, defined with Drizzle. The platform generates and applies
// migrations from this file; never write SQL migrations by hand. Accounts
// (app_users) already exist in ./accounts.
//
// import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
// import { appUsers } from './accounts';
//
// export const notes = pgTable('notes', {
//   id: uuid('id').primaryKey().defaultRandom(),
//   ownerId: uuid('owner_id').notNull().references(() => appUsers.id, { onDelete: 'cascade' }),
//   body: text('body').notNull(),
//   createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
// });

export {};
