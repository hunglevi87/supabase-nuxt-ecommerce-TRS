<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: ['auth'],
})
</script>

<template>
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">The Relic Shop App Shell</h2>
    <p class="text-muted-foreground">
      This route validates the Ionic-powered app layout for responsive web and PWA
      experiences.
    </p>
    <div class="rounded-xl border border-border p-4">
      <p class="text-sm text-muted-foreground">Status</p>
      <p class="mt-2 text-lg font-medium">Phase 0 scaffold complete</p>
    </div>
  </section>
</template>
