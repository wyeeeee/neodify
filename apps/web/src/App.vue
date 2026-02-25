<script setup lang="ts">
import { computed, ref } from 'vue'
import { login } from './services/auth-api'
import { clearAuthSession, loadAuthSession, saveAuthSession } from './services/auth-storage'

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
const runtimeModeLabel = computed(() => (import.meta.env.MODE === 'production' ? 'production' : 'development'))
const activeNav = computed(() => navItems.find((item) => item.key === activeNavKey.value) ?? navItems[0])
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
          <p class="workspace-subtitle">内容区域已预留，后续按模块逐步接入功能</p>
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
        <div class="placeholder-card">
          <p class="placeholder-label">模块占位</p>
          <h3>{{ activeNav?.label }}</h3>
          <p>该模块内容正在开发中，当前为高信息密度控制台骨架。</p>
        </div>
      </section>
    </section>
  </main>
</template>
