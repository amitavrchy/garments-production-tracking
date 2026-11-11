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
const environment = readFileSync('.env', 'utf8');
if (environment.includes('replace-with-at-least-32-random-characters')) {
  writeFileSync(
    '.env',
    environment.replace(
      'replace-with-at-least-32-random-characters',
      randomBytes(48).toString('hex'),
    ),
  );
  console.log('Replaced the example JWT secret with a generated local secret.');
}
for (const [cmd, args] of commands) {
  const isNpm = cmd === 'npm';
  if (isNpm && !process.env.npm_execpath) throw new Error('Run setup with npm run setup');
  const result = spawnSync(
    isNpm ? process.execPath : cmd,
    isNpm ? [process.env.npm_execpath, ...args] : args,
    {
      stdio: 'inherit',
      shell: false,
    },
  );
  if (result.status !== 0) {
    console.error(
      `Setup stopped at ${cmd} ${args.join(' ')}. Fix the reported error and run npm run setup again.`,
    );
    process.exit(result.status || 1);
  }
}
console.log(
  'Ready. Run npm run dev in backend, and npm run dev in frontend. Open http://localhost:3300',
);
