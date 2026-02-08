import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(process.cwd(), '..', '..');
const PROJECT_SKILLS_ROOT = path.resolve(REPO_ROOT, 'skills');

function resolveSafePath(skillId: string): { rootPath: string; skillMdPath: string } {
  const rootPath = path.resolve(PROJECT_SKILLS_ROOT, skillId);
  if (!rootPath.startsWith(PROJECT_SKILLS_ROOT)) {
    throw new Error('非法 skill 路径');
  }
  return {
    rootPath,
    skillMdPath: path.join(rootPath, 'SKILL.md')
  };
}

export class SkillFileService {
  getProjectSkillsRoot(): string {
    return PROJECT_SKILLS_ROOT;
  }

  ensureProjectSkillsRoot(): void {
    fs.mkdirSync(PROJECT_SKILLS_ROOT, { recursive: true });
  }

  getRepoRoot(): string {
    return REPO_ROOT;
  }

  createSkillFiles(skillId: string, content: string): { rootPath: string; skillMdPath: string } {
    this.ensureProjectSkillsRoot();
    const { rootPath, skillMdPath } = resolveSafePath(skillId);
    fs.mkdirSync(rootPath, { recursive: true });
    fs.writeFileSync(skillMdPath, content, 'utf-8');
    return { rootPath, skillMdPath };
  }

  updateSkillContent(skillId: string, content: string): void {
    const { skillMdPath } = resolveSafePath(skillId);
    if (!fs.existsSync(skillMdPath)) {
      throw new Error('Skill 文件不存在');
    }
    fs.writeFileSync(skillMdPath, content, 'utf-8');
  }

  readSkillContent(skillId: string): string {
    const { skillMdPath } = resolveSafePath(skillId);
    if (!fs.existsSync(skillMdPath)) {
      throw new Error('Skill 文件不存在');
    }
    return fs.readFileSync(skillMdPath, 'utf-8');
  }

  exists(skillId: string): boolean {
    const { skillMdPath } = resolveSafePath(skillId);
    return fs.existsSync(skillMdPath);
  }

  resolvePath(skillId: string): { rootPath: string; skillMdPath: string } {
    return resolveSafePath(skillId);
  }
}
