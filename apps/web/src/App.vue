<script setup lang="ts">
import { computed, ref } from 'vue'
import { login } from './services/auth-api'
import { clearAuthSession, loadAuthSession, saveAuthSession } from './services/auth-storage'

const username = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const session = ref(loadAuthSession())

const isLoggedIn = computed(() => Boolean(session.value?.token))

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
  username.value = ''
  password.value = ''
  errorMessage.value = ''
}
</script>

<template>
  <main class="page-shell">
    <section class="auth-card">
      <header class="auth-header">
        <p class="brand">NEODIFY CONTROL</p>
        <h1 class="title">单用户登录</h1>
        <p class="subtitle">使用后端 `.env` 中配置的账号密码进入系统</p>
      </header>

      <div v-if="isLoggedIn && session" class="session-box">
        <p><span>当前用户</span><strong>{{ session.username }}</strong></p>
        <p><span>过期时间</span><strong>{{ new Date(session.expiresAt).toLocaleString() }}</strong></p>
        <button class="button-secondary" type="button" @click="handleLogout">退出登录</button>
      </div>

      <form v-else class="form" @submit.prevent="handleSubmit">
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
</template>
