<script lang="ts" setup>
import { LibraryBigIcon } from 'lucide-vue-next'
</script>

<template>
  <NuxtLink to="/" class="text-3xl font-semibold flex items-center gap-1">
    <LibraryBigIcon class="w-8 h-8 text-violet-600" />
    <div>
      <p class="text-sm font-medium -mb-2">THE</p>
      <h1>RELIC <span class="text-violet-600">SHOP</span></h1>
    </div>
  </NuxtLink>
</template>
