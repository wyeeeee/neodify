<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { deleteAgent, getAgentDetail, listAgents, listMcps, listSkills, saveAgent } from '../services/management-api'
import type { AgentConfig, AgentDetail, CreateAgentPayload, McpConfig, SkillConfig } from '../types/management'

const props = defineProps<{
  token: string
}>()

const emit = defineEmits<{
  unauthorized: []
}>()

const hasLoadedAgentData = ref(false)
const isAgentDataLoading = ref(false)
const isAgentDetailLoading = ref(false)
const isAgentSaving = ref(false)
const isAgentDeleting = ref(false)
const agentDataErrorMessage = ref('')
const agentFormMessage = ref('')
const selectedAgentId = ref('')
const openActionAgentId = ref('')
const pendingDeleteAgentId = ref('')
const actionMenuLeft = ref(0)
const actionMenuTop = ref(0)
const agentKeyword = ref('')
const skillKeyword = ref('')
const mcpKeyword = ref('')

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

const selectedAgent = computed(() => agents.value.find((item) => item.id === selectedAgentId.value) ?? null)

const filteredAgents = computed(() => {
  const keyword = agentKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return agents.value
  }
  return agents.value.filter((item) => {
    return item.name.toLowerCase().includes(keyword) || item.id.toLowerCase().includes(keyword)
  })
})

const filteredSkills = computed(() => {
  const keyword = skillKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return skillOptions.value
  }
  return skillOptions.value.filter((item) => {
    return item.name.toLowerCase().includes(keyword) || item.id.toLowerCase().includes(keyword)
  })
})

const filteredMcps = computed(() => {
  const keyword = mcpKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return mcpOptions.value
  }
  return mcpOptions.value.filter((item) => {
    return item.name.toLowerCase().includes(keyword) || item.id.toLowerCase().includes(keyword)
  })
})

const selectedSkillOptions = computed(() => {
  const selectedSet = new Set(agentForm.skillIds)
  return skillOptions.value.filter((item) => selectedSet.has(item.id))
})

const selectedMcpOptions = computed(() => {
  const selectedSet = new Set(agentForm.mcpIds)
  return mcpOptions.value.filter((item) => selectedSet.has(item.id))
})

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

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

function isUnauthorizedError(message: string): boolean {
  return message.includes('token') || message.includes('未登录') || message.includes('401')
}

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

function applyAgentDetailToForm(detail: AgentDetail): void {
  agentForm.id = detail.id
  agentForm.name = detail.name
  agentForm.enabled = detail.enabled
  agentForm.model = detail.model
  agentForm.systemPromptMd = detail.systemPromptMd
  agentForm.temperature = detail.temperature
  agentForm.maxTokens = detail.maxTokens
  agentForm.skillIds = normalizeIdList(detail.skillIds)
  agentForm.mcpIds = normalizeIdList(detail.mcpIds)
}

function startCreateAgent(): void {
  selectedAgentId.value = ''
  resetAgentForm()
  agentFormMessage.value = '当前为新建 Agent 模式。'
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

function removeSkill(skillId: string): void {
  agentForm.skillIds = agentForm.skillIds.filter((item) => item !== skillId)
}

function removeMcp(mcpId: string): void {
  agentForm.mcpIds = agentForm.mcpIds.filter((item) => item !== mcpId)
}

function selectAllFilteredSkills(): void {
  const merged = [...agentForm.skillIds, ...filteredSkills.value.map((item) => item.id)]
  agentForm.skillIds = normalizeIdList(merged)
}

function clearAllSkills(): void {
  agentForm.skillIds = []
}

function selectAllFilteredMcps(): void {
  const merged = [...agentForm.mcpIds, ...filteredMcps.value.map((item) => item.id)]
  agentForm.mcpIds = normalizeIdList(merged)
}

function clearAllMcps(): void {
  agentForm.mcpIds = []
}

async function loadAgentDetailById(agentId: string): Promise<void> {
  isAgentDetailLoading.value = true
  agentFormMessage.value = ''
  try {
    const detail = await getAgentDetail(props.token, agentId)
    applyAgentDetailToForm(detail)
    selectedAgentId.value = detail.id
  } catch (error) {
    const message = resolveErrorMessage(error, '加载 Agent 详情失败')
    agentFormMessage.value = message
    if (isUnauthorizedError(message)) {
      emit('unauthorized')
    }
  } finally {
    isAgentDetailLoading.value = false
  }
}

async function handleSelectAgent(agentId: string): Promise<void> {
  closeActionMenu()
  if (selectedAgentId.value === agentId && !isAgentDetailLoading.value) {
    return
  }
  await loadAgentDetailById(agentId)
}

function closeActionMenu(): void {
  pendingDeleteAgentId.value = ''
  openActionAgentId.value = ''
}

function handleToggleActionMenu(agentId: string, event: Event): void {
  if (openActionAgentId.value === agentId) {
    closeActionMenu()
    return
  }

  const trigger = event.currentTarget as HTMLElement | null
  if (!trigger) {
    return
  }

  const rect = trigger.getBoundingClientRect()
  const menuWidth = 120
  const menuHeight = 42
  const padding = 8

  let top = rect.bottom + 6
  if (top + menuHeight > window.innerHeight - padding) {
    top = rect.top - menuHeight - 6
  }
  if (top < padding) {
    top = padding
  }

  let left = rect.right - menuWidth
  if (left < padding) {
    left = padding
  }
  if (left + menuWidth > window.innerWidth - padding) {
    left = window.innerWidth - menuWidth - padding
  }

  actionMenuTop.value = top
  actionMenuLeft.value = left
  pendingDeleteAgentId.value = ''
  openActionAgentId.value = agentId
}

function beginDeleteAgent(agentId: string): void {
  pendingDeleteAgentId.value = agentId
}

function cancelDeleteAgent(): void {
  pendingDeleteAgentId.value = ''
}

async function handleDeleteAgent(agentId: string): Promise<void> {
  const target = agents.value.find((item) => item.id === agentId)
  const displayName = target?.name ?? agentId

  closeActionMenu()
  isAgentDeleting.value = true
  try {
    await deleteAgent(props.token, agentId)
    if (selectedAgentId.value === agentId) {
      startCreateAgent()
    }
    agentFormMessage.value = `已删除 Agent：${displayName}`
    await loadAgentData(true)
  } catch (error) {
    const message = resolveErrorMessage(error, '删除 Agent 失败')
    agentFormMessage.value = message
    if (isUnauthorizedError(message)) {
      emit('unauthorized')
    }
  } finally {
    isAgentDeleting.value = false
  }
}

function handleGlobalPointerDown(event: PointerEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) {
    return
  }
  if (target.closest('.agent-action-menu') || target.closest('.agent-action-trigger')) {
    return
  }
  closeActionMenu()
}

function handleEscapeKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeActionMenu()
  }
}

function handleViewportChange(): void {
  closeActionMenu()
}

onMounted(() => {
  window.addEventListener('pointerdown', handleGlobalPointerDown)
  window.addEventListener('keydown', handleEscapeKey)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', handleGlobalPointerDown)
  window.removeEventListener('keydown', handleEscapeKey)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})

async function loadAgentData(force = false): Promise<void> {
  if (!force && hasLoadedAgentData.value) {
    return
  }

  isAgentDataLoading.value = true
  agentDataErrorMessage.value = ''
  try {
    const [agentList, skills, mcps] = await Promise.all([
      listAgents(props.token),
      listSkills(props.token),
      listMcps(props.token)
    ])

    agents.value = agentList
    skillOptions.value = skills
    mcpOptions.value = mcps
    hasLoadedAgentData.value = true

    if (!agentList.length) {
      startCreateAgent()
      return
    }

    const stillExists = selectedAgentId.value && agentList.some((item) => item.id === selectedAgentId.value)
    const targetId = stillExists ? selectedAgentId.value : agentList[0]?.id ?? ''
    if (targetId) {
      await loadAgentDetailById(targetId)
    }
  } catch (error) {
    const message = resolveErrorMessage(error, '加载 Agent 管理数据失败')
    agentDataErrorMessage.value = message
    if (isUnauthorizedError(message)) {
      emit('unauthorized')
    }
  } finally {
    isAgentDataLoading.value = false
  }
}

async function handleRefresh(): Promise<void> {
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
    await saveAgent(props.token, payload)
    selectedAgentId.value = payload.id
    agentFormMessage.value = `保存成功：${payload.name}`
    await loadAgentData(true)
  } catch (error) {
    const message = resolveErrorMessage(error, '保存 Agent 失败')
    agentFormMessage.value = message
    if (isUnauthorizedError(message)) {
      emit('unauthorized')
    }
  } finally {
    isAgentSaving.value = false
  }
}

watch(
  () => props.token,
  () => {
    hasLoadedAgentData.value = false
    agentDataErrorMessage.value = ''
    agentFormMessage.value = ''
    void loadAgentData(true)
  },
  { immediate: true }
)
</script>

<template>
  <div class="agent-page">
    <div class="agent-workspace">
      <aside class="agent-nav-panel">
        <div class="agent-nav-head">
          <h3 class="agent-nav-title">Agents</h3>
          <div class="agent-nav-actions">
            <button class="button-secondary button-compact" type="button" :disabled="isAgentDataLoading" @click="handleRefresh">
              {{ isAgentDataLoading ? '刷新中...' : '刷新' }}
            </button>
            <button class="button-secondary button-compact" type="button" @click="startCreateAgent">新建</button>
          </div>
        </div>

        <p v-if="agentDataErrorMessage" class="panel-error">{{ agentDataErrorMessage }}</p>

        <div class="agent-nav-list">
          <input v-model="agentKeyword" class="selector-search" type="text" placeholder="搜索 Agent 名称或ID" />
          <p v-if="!agents.length && !isAgentDataLoading" class="option-empty">暂无 Agent，请点击“新建”创建。</p>
          <p v-else-if="!filteredAgents.length" class="option-empty">没有匹配的 Agent。</p>
          <button
            v-for="item in filteredAgents"
            :key="item.id"
            type="button"
            class="agent-nav-item"
            :class="{ 'is-active': selectedAgentId === item.id }"
            @click="handleSelectAgent(item.id)"
          >
            <div class="agent-nav-main">
              <p class="agent-nav-name">{{ item.name }}</p>
              <p class="agent-nav-id">{{ item.id }}</p>
            </div>

            <div class="agent-nav-item-actions" @click.stop>
              <span class="status-pill" :class="item.enabled ? 'is-enabled' : 'is-disabled'">
                {{ item.enabled ? '启用' : '禁用' }}
              </span>
              <button class="agent-action-trigger" type="button" @click="handleToggleActionMenu(item.id, $event)">···</button>
            </div>
          </button>
        </div>
      </aside>

      <Teleport to="body">
        <div
          v-if="openActionAgentId"
          class="agent-action-menu"
          :style="{ top: `${actionMenuTop}px`, left: `${actionMenuLeft}px` }"
        >
          <template v-if="pendingDeleteAgentId === openActionAgentId">
            <p class="agent-action-confirm-text">确认删除该 Agent？</p>
            <div class="agent-action-confirm-actions">
              <button class="agent-action-item" type="button" @click="cancelDeleteAgent">取消</button>
              <button
                class="agent-action-item is-danger"
                type="button"
                :disabled="isAgentDeleting"
                @click="handleDeleteAgent(openActionAgentId)"
              >
                {{ isAgentDeleting ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </template>
          <button
            v-else
            class="agent-action-item is-danger"
            type="button"
            :disabled="isAgentDeleting"
            @click="beginDeleteAgent(openActionAgentId)"
          >
            删除
          </button>
        </div>
      </Teleport>

      <article class="agent-editor-panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">{{ selectedAgent ? `编辑：${selectedAgent.name}` : '新建 Agent' }}</h3>
            <p class="panel-desc">点击左侧 Agent 即自动载入，保存时按 ID 覆盖配置。</p>
          </div>
          <button class="button-secondary button-compact" type="button" @click="resetAgentForm">重置表单</button>
        </div>

        <p v-if="isAgentDetailLoading" class="form-feedback">正在加载 Agent 详情...</p>

        <form class="agent-form" @submit.prevent="handleSaveAgent">
          <div class="agent-basic-grid">
            <label class="field basic-span-5">
              <span>Agent ID</span>
              <input v-model="agentForm.id" type="text" placeholder="agent-main" />
            </label>
            <label class="field basic-span-5">
              <span>名称</span>
              <input v-model="agentForm.name" type="text" placeholder="主 Agent" />
            </label>

            <div class="field field-switch basic-span-2">
              <span>状态</span>
              <div class="toggle-group" role="group" aria-label="Agent 状态">
                <button
                  class="toggle-button"
                  type="button"
                  :class="{ 'is-active': agentForm.enabled }"
                  @click="agentForm.enabled = true"
                >
                  启用
                </button>
                <button
                  class="toggle-button"
                  type="button"
                  :class="{ 'is-active': !agentForm.enabled }"
                  @click="agentForm.enabled = false"
                >
                  禁用
                </button>
              </div>
            </div>

            <label class="field basic-span-6">
              <span>模型</span>
              <input v-model="agentForm.model" type="text" placeholder="claude-sonnet-4-5" />
            </label>
            <label class="field basic-span-3">
              <span>Temperature</span>
              <input v-model.number="agentForm.temperature" type="number" step="0.1" min="0" max="2" />
            </label>
            <label class="field basic-span-3">
              <span>Max Tokens</span>
              <input v-model.number="agentForm.maxTokens" type="number" step="1" min="1" />
            </label>
          </div>

          <label class="field">
            <span>系统提示词（Markdown）</span>
            <textarea v-model="agentForm.systemPromptMd" rows="5" placeholder="# 你是一个严谨助手"></textarea>
          </label>

          <div class="selector-grid">
            <section class="selector-block">
              <div class="selector-head">
                <p class="option-title">Skill 绑定（已选 {{ agentForm.skillIds.length }}）</p>
                <div class="selector-actions">
                  <button class="text-button" type="button" @click="selectAllFilteredSkills">全选筛选结果</button>
                  <button class="text-button" type="button" @click="clearAllSkills">清空</button>
                </div>
              </div>
              <input v-model="skillKeyword" class="selector-search" type="text" placeholder="搜索 Skill 名称或ID" />
              <div class="selector-list">
                <label v-for="skill in filteredSkills" :key="skill.id" class="selector-item">
                  <input
                    type="checkbox"
                    :checked="agentForm.skillIds.includes(skill.id)"
                    @change="handleSkillChecked(skill.id, $event)"
                  />
                  <span>{{ skill.name }}</span>
                  <small>{{ skill.id }}</small>
                </label>
                <p v-if="!filteredSkills.length" class="option-empty">没有匹配的 Skill。</p>
              </div>
              <div v-if="selectedSkillOptions.length" class="selected-tags">
                <button
                  v-for="skill in selectedSkillOptions"
                  :key="skill.id"
                  type="button"
                  class="selected-tag"
                  @click="removeSkill(skill.id)"
                >
                  {{ skill.name }}
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </section>

            <section class="selector-block">
              <div class="selector-head">
                <p class="option-title">MCP 绑定（已选 {{ agentForm.mcpIds.length }}）</p>
                <div class="selector-actions">
                  <button class="text-button" type="button" @click="selectAllFilteredMcps">全选筛选结果</button>
                  <button class="text-button" type="button" @click="clearAllMcps">清空</button>
                </div>
              </div>
              <input v-model="mcpKeyword" class="selector-search" type="text" placeholder="搜索 MCP 名称或ID" />
              <div class="selector-list">
                <label v-for="mcp in filteredMcps" :key="mcp.id" class="selector-item">
                  <input
                    type="checkbox"
                    :checked="agentForm.mcpIds.includes(mcp.id)"
                    @change="handleMcpChecked(mcp.id, $event)"
                  />
                  <span>{{ mcp.name }}</span>
                  <small>{{ mcp.id }}</small>
                </label>
                <p v-if="!filteredMcps.length" class="option-empty">没有匹配的 MCP。</p>
              </div>
              <div v-if="selectedMcpOptions.length" class="selected-tags">
                <button
                  v-for="mcp in selectedMcpOptions"
                  :key="mcp.id"
                  type="button"
                  class="selected-tag"
                  @click="removeMcp(mcp.id)"
                >
                  {{ mcp.name }}
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </section>
          </div>

          <p v-if="agentFormMessage" class="form-feedback">{{ agentFormMessage }}</p>

          <div class="form-actions">
            <button class="button-primary" type="submit" :disabled="isAgentSaving || isAgentDataLoading || isAgentDetailLoading">
              {{ isAgentSaving ? '保存中...' : '保存 Agent' }}
            </button>
          </div>
        </form>
      </article>
    </div>
  </div>
</template>
