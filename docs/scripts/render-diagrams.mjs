/**
 * Render Mermaid .mmd files to PNG in docs/images/
 */
import { readdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIAGRAMS_DIR = join(__dirname, 'diagrams');
const OUT_DIR = join(__dirname, '..', 'images');

async function renderOne(mmdFile) {
  const name = basename(mmdFile, '.mmd');
  const outFile = join(OUT_DIR, `diagram-${name}.png`);
  const mmdc = join(__dirname, 'node_modules', '@mermaid-js', 'mermaid-cli', 'src', 'cli.js');
  await execFileAsync(
    process.execPath,
    [mmdc, '-i', mmdFile, '-o', outFile, '-b', 'white', '-w', '1200'],
    { cwd: __dirname },
  );
  console.log('Rendered', `diagram-${name}.png`);
}

async function main() {
  const files = (await readdir(DIAGRAMS_DIR))
    .filter((f) => f.endsWith('.mmd'))
    .sort()
    .map((f) => join(DIAGRAMS_DIR, f));

  for (const file of files) {
    await renderOne(file);
  }
  console.log('Done — diagrams in docs/images/diagram-*.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
