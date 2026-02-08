import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { createDbContext } from '@neodify/db';
import { ScheduleService } from '../src/modules/schedules/schedule-service.js';

let dbPath = '';

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `neodify-schedule-${Date.now()}.sqlite`);
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
});

describe('ScheduleService', () => {
  test('should save valid cron schedule', () => {
    const db = createDbContext(dbPath);
    const service = new ScheduleService(db);

    service.saveSchedule({
      id: 'schedule-1',
      name: '每日任务',
      cronExpr: '*/5 * * * *',
      agentId: 'agent-1',
      inputTemplate: { prompt: 'hello' },
      enabled: true
    });

    const rows = service.listSchedules();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('每日任务');
  });

  test('should reject invalid cron schedule', () => {
    const db = createDbContext(dbPath);
    const service = new ScheduleService(db);
    expect(() => {
      service.saveSchedule({
        id: 'schedule-2',
        name: '错误任务',
        cronExpr: 'invalid cron',
        agentId: 'agent-1',
        inputTemplate: {},
        enabled: true
      });
    }).toThrow('Cron 表达式不合法');
  });
});

