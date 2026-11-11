import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
process.chdir(fileURLToPath(root));
for (const [example, target] of [
  ['.env.example', '.env'],
  ['../frontend/.env.example', '../frontend/.env.local'],
]) {
  if (!existsSync(target)) {
    copyFileSync(example, target);
    if (target === '.env')
      writeFileSync(
        target,
        readFileSync(target, 'utf8').replace(
          'replace-with-at-least-32-random-characters',
          randomBytes(48).toString('hex'),
        ),
      );
    console.log(`Created ${target}`);
  }
}
const commands = [
  ['docker', ['compose', 'up', '-d', '--wait']],
  ['npm', ['run', 'db:generate']],
  ['npm', ['run', 'db:migrate']],
  ['npm', ['run', 'db:seed']],
];
for (const [cmd, args] of commands) {
  const result = spawnSync(process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(
      `Setup stopped at ${cmd} ${args.join(' ')}. Fix the reported error and run npm run setup again.`,
    );
    process.exit(result.status || 1);
  }
}
console.log('Ready. Run npm run dev in backend, and npm run dev in frontend. Open http://localhost:3300');
