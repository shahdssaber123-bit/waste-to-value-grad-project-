import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

const phpBinary = [
  process.env.WTV_PHP_BINARY,
  'C:/php84/php.exe',
  'C:/xampp/php/php.exe',
  'php',
].find((candidate) => candidate && (candidate === 'php' || existsSync(candidate)));

const commands = [
  {
    name: 'laravel',
    command: phpBinary,
    args: ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'],
  },
  {
    name: 'vite',
    command: process.platform === 'win32' ? 'node' : 'node',
    args: ['node_modules/vite/bin/vite.js'],
  },
];

const children = commands.map(({ name, command, args }) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`\n[${name}] exited with code ${code}`);
    }
    children.forEach((other) => {
      if (other !== child && !other.killed) other.kill();
    });
    process.exit(code ?? 0);
  });
  return child;
});
