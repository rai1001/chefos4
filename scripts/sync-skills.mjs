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

async function listSkills(source) {
  const baseDir = expandHome(source.path);
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink() || !entry.isDirectory()) {
      continue;
    }

    if (entry.name === '.system' && source.includeDotSystem) {
      const systemDir = path.join(baseDir, '.system');
      const systemEntries = await fs.readdir(systemDir, { withFileTypes: true });
      for (const systemEntry of systemEntries) {
        if (systemEntry.isSymbolicLink() || !systemEntry.isDirectory()) {
          continue;
        }
        const fullPath = path.join(systemDir, systemEntry.name);
        if (await hasSkillMd(fullPath)) {
          skills.push({
            name: systemEntry.name,
            path: fullPath,
            sourceId: source.id,
          });
        }
      }
      continue;
    }

    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(baseDir, entry.name);
    if (await hasSkillMd(fullPath)) {
      skills.push({ name: entry.name, path: fullPath, sourceId: source.id });
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

  return { name: skillName, path: overridePath, sourceId: source.id };
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
    await fs.cp(skill.path, destinationPath, { recursive: true });
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
        conflicts.push({
          name: skill.name,
          existing: skillMap.get(skill.name),
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
