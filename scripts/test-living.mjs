import { build } from 'esbuild';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const temporary = await mkdtemp(join(tmpdir(), 'tinyops-tests-'));
try {
  const testDirectory = fileURLToPath(new URL('../tests/', import.meta.url));
  const names = (await readdir(testDirectory)).filter(name => name.endsWith('.test.ts'));
  await build({
    entryPoints: names.map(name => join(testDirectory, name)),
    outdir: temporary,
    outExtension: { '.js': '.mjs' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    logLevel: 'warning',
  });
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...names.map(name => join(temporary, name.replace(/\.ts$/, '.mjs')))], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
