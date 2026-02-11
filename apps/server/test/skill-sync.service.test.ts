import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { createDbContext } from '../src/db/index.js';
import { SkillService } from '../src/modules/skills/skill-service.js';

let dbPath = '';

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `neodify-skill-sync-${Date.now()}.sqlite`);
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
});

describe('SkillService sync', () => {
  test('local skill should be auto imported to database', () => {
    const db = createDbContext(dbPath);
    const skillFileService = {
      listLocalSkillIds: () => ['writer'],
      resolvePath: (skillId: string) => ({
        rootPath: `C:/repo/skills/${skillId}`,
        skillMdPath: `C:/repo/skills/${skillId}/SKILL.md`
      }),
      createSkillFiles: () => ({ rootPath: '', skillMdPath: '' }),
      updateSkillContent: () => {
        return;
      },
      readSkillContent: () => '# SKILL',
      exists: () => true
    };

    const service = new SkillService(db, skillFileService as never);
    service.syncLocalSkillsToDatabase();

    const row = db.skillRepository.getById('writer');
    expect(row?.id).toBe('writer');
    expect(row?.enabled).toBe(true);
    expect((row?.createdAt ?? 0) > 0).toBe(true);
  });

  test('missing skill file should be disabled in database', () => {
    const db = createDbContext(dbPath);
    const now = Date.now();
    db.skillRepository.upsert({
      id: 'local-skill',
      name: 'local-skill',
      rootPath: path.resolve(process.cwd(), '..', '..', 'skills', 'local-skill'),
      skillMdPath: path.resolve(process.cwd(), '..', '..', 'skills', 'local-skill', 'SKILL.md'),
      enabled: true,
      createdAt: now,
      updatedAt: now
    });

    const skillFileService = {
      listLocalSkillIds: () => [],
      resolvePath: (skillId: string) => ({
        rootPath: `C:/repo/skills/${skillId}`,
        skillMdPath: `C:/repo/skills/${skillId}/SKILL.md`
      }),
      createSkillFiles: () => ({ rootPath: '', skillMdPath: '' }),
      updateSkillContent: () => {
        return;
      },
      readSkillContent: () => '# SKILL',
      exists: () => false
    };

    const service = new SkillService(db, skillFileService as never);
    service.syncLocalSkillsToDatabase();

    const row = db.skillRepository.getById('local-skill');
    expect(row?.enabled).toBe(false);
  });
});
