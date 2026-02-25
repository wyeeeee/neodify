<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="placeholder-card">
    <p class="placeholder-label">模块占位</p>
    <h3>{{ title }}</h3>
    <p>该模块内容正在开发中，当前为高信息密度控制台骨架。</p>
  </div>
</template>

