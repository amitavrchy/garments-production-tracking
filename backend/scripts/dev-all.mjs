import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const backend = fileURLToPath(new URL('../', import.meta.url)),
  frontend = fileURLToPath(new URL('../../frontend/', import.meta.url)),
  production = process.argv.includes('--production');
const tasks = production
  ? [
      [backend, ['dist/main.js']],
      [
        frontend,
        ['node_modules/next/dist/bin/next', 'start', '--port', '3300', '--hostname', '0.0.0.0'],
      ],
    ]
  : [
      [backend, ['node_modules/tsx/dist/cli.mjs', 'watch', 'src/main.ts']],
      [
        frontend,
        ['node_modules/next/dist/bin/next', 'dev', '--port', '3300', '--hostname', '0.0.0.0'],
      ],
    ];
const children = tasks.map(([cwd, args]) =>
  spawn(process.execPath, args, { cwd, stdio: 'inherit', env: process.env }),
);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
};
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
    stop();
  });
  child.on('exit', (code) => {
    if (!stopping && code !== 0) process.exitCode = code || 1;
    stop();
  });
}
