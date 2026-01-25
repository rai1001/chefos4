# Project Skills Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Vendor all external skills into the repo and document a repeatable sync workflow, while capturing the current PGRST205 debugging evidence.
**Architecture:** `.agent/skills` is the canonical skills directory. A Node sync script reads `skills/skill-registry.json` to import skills from `~/.agents/skills` and `~/.codex/skills` (including `.system`) and mirrors into `skills/`. Conflicts are resolved via explicit overrides in the registry.
**Tech Stack:** Node.js (ESM), PowerShell, Supabase CLI, Markdown.

---

**Preflight:** Execute this plan in a dedicated git worktree before making changes.

### Task 1: Capture PGRST205 evidence for schedule_day_requirements (@systematic-debugging)

**Files:**
- Modify: `docs/debug-log.md`

**Step 1: Run a failing evidence check (table existence)**

Run: `supabase db query "select to_regclass('public.schedule_day_requirements') as table_exists;"`
Expected: `table_exists` is `null` if the table is missing (FAIL is acceptable; this is evidence).

**Step 2: Check migration state**

Run: `supabase db query "select version from supabase_migrations.schema_migrations where version = '20260128000001';"`
Expected: zero rows if the migration has not been applied.

**Step 3: Append a debug log entry**

Add to `docs/debug-log.md`:

```markdown
Fecha: 2026-01-25

### Incidencias reportadas
- Backend: PGRST205 "Could not find the table 'public.schedule_day_requirements' in the schema cache" from schedule coverage endpoints.

### Evidencia
- Query: select to_regclass('public.schedule_day_requirements') as table_exists;
- Result: table_exists = null
- Query: select version from supabase_migrations.schema_migrations where version = '20260128000001';
- Result: <empty>

### Notas
- Servicio: ScheduleCoverageService.getCoverageRules
- Logs: backend_dev.log at 2026-01-23 10:44
```

**Step 4: Verify the log entry is present**

Run: `rg -n "PGRST205|schedule_day_requirements" docs/debug-log.md`
Expected: lines matching the new entry.

**Step 5: Commit**

```bash
git add docs/debug-log.md
git commit -m "docs: log PGRST205 schedule_day_requirements evidence"
```

### Task 2: Add a skills registry config (@skill-installer)

**Files:**
- Create: `skills/skill-registry.json`

**Step 1: Run a failing registry parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('skills/skill-registry.json','utf8'))"`
Expected: FAIL with ENOENT because the file does not exist yet.

**Step 2: Create the registry**

```json
{
  "sources": [
    {
      "id": "agents",
      "path": "~/.agents/skills"
    },
    {
      "id": "codex",
      "path": "~/.codex/skills",
      "includeDotSystem": true
    }
  ],
  "overrides": {
    "skill-creator": {
      "source": "codex",
      "path": ".system/skill-creator"
    }
  },
  "destinations": [
    ".agent/skills",
    "skills"
  ]
}
```

**Step 3: Re-run the registry parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('skills/skill-registry.json','utf8'))"`
Expected: no output, exit code 0.

**Step 4: Commit**

```bash
git add skills/skill-registry.json
git commit -m "chore: add skills registry config"
```

### Task 3: Implement the skills sync script (@test-driven-development)

**Files:**
- Create: `scripts/sync-skills.mjs`

**Step 1: Run a failing script**

Run: `node scripts/sync-skills.mjs --dry-run`
Expected: FAIL with "Cannot find module" or file not found.

**Step 2: Create the sync script**

```javascript
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

    const unresolvedConflicts = conflicts.filter(
        (conflict) => !overrides[conflict.name]
    );

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
```

**Step 3: Run the script in dry-run mode**

Run: `node scripts/sync-skills.mjs --dry-run`
Expected: exit code 0 and a summary like `Skill sync summary: { copied: 0, skipped: <n>, errors: 0 }`.

**Step 4: Commit**

```bash
git add scripts/sync-skills.mjs
git commit -m "chore: add skills sync script"
```

### Task 4: Add npm scripts to run sync

**Files:**
- Modify: `package.json`

**Step 1: Run a failing npm script**

Run: `npm run sync:skills`
Expected: FAIL with "missing script: sync:skills".

**Step 2: Add scripts**

```json
{
  "scripts": {
    "sync:skills": "node scripts/sync-skills.mjs --dry-run",
    "sync:skills:overwrite": "node scripts/sync-skills.mjs --overwrite"
  }
}
```

**Step 3: Re-run the script**

Run: `npm run sync:skills`
Expected: exit code 0 and "Dry run only. No files were copied."

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add skills sync npm scripts"
```

### Task 5: Document the skills sync workflow (@quality-documentation-manager)

**Files:**
- Modify: `skills/README.md`
- Modify: `.agent/skills/README.md`
- Modify: `DEVELOPMENT.md`

**Step 1: Add documentation blocks**

Append to `skills/README.md` and `.agent/skills/README.md`:

```markdown
## External skills sync

- Canonical directory: `.agent/skills`
- Mirror directory: `skills`
- Registry: `skills/skill-registry.json`
- Dry run: `npm run sync:skills`
- Overwrite: `npm run sync:skills:overwrite`
- Sources: `~/.agents/skills`, `~/.codex/skills` (includes `.system`)
```

Add to `DEVELOPMENT.md`:

```markdown
## Skills

- Sync external skills into the repo with `npm run sync:skills` (dry run) or `npm run sync:skills:overwrite`.
- Update sources and overrides in `skills/skill-registry.json`.
```

**Step 2: Verify docs**

Run: `rg -n "sync:skills|skill-registry" skills/README.md .agent/skills/README.md DEVELOPMENT.md`
Expected: matches in all three files.

**Step 3: Commit**

```bash
git add skills/README.md .agent/skills/README.md DEVELOPMENT.md
git commit -m "docs: explain skills sync workflow"
```

### Task 6: Fix orchestrator workflow path to skills (@orquestador-de-habilidades)

**Files:**
- Modify: `.agent/workflows/orchestrate.md`

**Step 1: Confirm the typo exists**

Run: `rg -n "skilllls" .agent/workflows/orchestrate.md`
Expected: a match with the incorrect path.

**Step 2: Update the path and note the canonical directory**

Replace:
`G:\visual\CHEFOS2\skilllls\skills\[skill-name]\SKILL.md`

With:
`G:\visual\CHEFOS2\.agent\skills\[skill-name]\SKILL.md`

Add a short note near the path about syncing external skills with `npm run sync:skills:overwrite`.

**Step 3: Verify the typo is gone**

Run: `rg -n "skilllls" .agent/workflows/orchestrate.md`
Expected: no matches.

**Step 4: Commit**

```bash
git add .agent/workflows/orchestrate.md
git commit -m "docs: fix skills path in orchestrator workflow"
```

### Task 7: Sync external skills into the repo (@skill-installer)

**Files:**
- Modify: `.agent/skills/*`
- Modify: `skills/*`

**Step 1: Dry-run the sync**

Run: `npm run sync:skills`
Expected: summary printed with `Dry run only. No files were copied.`

**Step 2: Perform the sync**

Run: `npm run sync:skills:overwrite`
Expected: summary printed with `errors: 0`.

**Step 3: Verify SKILL.md count increased**

Run: `rg --files -g "SKILL.md" .agent/skills | Measure-Object`
Expected: `Count` higher than before the sync.

**Step 4: Commit**

```bash
git add .agent/skills skills
git commit -m "chore: sync external skills into repo"
```
