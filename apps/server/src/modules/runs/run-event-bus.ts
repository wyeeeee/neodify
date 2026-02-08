export type RunEventMessage = {
  runId: string;
  seq: number;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: number;
};

type Listener = (message: RunEventMessage) => void;

export class RunEventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  publish(message: RunEventMessage): void {
    const set = this.listeners.get(message.runId);
    if (!set) {
      return;
    }
    for (const listener of set) {
      listener(message);
    }
  }

  subscribe(runId: string, listener: Listener): () => void {
    const set = this.listeners.get(runId) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(runId, set);
    return () => {
      const target = this.listeners.get(runId);
      if (!target) {
        return;
      }
      target.delete(listener);
      if (target.size === 0) {
        this.listeners.delete(runId);
      }
    };
  }
}

