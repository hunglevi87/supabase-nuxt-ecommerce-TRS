<template>
  <main class="flex flex-col gap-10 lg:gap-14 py-4">
    <SectionHero />

    <section class="space-y-4">
      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold">
        The Relic Shop
      </h1>
      <p class="text-base sm:text-lg text-muted-foreground max-w-3xl">
        Rare, Elegant, Luxury Items Curated. Explore authenticated thrifted
        finds, custom gifting, and handcrafted bath & body collections.
      </p>
      <div class="grid gap-4 md:grid-cols-3">
        <NuxtLink
          to="/thrift"
          class="rounded-xl border border-border p-5 hover:bg-accent/40 transition-colors"
        >
          <h2 class="text-xl font-semibold">Thrifted Luxury</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Authenticated designer and vintage pieces with trust-first details.
          </p>
        </NuxtLink>
        <NuxtLink
          to="/gift"
          class="rounded-xl border border-border p-5 hover:bg-accent/40 transition-colors"
        >
          <h2 class="text-xl font-semibold">Gift Experience</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Build custom boxes, view testimonials, and shop curated gift sets.
          </p>
        </NuxtLink>
        <NuxtLink
          to="/handmade"
          class="rounded-xl border border-border p-5 hover:bg-accent/40 transition-colors"
        >
          <h2 class="text-xl font-semibold">Handmade</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Relic Shop candles, lotions, body wash, body butter, and more.
          </p>
        </NuxtLink>
      </div>
    </section>

    <SectionSampleProduct />
    <SectionCategory />
    <SectionLetterSubscription />
    <SectionAbout />
  </main>
</template>
