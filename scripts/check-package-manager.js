#!/usr/bin/env node
import fs from 'node:fs';

const forbiddenLocks = ['bun.lock', 'bun.lockb'];
const existingForbidden = forbiddenLocks.filter((file) => fs.existsSync(file));

if (existingForbidden.length > 0) {
  console.error(`Lockfiles não permitidos encontrados: ${existingForbidden.join(', ')}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!packageJson.packageManager || !String(packageJson.packageManager).startsWith('npm@')) {
  console.error('package.json deve definir "packageManager" com npm.');
  process.exit(1);
}

console.log('Package manager check OK.');
