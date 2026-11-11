import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const backend = fileURLToPath(new URL('../', import.meta.url)),
  frontend = fileURLToPath(new URL('../../frontend/', import.meta.url));
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this script with npm run verify:all from backend');
const steps = [
  [backend, 'db:generate'],
  [backend, 'format:check'],
  [frontend, 'format:check'],
  [backend, 'typecheck'],
  [frontend, 'typecheck'],
  [backend, 'test'],
  [backend, 'build'],
  [frontend, 'build'],
  [backend, 'audit'],
  [frontend, 'audit'],
];
for (const [cwd, script] of steps) {
  const result = spawnSync(process.execPath, [npm, 'run', script], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, RUN_DB_TESTS: process.env.RUN_DB_TESTS || 'true' },
  });
  if (result.status !== 0) {
    console.error(
      `Verification stopped: ${cwd.endsWith('frontend/') ? 'frontend' : 'workspace'} ${script}`,
    );
    process.exit(result.status || 1);
  }
}
console.log(
  'Both independent applications verified. With servers running, run npm run test:e2e in frontend for browser acceptance.',
);
