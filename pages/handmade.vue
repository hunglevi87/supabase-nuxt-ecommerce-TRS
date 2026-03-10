<script setup lang="ts">
const { handmadeLines } = useExperienceData()
</script>

<template>
  <main class="container mx-auto px-4 py-6 space-y-8">
    <section class="space-y-3">
      <h1 class="text-3xl sm:text-4xl font-bold">Handmade Bath &amp; Body</h1>
      <p class="text-muted-foreground max-w-3xl">
        House-made Relic Shop essentials crafted for gifting and self-care.
        Explore candles, lotion, body wash, body butter, and upcoming limited
        drops.
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="line in handmadeLines"
        :key="line.name"
        class="rounded-xl border border-border p-4"
      >
        <h2 class="text-lg font-semibold">{{ line.name }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">{{ line.summary }}</p>
      </article>
    </section>

    <section class="rounded-xl border border-border p-5 sm:p-6">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 class="text-xl font-semibold">Shop Handmade Collection</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Browse all current in-house products in the full catalog.
          </p>
        </div>
        <NuxtLink
          to="/collections/all"
          class="inline-flex items-center rounded-full px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold"
        >
          View Catalog
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
