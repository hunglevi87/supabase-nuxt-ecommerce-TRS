<script setup lang="ts">
const { giftTiers, giftTestimonials, preMadeGiftSets } = useExperienceData()
</script>

<template>
  <main class="container mx-auto px-4 py-6 space-y-10">
    <!-- Intro -->
    <section class="space-y-3">
      <h1 class="text-3xl sm:text-4xl font-bold">Gift Experience</h1>
      <p class="text-muted-foreground max-w-3xl">
        Build high-touch gifts with tiered rewards, then explore curated
        ready-to-send collections for every occasion.
      </p>
    </section>

    <!-- 1 · Gift Box Builder -->
    <section class="rounded-xl border border-border p-5 sm:p-7 space-y-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-2xl font-semibold">Gift Box Builder</h2>
        <NuxtLink
          to="/app"
          class="inline-flex items-center rounded-full px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold"
        >
          Start Building
        </NuxtLink>
      </div>
      <p class="text-sm text-muted-foreground">
        Choose vault items, track reward tiers, save drafts, and generate a
        checkout-ready custom box.
      </p>
      <div class="grid gap-4 md:grid-cols-3">
        <div
          v-for="tier in giftTiers"
          :key="tier.label"
          class="rounded-lg border border-border p-4"
        >
          <p class="text-sm text-muted-foreground">{{ tier.label }}</p>
          <p class="text-lg font-medium mt-1">{{ tier.reward }}</p>
        </div>
      </div>
    </section>

    <!-- 2 · Testimonials divider -->
    <section class="space-y-4">
      <div class="flex items-center gap-4">
        <div class="h-px flex-1 bg-border" />
        <h3 class="text-sm uppercase tracking-wide text-muted-foreground">
          Client Testimonials
        </h3>
        <div class="h-px flex-1 bg-border" />
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <article
          v-for="item in giftTestimonials"
          :key="item.name"
          class="rounded-xl border border-border p-4"
        >
          <p class="text-sm text-muted-foreground">“{{ item.quote }}”</p>
          <p class="mt-3 text-sm font-semibold">{{ item.name }}</p>
        </article>
      </div>
    </section>

    <!-- 3 · Pre-Made Gift Sets -->
    <section class="space-y-4">
      <h2 class="text-2xl font-semibold">Pre-Made Gift Sets</h2>
      <div class="grid gap-4 md:grid-cols-3">
        <article
          v-for="set in preMadeGiftSets"
          :key="set.title"
          class="rounded-xl border border-border p-4"
        >
          <h3 class="text-lg font-semibold">{{ set.title }}</h3>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ set.description }}
          </p>
          <NuxtLink
            :to="set.href ?? '/collections/all'"
            class="inline-flex mt-4 items-center rounded-full px-4 py-2 border border-border text-xs font-semibold"
          >
            View Set Items
          </NuxtLink>
        </article>
      </div>
    </section>
  </main>
</template>
