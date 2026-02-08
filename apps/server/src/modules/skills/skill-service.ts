import type { DbContext } from '@neodify/db';
import type { CreateSkillDto } from '../../types/api.js';
import type { SkillConfig } from '../../types/domain.js';
import { SkillFileService } from './skill-file.service.js';

export class SkillService {
  constructor(
    private readonly db: DbContext,
    private readonly skillFileService: SkillFileService
  ) {}

  saveSkill(input: CreateSkillDto): void {
    const now = Date.now();
    const paths = this.skillFileService.createSkillFiles(input.id, input.skillMdContent);
    this.db.skillRepository.upsert({
      id: input.id,
      name: input.name,
      rootPath: paths.rootPath,
      skillMdPath: paths.skillMdPath,
      enabled: input.enabled,
      createdAt: now,
      updatedAt: now
    });
  }

  updateSkillContent(skillId: string, content: string): void {
    this.skillFileService.updateSkillContent(skillId, content);
    const current = this.db.skillRepository.getById(skillId);
    if (!current) {
      throw new Error('Skill 不存在');
    }
    this.db.skillRepository.upsert({
      ...current,
      updatedAt: Date.now()
    });
  }

  listEnabledSkills(): Array<SkillConfig & { skillMdContent: string }> {
    this.syncMissingSkillsToDisabled();
    return this.db.skillRepository.listEnabled().map((item) => ({
      id: item.id,
      name: item.name,
      rootPath: item.rootPath,
      skillMdPath: item.skillMdPath,
      enabled: item.enabled,
      skillMdContent: this.skillFileService.readSkillContent(item.id)
    }));
  }

  syncMissingSkillsToDisabled(): void {
    const allSkills = this.db.skillRepository.listAll();
    for (const item of allSkills) {
      if (!item.enabled) {
        continue;
      }
      if (this.skillFileService.exists(item.id)) {
        continue;
      }
      this.db.skillRepository.upsert({
        ...item,
        enabled: false,
        updatedAt: Date.now()
      });
    }
  }
}
