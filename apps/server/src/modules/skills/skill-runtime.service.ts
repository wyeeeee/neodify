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

  prepareConversationCwd(conversationId: string, conversationCwd: string, skills: SkillConfig[]): string {
    const runSkillRoot = path.resolve(conversationCwd, '.claude', 'skills');
    fs.mkdirSync(runSkillRoot, { recursive: true });

    const existing = fs.existsSync(runSkillRoot) ? new Set(fs.readdirSync(runSkillRoot)) : new Set<string>();
    const targetSet = new Set(skills.map((item) => item.id));

    for (const folder of existing) {
      if (!targetSet.has(folder)) {
        fs.rmSync(path.resolve(runSkillRoot, folder), { recursive: true, force: true });
      }
    }

    for (const skill of skills) {
      const targetDir = path.resolve(runSkillRoot, skill.id);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(skill.skillMdPath, path.join(targetDir, 'SKILL.md'));
    }

    return conversationCwd;
  }
}
