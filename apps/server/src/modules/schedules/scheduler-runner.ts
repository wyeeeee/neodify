import cron from 'node-cron';
import type { ScheduleService } from './schedule-service.js';
import type { RunService } from '../runs/run-service.js';

export class SchedulerRunner {
  private readonly tasks = new Map<string, cron.ScheduledTask>();

  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly runService: RunService
  ) {}

  start(): void {
    const schedules = this.scheduleService.listSchedules().filter((item) => item.enabled);
    for (const schedule of schedules) {
      const task = cron.schedule(schedule.cronExpr, async () => {
        await this.runService.execute({
          source: 'cron',
          agentId: schedule.agentId,
          prompt: String(schedule.inputTemplate.prompt ?? ''),
          metadata: {
            scheduleId: schedule.id,
            scheduleName: schedule.name
          }
        });
      });
      this.tasks.set(schedule.id, task);
    }
  }

  stop(): void {
    for (const task of this.tasks.values()) {
      task.stop();
      task.destroy();
    }
    this.tasks.clear();
  }
}

