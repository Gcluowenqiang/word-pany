import { ref, computed } from 'vue'
import { useUpdater, UpdateStatus } from './useUpdater'
import { useIncrementalUpdater } from './useIncrementalUpdater'
import { useNotifications } from './useNotifications'

export interface UnifiedUpdateInfo {
  version: string
  date?: string
  body?: string
  currentVersion: string
  available: boolean
  isIncremental: boolean
  estimatedSavings?: number
  downloadSize?: string
  method: 'incremental' | 'full'
}

export function useUnifiedUpdater() {
  const { sendNotification } = useNotifications()
  
  // 导入两个更新系统
  const standardUpdater = useUpdater()
  const incrementalUpdater = useIncrementalUpdater()
  
  // 统一状态管理
  const updateMode = ref<'auto' | 'standard' | 'incremental'>('auto')
  const currentUpdateInfo = ref<UnifiedUpdateInfo | null>(null)
  
  // 计算属性 - 统一状态
  const isChecking = computed(() => 
    standardUpdater.isChecking.value || incrementalUpdater.isChecking.value
  )
  
  const isUpdating = computed(() => 
    standardUpdater.isDownloading.value || 
    standardUpdater.isInstalling.value || 
    incrementalUpdater.isUpdating.value
  )
  
  const updateProgress = computed(() => {
    if (incrementalUpdater.isUpdating.value) {
      return incrementalUpdater.updateProgress.value
    }
    return standardUpdater.downloadProgress.value
  })
  
  const downloadSpeed = computed(() => {
    return incrementalUpdater.downloadSpeed.value
  })
  
  // 智能更新检查
  const checkForUpdate = async (silent = false): Promise<UnifiedUpdateInfo | null> => {
    try {
      if (!silent) {
        console.log('🔍 开始智能更新检查...')
      }
      
      // 首先尝试增量更新检查
      if (updateMode.value === 'auto' || updateMode.value === 'incremental') {
        try {
          const incrementalUpdate = await incrementalUpdater.checkForUpdate(silent)
          
          if (incrementalUpdate && incrementalUpdate.incrementalAvailable) {
            const unifiedInfo: UnifiedUpdateInfo = {
              version: incrementalUpdate.version,
              date: incrementalUpdate.date,
              body: incrementalUpdate.body,
              currentVersion: incrementalUpdate.currentVersion,
              available: true,
              isIncremental: true,
              estimatedSavings: incrementalUpdate.estimatedSavings,
              downloadSize: incrementalUpdater.updateStats.value?.downloadSize,
              method: 'incremental'
            }
            
            currentUpdateInfo.value = unifiedInfo
            
            if (!silent) {
              console.log(`🚀 增量更新可用: v${incrementalUpdate.version}，可节省 ${incrementalUpdate.estimatedSavings}% 下载量`)
              await sendNotification(
                '🚀 增量更新可用',
                `发现新版本 v${incrementalUpdate.version}，增量更新可节省 ${incrementalUpdate.estimatedSavings}% 下载量！`
              )
            }
            
            return unifiedInfo
          }
        } catch (error) {
          console.warn('⚠️ 增量更新检查失败，回退到标准更新检查:', error)
          if (!silent) {
            await sendNotification(
              '⚠️ 网络连接问题',
              '增量更新检查失败，正在尝试标准更新检查...'
            )
          }
          // 继续执行标准更新检查
        }
      }
      
      // 如果增量更新不可用，尝试标准更新
      if (updateMode.value === 'auto' || updateMode.value === 'standard') {
        const hasStandardUpdate = await standardUpdater.checkForUpdates(silent)
        
        if (hasStandardUpdate && standardUpdater.updateInfo.value) {
          const updateInfo = standardUpdater.updateInfo.value
          const unifiedInfo: UnifiedUpdateInfo = {
            version: updateInfo.version,
            date: updateInfo.date,
            body: updateInfo.body,
            currentVersion: updateInfo.currentVersion,
            available: true,
            isIncremental: false,
            method: 'full'
          }
          
          currentUpdateInfo.value = unifiedInfo
          
          if (!silent) {
            console.log(`📦 标准更新可用: v${updateInfo.version}`)
            await sendNotification(
              '📦 标准更新可用',
              `发现新版本 v${updateInfo.version}，将使用完整更新包`
            )
          }
          
          return unifiedInfo
        }
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
  
  // 执行更新
  const installUpdate = async (): Promise<boolean> => {
    if (!currentUpdateInfo.value) {
      console.warn('⚠️ 没有可用的更新')
      return false
    }
    
    try {
      const updateInfo = currentUpdateInfo.value
      
      if (updateInfo.isIncremental) {
        console.log('🚀 执行增量更新...')
        await sendNotification(
          '🚀 开始增量更新',
          `正在下载增量补丁，可节省 ${updateInfo.estimatedSavings}% 下载量`
        )
        
        await incrementalUpdater.installUpdates()
        return true
      } else {
        console.log('📦 执行标准更新...')
        await sendNotification(
          '📦 开始标准更新',
          '正在下载完整更新包'
        )
        
        return await standardUpdater.downloadAndInstallUpdate()
      }
    } catch (error) {
      console.error('❌ 更新安装失败:', error)
      await sendNotification(
        '❌ 更新失败',
        error instanceof Error ? error.message : '未知错误'
      )
      return false
    }
  }
  
  // 设置更新模式
  const setUpdateMode = (mode: 'auto' | 'standard' | 'incremental') => {
    updateMode.value = mode
    console.log(`🔧 更新模式设置为: ${mode}`)
  }
  
  // 重置状态
  const resetUpdateState = () => {
    currentUpdateInfo.value = null
    standardUpdater.resetUpdateState()
    // incrementalUpdater 没有重置方法，但状态会自动管理
  }
  
  // 格式化更新信息
  const formatUpdateInfo = computed(() => {
    if (!currentUpdateInfo.value) return null
    
    const info = currentUpdateInfo.value
    return {
      title: info.isIncremental ? '增量更新可用' : '标准更新可用',
      version: `v${info.version}`,
      description: info.isIncremental 
        ? `增量更新 - 节省 ${info.estimatedSavings}% 下载量`
        : '完整更新包下载',
      size: info.downloadSize || '计算中...',
      method: info.method,
      savings: info.estimatedSavings || 0,
      changeLog: info.body || '版本更新说明'
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
    downloadSpeed: readonly(downloadSpeed),
    currentUpdateInfo: readonly(currentUpdateInfo),
    updateMode: readonly(updateMode),
    
    // 配置
    enableAutoCheck,
    
    // 计算属性
    formatUpdateInfo,
    
    // 方法
    checkForUpdate,
    installUpdate,
    setUpdateMode,
    resetUpdateState,
    
    // 底层更新器访问（用于高级操作）
    standardUpdater,
    incrementalUpdater
  }
} 