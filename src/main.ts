import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import 'animate.css'
import App from './App.vue'
import router from './router'
import { useSettingsStore } from './stores/settingsStore'
import { useTheme } from './composables/useTheme'
import './styles/win11.scss'
import './styles/theme.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// Element Plus消息提示使用默认样式

// 初始化设置存储
const settingsStore = useSettingsStore()
settingsStore.loadSettings()

// 初始化主题系统
const { initializeTheme } = useTheme()
initializeTheme()

app.mount('#app') 