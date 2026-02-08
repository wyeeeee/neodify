import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { SkillRuntimeService } from '../src/modules/skills/skill-runtime.service.js';

describe('SkillRuntimeService', () => {
  const oldCwd = process.cwd();
  let tmpRoot = '';

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'neodify-runtime-'));
    process.chdir(tmpRoot);
  });

  afterEach(() => {
    process.chdir(oldCwd);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test('should project skill to run .claude/skills directory', () => {
    const skillRoot = path.resolve(tmpRoot, 'skills', 'writer');
    fs.mkdirSync(skillRoot, { recursive: true });
    const skillMdPath = path.join(skillRoot, 'SKILL.md');
    fs.writeFileSync(skillMdPath, '# Writer Skill', 'utf-8');

    const service = new SkillRuntimeService(tmpRoot);
    const runCwd = service.prepareRunCwd('run-1', [
      {
        id: 'writer',
        name: 'writer',
        enabled: true,
        rootPath: skillRoot,
        skillMdPath
      }
    ]);

    const projected = path.resolve(runCwd, '.claude', 'skills', 'writer', 'SKILL.md');
    expect(fs.existsSync(projected)).toBe(true);
    expect(fs.readFileSync(projected, 'utf-8')).toContain('Writer Skill');
  });
});

