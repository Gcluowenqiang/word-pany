<template>
  <div id="app" class="wp-theme-transition">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// 极简App组件，无复杂逻辑
</script>

<style>
/* 最原始的全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: var(--wp-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
  background: var(--wp-background, #ffffff);
  color: var(--wp-on-background, #000000);
  transition: var(--wp-transition, all 0.3s ease);
}

#app {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background: var(--wp-background);
  color: var(--wp-on-background);
}

/* 移除所有复杂的动画和效果 */
button {
  font-family: inherit;
}

input, textarea {
  font-family: inherit;
}

/* 全局滚动条优化 - 方案1: 极简隐藏式 */
/*
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

*::-webkit-scrollbar {
  display: none;
}
*/

/* 全局滚动条优化 - 方案2: 细腻融入式 (当前激活) */
*::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 2px;
  transition: all 0.2s ease;
}

*::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.15);
}

/* 全局滚动条优化 - Firefox 支持 */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.05) transparent;
}
</style> 