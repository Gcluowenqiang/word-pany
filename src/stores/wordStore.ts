import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Word } from '../types/word'
import { useProgress } from '../composables/useProgress'

// 改进的Tauri环境检测函数
async function checkTauriEnvironment(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  // 检查__TAURI__对象
  if ((window as any).__TAURI__) return true
  
  // 等待一小段时间让Tauri完全初始化
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 再次检查
  if ((window as any).__TAURI__) return true
  
  // 尝试检查Tauri API
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    // 简单测试调用
    return typeof invoke === 'function'
  } catch {
    return false
  }
}

export const useWordStore = defineStore('word', () => {
  // 状态
  const wordList = ref<Word[]>([])
  const currentWordIndex = ref(0)
  const isLoading = ref(false)
  
  // 集成学习进度管理
  const { 
    initializeProgressStores, 
    updateWordProgress, 
    getLearningStats,
    startStudySession,
    getWordProgress,
    currentStats
  } = useProgress()
  
  // 学习会话管理
  let currentSession: { startTime: number; endSession: () => Promise<void> } | null = null

  // 计算属性
  const currentWord = computed(() => wordList.value[currentWordIndex.value])
  const totalWords = computed(() => wordList.value.length)
  const hasWords = computed(() => wordList.value.length > 0)

  // 方法
  const loadWords = async () => {
    isLoading.value = true
    try {
      // 初始化学习进度存储
      await initializeProgressStores()
      
      // 改进的Tauri环境检测 - 等待Tauri完全初始化
      const isTauriEnvironment = await checkTauriEnvironment()
      
      if (isTauriEnvironment) {
        // 调用Tauri后端API加载真实XML数据
        const { invoke } = await import('@tauri-apps/api/core')
        const words = await invoke('get_words', { filter: null }) as Word[]
        
        // 为每个单词加载学习进度
        for (const word of words) {
          const progress = await getWordProgress(word.id)
          if (progress) {
            word.progress = progress.progress
            word.masteryLevel = progress.mastery_level
            word.reviewCount = progress.review_count
            word.lastReview = new Date(progress.last_review)
          } else {
            // 设置默认值
            word.progress = word.progress || 1
            word.masteryLevel = word.masteryLevel || 0
            word.reviewCount = word.reviewCount || 0
            word.lastReview = word.lastReview || new Date()
          }
        }
        
        wordList.value = words
        console.log('✅ 真实数据加载完成:', words.length, '个软件技术词汇')
        console.log('📚 数据来源: software_vocabulary.xml')
        console.log('💾 学习进度已同步加载')
        if (words.length > 0) {
          console.log('📖 第一个单词示例:', words[0].word, '-', words[0].trans)
        }
        
        // 加载学习统计
        await getLearningStats()
      } else {
        // 非Tauri环境，使用模拟数据
        throw new Error('非Tauri环境，使用模拟数据')
      }
    } catch (error) {
      console.error('❌ 单词数据加载失败:', error)
      // 提供更丰富的模拟数据，确保应用可用性
      wordList.value = [
        {
          id: 'demo-1',
          word: 'algorithm',
          trans: 'n. 算法，运算法则',
          phonetic: '/ˈælɡərɪðəm/',
          tags: ['programming', 'computer-science'],
          progress: 3,
          examples: [
            {
              source: 'This algorithm solves the problem efficiently.',
              trans: '这个算法有效地解决了这个问题。'
            }
          ],
          difficulty: 6,
          lastReview: new Date(),
          masteryLevel: 60,
          reviewCount: 3,
          note: '技术说明：计算机科学中解决问题的步骤序列'
        },
        {
          id: 'demo-2', 
          word: 'framework',
          trans: 'n. 框架，结构',
          phonetic: '/ˈfreɪmwɜːrk/',
          tags: ['programming', 'development'],
          progress: 2,
          examples: [
            {
              source: 'Vue is a popular JavaScript framework.',
              trans: 'Vue是一个流行的JavaScript框架。'
            }
          ],
          difficulty: 4,
          lastReview: new Date(),
          masteryLevel: 40,
          reviewCount: 2,
          note: '技术说明：提供应用程序开发基础结构的软件平台'
        },
        {
          id: 'demo-3',
          word: 'database',
          trans: 'n. 数据库',
          phonetic: '/ˈdeɪtəbeɪs/',
          tags: ['database', 'storage'],
          progress: 4,
          examples: [
            {
              source: 'The database stores user information.',
              trans: '数据库存储用户信息。'
            }
          ],
          difficulty: 3,
          lastReview: new Date(),
          masteryLevel: 80,
          reviewCount: 5,
          note: '技术说明：组织和存储数据的集合系统'
        }
      ]
      console.log('🔄 使用模拟数据:', wordList.value.length, '个单词')
    } finally {
      isLoading.value = false
    }
  }

  const forceRefresh = async () => {
    console.log('🔄 强制刷新数据...')
    isLoading.value = true
    try {
      const isTauriEnvironment = await checkTauriEnvironment()
      
      if (isTauriEnvironment) {
        const { invoke } = await import('@tauri-apps/api/core')
        // 先清理缓存
        await invoke('clear_cache')
        console.log('🧹 后端缓存已清理')
        
        // 然后重新加载数据
        await loadWords()
        console.log('🎉 数据强制刷新完成!')
      } else {
        await loadWords()
      }
    } catch (error) {
      console.error('❌ 强制刷新失败:', error)
      await loadWords() // 降级到普通加载
    }
  }

  const nextWord = () => {
    if (currentWordIndex.value < wordList.value.length - 1) {
      currentWordIndex.value++
    } else {
      currentWordIndex.value = 0 // 循环到第一个
    }
  }

  const previousWord = () => {
    if (currentWordIndex.value > 0) {
      currentWordIndex.value--
    } else {
      currentWordIndex.value = wordList.value.length - 1 // 循环到最后一个
    }
  }

  // 更新单词掌握度（集成学习进度保存）
  const updateWordMastery = async (wordId: string, masteryLevel: number, isCorrect: boolean = true) => {
    const word = wordList.value.find(w => w.id === wordId)
    if (word) {
      // 计算新的进度级别
      const newProgress = Math.min(Math.ceil(masteryLevel / 20), 5)
      
      // 更新本地状态
      word.masteryLevel = masteryLevel
      word.lastReview = new Date()
      word.reviewCount++
      word.progress = newProgress
      
      // 保存到持久化存储
      const success = await updateWordProgress(
        wordId, 
        newProgress, 
        masteryLevel, 
        isCorrect,
        30 // 假设每次学习30秒
      )
      
      if (success) {
        console.log('✅ 单词学习进度已保存:', { wordId, masteryLevel, progress: newProgress })
      } else {
        console.error('❌ 保存学习进度失败:', wordId)
      }
    }
  }

  // 开始学习会话
  const beginStudySession = (sessionType: 'review' | 'new_words' | 'mixed' = 'mixed') => {
    if (currentSession) {
      console.warn('⚠️ 已有活跃的学习会话，将结束当前会话')
      currentSession.endSession()
    }
    
    currentSession = startStudySession(sessionType)
    console.log('🎯 学习会话已开始:', sessionType)
    
    return currentSession
  }

  // 结束学习会话
  const endStudySession = async () => {
    if (currentSession) {
      await currentSession.endSession()
      currentSession = null
      console.log('✅ 学习会话已结束')
    }
  }

  // 标记单词为已掌握
  const markWordKnown = async (wordId?: string) => {
    const targetId = wordId || currentWord.value?.id
    if (targetId) {
      await updateWordMastery(targetId, 95, true)
    }
  }

  // 标记单词为未掌握
  const markWordUnknown = async (wordId?: string) => {
    const targetId = wordId || currentWord.value?.id
    if (targetId) {
      await updateWordMastery(targetId, 10, false)
    }
  }

  // 获取当前学习统计
  const refreshLearningStats = async () => {
    await getLearningStats()
  }

  // 根据ID设置当前单词
  const setCurrentWordById = (wordId: string): boolean => {
    const index = wordList.value.findIndex(word => word.id === wordId)
    if (index !== -1) {
      currentWordIndex.value = index
      console.log('✅ 跳转到单词:', wordList.value[index].word)
      return true
    }
    console.warn('⚠️ 未找到单词ID:', wordId)
    return false
  }

  return {
    // 状态
    wordList,
    currentWordIndex,
    isLoading,
    currentStats,
    
    // 计算属性
    currentWord,
    totalWords,
    hasWords,
    
    // 方法
    loadWords,
    forceRefresh,
    nextWord,
    previousWord,
    updateWordMastery,
    
    // 新增：学习进度相关方法
    beginStudySession,
    endStudySession,
    markWordKnown,
    markWordUnknown,
    refreshLearningStats,
    setCurrentWordById
  }
}) 