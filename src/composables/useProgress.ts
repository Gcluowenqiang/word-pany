import { ref, computed } from 'vue'
import { Store } from '@tauri-apps/plugin-store'
import { invoke } from '@tauri-apps/api/core'
import type { WordProgress, LearningStats, StudySession } from '../types/word'

// Store 实例
let progressStore: Store | null = null
let statsStore: Store | null = null
let sessionsStore: Store | null = null

// 状态
const currentStats = ref<LearningStats | null>(null)
const isLoading = ref(false)
const studySessionData = ref<StudySession>({
  words_studied: [],
  session_duration: 0,
  correct_answers: 0,
  total_answers: 0,
  average_time_per_word: 0,
  session_type: 'mixed'
})

// 初始化 Store
export async function initializeProgressStores() {
  if (!progressStore) {
    progressStore = await Store.load('user_progress.json')
    statsStore = await Store.load('learning_stats.json')
    sessionsStore = await Store.load('study_sessions.json')
  }
}

export function useProgress() {
  
  // 获取单词学习进度
  const getWordProgress = async (wordId: string): Promise<WordProgress | null> => {
    try {
      await initializeProgressStores()
      const progressKey = `word_${wordId}`
      const progress = await progressStore?.get<WordProgress>(progressKey)
      
      return progress || null
    } catch (error) {
      console.error('获取单词进度失败:', error)
      return null
    }
  }

  // 更新单词学习进度
  const updateWordProgress = async (
    wordId: string,
    progress: number,
    masteryLevel: number,
    isCorrect: boolean,
    timeSpent: number = 30
  ): Promise<boolean> => {
    try {
      isLoading.value = true
      
      // 调用后端API更新进度
      await invoke('update_word_progress', {
        wordId,
        progress,
        masteryLevel,
        isCorrect,
        timeSpent
      })

      // 更新学习会话数据
      if (!studySessionData.value.words_studied.includes(wordId)) {
        studySessionData.value.words_studied.push(wordId)
      }
      studySessionData.value.total_answers++
      if (isCorrect) {
        studySessionData.value.correct_answers++
      }
      
      console.log('✅ 单词学习进度已保存:', { wordId, progress, masteryLevel })
      return true
    } catch (error) {
      console.error('❌ 更新单词进度失败:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 获取学习统计数据
  const getLearningStats = async (): Promise<LearningStats | null> => {
    try {
      isLoading.value = true
      
      const stats = await invoke<LearningStats>('get_learning_stats')
      currentStats.value = stats
      
      return stats
    } catch (error) {
      console.error('❌ 获取学习统计失败:', error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 开始新的学习会话
  const startStudySession = (sessionType: 'review' | 'new_words' | 'mixed' = 'mixed') => {
    studySessionData.value = {
      words_studied: [],
      session_duration: 0,
      correct_answers: 0,
      total_answers: 0,
      average_time_per_word: 0,
      session_type: sessionType
    }
    
    // 记录会话开始时间
    const startTime = Date.now()
    
    return {
      startTime,
      endSession: async () => {
        const endTime = Date.now()
        studySessionData.value.session_duration = Math.round((endTime - startTime) / 1000)
        
        if (studySessionData.value.words_studied.length > 0) {
          studySessionData.value.average_time_per_word = 
            studySessionData.value.session_duration / studySessionData.value.words_studied.length
        }
        
        await saveStudySession()
      }
    }
  }

  // 保存学习会话
  const saveStudySession = async (): Promise<boolean> => {
    try {
      await invoke('save_study_session', {
        sessionData: studySessionData.value
      })
      
      console.log('✅ 学习会话已保存')
      return true
    } catch (error) {
      console.error('❌ 保存学习会话失败:', error)
      return false
    }
  }

  // 导出学习进度
  const exportProgress = async (filePath: string): Promise<boolean> => {
    try {
      isLoading.value = true
      
      await invoke('export_progress', { filePath })
      console.log('✅ 学习进度已导出')
      return true
    } catch (error) {
      console.error('❌ 导出学习进度失败:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 导入学习进度
  const importProgress = async (filePath: string): Promise<boolean> => {
    try {
      isLoading.value = true
      
      await invoke('import_progress', { filePath })
      
      // 重新加载统计数据
      await getLearningStats()
      
      console.log('✅ 学习进度已导入')
      return true
    } catch (error) {
      console.error('❌ 导入学习进度失败:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 设置每日学习目标
  const setDailyGoal = async (goal: number): Promise<boolean> => {
    try {
      await initializeProgressStores()
      await statsStore?.set('daily_goal', goal)
      await statsStore?.save()
      
      // 更新当前统计数据
      if (currentStats.value) {
        currentStats.value.daily_goal = goal
      }
      
      console.log('✅ 每日学习目标已设置:', goal)
      return true
    } catch (error) {
      console.error('❌ 设置每日目标失败:', error)
      return false
    }
  }

  // 计算属性
  const progressPercentage = computed(() => {
    if (!currentStats.value) return 0
    const { daily_progress, daily_goal } = currentStats.value
    return Math.min(Math.round((daily_progress / daily_goal) * 100), 100)
  })

  const completionRate = computed(() => {
    if (!currentStats.value) return 0
    const { learned_words, total_words } = currentStats.value
    return total_words > 0 ? Math.round((learned_words / total_words) * 100) : 0
  })

  const masteryRate = computed(() => {
    if (!currentStats.value) return 0
    const { mastered_words, learned_words } = currentStats.value
    return learned_words > 0 ? Math.round((mastered_words / learned_words) * 100) : 0
  })

  // 工具函数
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}秒`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      return `${minutes}分钟`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}小时${minutes}分钟`
    }
  }

  const getProgressLevel = (masteryLevel: number): string => {
    if (masteryLevel >= 90) return '已精通'
    if (masteryLevel >= 80) return '已掌握'
    if (masteryLevel >= 60) return '较熟练'
    if (masteryLevel >= 40) return '基本了解'
    if (masteryLevel >= 20) return '初步接触'
    return '未学习'
  }

  return {
    // 状态
    currentStats,
    isLoading,
    studySessionData,
    
    // 计算属性
    progressPercentage,
    completionRate,
    masteryRate,
    
    // 方法
    getWordProgress,
    updateWordProgress,
    getLearningStats,
    startStudySession,
    saveStudySession,
    exportProgress,
    importProgress,
    setDailyGoal,
    
    // 工具函数
    formatTime,
    getProgressLevel,
    
    // 初始化
    initializeProgressStores
  }
} 