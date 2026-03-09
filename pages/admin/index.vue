<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})
</script>

<template>
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Operations Overview</h2>
    <p class="text-muted-foreground">
      Phase 0 admin shell is ready. Inventory, sync monitor, gift vault, and jobs
      panels will be added in the next implementation phases.
    </p>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-border p-4">
        <p class="text-sm text-muted-foreground">Inventory</p>
        <p class="mt-2 text-lg font-medium">Pending setup</p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-sm text-muted-foreground">Sync Queue</p>
        <p class="mt-2 text-lg font-medium">Pending setup</p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-sm text-muted-foreground">Gift Builder Rules</p>
        <p class="mt-2 text-lg font-medium">Pending setup</p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-sm text-muted-foreground">Automations</p>
        <p class="mt-2 text-lg font-medium">Pending setup</p>
      </div>
    </div>
  </section>
</template>
