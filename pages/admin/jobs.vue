<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

type AdminSyncJob = {
  id: string
  marketplace: string
  action: string
  status: string
  created_at: string
  scheduled_at: string | null
  completed_at: string | null
  error_message: string | null
  retry_count: number | null
  max_retries: number | null
  seller_id: string
  product_id: string | null
}

type AdminJobsResponse = {
  jobs: AdminSyncJob[]
  count: number
  limit: number
  offset: number
}

const status = ref<'all' | 'pending' | 'queued' | 'running' | 'done' | 'failed'>('all')
const limit = ref(25)
const offset = ref(0)

const query = computed(() => ({
  status: status.value,
  limit: limit.value,
  offset: offset.value,
}))

const { data, pending, error, refresh } = await useFetch<AdminJobsResponse>('/api/admin/jobs', {
  query,
  watch: [query],
})

const jobs = computed(() => data.value?.jobs ?? [])

const doneCount = computed(() => jobs.value.filter(job => job.status === 'done').length)
const failedCount = computed(() => jobs.value.filter(job => job.status === 'failed').length)
const aiCount = computed(() =>
  jobs.value.filter((job) => {
    const action = job.action.toLowerCase()
    return action.includes('botsee') || action.includes('classify') || action.includes('price')
  }).length,
)
const ebayCount = computed(() => jobs.value.filter(job => job.marketplace.toLowerCase() === 'ebay').length)

function shortId(id: string): string {
  return id.slice(0, 8)
}

function prettyDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString()
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold">
          Emma Jobs
        </h2>
        <p class="text-sm text-muted-foreground">
          Monitor AI and eBay orchestration jobs queued through shared Supabase.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm text-muted-foreground" for="statusFilter">Status</label>
        <select
          id="statusFilter"
          v-model="status"
          class="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">
            All
          </option>
          <option value="pending">
            Pending
          </option>
          <option value="queued">
            Queued
          </option>
          <option value="running">
            Running
          </option>
          <option value="done">
            Done
          </option>
          <option value="failed">
            Failed
          </option>
        </select>
        <button
          class="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          type="button"
          @click="refresh()"
        >
          Refresh
        </button>
      </div>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-border p-4">
        <p class="text-sm text-muted-foreground">
          Total jobs
        </p>
        <p class="mt-2 text-lg font-medium">
          {{ jobs.length }}
        </p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-sm text-muted-foreground">
          eBay jobs
        </p>
        <p class="mt-2 text-lg font-medium">
          {{ ebayCount }}
        </p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-sm text-muted-foreground">
          AI jobs
        </p>
        <p class="mt-2 text-lg font-medium">
          {{ aiCount }}
        </p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-sm text-muted-foreground">
          Failed
        </p>
        <p class="mt-2 text-lg font-medium">
          {{ failedCount }}
        </p>
      </div>
    </div>

    <p v-if="pending" class="text-sm text-muted-foreground">
      Loading jobs…
    </p>
    <p v-else-if="error" class="text-sm text-red-500">
      Failed to load jobs: {{ error.message }}
    </p>
    <div v-else class="overflow-x-auto rounded-xl border border-border">
      <table class="min-w-full divide-y divide-border text-sm">
        <thead class="bg-muted/50 text-left">
          <tr>
            <th class="px-3 py-2 font-medium">
              ID
            </th>
            <th class="px-3 py-2 font-medium">
              Marketplace
            </th>
            <th class="px-3 py-2 font-medium">
              Action
            </th>
            <th class="px-3 py-2 font-medium">
              Status
            </th>
            <th class="px-3 py-2 font-medium">
              Created
            </th>
            <th class="px-3 py-2 font-medium">
              Completed
            </th>
            <th class="px-3 py-2 font-medium">
              Error
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="job in jobs" :key="job.id">
            <td class="whitespace-nowrap px-3 py-2 font-mono text-xs">
              {{ shortId(job.id) }}
            </td>
            <td class="whitespace-nowrap px-3 py-2 uppercase">
              {{ job.marketplace }}
            </td>
            <td class="whitespace-nowrap px-3 py-2">
              {{ job.action }}
            </td>
            <td class="whitespace-nowrap px-3 py-2">
              <span
                class="rounded-full px-2 py-1 text-xs"
                :class="{
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200': job.status === 'pending' || job.status === 'queued' || job.status === 'running',
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200': job.status === 'done',
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200': job.status === 'failed',
                }"
              >
                {{ job.status }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-2">
              {{ prettyDate(job.created_at) }}
            </td>
            <td class="whitespace-nowrap px-3 py-2">
              {{ prettyDate(job.completed_at) }}
            </td>
            <td class="px-3 py-2 text-xs text-red-500">
              {{ job.error_message || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-xs text-muted-foreground">
      Completed in current page: {{ doneCount }} / {{ jobs.length }}
    </p>
  </section>
</template>
