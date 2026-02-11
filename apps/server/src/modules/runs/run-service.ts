import type { DbContext } from '../../db/index.js';
import type { ConversationService } from '../conversations/conversation-service.js';
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
    private readonly conversationService: ConversationService,
    private readonly skillRuntimeService: SkillRuntimeService,
    private readonly provider: AgentProvider,
    private readonly bus: RunEventBus
  ) {}

  private appendEvent(runId: string, seq: number, eventType: string, payload: Record<string, unknown>): void {
    const createdAt = Date.now();
    this.db.runEventRepository.append(runId, seq, eventType, JSON.stringify(payload), createdAt);
    this.bus.publish({ runId, seq, eventType, payload, createdAt });
  }

  private async processRun(
    runId: string,
    startedAt: number,
    input: RunInput,
    conversation: {
      id: string;
      agentId: string;
      title: string;
      cwd: string;
      sdkSessionId: string | null;
      createdAt: number;
      updatedAt: number;
    }
  ): Promise<void> {
    let seq = 0;
    this.appendEvent(runId, ++seq, 'run.started', { source: input.source, agentId: input.agentId });

    try {
      const resolved = this.agentService.resolveAgent(input.agentId);
      this.appendEvent(runId, ++seq, 'agent.resolved', {
        agentName: resolved.agent.name,
        skillCount: resolved.skills.length,
        mcpCount: resolved.mcps.length
      });

      const runCwd = this.skillRuntimeService.prepareConversationCwd(conversation.id, conversation.cwd, resolved.skills);
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
        cwd: runCwd,
        resumeSessionId: conversation.sdkSessionId ?? undefined
      });

      if (result.sessionId) {
        this.conversationService.updateSessionId(conversation.id, result.sessionId);
        this.db.runRepository.updateSdkSessionId(runId, result.sessionId);
      }

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
  }

  async execute(input: RunInput & { conversationTitle?: string }): Promise<{ runId: string; conversationId: string }> {
    const runId = createRunId();
    const startedAt = Date.now();
    const conversation = this.conversationService.ensureConversation({
      conversationId: input.conversationId,
      agentId: input.agentId,
      title: input.conversationTitle
    });

    const turnIndex = this.conversationService.nextTurnIndex(conversation.id);
    this.db.runRepository.create({
      id: runId,
      source: input.source,
      agentId: input.agentId,
      conversationId: conversation.id,
      turnIndex,
      sdkSessionId: conversation.sdkSessionId,
      status: 'running',
      inputJson: JSON.stringify({ prompt: input.prompt, metadata: input.metadata }),
      outputJson: null,
      errorMsg: null,
      startedAt,
      endedAt: null,
      latencyMs: null,
      costJson: JSON.stringify({ total_cost_usd: 0 })
    });

    void this.guard.withLock(runId, async () => {
      await this.processRun(runId, startedAt, input, conversation);
    });

    return { runId, conversationId: conversation.id };
  }
}
