import { ref, computed } from 'vue'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

// 更新状态枚举
export enum UpdateStatus {
  IDLE = 'idle',
  CHECKING = 'checking',
  AVAILABLE = 'available',
  DOWNLOADING = 'downloading',
  DOWNLOADED = 'downloaded',
  INSTALLING = 'installing',
  UP_TO_DATE = 'up_to_date',
  ERROR = 'error'
}

// 更新信息接口
export interface UpdateInfo {
  version: string
  date?: string
  body?: string
  currentVersion: string
}

export function useUpdater() {
  // 状态管理
  const updateStatus = ref<UpdateStatus>(UpdateStatus.IDLE)
  const updateInfo = ref<UpdateInfo | null>(null)
  const downloadProgress = ref(0)
  const errorMessage = ref<string>('')
  const isUpdateAvailable = ref(false)

  // 计算属性
  const isChecking = computed(() => updateStatus.value === UpdateStatus.CHECKING)
  const isDownloading = computed(() => updateStatus.value === UpdateStatus.DOWNLOADING)
  const isInstalling = computed(() => updateStatus.value === UpdateStatus.INSTALLING)
  const canCheckUpdate = computed(() => 
    updateStatus.value === UpdateStatus.IDLE || 
    updateStatus.value === UpdateStatus.UP_TO_DATE ||
    updateStatus.value === UpdateStatus.ERROR
  )

  // 检查更新
  const checkForUpdates = async (silent: boolean = false): Promise<boolean> => {
    if (!canCheckUpdate.value) {
      console.warn('⚠️ 更新检查正在进行中，请稍后重试')
      return false
    }

    try {
      updateStatus.value = UpdateStatus.CHECKING
      errorMessage.value = ''
      
      if (!silent) {
        console.log('🔍 开始检查更新...')
      }

      const update = await check()
      
      if (update) {
        updateStatus.value = UpdateStatus.AVAILABLE
        isUpdateAvailable.value = true
        
        updateInfo.value = {
          version: update.version,
          date: update.date,
          body: update.body,
          currentVersion: update.currentVersion
        }

        console.log('🎉 发现新版本:', update.version)
        console.log('📋 更新内容:', update.body)
        
        return true
      } else {
        updateStatus.value = UpdateStatus.UP_TO_DATE
        isUpdateAvailable.value = false
        
        if (!silent) {
          console.log('✅ 当前已是最新版本')
        }
        
        return false
      }
    } catch (error) {
      updateStatus.value = UpdateStatus.ERROR
      errorMessage.value = error instanceof Error ? error.message : '检查更新失败'
      isUpdateAvailable.value = false
      
      console.error('❌ 检查更新失败:', error)
      return false
    }
  }

  // 下载并安装更新
  const downloadAndInstallUpdate = async (): Promise<boolean> => {
    if (updateStatus.value !== UpdateStatus.AVAILABLE) {
      console.warn('⚠️ 没有可用的更新')
      return false
    }

    try {
      updateStatus.value = UpdateStatus.DOWNLOADING
      downloadProgress.value = 0
      
      console.log('📥 开始下载更新...')
      
      const update = await check()
      if (!update) {
        throw new Error('无法获取更新信息')
      }

      // 开始下载
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            console.log('📥 开始下载更新...')
            downloadProgress.value = 0
            break
          case 'Progress':
            // 更新下载进度 - 使用简单的增量方式
            downloadProgress.value = Math.min(downloadProgress.value + 5, 95)
            console.log(`📥 下载进度: ${downloadProgress.value}%`)
            break
          case 'Finished':
            console.log('✅ 下载完成，准备安装...')
            downloadProgress.value = 100
            updateStatus.value = UpdateStatus.INSTALLING
            break
        }
      })

      console.log('✅ 更新安装完成，准备重启应用...')
      
      // 重启应用
      setTimeout(async () => {
        try {
          await relaunch()
        } catch (error) {
          console.error('❌ 重启应用失败:', error)
          errorMessage.value = '重启应用失败，请手动重启'
          updateStatus.value = UpdateStatus.ERROR
        }
      }, 1000)

      return true
    } catch (error) {
      updateStatus.value = UpdateStatus.ERROR
      errorMessage.value = error instanceof Error ? error.message : '更新失败'
      
      console.error('❌ 更新失败:', error)
      return false
    }
  }

  // 仅下载更新
  const downloadUpdate = async (): Promise<boolean> => {
    if (updateStatus.value !== UpdateStatus.AVAILABLE) {
      console.warn('⚠️ 没有可用的更新')
      return false
    }

    try {
      updateStatus.value = UpdateStatus.DOWNLOADING
      downloadProgress.value = 0
      
      const update = await check()
      if (!update) {
        throw new Error('无法获取更新信息')
      }

      await update.download((event) => {
        switch (event.event) {
          case 'Started':
            console.log('📥 开始下载更新...')
            break
          case 'Progress':
            // 更新下载进度
            downloadProgress.value = Math.min(downloadProgress.value + 5, 95)
            break
          case 'Finished':
            console.log('✅ 下载完成')
            updateStatus.value = UpdateStatus.DOWNLOADED
            break
        }
      })

      return true
    } catch (error) {
      updateStatus.value = UpdateStatus.ERROR
      errorMessage.value = error instanceof Error ? error.message : '下载失败'
      
      console.error('❌ 下载失败:', error)
      return false
    }
  }

  // 安装已下载的更新
  const installUpdate = async (): Promise<boolean> => {
    if (updateStatus.value !== UpdateStatus.DOWNLOADED) {
      console.warn('⚠️ 更新尚未下载完成')
      return false
    }

    try {
      updateStatus.value = UpdateStatus.INSTALLING
      
      const update = await check()
      if (!update) {
        throw new Error('无法获取更新信息')
      }

      await update.install()
      
      console.log('✅ 更新安装完成，准备重启应用...')
      
      // 重启应用
      setTimeout(async () => {
        try {
          await relaunch()
        } catch (error) {
          console.error('❌ 重启应用失败:', error)
        }
      }, 1000)

      return true
    } catch (error) {
      updateStatus.value = UpdateStatus.ERROR
      errorMessage.value = error instanceof Error ? error.message : '安装失败'
      
      console.error('❌ 安装失败:', error)
      return false
    }
  }

  // 重置状态
  const resetUpdateState = () => {
    updateStatus.value = UpdateStatus.IDLE
    updateInfo.value = null
    downloadProgress.value = 0
    errorMessage.value = ''
    isUpdateAvailable.value = false
  }

  // 格式化更新大小
  const formatUpdateSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化版本信息
  const formatVersionInfo = (info: UpdateInfo): string => {
    const current = info.currentVersion
    const latest = info.version
    return `${current} → ${latest}`
  }

  return {
    // 状态
    updateStatus: readonly(updateStatus),
    updateInfo: readonly(updateInfo),
    downloadProgress: readonly(downloadProgress),
    errorMessage: readonly(errorMessage),
    isUpdateAvailable: readonly(isUpdateAvailable),
    
    // 计算属性
    isChecking,
    isDownloading,
    isInstalling,
    canCheckUpdate,
    
    // 方法
    checkForUpdates,
    downloadAndInstallUpdate,
    downloadUpdate,
    installUpdate,
    resetUpdateState,
    
    // 工具函数
    formatUpdateSize,
    formatVersionInfo,
    
    // 枚举
    UpdateStatus
  }
} 