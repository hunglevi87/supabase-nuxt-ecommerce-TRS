<template>
  <div>
    <NuxtLoadingIndicator color="#d4af37" />
    <CommonAppHeader />
    <section class="px-4 sm:px-6 lg:px-16 overflow-hidden">
      <slot />
    </section>
    <CommonAppFooter />
  </div>
</template>
