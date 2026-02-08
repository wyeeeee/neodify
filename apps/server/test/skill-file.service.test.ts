import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { SkillFileService } from '../src/modules/skills/skill-file.service.js';

describe('SkillFileService', () => {
  const oldCwd = process.cwd();
  let cwd = '';

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'neodify-skill-'));
    process.chdir(cwd);
  });

  test('should create and update SKILL.md', () => {
    const service = new SkillFileService();
    service.createSkillFiles('writer', '# SKILL\n\n初版');
    const first = service.readSkillContent('writer');
    expect(first).toContain('初版');

    service.updateSkillContent('writer', '# SKILL\n\n更新版');
    const second = service.readSkillContent('writer');
    expect(second).toContain('更新版');
  });

  test('should throw when reading non-exist skill', () => {
    const service = new SkillFileService();
    expect(() => service.readSkillContent('unknown')).toThrow('Skill 文件不存在');
  });

  afterEach(() => {
    process.chdir(oldCwd);
    fs.rmSync(cwd, { recursive: true, force: true });
  });
});
