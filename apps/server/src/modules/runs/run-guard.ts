export class RunGuard {
  private readonly running = new Set<string>();

  async withLock<T>(runId: string, fn: () => Promise<T>): Promise<T> {
    if (this.running.has(runId)) {
      throw new Error('Run 已在执行中');
    }
    this.running.add(runId);
    try {
      return await fn();
    } finally {
      this.running.delete(runId);
    }
  }
}

