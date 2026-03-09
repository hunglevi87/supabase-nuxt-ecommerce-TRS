// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxt/content',
    '@nuxtjs/ionic',
    '@vite-pwa/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@vueuse/nuxt',
    'nuxt-lodash',
    '@nuxtjs/tailwindcss',
    '@nuxt/eslint',
    '@nuxtjs/supabase',
    '@nuxt/fonts',
    'shadcn-nuxt',
    '@nuxtjs/color-mode',
    'nuxt-swiper',
    '@pinia-plugin-persistedstate/nuxt',
    'radix-vue/nuxt',
    '@vee-validate/nuxt',
  ],

  supabase: {
    redirect: false,
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'The Relic Shop',
      short_name: 'Relic Shop',
      description: 'Rare, Elegant, Luxury Items Curated',
      display: 'standalone',
      theme_color: '#0f1419',
      background_color: '#0f1419',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/favicon.ico',
          sizes: '64x64',
          type: 'image/x-icon',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
    },
  },

  tailwindcss: {
    cssPath: ['~/assets/css/tailwind.css', { injectPosition: 'first' }],
    configPath: './tailwind.config.js',
    exposeConfig: {
      level: 2,
    },
    config: {},
    viewer: true,
  },

  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui',
  },

  colorMode: {
    classSuffix: '',
  },

  css: ['~/assets/css/tailwind.css', '~/assets/scss/main.scss'],
  compatibilityDate: '2024-08-17',
  fonts: {
    provider: 'google', // sets default provider
    families: [
      {
        name: 'Cormorant Garamond',
        provider: 'google', // you can override the provider on a per-family basis
        subsets: ['latin'],
        display: 'swap',
        weight: [400, 500, 600, 700],
        styles: ['normal'],
        fallbacks: ['serif'],
      },
      {
        name: 'Playfair Display',
        provider: 'google',
        subsets: ['latin'],
        display: 'swap',
        weight: [400, 500, 600, 700],
        styles: ['normal'],
        fallbacks: ['serif'],
      },
      {
        name: 'Inter',
        provider: 'google',
        subsets: ['latin'],
        display: 'swap',
        weight: [400, 500, 600, 700],
        styles: ['normal'],
        fallbacks: ['Arial'],
      },
    ],
  },
  devServer: {
    port: 3000,
    host: '0.0.0.0',
  },
  runtimeConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    public: {
      stripePublishableKey: process.env.STRIPE_PUBLIC_KEY,
    },
  },
})
