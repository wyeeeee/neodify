<script setup lang="ts">
import { computed, ref } from 'vue'
import { login } from './services/auth-api'
import { clearAuthSession, loadAuthSession, saveAuthSession } from './services/auth-storage'
import AgentManagePage from './components/AgentManagePage.vue'
import ConsoleShell from './components/ConsoleShell.vue'
import PagePlaceholder from './components/PagePlaceholder.vue'

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
  username.value = ''
  password.value = ''
  errorMessage.value = ''
}
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

  <ConsoleShell
    v-else-if="session"
    :nav-items="navItems"
    :active-nav-key="activeNavKey"
    :runtime-mode-label="runtimeModeLabel"
    :active-nav-label="activeNav?.label ?? ''"
    :workspace-subtitle="workspaceSubtitle"
    :session-username="session.username"
    :session-expires-at-text="sessionExpiresAtText"
    @navigate="activeNavKey = $event"
    @logout="handleLogout"
  >
    <AgentManagePage
      v-if="isAgentPage"
      :token="session.token"
      @unauthorized="handleLogout"
    />
    <PagePlaceholder v-else :title="activeNav?.label ?? ''" />
  </ConsoleShell>
</template>

