import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'animate.css'
import App from './App.vue'
import router from './router'
import { useSettingsStore } from './stores/settingsStore'
import './styles/win11.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 初始化设置存储
const settingsStore = useSettingsStore()
settingsStore.loadSettings()

app.mount('#app') 