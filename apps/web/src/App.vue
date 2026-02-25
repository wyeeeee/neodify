<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { login } from './services/auth-api'
import { clearAuthSession, loadAuthSession, saveAuthSession } from './services/auth-storage'
import { listAgents, listMcps, listSkills, saveAgent } from './services/management-api'
import type { AgentConfig, CreateAgentPayload, McpConfig, SkillConfig } from './types/management'

interface NavItem {
  key: string
  label: string
  description: string
}

const username = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const session = ref(loadAuthSession())
const activeNavKey = ref('console')
const hasLoadedAgentData = ref(false)
const isAgentDataLoading = ref(false)
const isAgentSaving = ref(false)
const agentDataErrorMessage = ref('')
const agentFormMessage = ref('')
const agents = ref<AgentConfig[]>([])
const skillOptions = ref<SkillConfig[]>([])
const mcpOptions = ref<McpConfig[]>([])

const agentForm = reactive<CreateAgentPayload>({
  id: '',
  name: '',
  enabled: true,
  model: 'claude-sonnet-4-5',
  systemPromptMd: '',
  temperature: 0.2,
  maxTokens: 4000,
  skillIds: [],
  mcpIds: []
})

const navItems: NavItem[] = [
  { key: 'console', label: '运行控制台', description: '调用与实时事件' },
  { key: 'runs', label: '运行详情', description: '历史运行与追踪' },
  { key: 'agents', label: 'Agent 管理', description: '模型与提示词配置' },
  { key: 'skills', label: 'Skill 管理', description: 'SKILL.md 编辑与同步' },
  { key: 'mcps', label: 'MCP 管理', description: '连接模式与参数配置' }
]

const isLoggedIn = computed(() => Boolean(session.value?.token))
const isAgentPage = computed(() => activeNavKey.value === 'agents')
const runtimeModeLabel = computed(() => (import.meta.env.MODE === 'production' ? 'production' : 'development'))
const activeNav = computed(() => navItems.find((item) => item.key === activeNavKey.value) ?? navItems[0])
const workspaceSubtitle = computed(() => {
  if (isAgentPage.value) {
    return '维护 Agent 模型参数与关联的 Skill / MCP 配置'
  }
  return '内容区域已预留，后续按模块逐步接入功能'
})
const sessionExpiresAtText = computed(() => {
  if (!session.value) {
    return '--'
  }
  return new Date(session.value.expiresAt).toLocaleString()
})

function resetAgentForm(): void {
  agentForm.id = ''
  agentForm.name = ''
  agentForm.enabled = true
  agentForm.model = 'claude-sonnet-4-5'
  agentForm.systemPromptMd = ''
  agentForm.temperature = 0.2
  agentForm.maxTokens = 4000
  agentForm.skillIds = []
  agentForm.mcpIds = []
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

function normalizeIdList(list: string[]): string[] {
  const unique = new Set<string>()
  for (const item of list) {
    const value = item.trim()
    if (!value) {
      continue
    }
    unique.add(value)
  }
  return [...unique]
}

function isUnauthorizedError(message: string): boolean {
  return message.includes('token') || message.includes('未登录') || message.includes('401')
}

function getSessionToken(): string {
  if (!session.value?.token) {
    throw new Error('登录状态已失效，请重新登录')
  }
  return session.value.token
}

function updateSelectedIds(list: string[], value: string, checked: boolean): string[] {
  if (checked) {
    return normalizeIdList([...list, value])
  }
  return list.filter((item) => item !== value)
}

function handleSkillChecked(skillId: string, event: Event): void {
  const target = event.target as HTMLInputElement | null
  agentForm.skillIds = updateSelectedIds(agentForm.skillIds, skillId, Boolean(target?.checked))
}

function handleMcpChecked(mcpId: string, event: Event): void {
  const target = event.target as HTMLInputElement | null
  agentForm.mcpIds = updateSelectedIds(agentForm.mcpIds, mcpId, Boolean(target?.checked))
}

function loadAgentBaseToForm(item: AgentConfig): void {
  agentForm.id = item.id
  agentForm.name = item.name
  agentForm.enabled = item.enabled
  agentForm.model = item.model
  agentForm.systemPromptMd = item.systemPromptMd
  agentForm.temperature = item.temperature
  agentForm.maxTokens = item.maxTokens
  agentForm.skillIds = []
  agentForm.mcpIds = []
  agentFormMessage.value = '已载入基础字段。Skill / MCP 绑定请手动重新选择后再保存。'
}

async function loadAgentData(force = false): Promise<void> {
  if (!isLoggedIn.value) {
    return
  }
  if (!force && hasLoadedAgentData.value) {
    return
  }

  isAgentDataLoading.value = true
  agentDataErrorMessage.value = ''
  try {
    const token = getSessionToken()
    const [agentList, skills, mcps] = await Promise.all([listAgents(token), listSkills(token), listMcps(token)])
    agents.value = agentList
    skillOptions.value = skills
    mcpOptions.value = mcps
    hasLoadedAgentData.value = true
  } catch (error) {
    const message = resolveErrorMessage(error, '加载 Agent 管理数据失败')
    agentDataErrorMessage.value = message
    if (isUnauthorizedError(message)) {
      handleLogout()
    }
  } finally {
    isAgentDataLoading.value = false
  }
}

async function handleAgentRefresh(): Promise<void> {
  await loadAgentData(true)
}

async function handleSaveAgent(): Promise<void> {
  const trimmedId = agentForm.id.trim()
  const trimmedName = agentForm.name.trim()
  const trimmedModel = agentForm.model.trim()

  if (!trimmedId || !trimmedName || !trimmedModel) {
    agentFormMessage.value = '请先填写 Agent ID、名称和模型。'
    return
  }
  if (!Number.isFinite(agentForm.temperature)) {
    agentFormMessage.value = 'temperature 必须是有效数字。'
    return
  }
  if (!Number.isInteger(agentForm.maxTokens) || agentForm.maxTokens <= 0) {
    agentFormMessage.value = 'maxTokens 必须是正整数。'
    return
  }

  const payload: CreateAgentPayload = {
    id: trimmedId,
    name: trimmedName,
    enabled: agentForm.enabled,
    model: trimmedModel,
    systemPromptMd: agentForm.systemPromptMd,
    temperature: Number(agentForm.temperature),
    maxTokens: Number(agentForm.maxTokens),
    skillIds: normalizeIdList(agentForm.skillIds),
    mcpIds: normalizeIdList(agentForm.mcpIds)
  }

  isAgentSaving.value = true
  agentFormMessage.value = ''
  try {
    const token = getSessionToken()
    await saveAgent(token, payload)
    agentFormMessage.value = `保存成功：${payload.name}`
    await loadAgentData(true)
  } catch (error) {
    const message = resolveErrorMessage(error, '保存 Agent 失败')
    agentFormMessage.value = message
    if (isUnauthorizedError(message)) {
      handleLogout()
    }
  } finally {
    isAgentSaving.value = false
  }
}

async function handleSubmit() {
  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = '请输入账号和密码'
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true
  try {
    const loginResult = await login({
      username: username.value.trim(),
      password: password.value
    })
    saveAuthSession(loginResult)
    session.value = loginResult
    password.value = ''
    if (isAgentPage.value) {
      await loadAgentData(true)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  } finally {
    isSubmitting.value = false
  }
}

function handleLogout() {
  clearAuthSession()
  session.value = null
  activeNavKey.value = 'console'
  hasLoadedAgentData.value = false
  isAgentDataLoading.value = false
  isAgentSaving.value = false
  agentDataErrorMessage.value = ''
  agentFormMessage.value = ''
  agents.value = []
  skillOptions.value = []
  mcpOptions.value = []
  resetAgentForm()
  username.value = ''
  password.value = ''
  errorMessage.value = ''
}

watch(activeNavKey, (nextKey) => {
  if (nextKey === 'agents') {
    void loadAgentData(false)
  }
})
</script>

<template>
  <main v-if="!isLoggedIn" class="page-shell">
    <section class="auth-card login-card">
      <header class="auth-header">
        <p class="brand">NEODIFY CONTROL</p>
        <h1 class="title">单用户登录</h1>
        <p class="subtitle">使用后端 `.env` 中配置的账号密码进入系统</p>
      </header>

      <form class="form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>账号</span>
          <input
            v-model="username"
            name="username"
            type="text"
            autocomplete="username"
            placeholder="请输入账号"
          />
        </label>

        <label class="field">
          <span>密码</span>
          <input
            v-model="password"
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
          />
        </label>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

        <button class="button-primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? '登录中...' : '登录' }}
        </button>
      </form>
    </section>
  </main>

  <main v-else-if="session" class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <p class="sidebar-brand">NEODIFY</p>
        <h1 class="sidebar-title">控制台</h1>
      </div>
      <nav class="sidebar-nav" aria-label="主导航">
        <p class="nav-group-title">主导航</p>
        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          class="nav-item"
          :class="{ 'is-active': activeNavKey === item.key }"
          @click="activeNavKey = item.key"
        >
          <span class="nav-item-title">{{ item.label }}</span>
          <small class="nav-item-desc">{{ item.description }}</small>
        </button>
      </nav>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div class="topbar-main">
          <p class="workspace-mode">环境 {{ runtimeModeLabel }}</p>
          <h2 class="workspace-title">{{ activeNav?.label }}</h2>
          <p class="workspace-subtitle">{{ workspaceSubtitle }}</p>
        </div>
        <div class="user-menu-wrap">
          <details class="user-menu">
            <summary class="user-menu-trigger">
              <span class="user-menu-label">当前用户</span>
              <strong>{{ session.username }}</strong>
              <span class="user-menu-caret" aria-hidden="true">▾</span>
            </summary>
            <div class="user-menu-popover">
              <p class="user-menu-row"><span>用户</span><strong>{{ session.username }}</strong></p>
              <p class="user-menu-row"><span>过期</span><strong>{{ sessionExpiresAtText }}</strong></p>
              <button class="button-secondary button-compact" type="button" @click="handleLogout">退出登录</button>
            </div>
          </details>
        </div>
      </header>

      <section class="workspace-content" aria-label="页面内容占位">
        <div v-if="isAgentPage" class="agent-page">
          <div class="agent-layout">
            <article class="panel-card">
              <div class="panel-head">
                <div>
                  <h3 class="panel-title">Agent 列表</h3>
                  <p class="panel-desc">展示当前已启用 Agent，可一键载入基础字段到右侧表单。</p>
                </div>
                <button class="button-secondary button-compact" type="button" :disabled="isAgentDataLoading" @click="handleAgentRefresh">
                  {{ isAgentDataLoading ? '刷新中...' : '刷新' }}
                </button>
              </div>

              <p v-if="agentDataErrorMessage" class="panel-error">{{ agentDataErrorMessage }}</p>

              <div class="table-wrap">
                <table class="agent-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>名称</th>
                      <th>模型</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!agents.length && !isAgentDataLoading">
                      <td colspan="5" class="empty-cell">暂无 Agent，请在右侧创建。</td>
                    </tr>
                    <tr v-for="item in agents" :key="item.id">
                      <td>{{ item.id }}</td>
                      <td>{{ item.name }}</td>
                      <td>{{ item.model }}</td>
                      <td>
                        <span class="status-pill" :class="item.enabled ? 'is-enabled' : 'is-disabled'">
                          {{ item.enabled ? '已启用' : '已禁用' }}
                        </span>
                      </td>
                      <td>
                        <button class="text-button" type="button" @click="loadAgentBaseToForm(item)">载入表单</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            <article class="panel-card">
              <div class="panel-head">
                <div>
                  <h3 class="panel-title">新建 / 覆盖 Agent</h3>
                  <p class="panel-desc">按相同 ID 提交会覆盖 Agent 配置与绑定关系。</p>
                </div>
                <button class="button-secondary button-compact" type="button" @click="resetAgentForm">清空</button>
              </div>

              <form class="agent-form" @submit.prevent="handleSaveAgent">
                <div class="form-grid-2">
                  <label class="field">
                    <span>Agent ID</span>
                    <input v-model="agentForm.id" type="text" placeholder="agent-main" />
                  </label>
                  <label class="field">
                    <span>名称</span>
                    <input v-model="agentForm.name" type="text" placeholder="主 Agent" />
                  </label>
                </div>

                <div class="form-grid-3">
                  <label class="field">
                    <span>模型</span>
                    <input v-model="agentForm.model" type="text" placeholder="claude-sonnet-4-5" />
                  </label>
                  <label class="field">
                    <span>Temperature</span>
                    <input v-model.number="agentForm.temperature" type="number" step="0.1" min="0" max="2" />
                  </label>
                  <label class="field">
                    <span>Max Tokens</span>
                    <input v-model.number="agentForm.maxTokens" type="number" step="1" min="1" />
                  </label>
                </div>

                <label class="field">
                  <span>系统提示词（Markdown）</span>
                  <textarea v-model="agentForm.systemPromptMd" rows="5" placeholder="# 你是一个严谨助手"></textarea>
                </label>

                <label class="switch-row">
                  <input v-model="agentForm.enabled" type="checkbox" />
                  <span>启用该 Agent</span>
                </label>

                <div class="option-block">
                  <p class="option-title">绑定 Skills</p>
                  <div v-if="skillOptions.length" class="check-list">
                    <label v-for="skill in skillOptions" :key="skill.id" class="check-item">
                      <input
                        type="checkbox"
                        :checked="agentForm.skillIds.includes(skill.id)"
                        @change="handleSkillChecked(skill.id, $event)"
                      />
                      <span>{{ skill.name }}</span>
                    </label>
                  </div>
                  <p v-else class="option-empty">暂无可用 Skill，可先到 Skill 管理创建。</p>
                </div>

                <div class="option-block">
                  <p class="option-title">绑定 MCPs</p>
                  <div v-if="mcpOptions.length" class="check-list">
                    <label v-for="mcp in mcpOptions" :key="mcp.id" class="check-item">
                      <input
                        type="checkbox"
                        :checked="agentForm.mcpIds.includes(mcp.id)"
                        @change="handleMcpChecked(mcp.id, $event)"
                      />
                      <span>{{ mcp.name }}</span>
                    </label>
                  </div>
                  <p v-else class="option-empty">暂无可用 MCP，可先到 MCP 管理创建。</p>
                </div>

                <p v-if="agentFormMessage" class="form-feedback">{{ agentFormMessage }}</p>

                <div class="form-actions">
                  <button class="button-primary" type="submit" :disabled="isAgentSaving || isAgentDataLoading">
                    {{ isAgentSaving ? '保存中...' : '保存 Agent' }}
                  </button>
                </div>
              </form>
            </article>
          </div>
        </div>

        <div v-else class="placeholder-card">
          <p class="placeholder-label">模块占位</p>
          <h3>{{ activeNav?.label }}</h3>
          <p>该模块内容正在开发中，当前为高信息密度控制台骨架。</p>
        </div>
      </section>
    </section>
  </main>
</template>
