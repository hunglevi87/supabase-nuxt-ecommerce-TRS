import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Tables } from '~/types/database.types'
import { useApiServices } from '@/composables/apiServices'

type WishlistItem = Tables<'wishlist'>

export const useWishlistStore = defineStore('wishlist', () => {
  const wishlist = ref<WishlistItem[]>([])
  const user = useSupabaseUser()

  const { addToWishlistApi, deleteWishlistItemApi, getWishlistItems } =
    useApiServices()

  function addToWishlist(productId: number) {
    if (!user.value) return

    if (!wishlist.value.some((item) => item.product_id === productId)) {
      wishlist.value.push({ product_id: productId } as WishlistItem)
    }

    addToWishlistApi(user.value.id, productId)
  }

  function removeFromWishList(productId: number) {
    if (!user.value) return

    wishlist.value = wishlist.value.filter(
      (item) => item.product_id !== productId,
    )

    deleteWishlistItemApi(user.value.id, productId)
  }

  watch(
    user,
    async (newUser) => {
      if (newUser) {
        wishlist.value = await getWishlistItems(newUser.id)
      } else {
        wishlist.value = []
      }
    },
    { immediate: true },
  )

  return {
    wishlist,
    addToWishlist,
    removeFromWishList,
  }
})
