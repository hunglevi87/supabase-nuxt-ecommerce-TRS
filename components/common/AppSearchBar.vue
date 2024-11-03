<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'

const searchKey = defineModel({
  type: String,
  default: '',
  required: true,
})
</script>

<template>
  <div class="relative w-full items-center">
    <Input
      id="search"
      v-model="searchKey"
      type="text"
      placeholder="Search..."
      class="pl-10"
    />
    <span
      class="absolute start-0 inset-y-0 flex items-center justify-center px-2"
    >
      <Search class="size-6 text-muted-foreground" />
    </span>
  </div>
</template>
