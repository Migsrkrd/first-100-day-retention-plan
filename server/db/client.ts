// Platform-owned: do not edit. Import { db } to query; tables live in ./schema
// and the app's accounts in ./accounts. Preview connects with DATABASE_URL; Test
// and Deploy reach their Aurora database through its Data API.
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { sql } from 'drizzle-orm';
import { drizzle as drizzleDataApi } from 'drizzle-orm/aws-data-api/pg';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import * as accounts from './accounts';
import * as schema from './schema';

const tables = { ...accounts, ...schema };
const clusterArn = process.env.CLARITY_DB_CLUSTER_ARN;

function isLocalDatabaseUrl(value: string): boolean {
  return (
    value.includes('localhost') || value.includes('postgres:5432') || value.includes('127.0.0.1')
  );
}

/** Match the platform pool: RDS requires TLS; local Docker Postgres does not. */
function buildPoolSsl(value: string): false | { rejectUnauthorized: true; ca?: string } {
  if (isLocalDatabaseUrl(value)) return false;
  const caPath = process.env.RDS_CA_BUNDLE_PATH || path.resolve('/app/certs/global-bundle.pem');
  try {
    return { rejectUnauthorized: true, ca: fs.readFileSync(caPath, 'utf8') };
  } catch {
    return { rejectUnauthorized: true };
  }
}

/** Explicit ssl: above conflicts with sslmode in the URL (pg prefers one path). */
function connectionStringWithoutSslMode(value: string): string {
  try {
    const url = new URL(value);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('ssl');
    return url.toString();
  } catch {
    return value;
  }
}

const databaseUrl = connectionStringWithoutSslMode(process.env.DATABASE_URL ?? '');
const pool = clusterArn
  ? null
  : new pg.Pool({
      connectionString: databaseUrl,
      ssl: buildPoolSsl(databaseUrl),
      max: Number(process.env.DATABASE_POOL_MAX) || 5,
    });

// Both drivers expose the same query builder; app code is typed against one.
export const db: NodePgDatabase<typeof tables> = pool
  ? drizzlePg(pool, { schema: tables })
  : (drizzleDataApi(new RDSDataClient({}), {
      resourceArn: clusterArn as string,
      secretArn: process.env.CLARITY_DB_SECRET_ARN ?? '',
      database: process.env.CLARITY_DB_NAME ?? 'app',
      schema: tables,
    }) as unknown as NodePgDatabase<typeof tables>);
export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Runs work in a transaction with app.user_id set, for row-level security policies. */
export function withUser<T>(userId: string, work: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return work(tx);
  });
}

export async function closeDatabase(): Promise<void> {
  await pool?.end();
}
