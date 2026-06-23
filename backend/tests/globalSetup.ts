import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import pg from 'pg';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '..');
const runtimeEnvPath = resolve(backendRoot, '.test-runtime.env');
const pgDataDir = resolve(backendRoot, 'tmp', 'pgdata-test');
const pgVersionFile = resolve(pgDataDir, 'PG_VERSION');

let embeddedPg: EmbeddedPostgres | null = null;

async function canConnect(databaseUrl: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

function writeRuntimeEnv(databaseUrl: string) {
  writeFileSync(
    runtimeEnvPath,
    [
      `DATABASE_URL="${databaseUrl}"`,
      'JWT_SECRET="test-secret"',
      'JWT_EXPIRES_IN="1h"',
      'NODE_ENV="test"',
      '',
    ].join('\n'),
  );
}

function migrateAndSeed(databaseUrl: string) {
  const env = { ...process.env, DATABASE_URL: databaseUrl, JWT_SECRET: 'test-secret' };
  execSync('npx prisma migrate deploy', { cwd: backendRoot, env, stdio: 'pipe' });
  execSync('npx tsx prisma/seed.ts', { cwd: backendRoot, env, stdio: 'pipe' });
}

async function startEmbeddedPostgres(): Promise<string> {
  mkdirSync(pgDataDir, { recursive: true });
  embeddedPg = new EmbeddedPostgres({
    databaseDir: pgDataDir,
    user: 'oex',
    password: 'oex',
    port: 5433,
    persistent: true,
  });

  if (!existsSync(pgVersionFile)) {
    await embeddedPg.initialise();
  }
  await embeddedPg.start();

  try {
    await embeddedPg.createDatabase('oex_test');
  } catch {
    // database may already exist from a prior run
  }

  return 'postgresql://oex:oex@localhost:5433/oex_test?schema=public';
}

export default async function globalSetup() {
  const configuredUrl =
    process.env.DATABASE_URL ?? 'postgresql://oex:oex@localhost:5432/oex_test?schema=public';

  let databaseUrl = configuredUrl;

  if (await canConnect(configuredUrl)) {
    migrateAndSeed(configuredUrl);
  } else {
    const embeddedUrl = 'postgresql://oex:oex@localhost:5433/oex_test?schema=public';
    if (await canConnect(embeddedUrl)) {
      databaseUrl = embeddedUrl;
    } else {
      databaseUrl = await startEmbeddedPostgres();
    }
    migrateAndSeed(databaseUrl);
  }

  writeRuntimeEnv(databaseUrl);

  return async () => {
    if (embeddedPg) {
      try {
        await embeddedPg.stop();
      } catch {
        // Windows may lock pgdata dir briefly after stop
      }
    }
    if (existsSync(runtimeEnvPath)) {
      unlinkSync(runtimeEnvPath);
    }
  };
}
