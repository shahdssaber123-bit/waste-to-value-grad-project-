import { spawn } from 'node:child_process';

const backendOnly = process.argv.includes('--backend-only');
const root = process.cwd();
const windowsCandidates = ['C:/php84/php.exe', 'C:/xampp/php/php.exe', 'php'];
const phpCommand = process.platform === 'win32'
  ? windowsCandidates.find((candidate) => candidate === 'php') || 'php'
  : 'php';

function run(command, args, label) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: false });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`);
      process.exitCode = code || 1;
    }
  });
  return child;
}

const children = [run(phpCommand, ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'], 'backend')];
if (!backendOnly) children.push(run('node', ['node_modules/vite/bin/vite.js'], 'frontend'));

function shutdown() {
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
