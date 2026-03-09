export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/account/login')
  }

  const appRoles = user.value.app_metadata?.roles
  const profileRoles = user.value.user_metadata?.roles
  const roles = Array.isArray(appRoles)
    ? appRoles
    : Array.isArray(profileRoles)
      ? profileRoles
      : []

  if (roles.length > 0 && !roles.includes('admin')) {
    return navigateTo('/')
  }
})
