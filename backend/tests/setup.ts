import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const runtimeEnvPath = resolve(__dirname, '../.test-runtime.env');

function loadRuntimeEnv() {
  if (!existsSync(runtimeEnvPath)) {
    return;
  }
  const content = readFileSync(runtimeEnvPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadRuntimeEnv();

const { createApp } = await import('../src/app.js');
export const app = createApp();
