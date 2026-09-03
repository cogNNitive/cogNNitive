import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './assets/main.css'

const app = createApp(App)

// Global error handler — shows unhandled errors in the console
app.config.errorHandler = (err, _instance, _info) => {
  console.error('[iNNfo] Unhandled error:', err)
}

app.use(createPinia())
app.use(router)
app.mount('#app')
