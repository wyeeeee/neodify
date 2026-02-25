<script setup lang="ts">
interface NavItem {
  key: string
  label: string
  description: string
}

defineProps<{
  navItems: NavItem[]
  activeNavKey: string
  runtimeModeLabel: string
  activeNavLabel: string
  workspaceSubtitle: string
  sessionUsername: string
  sessionExpiresAtText: string
}>()

const emit = defineEmits<{
  navigate: [key: string]
  logout: []
}>()
</script>

<template>
  <main class="app-shell">
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
          @click="emit('navigate', item.key)"
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
          <h2 class="workspace-title">{{ activeNavLabel }}</h2>
          <p class="workspace-subtitle">{{ workspaceSubtitle }}</p>
        </div>

        <div class="user-menu-wrap">
          <details class="user-menu">
            <summary class="user-menu-trigger">
              <span class="user-menu-label">当前用户</span>
              <strong>{{ sessionUsername }}</strong>
              <span class="user-menu-caret" aria-hidden="true">▾</span>
            </summary>
            <div class="user-menu-popover">
              <p class="user-menu-row"><span>用户</span><strong>{{ sessionUsername }}</strong></p>
              <p class="user-menu-row"><span>过期</span><strong>{{ sessionExpiresAtText }}</strong></p>
              <button class="button-secondary button-compact" type="button" @click="emit('logout')">退出登录</button>
            </div>
          </details>
        </div>
      </header>

      <section class="workspace-content" aria-label="页面内容区">
        <slot />
      </section>
    </section>
  </main>
</template>

