import { describe, expect, test } from 'vitest';
import { RunEventBus } from '../src/modules/runs/run-event-bus.js';

describe('RunEventBus', () => {
  test('subscribe should receive published events', () => {
    const bus = new RunEventBus();
    const received: string[] = [];

    const unsubscribe = bus.subscribe('run-1', (message) => {
      received.push(message.eventType);
    });

    bus.publish({
      runId: 'run-1',
      seq: 1,
      eventType: 'run.started',
      payload: { ok: true },
      createdAt: Date.now()
    });

    unsubscribe();
    bus.publish({
      runId: 'run-1',
      seq: 2,
      eventType: 'run.completed',
      payload: { ok: true },
      createdAt: Date.now()
    });

    expect(received).toEqual(['run.started']);
  });
});

