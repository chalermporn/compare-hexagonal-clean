<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'

// syncs with Slidev's dark mode (class "dark" on <html>)
const isDark = useDark()
const toggle = useToggle(isDark)
</script>

<template>
  <button
    class="theme-fab print:hidden"
    :title="isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'"
    aria-label="สลับธีมสว่าง/มืด"
    @click="toggle()"
  >
    <carbon-sun v-if="isDark" />
    <carbon-moon v-else />
  </button>
</template>

<style scoped>
.theme-fab {
  position: fixed;
  top: 0.9rem;
  right: 0.9rem;
  z-index: 100;
  width: 2.1rem;
  height: 2.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-size: 1.1rem;
  color: var(--hex, #00A3E4);
  background: rgba(125, 125, 125, 0.12);
  border: 1px solid rgba(125, 125, 125, 0.25);
  backdrop-filter: blur(6px);
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.theme-fab:hover {
  background: rgba(125, 125, 125, 0.22);
  transform: scale(1.08);
}
</style>
