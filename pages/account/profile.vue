<template>
  <div class="container w-full px-4 py-8">
    <h2 class="text-3xl text-center font-bold mb-8">Welcome, {{ username }}</h2>
    <Tabs v-model="tab" class="w-1/2 mx-auto">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="orders">Orders</TabsTrigger>
      </TabsList>

      <TabsContent value="account">
        <ProfileForm />
      </TabsContent>
      <TabsContent value="orders">
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <h6 class="text-base">You haven't placed any orders yet.</h6>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { Tabs, TabsList, TabsContent, TabsTrigger } from '~/components/ui/tabs'
import ProfileForm from '~/components/account/ProfileForm.vue'
const tab = ref('account')

const user = useSupabaseUser()

const username = computed(() => {
  return `${user.value?.user_metadata.firstName} ${user.value?.user_metadata.lastName}`
})
</script>
