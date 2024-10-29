<template>
  <form @submit="onSubmit">
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Make changes to your account here. Click save when you're done.
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-2">
        <div class="space-y-1">
          <Label for="firstName">Name</Label>
          <Input id="firstName" v-model="firstName" name="firstName" />
          <span v-if="errors.firstName" class="text-sm text-red-500">
            {{ errors.firstName }}
          </span>
        </div>
        <div class="space-y-1">
          <Label for="lastName">Username</Label>
          <Input id="lastName" v-model="lastName" name="lastName" />
          <span v-if="errors.lastName" class="text-sm text-red-500">
            {{ errors.lastName }}
          </span>
        </div>
      </CardContent>
      <CardFooter class="grid grid-cols-2 gap-4">
        <Button type="submit">Save changes</Button>
        <Button variant="outline" type="button" @click="resetForm"
          >Cancel</Button
        >
      </CardFooter>
    </Card>
  </form>
</template>

<script setup lang="ts">
import { useField, useForm } from 'vee-validate'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const errorMsg = ref('')

// Form schema
const validationSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
})

// Initialize form with vee-validate
const { handleSubmit, errors, resetForm } = useForm({
  validationSchema,
  initialValues: {
    firstName: user.value?.user_metadata.firstName || '',
    lastName: user.value?.user_metadata.lastName || '',
  },
})

const { value: firstName } = useField<string>('firstName')
const { value: lastName } = useField<string>('lastName')

// Form submission handler
const onSubmit = handleSubmit(async (values) => {
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        firstName: values.firstName,
        lastName: values.lastName,
      },
    })
    if (error) throw error
    // Show success message or redirect
  } catch (error) {
    errorMsg.value = error.message
    console.error('Error updating profile:', error)
  }
})
</script>

<style></style>
