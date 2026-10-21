import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const forbidden = [
  'chrome-' + 'extension://',
  'https://' + 'example.com',
  'http://' + 'example.com',
  'local' + 'host'
];
const textExt = new Set(['.astro', '.ts', '.mjs', '.css', '.json', '.jsonc', '.md', '.svg', '.txt', '.yaml', '.yml']);
const skip = new Set(['node_modules', 'dist', '.git', '.astro', '.wrangler', 'scripts']);
let failed = false;

/** @param {string} dir */
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (textExt.has(path.extname(entry.name))) {
      const text = fs.readFileSync(full, 'utf8');
      for (const needle of forbidden) {
        if (text.includes(needle)) {
          console.error(`Forbidden content: ${needle} in ${full}`);
          failed = true;
        }
      }
    }
  }
}

walk(fileURLToPath(root));
if (fs.existsSync(fileURLToPath(new URL('../pnpm-workspace.yaml', import.meta.url)))) {
  const workspace = fs.readFileSync(fileURLToPath(new URL('../pnpm-workspace.yaml', import.meta.url)), 'utf8');
  if (!/^packages:\s*\n(?:\s*-\s*['"]?\.['"]?\s*\n?)+/m.test(workspace)) {
    console.error('pnpm-workspace.yaml exists but does not contain a non-empty packages list with the project root.');
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('Source hygiene checks passed.');
