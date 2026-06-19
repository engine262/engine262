#!/usr/bin/env node
/* eslint-disable no-console */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { glob } from 'tinyglobby';

// stdio: 'inherit' and similar options aren't in the promisify overload types
/* eslint-disable @typescript-eslint/no-explicit-any */
const execFileAsync = (cmd: string, args: string[], options: any = {}) => promisify(execFile)(cmd, args, { ...options, maxBuffer: 10 * 1024 * 1024 });
/* eslint-enable @typescript-eslint/no-explicit-any */

interface LockEntry {
  name: string;
  description: string;
  source: string;
  commit: string;
  path: string[];
  diff?: string[];
}

interface SpecLock {
  [name: string]: string;
}

interface ParsedPRSource {
  type: 'pr';
  owner: string;
  repo: string;
  prNumber: string;
  cloneUrl: string;
}

interface ParsedRepoSource {
  type: 'repo';
  cloneUrl: string;
}

type ParsedSource = ParsedPRSource | ParsedRepoSource;

function validateLockFile(data: unknown): LockEntry[] {
  const entrySchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    source: z.string().min(1),
    commit: z.string().regex(/^[0-9a-f]{40}$/i),
    path: z.array(z.string()),
    diff: z.array(z.string()).optional(),
  });
  const schema = z.object({ spec: z.array(entrySchema) });
  return schema.parse(data).spec as LockEntry[];
}

async function calculateHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

async function listFilesRecursive(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return listFilesRecursive(fullPath);
    }
    return [fullPath];
  }));
  return nested.flat().sort();
}

async function calculateEntryHash(name: string, specDir: string): Promise<string> {
  const files = await fs.readdir(specDir, { withFileTypes: true });
  const entryFiles = (
    await Promise.all(files.map(async (entry) => {
      const fullPath = path.join(specDir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === name ? listFilesRecursive(fullPath) : [];
      }

      const rel = path.relative(specDir, fullPath);
      return rel.startsWith(`${name}.`) ? [fullPath] : [];
    }))
  ).flat().sort();

  if (entryFiles.length === 0) return '';

  const hash = createHash('sha256');
  const fileHashes = await Promise.all(entryFiles.map((file) => calculateHash(file)));
  for (let i = 0; i < entryFiles.length; i += 1) {
    hash.update(path.relative(specDir, entryFiles[i]));
    hash.update(fileHashes[i]);
  }
  return hash.digest('hex');
}

async function readSpecLock(specDir: string): Promise<SpecLock> {
  const lockPath = path.join(specDir, 'spec.lock.json');
  try {
    return JSON.parse(await fs.readFile(lockPath, 'utf-8'));
  } catch {
    return {};
  }
}

async function writeSpecLock(specDir: string, lock: SpecLock): Promise<void> {
  const lockPath = path.join(specDir, 'spec.lock.json');
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(lockPath, JSON.stringify(lock, null, 2));
}

function parseSource(source: string): ParsedSource {
  const prMatch = source.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/);
  if (prMatch) {
    const [, owner, repo, prNumber] = prMatch;
    return {
      type: 'pr', owner, repo, prNumber, cloneUrl: `https://github.com/${owner}/${repo}.git`,
    };
  }

  let cloneUrl = source;
  const githubHttpsMatch = source.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
  if (githubHttpsMatch) {
    const [, owner, repo] = githubHttpsMatch;
    cloneUrl = `https://github.com/${owner}/${repo}.git`;
  }

  return { type: 'repo', cloneUrl };
}

async function gitShallowCloneCommit(cloneUrl: string, commit: string, checkoutDir: string): Promise<void> {
  await fs.mkdir(checkoutDir, { recursive: true });
  await execFileAsync('git', ['init'], { cwd: checkoutDir });
  await execFileAsync('git', ['remote', 'add', 'origin', cloneUrl], { cwd: checkoutDir });

  console.log(`Fetching ${commit} from ${cloneUrl}...`);
  await execFileAsync('git', ['fetch', '--depth=1', 'origin', commit], { cwd: checkoutDir, stdio: 'inherit' });
  await execFileAsync('git', ['checkout', commit], { cwd: checkoutDir, stdio: 'inherit' });

  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: checkoutDir });
  const actualCommit = (Buffer.isBuffer(stdout) ? stdout.toString('utf-8') : String(stdout)).trim();
  if (actualCommit !== commit) {
    throw new Error(`Commit mismatch: expected ${commit}, got ${actualCommit}`);
  }
}

async function gitGenerateDiff(
  checkoutDir: string,
  commit: string,
  prNumber: string,
  diffPaths: string[],
): Promise<string> {
  const prHeadRef = `refs/remotes/origin/pr/${prNumber}/head`;
  const prMergeRef = `refs/remotes/origin/pr/${prNumber}/merge`;
  const fetchRefs = [
    `pull/${prNumber}/head:${prHeadRef}`,
    `pull/${prNumber}/merge:${prMergeRef}`,
  ];

  await execFileAsync('git', ['fetch', '--depth=1', 'origin', ...fetchRefs], { cwd: checkoutDir });

  let mergeBase = '';
  for (let attempts = 0; attempts < 5; attempts += 1) {
    try {
      // Diff from the PR branch point, not the current base branch tip.
      // GitHub's synthetic merge ref uses the current base as first parent.
      // For older PRs that can greatly inflate the patch unless we walk back to
      // the actual merge-base with the PR head.
      // eslint-disable-next-line no-await-in-loop
      const { stdout: mergeBaseStdout } = await execFileAsync('git', ['merge-base', `${prMergeRef}^1`, prHeadRef], { cwd: checkoutDir });
      mergeBase = (Buffer.isBuffer(mergeBaseStdout) ? mergeBaseStdout.toString('utf-8') : String(mergeBaseStdout)).trim();
      break;
    } catch {
      // eslint-disable-next-line no-await-in-loop
      await execFileAsync('git', ['fetch', '--deepen=50', 'origin', ...fetchRefs], { cwd: checkoutDir });
    }
  }

  if (mergeBase === '') {
    throw new Error(`Unable to determine merge base for PR ${prNumber}`);
  }

  const { stdout } = await execFileAsync('git', ['diff', mergeBase, commit, '--', ...diffPaths], { cwd: checkoutDir });
  return Buffer.isBuffer(stdout) ? stdout.toString('utf-8') : String(stdout);
}

async function matchPathGlobs(patterns: string[], cwd: string): Promise<string[]> {
  const matched = new Set<string>();
  for (const pattern of patterns) {
    // eslint-disable-next-line no-await-in-loop
    const result = await glob(pattern, { cwd, dot: true });
    if (result.length === 0) throw new Error(`path pattern matched no files: ${pattern}`);
    for (const f of result) matched.add(f.replace(/^\.\//, ''));
  }
  return Array.from(matched).sort();
}

function computeOutputPaths(name: string, matchedFiles: string[], specDir: string): Map<string, string> {
  const outputPaths = new Map<string, string>();

  if (matchedFiles.length === 1) {
    const file = matchedFiles[0];
    outputPaths.set(file, path.join(specDir, `${name}${path.extname(file)}`));
  } else {
    const commonAncestor = computeCommonAncestor(matchedFiles);
    for (const file of matchedFiles) {
      const relativePath = file.substring(commonAncestor.length).replace(/^\//, '');
      outputPaths.set(file, path.join(specDir, name, relativePath));
    }
  }

  return outputPaths;
}

function computeCommonAncestor(paths: string[]): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) {
    const dir = path.dirname(paths[0]);
    return dir === '.' ? '' : dir;
  }

  const segments = paths.map((p) => p.split('/'));
  const minLength = Math.min(...segments.map((s) => s.length - 1));

  let commonLength = 0;
  for (let idx = 0; idx < minLength; idx += 1) {
    const segment = segments[0][idx];
    if (segments.every((s) => s[idx] === segment)) {
      commonLength += 1;
    } else {
      break;
    }
  }

  return segments[0].slice(0, commonLength).join('/');
}

async function copyFiles(checkoutDir: string, outputPaths: Map<string, string>): Promise<void> {
  await Promise.all(
    Array.from(outputPaths.entries()).map(async ([sourceFile, outputFile]) => {
      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      await fs.copyFile(path.join(checkoutDir, sourceFile), outputFile);
    }),
  );
}

async function processEntry(entry: LockEntry, specDir: string, tempDir: string): Promise<void> {
  console.log(`Processing: ${entry.name}`);

  const parsedSource = parseSource(entry.source);
  const checkoutDir = path.join(tempDir, entry.name);

  await gitShallowCloneCommit(parsedSource.cloneUrl, entry.commit, checkoutDir);

  const matchedFiles = await matchPathGlobs(entry.path, checkoutDir);
  console.log(`  Matched ${matchedFiles.length} file(s)`);

  const outputPaths = computeOutputPaths(entry.name, matchedFiles, specDir);
  await copyFiles(checkoutDir, outputPaths);

  if (entry.diff && parsedSource.type === 'pr') {
    const diffContent = await gitGenerateDiff(checkoutDir, entry.commit, parsedSource.prNumber, entry.diff);
    const patchFile = path.join(specDir, `${entry.name}.patch`);
    await fs.writeFile(patchFile, diffContent);
    console.log(`  Generated patch: ${patchFile}`);
  }
}

async function clearSpecDirectory(specDir: string, entries: LockEntry[]): Promise<void> {
  try {
    const activeNames = new Set(entries.map((e) => e.name));
    const diskEntries = await fs.readdir(specDir, { withFileTypes: true });

    await Promise.all(
      diskEntries
        .filter((de) => de.name !== 'spec.lock.json')
        .filter((de) => {
          const baseName = de.isDirectory() ? de.name : path.parse(de.name).name;
          return !activeNames.has(baseName);
        })
        .map((de) => {
          const fullPath = path.join(specDir, de.name);
          return de.isDirectory()
            ? fs.rm(fullPath, { recursive: true, force: true })
            : fs.unlink(fullPath);
        }),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function main() {
  const resolvedLockFile = path.resolve('spec.json');
  const resolvedSpecDir = path.resolve('spec');

  console.log(`Reading lock file: ${resolvedLockFile}`);
  const entries = validateLockFile(JSON.parse(await fs.readFile(resolvedLockFile, 'utf-8')));
  console.log(`Found ${entries.length} lock entries\n`);

  console.log('Cleaning spec directory...');
  await clearSpecDirectory(resolvedSpecDir, entries);
  await fs.mkdir(resolvedSpecDir, { recursive: true });

  const specLock = await readSpecLock(resolvedSpecDir);
  const newSpecLock: SpecLock = {};
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spec-update-'));

  try {
    for (const entry of entries) {
      const configHash = createHash('sha256')
        .update(entry.commit)
        .update(JSON.stringify(entry.path))
        .update(JSON.stringify(entry.diff ?? []))
        .digest('hex');

      if (specLock[entry.name] === configHash) {
        // eslint-disable-next-line no-await-in-loop
        const currentHash = await calculateEntryHash(entry.name, resolvedSpecDir);
        if (currentHash !== '') {
          console.log(`Skipping: ${entry.name} (already up to date)`);
          newSpecLock[entry.name] = configHash;
          continue;
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await processEntry(entry, resolvedSpecDir, tempDir);
      newSpecLock[entry.name] = configHash;
    }

    await writeSpecLock(resolvedSpecDir, newSpecLock);
    console.log('\nSpec update completed successfully');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
