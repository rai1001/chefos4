import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const overwrite = args.includes('--overwrite');
const registryFlagIndex = args.indexOf('--registry');
const registryPath =
  registryFlagIndex >= 0 ? args[registryFlagIndex + 1] : 'skills/skill-registry.json';

if (registryFlagIndex >= 0 && !registryPath) {
  console.error('Missing value for --registry');
  process.exit(1);
}

const home = os.homedir();
const LINK_STUB_MAX_BYTES = 256;

function expandHome(inputPath) {
  if (!inputPath) return inputPath;
  return inputPath.replace(/^~(?=$|[\\/])/, home);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hasSkillMd(dirPath) {
  return fileExists(path.join(dirPath, 'SKILL.md'));
}

async function isDirectoryEntry(entry, entryPath) {
  if (entry.isDirectory()) {
    return true;
  }

  if (entry.isSymbolicLink()) {
    try {
      const stats = await fs.stat(entryPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  return false;
}

function shouldSkipEntry(entryName) {
  if (entryName === '__pycache__') {
    return true;
  }

  if (entryName.endsWith('.pyc')) {
    return true;
  }

  return false;
}

async function resolveLinkStub(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile() || stats.size > LINK_STUB_MAX_BYTES) {
      return null;
    }

    if (path.extname(filePath)) {
      return null;
    }

    const raw = await fs.readFile(filePath, 'utf8');
    const trimmed = raw.trim();

    if (!trimmed || trimmed.includes('\n') || trimmed.includes('\r')) {
      return null;
    }

    if (!/^\.\.?(?:[\\/]|$)/.test(trimmed)) {
      return null;
    }

    const resolved = path.resolve(path.dirname(filePath), trimmed);
    if (!(await fileExists(resolved))) {
      return null;
    }

    return resolved;
  } catch {
    return null;
  }
}

async function copyDirectory(sourceDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (shouldSkipEntry(entry.name)) {
      continue;
    }

    const sourceEntryPath = path.join(sourceDir, entry.name);
    const destEntryPath = path.join(destDir, entry.name);

    if (entry.isSymbolicLink()) {
      let linkTarget;
      try {
        linkTarget = await fs.readlink(sourceEntryPath);
      } catch {
        linkTarget = null;
      }

      if (linkTarget) {
        const resolvedTarget = path.isAbsolute(linkTarget)
          ? linkTarget
          : path.resolve(sourceDir, linkTarget);

        if (await fileExists(resolvedTarget)) {
          const targetStats = await fs.stat(resolvedTarget);
          if (targetStats.isDirectory()) {
            await copyDirectory(resolvedTarget, destEntryPath);
          } else {
            await fs.copyFile(resolvedTarget, destEntryPath);
          }
          continue;
        }

        await fs.writeFile(destEntryPath, linkTarget);
        continue;
      }
    }

    if (entry.isDirectory()) {
      await copyDirectory(sourceEntryPath, destEntryPath);
      continue;
    }

    if (entry.isFile()) {
      const stubTarget = await resolveLinkStub(sourceEntryPath);
      if (stubTarget) {
        const targetStats = await fs.stat(stubTarget);
        if (targetStats.isDirectory()) {
          await copyDirectory(stubTarget, destEntryPath);
        } else {
          await fs.copyFile(stubTarget, destEntryPath);
        }
        continue;
      }

      await fs.copyFile(sourceEntryPath, destEntryPath);
    }
  }
}

async function listSkills(source) {
  const baseDir = expandHome(source.path);
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);

    if (!(await isDirectoryEntry(entry, fullPath))) {
      continue;
    }

    if (entry.name === '.system' && source.includeDotSystem) {
      const systemDir = fullPath;
      const systemEntries = await fs.readdir(systemDir, { withFileTypes: true });
      for (const systemEntry of systemEntries) {
        const systemPath = path.join(systemDir, systemEntry.name);
        if (!(await isDirectoryEntry(systemEntry, systemPath))) {
          continue;
        }
        if (await hasSkillMd(systemPath)) {
          const realPath = await fs.realpath(systemPath).catch(() => systemPath);
          skills.push({
            name: systemEntry.name,
            path: systemPath,
            realPath,
            sourceId: source.id,
          });
        }
      }
      continue;
    }

    if (entry.name.startsWith('.')) {
      continue;
    }

    if (await hasSkillMd(fullPath)) {
      const realPath = await fs.realpath(fullPath).catch(() => fullPath);
      skills.push({ name: entry.name, path: fullPath, realPath, sourceId: source.id });
    }
  }

  return skills;
}

async function resolveOverride(overrides, sources, skillName) {
  const override = overrides[skillName];
  if (!override) return null;

  const source = sources.find((item) => item.id === override.source);
  if (!source) {
    throw new Error(`Override source not found for ${skillName}: ${override.source}`);
  }

  const baseDir = expandHome(source.path);
  const overridePath = path.isAbsolute(override.path)
    ? override.path
    : path.join(baseDir, override.path);

  if (!(await hasSkillMd(overridePath))) {
    throw new Error(`Override path missing SKILL.md for ${skillName}: ${overridePath}`);
  }

  const realPath = await fs.realpath(overridePath).catch(() => overridePath);
  return { name: skillName, path: overridePath, realPath, sourceId: source.id };
}

async function copySkill(skill, destinationRoot) {
  const destinationPath = path.join(destinationRoot, skill.name);
  const destinationExists = await fileExists(destinationPath);

  if (destinationExists && !overwrite) {
    return { status: 'skipped', destinationPath };
  }

  if (!dryRun) {
    if (destinationExists && overwrite) {
      await fs.rm(destinationPath, { recursive: true, force: true });
    }
    await copyDirectory(skill.path, destinationPath);
  }

  return { status: 'copied', destinationPath };
}

async function main() {
  const registryRaw = await fs.readFile(registryPath, 'utf8');
  const registry = JSON.parse(registryRaw);
  const sources = registry.sources || [];
  const overrides = registry.overrides || {};
  const destinations = registry.destinations || [];

  if (sources.length === 0 || destinations.length === 0) {
    throw new Error('Registry must include sources and destinations');
  }

  const skillMap = new Map();
  const conflicts = [];

  for (const source of sources) {
    const skills = await listSkills(source);
    for (const skill of skills) {
      if (skillMap.has(skill.name)) {
        const existing = skillMap.get(skill.name);
        if (existing?.realPath === skill.realPath) {
          continue;
        }
        conflicts.push({
          name: skill.name,
          existing,
          incoming: skill,
        });
        continue;
      }
      skillMap.set(skill.name, skill);
    }
  }

  for (const skillName of Object.keys(overrides)) {
    const overrideSkill = await resolveOverride(overrides, sources, skillName);
    if (overrideSkill) {
      skillMap.set(skillName, overrideSkill);
    }
  }

  const unresolvedConflicts = conflicts.filter((conflict) => !overrides[conflict.name]);

  if (unresolvedConflicts.length > 0) {
    console.error('Unresolved skill conflicts:');
    for (const conflict of unresolvedConflicts) {
      console.error(
        `- ${conflict.name}: ${conflict.existing.sourceId} vs ${conflict.incoming.sourceId}`
      );
    }
    process.exit(1);
  }

  const summary = {
    copied: 0,
    skipped: 0,
    errors: 0,
  };

  for (const destination of destinations) {
    const destinationRoot = path.resolve(destination);
    await fs.mkdir(destinationRoot, { recursive: true });

    for (const skill of skillMap.values()) {
      try {
        const result = await copySkill(skill, destinationRoot);
        summary[result.status] += 1;
      } catch (error) {
        console.error(`Failed to copy ${skill.name} -> ${destinationRoot}`, error);
        summary.errors += 1;
      }
    }
  }

  console.log('Skill sync summary:', summary);
  if (dryRun) {
    console.log('Dry run only. No files were copied.');
  }
}

main().catch((error) => {
  console.error('Skill sync failed:', error);
  process.exit(1);
});
