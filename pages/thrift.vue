<script setup lang="ts">
const { thriftValueProps } = useExperienceData()
</script>

<template>
  <main class="container mx-auto px-4 py-6 space-y-8">
    <section class="space-y-3">
      <h1 class="text-3xl sm:text-4xl font-bold">Thrifted Luxury</h1>
      <p class="text-muted-foreground max-w-3xl">
        Authenticated designer and vintage pieces curated for value, quality,
        and story. Every listing is presented with condition context and trust
        cues.
      </p>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/collections/all"
          class="inline-flex items-center rounded-full px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold"
        >
          Shop Thrifted Catalog
        </NuxtLink>
        <NuxtLink
          to="/gift"
          class="inline-flex items-center rounded-full px-5 py-2 border border-border text-sm font-semibold"
        >
          Pair with a Gift
        </NuxtLink>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-3">
      <div
        v-for="vp in thriftValueProps"
        :key="vp.title"
        class="rounded-xl border border-border p-4"
      >
        <h2 class="text-lg font-semibold">{{ vp.title }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ vp.description }}
        </p>
      </div>
    </section>

    <SectionSampleProduct />
  </main>
</template>
