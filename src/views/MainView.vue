<template>
  <div class="main-container">
    <!-- 滚动内容区域 -->
    <div class="content-area">
      <!-- 学习进度显示 -->
      <div class="progress-header" v-if="currentStats">
        <div class="daily-progress">
          <span class="progress-text">今日进度: {{ currentStats.daily_progress }}/{{ currentStats.daily_goal }}</span>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>
        </div>
        <div class="streak-info">
          <span class="streak-text">连续学习 {{ currentStats.streak_days }} 天</span>
        </div>
      </div>

      <!-- 搜索功能 -->
      <SearchBox />

      <!-- 极简单词卡片 -->
      <WordCard v-if="currentWord" :word="currentWord" />

      <!-- 学习统计面板 -->
      <div v-if="showStats" class="stats-panel">
        <div class="stats-grid" v-if="currentStats">
          <div class="stat-item">
            <span class="stat-label">总词汇:</span>
            <span class="stat-value">{{ currentStats.total_words }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已学习:</span>
            <span class="stat-value">{{ currentStats.learned_words }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已掌握:</span>
            <span class="stat-value">{{ currentStats.mastered_words }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">正确率:</span>
            <span class="stat-value">{{ Math.round(currentStats.correct_rate) }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">学习时长:</span>
            <span class="stat-value">{{ formatTime(currentStats.total_time_spent) }}</span>
          </div>
        </div>
        
        <button @click="toggleStats" class="win11-button secondary toggle-stats-btn">
          {{ showStats ? '隐藏统计' : '显示统计' }}
        </button>
      </div>
    </div>

    <!-- 固定在底部的控制按钮 -->
    <div class="controls-footer">
      <button @click="previousWord" class="win11-button secondary">
        ← 上一个
      </button>
      
      <!-- 自动切换控制 -->
      <button @click="toggleAutoSwitch" class="win11-button secondary auto-switch-btn">
        {{ isAutoSwitching ? '⏸️ 停止切换' : '▶️ 自动切换' }}
      </button>
      
      <!-- 学习进度控制 -->
      <div class="progress-controls">
        <button @click="markWordUnknown" class="win11-button mastery-btn unknown">
          ❌ 不会
        </button>
        <button @click="markWordKnown" class="win11-button mastery-btn known">
          ✅ 会了
        </button>
      </div>
      
      <button @click="nextWord" class="win11-button secondary">
        下一个 →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWordStore } from '../stores/wordStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useProgress } from '../composables/useProgress'
import { useHotkeys } from '../composables/useHotkeys'
import WordCard from '../components/WordCard.vue'
import SearchBox from '../components/SearchBox.vue'
import { listen } from '@tauri-apps/api/event'

// 路由
const router = useRouter()

// 状态管理
const wordStore = useWordStore()
const settingsStore = useSettingsStore()
const { formatTime, getProgressLevel } = useProgress()

// 组件状态
const showStats = ref(false)
const studySession = ref<any>(null)
const isAutoSwitching = ref(false)
let autoSwitchTimer: number | null = null

// 计算属性
const currentWord = computed(() => wordStore.currentWord)
const currentStats = computed(() => wordStore.currentStats)
const progressPercentage = computed(() => {
  if (!currentStats.value) return 0
  const { daily_progress, daily_goal } = currentStats.value
  return Math.min(Math.round((daily_progress / daily_goal) * 100), 100)
})

// 方法
const nextWord = () => {
  wordStore.nextWord()
}

const previousWord = () => {
  wordStore.previousWord()
}

const markWordKnown = async () => {
  await wordStore.markWordKnown()
  await wordStore.refreshLearningStats()
}

const markWordUnknown = async () => {
  await wordStore.markWordUnknown()
  await wordStore.refreshLearningStats()
}

const toggleStats = () => {
  showStats.value = !showStats.value
}

// 自动切换功能
const toggleAutoSwitch = () => {
  if (isAutoSwitching.value) {
    stopAutoSwitch()
  } else {
    startAutoSwitch()
  }
}

const startAutoSwitch = (fromSettings = false) => {
  isAutoSwitching.value = true
  console.log('🔄 开始自动切换单词')
  
  // 只有不是从设置触发的，才需要同步更新设置
  if (!fromSettings && !settingsStore.settings.autoSwitch) {
    settingsStore.updateSettings({ autoSwitch: true })
    console.log('🔄 同步启用设置中的自动切换开关')
  }
  
  // 从设置中获取切换间隔，默认7秒
  const switchInterval = settingsStore.settings.switchInterval || 7
  console.log(`⏰ 自动切换间隔: ${switchInterval}秒`)
  
  // 设置定时器，定期切换到下一个单词
  autoSwitchTimer = window.setInterval(() => {
    console.log('🔄 自动切换到下一个单词')
    nextWord()
  }, switchInterval * 1000)
}

const stopAutoSwitch = (fromSettings = false) => {
  isAutoSwitching.value = false
  console.log('⏹️ 停止自动切换')
  
  // 只有不是从设置触发的，才需要同步更新设置
  if (!fromSettings && settingsStore.settings.autoSwitch) {
    settingsStore.updateSettings({ autoSwitch: false })
    console.log('🔄 同步禁用设置中的自动切换开关')
  }
  
  if (autoSwitchTimer) {
    clearInterval(autoSwitchTimer)
    autoSwitchTimer = null
  }
}

// 打开设置页面
const openSettings = () => {
  console.log('🔧 打开设置页面')
  router.push('/settings')
}

// 快捷键回调函数
const hotkeyCallbacks = {
  onNextWord: nextWord,
  onPreviousWord: previousWord,
  onMarkMastered: markWordKnown,
  onTogglePause: toggleStats,
  onShowSettings: openSettings
}

// 使用快捷键
const { } = useHotkeys(hotkeyCallbacks)

// 事件监听器引用
let unlistenOpenSettings: (() => void) | null = null
let unlistenMenuNextWord: (() => void) | null = null
let unlistenMenuPrevWord: (() => void) | null = null
let unlistenMenuAutoSwitch: (() => void) | null = null
let unlistenMenuRefreshWords: (() => void) | null = null
let unlistenMenuToggleStats: (() => void) | null = null
let unlistenMenuThemeSwitch: (() => void) | null = null

// 生命周期
onMounted(async () => {
  // 加载单词数据
  await wordStore.loadWords()
  
  // 开始学习会话
  studySession.value = wordStore.beginStudySession('mixed')
  
  // 检查设置中的自动切换开关
  if (settingsStore.settings.autoSwitch) {
    console.log('🔄 设置中启用了自动切换，自动开始')
    startAutoSwitch(true)
  }
  
  // 监听托盘菜单的设置事件
  try {
    unlistenOpenSettings = await listen('open-settings', () => {
      console.log('📢 收到托盘菜单设置事件')
      openSettings()
    })
    console.log('✅ 设置事件监听器已注册')
  } catch (error) {
    console.error('❌ 注册设置事件监听器失败:', error)
  }
  
  // 监听应用菜单事件
  try {
    // 监听菜单-下一个单词
    unlistenMenuNextWord = await listen('menu-next-word', () => {
      console.log('📢 收到菜单下一个单词事件')
      nextWord()
    })
    
    // 监听菜单-上一个单词
    unlistenMenuPrevWord = await listen('menu-prev-word', () => {
      console.log('📢 收到菜单上一个单词事件')
      previousWord()
    })
    
    // 监听菜单-自动切换
    unlistenMenuAutoSwitch = await listen('menu-auto-switch', () => {
      console.log('📢 收到菜单自动切换事件')
      toggleAutoSwitch()
    })
    
    // 监听菜单-刷新单词库
    unlistenMenuRefreshWords = await listen('menu-refresh-words', async () => {
      console.log('📢 收到菜单刷新单词库事件')
      await wordStore.loadWords()
    })
    
    // 监听菜单-统计面板
    unlistenMenuToggleStats = await listen('menu-toggle-stats', () => {
      console.log('📢 收到菜单统计面板事件')
      toggleStats()
    })
    
    // 监听菜单-主题切换
    unlistenMenuThemeSwitch = await listen('menu-theme-switch', () => {
      console.log('📢 收到菜单主题切换事件')
      // TODO: 实现主题切换功能
      console.log('主题切换功能待实现')
    })
    
    console.log('✅ 所有菜单事件监听器已注册')
  } catch (error) {
    console.error('❌ 注册菜单事件监听器失败:', error)
  }
  
  // 显示启动信息
  console.log('🎯 小驴单词薄启动完成 - 学习进度保存功能已激活')
})

// 监听设置中的自动切换开关变化
watch(
  () => settingsStore.settings.autoSwitch,
  (newValue) => {
    console.log('🔄 设置中的自动切换开关变化:', newValue)
    if (newValue && !isAutoSwitching.value) {
      // 设置中启用了自动切换，但当前没有运行，启动它
      startAutoSwitch(true)
    } else if (!newValue && isAutoSwitching.value) {
      // 设置中禁用了自动切换，但当前正在运行，停止它
      stopAutoSwitch(true)
    }
  }
)

onUnmounted(async () => {
  // 移除事件监听器
  if (unlistenOpenSettings) {
    unlistenOpenSettings()
    console.log('🗑️ 设置事件监听器已移除')
  }
  
  // 移除菜单事件监听器
  if (unlistenMenuNextWord) {
    unlistenMenuNextWord()
  }
  if (unlistenMenuPrevWord) {
    unlistenMenuPrevWord()
  }
  if (unlistenMenuAutoSwitch) {
    unlistenMenuAutoSwitch()
  }
  if (unlistenMenuRefreshWords) {
    unlistenMenuRefreshWords()
  }
  if (unlistenMenuToggleStats) {
    unlistenMenuToggleStats()
  }
  if (unlistenMenuThemeSwitch) {
    unlistenMenuThemeSwitch()
  }
  console.log('🗑️ 所有菜单事件监听器已移除')
  
  // 清理自动切换定时器
  if (autoSwitchTimer) {
    clearInterval(autoSwitchTimer)
    console.log('🗑️ 自动切换定时器已清理')
  }
  
  // 结束学习会话
  if (studySession.value) {
    await wordStore.endStudySession()
  }
})
</script>

<style scoped>
@import '../styles/win11.scss';

.main-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 80px; /* 为底部按钮留出空间 */
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.daily-progress {
  flex: 1;
}

.progress-text {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.3s ease;
}

.streak-info {
  font-size: 14px;
  color: #f57c00;
  font-weight: bold;
}

.controls-footer {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid #e0e0e0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.progress-controls {
  display: flex;
  gap: 10px;
}

.win11-button.mastery-btn.known {
  background: #4CAF50;
  color: white;
  border: none;
}

.win11-button.mastery-btn.known:hover {
  background: #45a049;
  transform: translateY(-1px);
}

.win11-button.mastery-btn.unknown {
  background: #f44336;
  color: white;
  border: none;
}

.win11-button.mastery-btn.unknown:hover {
  background: #d32f2f;
  transform: translateY(-1px);
}

.stats-panel {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.toggle-stats-btn {
  font-size: 0.9em;
}

.auto-switch-btn {
  font-size: 0.9em;
}
</style> 