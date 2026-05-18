#!/usr/bin/env node
// Converts all relative imports in src/ to @/ alias imports.
// Run once before reorganizing folders so all paths become absolute.
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');
const SKIP_DIRS = new Set(['node_modules', '.venv', 'gym-app-within-an-app']);

function walk(dir) {
  const results = [];
  for (const item of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(item)) continue;
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) results.push(...walk(full));
    else if (/\.(jsx?|tsx?)$/.test(item)) results.push(full);
  }
  return results;
}

function toAlias(fromFile, relPath) {
  const abs = path.resolve(path.dirname(fromFile), relPath);
  if (!abs.startsWith(SRC_DIR)) return null;
  return '@/' + path.relative(SRC_DIR, abs).replace(/\\/g, '/');
}

let totalChanged = 0;

for (const file of walk(SRC_DIR)) {
  let src = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Static imports/exports: from './x' or from '../x'
  src = src.replace(/((?:from|import)\s+['"])(\.{1,2}\/[^'"]+)(['"])/g, (m, before, rel, after) => {
    const alias = toAlias(file, rel);
    if (!alias) return m;
    changed = true;
    return before + alias + after;
  });

  // Dynamic imports: import('./x') or import('../x')
  src = src.replace(/(import\s*\(\s*['"])(\.{1,2}\/[^'"]+)(['"]\s*\))/g, (m, before, rel, after) => {
    const alias = toAlias(file, rel);
    if (!alias) return m;
    changed = true;
    return before + alias + after;
  });

  if (changed) {
    fs.writeFileSync(file, src, 'utf8');
    console.log('  updated:', path.relative(SRC_DIR, file));
    totalChanged++;
  }
}

console.log(`\nDone — updated ${totalChanged} files.`);
