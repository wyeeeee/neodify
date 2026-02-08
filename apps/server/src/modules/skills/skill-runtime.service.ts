import fs from 'node:fs';
import path from 'node:path';
import type { SkillConfig } from '../../types/domain.js';

export class SkillRuntimeService {
  constructor(private readonly repoRoot: string) {}

  prepareRunCwd(runId: string, skills: SkillConfig[]): string {
    const runCwd = path.resolve(this.repoRoot, '.runtime', 'runs', runId);
    const runSkillRoot = path.resolve(runCwd, '.claude', 'skills');
    fs.mkdirSync(runSkillRoot, { recursive: true });

    for (const skill of skills) {
      const targetDir = path.resolve(runSkillRoot, skill.id);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(skill.skillMdPath, path.join(targetDir, 'SKILL.md'));
    }

    return runCwd;
  }
}

