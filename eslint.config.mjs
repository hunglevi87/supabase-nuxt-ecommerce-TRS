// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt().override('nuxt/vue/rules', {
// Your custom configs here
  rules: {
    'vue/html-self-closing': 'off',
  },
})
