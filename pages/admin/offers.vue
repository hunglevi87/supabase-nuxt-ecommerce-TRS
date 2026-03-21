<template>
  <div class="container mx-auto p-6 py-12">
    <Head>
      <Title>Offers Dashboard - Admin</Title>
    </Head>

    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-2">Offers Dashboard</h1>
      <p class="text-gray-600 dark:text-gray-400">Review and manage customer offers</p>
    </div>

    <!-- Filter Tabs -->
    <Tabs v-model="activeTab" class="mb-6">
      <TabsList>
        <TabsTrigger value="pending">
          Pending
          <span v-if="pendingCount > 0" class="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-sm">
            {{ pendingCount }}
          </span>
        </TabsTrigger>
        <TabsTrigger value="accepted">Accepted</TabsTrigger>
        <TabsTrigger value="declined">Declined</TabsTrigger>
        <TabsTrigger value="expired">Expired</TabsTrigger>
      </TabsList>
    </Tabs>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader class="w-8 h-8 animate-spin text-gray-400" />
      <span class="ml-4 text-gray-600">Loading offers...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredOffers.length === 0" class="text-center py-12">
      <Package class="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <p class="text-gray-600 dark:text-gray-400 text-lg">No {{ activeTab }} offers</p>
    </div>

    <!-- Offers Table -->
    <div v-else class="space-y-4">
      <div
        v-for="offer in filteredOffers"
        :key="offer.id"
        class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition"
      >
        <div class="flex items-start justify-between gap-4">
          <!-- Offer Details -->
          <div class="flex-1">
            <h3 class="text-xl font-bold mb-2">{{ offer.products.name }}</h3>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <!-- List Price -->
              <div>
                <p class="text-xs text-gray-500 uppercase font-semibold">List Price</p>
                <p class="text-lg font-semibold">${{ offer.products.price }}</p>
              </div>

              <!-- Offered Amount -->
              <div>
                <p class="text-xs text-gray-500 uppercase font-semibold">Offered</p>
                <p class="text-lg font-semibold text-blue-600">
                  ${{ offer.offered_amount }}
                </p>
              </div>

              <!-- Discount -->
              <div>
                <p class="text-xs text-gray-500 uppercase font-semibold">Discount</p>
                <p class="text-lg font-semibold text-orange-600">
                  {{ discountPercent(offer) }}%
                </p>
              </div>

              <!-- From -->
              <div>
                <p class="text-xs text-gray-500 uppercase font-semibold">From</p>
                <p class="text-lg font-mono text-gray-700 dark:text-gray-300 truncate">
                  {{ offer.buyer_email }}
                </p>
              </div>
            </div>

            <!-- Timeline -->
            <div class="text-sm text-gray-500 space-y-1">
              <p>Created: {{ formatDate(offer.created_at) }}</p>
              <p v-if="offer.status === 'pending'" class="text-orange-600 font-semibold">
                ⏰ Expires: {{ formatDate(offer.expires_at) }}
              </p>
            </div>
          </div>

          <!-- Status Badge -->
          <div>
            <span :class="['mb-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold', getStatusClasses(offer.status)]">
              {{ offer.status.toUpperCase() }}
            </span>
          </div>
        </div>

        <!-- Action Buttons (for pending offers) -->
        <div v-if="offer.status === 'pending'" class="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            :disabled="acceptingId === offer.id"
            class="flex-1 bg-green-600 hover:bg-green-700"
            @click="acceptOffer(offer.id)"
          >
            <Check v-if="acceptingId !== offer.id" class="w-4 h-4 mr-2" />
            <Loader v-else class="w-4 h-4 mr-2 animate-spin" />
            {{ acceptingId === offer.id ? 'Accepting...' : 'Accept Offer' }}
          </Button>

          <Button
            :disabled="decliningId === offer.id"
            class="flex-1"
            variant="outline"
            @click="declineOffer(offer.id)"
          >
            <X v-if="decliningId !== offer.id" class="w-4 h-4 mr-2" />
            <Loader v-else class="w-4 h-4 mr-2 animate-spin" />
            {{ decliningId === offer.id ? 'Declining...' : 'Decline' }}
          </Button>
        </div>

        <!-- Stripe Link (for accepted offers) -->
        <div v-if="offer.status === 'accepted' && stripeLinks[offer.id]" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Checkout Link:
          </p>
          <a
            :href="stripeLinks[offer.id]"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:underline font-mono text-sm break-all"
          >
            {{ stripeLinks[offer.id] }}
          </a>
          <Button
            size="sm"
            variant="outline"
            class="ml-2"
            @click="copyToClipboard(stripeLinks[offer.id])"
          >
            <Copy class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Toast for feedback -->
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Button } from '~/components/ui/button'
import { Toaster, useToast } from '~/components/ui/toast'
import { Loader, Check, X, Copy, Package } from 'lucide-vue-next'
import type { OfferStatus } from '~/types/haggle.types'

definePageMeta({
  middleware: 'auth',
})

interface OfferProduct {
  id: string
  name: string
  price: number
}

interface AdminOffer {
  id: string
  buyer_email: string
  offered_amount: number
  status: OfferStatus
  expires_at: string
  created_at: string
  products: OfferProduct
}

interface AcceptOfferResponse {
  stripeCheckoutUrl?: string
}

const activeTab = ref<OfferStatus>('pending')
const offers = ref<AdminOffer[]>([])
const isLoading = ref(true)
const acceptingId = ref<string | null>(null)
const decliningId = ref<string | null>(null)
const stripeLinks = ref<Record<string, string>>({})
const { toast } = useToast()

const pendingCount = computed(() => offers.value.filter((o) => o.status === 'pending').length)

const filteredOffers = computed(() => {
  return offers.value.filter((o) => o.status === activeTab.value)
})

const discountPercent = (offer: AdminOffer) => {
  const discount = ((offer.products.price - offer.offered_amount) / offer.products.price) * 100
  return Math.round(discount)
}

const getStatusClasses = (status: OfferStatus): string => {
  const classes: Record<OfferStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    declined: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    expired: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  }
  return classes[status]
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadOffers = async () => {
  isLoading.value = true
  try {
    const data = await $fetch<AdminOffer[]>('/api/offers')
    offers.value = data
  } catch (err) {
    console.error('Error loading offers:', err)
    toast({
      title: 'Error',
      description: err instanceof Error ? err.message : 'Failed to load offers',
      variant: 'destructive',
    })
  } finally {
    isLoading.value = false
  }
}

const acceptOffer = async (offerId: string) => {
  acceptingId.value = offerId

  try {
    const data = await $fetch<AcceptOfferResponse>('/api/offers/accept', {
      method: 'POST',
      body: { offerId },
    })

    if (data.stripeCheckoutUrl) {
      stripeLinks.value[offerId] = data.stripeCheckoutUrl
      toast({
        title: 'Success',
        description: 'Offer accepted! Stripe checkout link generated.',
      })

      // Refresh offers
      await loadOffers()
    }
  } catch (err) {
    console.error('Error accepting offer:', err)
    toast({
      title: 'Error',
      description: err instanceof Error ? err.message : 'An unexpected error occurred',
      variant: 'destructive',
    })
  } finally {
    acceptingId.value = null
  }
}

const declineOffer = async (offerId: string) => {
  decliningId.value = offerId

  try {
    await $fetch('/api/offers/decline', {
      method: 'POST',
      body: { offerId },
    })

    toast({
      title: 'Success',
      description: 'Offer declined. Buyer will be notified.',
    })

    // Refresh offers
    await loadOffers()
  } catch (err) {
    console.error('Error declining offer:', err)
    toast({
      title: 'Error',
      description: err instanceof Error ? err.message : 'An unexpected error occurred',
      variant: 'destructive',
    })
  } finally {
    decliningId.value = null
  }
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  toast({
    title: 'Copied',
    description: 'Stripe link copied to clipboard',
  })
}

let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadOffers()
  // Refresh every 30 seconds
  refreshTimer = setInterval(loadOffers, 30000)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped></style>
