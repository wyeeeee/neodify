import type { DbContext } from '@neodify/db';
import type { SkillRuntimeService } from '../skills/skill-runtime.service.js';
import type { AgentProvider } from '../../providers/agent-provider.js';
import type { RunInput } from '../../types/domain.js';
import { createRunId } from '../../utils/ids.js';
import { AgentService } from '../agents/agent-service.js';
import { RunEventBus } from './run-event-bus.js';
import { RunGuard } from './run-guard.js';

export class RunService {
  private readonly guard = new RunGuard();

  constructor(
    private readonly db: DbContext,
    private readonly agentService: AgentService,
    private readonly skillRuntimeService: SkillRuntimeService,
    private readonly provider: AgentProvider,
    private readonly bus: RunEventBus
  ) {}

  private appendEvent(runId: string, seq: number, eventType: string, payload: Record<string, unknown>): void {
    const createdAt = Date.now();
    this.db.runEventRepository.append(runId, seq, eventType, JSON.stringify(payload), createdAt);
    this.bus.publish({ runId, seq, eventType, payload, createdAt });
  }

  async execute(input: RunInput): Promise<{ runId: string }> {
    const runId = createRunId();
    await this.guard.withLock(runId, async () => {
      let seq = 0;
      const startedAt = Date.now();
      this.db.runRepository.create({
        id: runId,
        source: input.source,
        agentId: input.agentId,
        status: 'running',
        inputJson: JSON.stringify({ prompt: input.prompt, metadata: input.metadata }),
        outputJson: null,
        errorMsg: null,
        startedAt,
        endedAt: null,
        latencyMs: null,
        costJson: JSON.stringify({ total_cost_usd: 0 })
      });
      this.appendEvent(runId, ++seq, 'run.started', { source: input.source, agentId: input.agentId });

      try {
        const resolved = this.agentService.resolveAgent(input.agentId);
        this.appendEvent(runId, ++seq, 'agent.resolved', {
          agentName: resolved.agent.name,
          skillCount: resolved.skills.length,
          mcpCount: resolved.mcps.length
        });

        const runCwd = this.skillRuntimeService.prepareRunCwd(runId, resolved.skills);
        this.appendEvent(runId, ++seq, 'skill.runtime_prepared', {
          runCwd,
          skillCount: resolved.skills.length
        });

        const result = await this.provider.run({
          prompt: input.prompt,
          systemPrompt: resolved.agent.systemPromptMd,
          model: resolved.agent.model,
          maxTokens: resolved.agent.maxTokens,
          mcpList: resolved.mcps,
          cwd: runCwd
        });

        for (const event of result.events) {
          this.appendEvent(runId, ++seq, event.eventType, event.payload);
        }

        const endedAt = Date.now();
        const latencyMs = endedAt - startedAt;
        this.db.runRepository.finishSuccess(
          runId,
          JSON.stringify({ text: result.text, structuredOutput: result.structuredOutput }),
          endedAt,
          latencyMs,
          JSON.stringify({ total_cost_usd: result.totalCostUsd })
        );
        this.appendEvent(runId, ++seq, 'run.completed', {
          latencyMs,
          totalCostUsd: result.totalCostUsd
        });
      } catch (error) {
        const endedAt = Date.now();
        const latencyMs = endedAt - startedAt;
        const message = error instanceof Error ? error.message : '未知错误';
        this.db.runRepository.finishFailure(runId, message, endedAt, latencyMs);
        this.appendEvent(runId, ++seq, 'run.failed', {
          message
        });
      }
    });

    return { runId };
  }
}
