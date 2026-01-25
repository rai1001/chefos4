# Skills

This directory contains functional skills that extend the agent's capabilities.

## How to add a new skill

1. Create a new folder inside this `skills` directory. The folder name should be the name of the skill (e.g., `data-analysis`).
2. Inside that folder, create a `SKILL.md` file.
3. The `SKILL.md` file must contain YAML frontmatter with the skill name and description, followed by detailed markdown instructions.

Example structure:
```
skills/
  └── my-new-skill/
      └── SKILL.md
```

Example `SKILL.md`:
```markdown
---
name: my-new-skill
description: A skill to do something awesome
---

# Instructions

To use this skill...
```

## External skills sync

- Canonical directory: `.agent/skills`
- Mirror directory: `skills`
- Registry: `skills/skill-registry.json`
- Dry run: `npm run sync:skills`
- Overwrite: `npm run sync:skills:overwrite`
- Sources: `~/.agents/skills`, `~/.codex/skills` (includes `.system`)
