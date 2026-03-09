<template>
  <div class="min-h-screen bg-background text-foreground">
    <NuxtLoadingIndicator color="#d4af37" />
    <header class="border-b border-border px-4 sm:px-6 lg:px-16 py-4">
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-xl sm:text-2xl font-semibold">The Relic Shop Admin</h1>
        <NuxtLink to="/" class="text-sm text-muted-foreground hover:text-foreground">
          Back to storefront
        </NuxtLink>
      </div>
    </header>
    <main class="px-4 sm:px-6 lg:px-16 py-6">
      <slot />
    </main>
  </div>
</template>
