import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const binDir = path.join(rootDir, 'node_modules', '.bin');
const candidateNames = process.platform === 'win32'
  ? ['chrome-devtools-mcp.cmd', 'chrome-devtools-mcp.ps1', 'chrome-devtools-mcp']
  : ['chrome-devtools-mcp'];
const executablePath = candidateNames
  .map((name) => path.join(binDir, name))
  .find((filePath) => fs.existsSync(filePath));

if (!executablePath) {
  console.error('Unable to locate chrome-devtools-mcp executable in node_modules/.bin.');
  process.exit(127);
}

const child = spawn(executablePath, process.argv.slice(2), {
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to launch chrome-devtools-mcp:', error.message);
  if (error.code === 'ENOENT') {
    process.exit(127);
  }
  process.exit(1);
});
