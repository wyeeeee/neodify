import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { createDbContext } from '../src/db/index.js';
import { SkillFileService } from '../src/modules/skills/skill-file.service.js';
import { SkillService } from '../src/modules/skills/skill-service.js';

let dbPath = '';

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `neodify-skill-sync-${Date.now()}.sqlite`);
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
});

describe('SkillService sync', () => {
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

    const service = new SkillService(db, new SkillFileService());
    service.syncMissingSkillsToDisabled();

    const row = db.skillRepository.getById('local-skill');
    expect(row?.enabled).toBe(false);
  });
});
