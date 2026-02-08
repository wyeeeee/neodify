import cron from 'node-cron';
import type { DbContext } from '@neodify/db';
import type { CreateScheduleDto } from '../../types/api.js';

export class ScheduleService {
  constructor(private readonly db: DbContext) {}

  saveSchedule(input: CreateScheduleDto): void {
    if (!cron.validate(input.cronExpr)) {
      throw new Error('Cron 表达式不合法');
    }
    this.db.scheduleRepository.upsert({
      id: input.id,
      name: input.name,
      cronExpr: input.cronExpr,
      agentId: input.agentId,
      inputTemplateJson: JSON.stringify(input.inputTemplate),
      enabled: input.enabled,
      nextRunAt: null,
      lastRunAt: null
    });
  }

  listSchedules() {
    return this.db.scheduleRepository.listAll().map((item) => ({
      ...item,
      inputTemplate: JSON.parse(item.inputTemplateJson) as Record<string, unknown>
    }));
  }
}

