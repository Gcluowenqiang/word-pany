import { ref, computed, readonly } from 'vue'
import { useSimpleUpdater } from './useSimpleUpdater'
import { useNotifications } from './useNotifications'

export interface UnifiedUpdateInfo {
  version: string
  date?: string
  body?: string
  currentVersion: string
  available: boolean
  downloadSize?: string
  publishedAt?: string
}

export function useUnifiedUpdater() {
  const { sendNotification } = useNotifications()
  
  // 只使用简单更新器
  const simpleUpdater = useSimpleUpdater()
  
  // 统一状态管理
  const currentUpdateInfo = ref<UnifiedUpdateInfo | null>(null)
  
  // 计算属性 - 统一状态
  const isChecking = computed(() => 
    simpleUpdater.isChecking.value
  )
  
  const isUpdating = computed(() => 
    false // 简单更新器直接打开浏览器下载，无需显示下载状态
  )
  
  const updateProgress = computed(() => {
    return 0 // 简单更新器不提供进度，直接跳转到浏览器下载
  })
  
  // 智能更新检查（现在只使用简单更新器）
  const checkForUpdate = async (silent = false): Promise<UnifiedUpdateInfo | null> => {
    try {
      if (!silent) {
        console.log('🔍 开始智能更新检查...')
      }
      
      // 使用简单更新器检查
      const updateInfo = await simpleUpdater.checkForUpdate(silent)
      
      if (updateInfo) {
        const unifiedInfo: UnifiedUpdateInfo = {
          version: updateInfo.version,
          date: updateInfo.publishedAt,
          body: updateInfo.body,
          currentVersion: updateInfo.currentVersion,
          available: true,
          downloadSize: simpleUpdater.formattedUpdateInfo?.value?.size,
          publishedAt: updateInfo.publishedAt
        }
        
        currentUpdateInfo.value = unifiedInfo
        
        if (!silent) {
          console.log(`🚀 发现新版本: v${updateInfo.version}`)
          await sendNotification(
            '🚀 发现新版本',
            `发现新版本 v${updateInfo.version}，点击立即下载！`
          )
        }
        
        return unifiedInfo
      }
      
      // 没有更新
      currentUpdateInfo.value = null
      if (!silent) {
        console.log('✅ 当前已是最新版本')
      }
      
      return null
      
    } catch (error) {
      console.error('❌ 更新检查失败:', error)
      currentUpdateInfo.value = null
      throw error
    }
  }
  
  // 执行更新（跳转到浏览器下载）
  const installUpdate = async (): Promise<boolean> => {
    if (!currentUpdateInfo.value) {
      console.warn('⚠️ 没有可用的更新')
      return false
    }
    
    try {
      console.log('🌐 打开浏览器下载更新...')
      await sendNotification(
        '🌐 正在下载',
        '已在浏览器中打开下载链接，请手动下载并安装'
      )
      
      await simpleUpdater.downloadAndInstall()
      return true
    } catch (error) {
      console.error('❌ 打开下载链接失败:', error)
      await sendNotification(
        '❌ 下载失败',
        error instanceof Error ? error.message : '未知错误'
      )
      return false
    }
  }
  
  // 重置状态
  const resetUpdateState = () => {
    currentUpdateInfo.value = null
    // simpleUpdater 的状态会自动管理
  }
  
  // 格式化更新信息
  const formatUpdateInfo = computed(() => {
    if (!currentUpdateInfo.value) return null
    
    const info = currentUpdateInfo.value
    return {
      title: '发现新版本',
      version: `v${info.version}`,
      description: '浏览器下载更新包',
      size: info.downloadSize || '计算中...',
      method: 'browser' as const,
      savings: 0,
      changeLog: info.body || '版本更新说明',
      publishDate: info.publishedAt || '未知'
    }
  })
  
  // 自动检查设置
  const enableAutoCheck = ref(true)
  
  const setupAutoCheck = () => {
    if (!enableAutoCheck.value) return
    
    // 每4小时自动检查一次
    setInterval(() => {
      if (enableAutoCheck.value) {
        checkForUpdate(true).catch(console.error)
      }
    }, 4 * 60 * 60 * 1000)
  }
  
  // 启动自动检查
  setupAutoCheck()
  
  return {
    // 状态
    isChecking: readonly(isChecking),
    isUpdating: readonly(isUpdating),
    updateProgress: readonly(updateProgress),
    currentUpdateInfo: readonly(currentUpdateInfo),
    
    // 配置
    enableAutoCheck,
    
    // 计算属性
    formatUpdateInfo,
    
    // 方法
    checkForUpdate,
    installUpdate,
    resetUpdateState,
    
    // 底层更新器访问（只提供简单更新器）
    simpleUpdater
  }
} 