<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Make an Offer</DialogTitle>
        <DialogDescription>
          Negotiate the price for this item. Offer must be at least 70% of the list price.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- List Price Display -->
        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-400">List Price</p>
          <p class="text-2xl font-bold">${{ listPrice.toFixed(2) }}</p>
        </div>

        <!-- Minimum Offer Info -->
        <div class="text-sm text-gray-600 dark:text-gray-400">
          <p>Minimum offer: <span class="font-semibold">${{ minOffer.toFixed(2) }}</span> (70% of list)</p>
          <p>Your offer will expire in 48 hours</p>
        </div>

        <!-- Offer Amount Input -->
        <div class="space-y-2">
          <Label for="offer-amount">Your Offer</Label>
          <Input
            id="offer-amount"
            v-model.number="offerAmount"
            type="number"
            step="0.01"
            :min="minOffer"
            :max="listPrice"
            placeholder="Enter your offer"
            required
            :disabled="isLoading"
          />
          <div class="flex justify-between text-xs text-gray-500">
            <span>Min: ${{ minOffer.toFixed(2) }}</span>
            <span>Max: ${{ listPrice.toFixed(2) }}</span>
          </div>
          <div v-if="offerAmount" class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
            <p class="font-semibold text-blue-900 dark:text-blue-100">
              Discount: {{ discountPercent }}% off list price
            </p>
          </div>
        </div>

        <!-- Email Input -->
        <div class="space-y-2">
          <Label for="buyer-email">Your Email</Label>
          <Input
            id="buyer-email"
            v-model="buyerEmail"
            type="email"
            placeholder="your@email.com"
            required
            :disabled="isLoading"
          />
          <p class="text-xs text-gray-500">
            We'll use this to notify you about your offer
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 p-3 rounded">
          <p class="text-sm text-red-900 dark:text-red-100">{{ errorMessage }}</p>
        </div>

        <!-- Submit Button -->
        <Button
          type="submit"
          :disabled="isLoading || !offerAmount || !buyerEmail"
          class="w-full"
        >
          <Loader v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
          {{ isLoading ? 'Submitting...' : 'Submit Offer' }}
        </Button>

        <!-- Success Message -->
        <div
          v-if="successMessage"
          class="bg-green-50 dark:bg-green-900/20 p-3 rounded"
        >
          <p class="text-sm text-green-900 dark:text-green-100">{{ successMessage }}</p>
        </div>
      </form>

      <DialogFooter class="sm:justify-start">
        <Button type="button" variant="outline" @click="closeDialog">
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Loader } from 'lucide-vue-next'

interface Props {
  productId: string
  listPrice: number
  isOpen: boolean
}

interface Emits {
  (e: 'update:isOpen', value: boolean): void
  (e: 'success', offerId: string): void
}

interface CreateOfferResponse {
  offerId: string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const minOffer = computed(() => props.listPrice * 0.7)
const offerAmount = ref<number>(minOffer.value)
const buyerEmail = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const isOpen = computed({
  get: () => props.isOpen,
  set: (value) => emit('update:isOpen', value),
})

const discountPercent = computed(() => {
  if (!offerAmount.value) return 0
  const discount = ((props.listPrice - offerAmount.value) / props.listPrice) * 100
  return Math.round(discount)
})

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  // Validate
  if (offerAmount.value < minOffer.value) {
    errorMessage.value = `Offer must be at least $${minOffer.value.toFixed(2)}`
    return
  }

  if (!buyerEmail.value.includes('@')) {
    errorMessage.value = 'Please enter a valid email address'
    return
  }

  isLoading.value = true

  try {
    const data = await $fetch<CreateOfferResponse>('/api/offers', {
      method: 'POST',
      body: {
        productId: props.productId,
        offerAmount: offerAmount.value,
        buyerEmail: buyerEmail.value,
      },
    })

    successMessage.value =
      '✅ Offer submitted! Check your email for updates. The seller will review within 48 hours.'
    emit('success', data.offerId)

    // Close modal after 2 seconds
    setTimeout(() => {
      closeDialog()
    }, 2000)
  } catch (err) {
    console.error('Offer submission error:', err)
    errorMessage.value =
      err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const closeDialog = () => {
  // Reset form
  offerAmount.value = minOffer.value
  buyerEmail.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  emit('update:isOpen', false)
}

// Update minOffer when listPrice changes
watch(
  () => props.listPrice,
  (newPrice) => {
    offerAmount.value = newPrice * 0.7
  }
)
</script>

<style scoped></style>
