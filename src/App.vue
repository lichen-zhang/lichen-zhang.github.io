<template>
  <AppShell>
    <RouterView />
  </AppShell>

  <Transition name="global-loading-fade">
    <div v-if="ui.isGlobalLoading" class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 px-4">
      <div class="flex items-center gap-3 rounded-xl border border-white/40 bg-white/90 px-4 py-3 text-sm text-slate-800 shadow-sm backdrop-blur">
        <span class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-400/40 border-t-slate-700"></span>
        <p class="font-medium">{{ ui.globalLoadingText }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppShell from './components/AppShell.vue'
import { useUiStore } from './stores/ui'

const ui = useUiStore()
</script>

<style scoped>
.global-loading-fade-enter-active,
.global-loading-fade-leave-active {
  transition: opacity 0.22s ease;
}

.global-loading-fade-enter-from,
.global-loading-fade-leave-to {
  opacity: 0;
}
</style>
