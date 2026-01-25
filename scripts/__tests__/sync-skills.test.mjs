import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const scriptPath = path.join(repoRoot, 'scripts', 'sync-skills.mjs');

test('sync-skills dry run produces summary output', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-skills-'));

  try {
    const sourceDir = path.join(tmpDir, 'source');
    const destDir = path.join(tmpDir, 'dest');

    await fs.mkdir(path.join(sourceDir, 'demo-skill'), { recursive: true });
    await fs.writeFile(
      path.join(sourceDir, 'demo-skill', 'SKILL.md'),
      '---\nname: demo-skill\ndescription: test\n---\n'
    );

    const registry = {
      sources: [{ id: 'local', path: sourceDir }],
      overrides: {},
      destinations: [destDir],
    };

    const registryPath = path.join(tmpDir, 'registry.json');
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

    const { stdout } = await execFileAsync(
      process.execPath,
      [scriptPath, '--dry-run', '--registry', registryPath],
      { cwd: repoRoot }
    );

    assert.match(stdout, /Skill sync summary:/);
    assert.match(stdout, /Dry run only/);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('sync-skills resolves link stub files to their target', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-skills-'));

  try {
    const sourceDir = path.join(tmpDir, 'source');
    const destDir = path.join(tmpDir, 'dest');
    const sharedDataDir = path.join(tmpDir, 'shared', 'data');

    await fs.mkdir(sharedDataDir, { recursive: true });
    await fs.writeFile(path.join(sharedDataDir, 'palette.json'), '{"ok":true}');

    const skillDir = path.join(sourceDir, 'demo-skill');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: demo-skill\ndescription: test\n---\n'
    );

    const linkStubTarget = path.relative(skillDir, sharedDataDir);
    await fs.writeFile(path.join(skillDir, 'data'), linkStubTarget);

    const registry = {
      sources: [{ id: 'local', path: sourceDir }],
      overrides: {},
      destinations: [destDir],
    };

    const registryPath = path.join(tmpDir, 'registry.json');
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

    await execFileAsync(process.execPath, [scriptPath, '--registry', registryPath], {
      cwd: repoRoot,
    });

    const copiedFile = path.join(destDir, 'demo-skill', 'data', 'palette.json');
    const copiedContents = await fs.readFile(copiedFile, 'utf8');
    assert.equal(copiedContents, '{"ok":true}');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('sync-skills skips __pycache__ directories and .pyc files', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-skills-'));

  try {
    const sourceDir = path.join(tmpDir, 'source');
    const destDir = path.join(tmpDir, 'dest');

    const skillDir = path.join(sourceDir, 'demo-skill');
    const cacheDir = path.join(skillDir, '__pycache__');

    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: demo-skill\ndescription: test\n---\n'
    );
    await fs.writeFile(path.join(cacheDir, 'module.cpython-313.pyc'), 'binary');
    await fs.writeFile(path.join(skillDir, 'module.pyc'), 'binary');

    const registry = {
      sources: [{ id: 'local', path: sourceDir }],
      overrides: {},
      destinations: [destDir],
    };

    const registryPath = path.join(tmpDir, 'registry.json');
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

    await execFileAsync(process.execPath, [scriptPath, '--registry', registryPath], {
      cwd: repoRoot,
    });

    await assert.rejects(
      fs.stat(path.join(destDir, 'demo-skill', '__pycache__')),
      /ENOENT/
    );
    await assert.rejects(
      fs.stat(path.join(destDir, 'demo-skill', 'module.pyc')),
      /ENOENT/
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
