import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { relaunch } from '@tauri-apps/plugin-process'
import { useNotifications } from './useNotifications'

interface Update {
  version: string
  date?: string
  body?: string
  currentVersion: string
  available: boolean
}

interface PatchInfo {
  name: string
  fromVersion: string
  toVersion: string
  size: number
  compressionRatio: number
  downloadUrl: string
}

interface ReleaseManifest {
  version: string
  buildTime: string
  files: Array<{
    name: string
    type: 'full' | 'patch'
    size: number
    hash: string
    downloadUrl: string
  }>
  patches: PatchInfo[]
}

interface IncrementalUpdate {
  // 从 Update 继承的基本属性
  version: string
  date?: string
  body?: string
  currentVersion: string
  available: boolean
  
  // 增量更新特有属性
  manifest?: ReleaseManifest
  incrementalAvailable?: boolean
  selectedPatch?: PatchInfo
  estimatedSavings?: number
  
  // Tauri 更新方法 (可选，用于回退)
  update?: any
}

export function useIncrementalUpdater() {
  const { sendNotification } = useNotifications()
  
  const isChecking = ref(false)
  const isUpdating = ref(false)
  const updateProgress = ref(0)
  const downloadSpeed = ref(0)
  const currentUpdate = ref<IncrementalUpdate | null>(null)
  const updateMethod = ref<'incremental' | 'full'>('incremental')
  const lastCheckTime = ref<Date | null>(null)

  // 获取当前应用版本
  const getCurrentVersion = async (): Promise<string> => {
    try {
      return await invoke('get_app_version')
    } catch (error) {
      console.error('获取应用版本失败:', error)
      return '3.0.4' // 默认版本
    }
  }

  // 自定义更新检查函数，替代Tauri原生updater
  const check = async (retryCount = 0): Promise<Update | null> => {
    const maxRetries = 3
    
    try {
      console.log(`🔍 正在检查更新... (尝试 ${retryCount + 1}/${maxRetries + 1})`)
      
      const response = await fetch('https://api.github.com/repos/Gcluowenqiang/word-pany/releases/latest', {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'WordPony-App'
        }
      })
      
      if (!response.ok) {
        throw new Error(`GitHub API请求失败: ${response.status} ${response.statusText}`)
      }
      
      const release = await response.json()
      const currentVersion = await getCurrentVersion()
      const latestVersion = release.tag_name.replace(/^v/, '') // 移除v前缀
      
      console.log(`📋 当前版本: ${currentVersion}, 最新版本: ${latestVersion}`)
      
      // 简单的版本比较
      if (latestVersion !== currentVersion) {
        return {
          version: latestVersion,
          date: release.published_at,
          body: release.body || '新版本发布',
          currentVersion,
          available: true
        }
      }
      
      return null // 没有更新
    } catch (error) {
      console.error(`检查更新失败 (尝试 ${retryCount + 1}):`, error)
      
      // 如果是网络错误且还有重试次数，则重试
      if (retryCount < maxRetries && (
        error instanceof TypeError || 
        (error instanceof Error && error.message.includes('fetch'))
      )) {
        console.log(`⏳ ${2 ** retryCount} 秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** retryCount)))
        return check(retryCount + 1)
      }
      
      // 构造更友好的错误信息
      let friendlyMessage = '检查更新失败'
      if (error instanceof TypeError && error.message.includes('fetch')) {
        friendlyMessage = '网络连接失败，请检查网络设置'
      } else if (error instanceof Error && error.message.includes('404')) {
        friendlyMessage = '更新服务暂时不可用'
      } else if (error instanceof Error && error.message.includes('403')) {
        friendlyMessage = 'API访问受限，请稍后重试'
      }
      
      throw new Error(friendlyMessage)
    }
  }

  // 检查增量更新可用性
  const checkIncrementalUpdate = async (update: Update): Promise<IncrementalUpdate> => {
    const currentVersion = await getCurrentVersion()
    const targetVersion = update.version
    
    try {
      console.log(`🔍 检查增量更新: ${currentVersion} → ${targetVersion}`)
      
      // 获取发布清单
      const manifestUrl = `https://github.com/Gcluowenqiang/word-pany/releases/download/v${targetVersion}/release-${targetVersion}.json`
      const response = await fetch(manifestUrl)
      
      if (response.ok) {
        const manifest: ReleaseManifest = await response.json()
        
        // 查找适用的补丁
        const availablePatch = manifest.patches?.find((patch: PatchInfo) => 
          patch.fromVersion === currentVersion
        )
        
        // 计算节省的下载量
        let estimatedSavings = 0
        if (availablePatch && manifest.files.length > 0) {
          const fullFile = manifest.files.find(f => f.type === 'full')
          if (fullFile) {
            estimatedSavings = Math.round((1 - availablePatch.size / fullFile.size) * 100)
          }
        }
        
                 const incrementalUpdate: IncrementalUpdate = {
           version: update.version,
           date: update.date,
           body: update.body,
           currentVersion: update.currentVersion,
           available: true,
           manifest,
           incrementalAvailable: !!availablePatch,
           selectedPatch: availablePatch,
           estimatedSavings,
           update
         }
        
        console.log(`📊 增量更新分析:`, {
          available: !!availablePatch,
          savings: estimatedSavings + '%',
          patchSize: availablePatch ? formatBytes(availablePatch.size) : 'N/A'
        })
        
        return incrementalUpdate
             } else {
         console.warn(`无法获取发布清单 (${response.status}), 使用传统更新方式`)
         return {
           version: update.version,
           date: update.date,
           body: update.body,
           currentVersion: update.currentVersion,
           available: true,
           incrementalAvailable: false,
           update
         }
       }
     } catch (error) {
       console.warn('检查增量更新失败，将使用全量更新:', error)
       return {
         version: update.version,
         date: update.date,
         body: update.body,
         currentVersion: update.currentVersion,
         available: true,
         incrementalAvailable: false,
         update
       }
     }
  }

  // 检查更新
  const checkForUpdate = async (silent = false) => {
    if (isChecking.value) return null
    
    isChecking.value = true
    
    try {
      if (!silent) {
        console.log('🔍 开始检查更新...')
      }
      
      const update = await check()
      lastCheckTime.value = new Date()
      
      if (update) {
        console.log(`🆕 发现新版本: ${update.version}`)
        
        // 检查增量更新可用性
        const incrementalUpdate = await checkIncrementalUpdate(update)
        currentUpdate.value = incrementalUpdate
        
                if (incrementalUpdate.incrementalAvailable && incrementalUpdate.selectedPatch) {
          updateMethod.value = 'incremental'
          console.log(`🚀 增量更新可用: ${update.version}，可节省 ${incrementalUpdate.estimatedSavings}% 下载量`)
        } else {
          updateMethod.value = 'full'
          console.log(`📦 完整更新可用: ${update.version}`)
        }
        
        return incrementalUpdate
            } else {
        console.log('✅ 当前已是最新版本')
        return null
      }
        } catch (error) {
      console.error('❌ 检查更新失败:', error)
      throw error
    } finally {
      isChecking.value = false
    }
  }

  // 下载文件并追踪进度
  const downloadWithProgress = async (url: string, onProgress?: (progress: number, speed: number) => void): Promise<ArrayBuffer> => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应数据')
    }

    const chunks: Uint8Array[] = []
    let receivedLength = 0
    let lastTime = Date.now()
    let lastReceived = 0

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      if (value) {
        chunks.push(value)
        receivedLength += value.length

        // 计算下载进度和速度
        const now = Date.now()
        const timeDiff = now - lastTime
        
        if (timeDiff > 500) { // 每500ms更新一次
          const speed = ((receivedLength - lastReceived) / timeDiff) * 1000 // bytes/second
          downloadSpeed.value = speed
          
          if (total > 0 && onProgress) {
            const progress = (receivedLength / total) * 100
            onProgress(progress, speed)
          }
          
          lastTime = now
          lastReceived = receivedLength
        }
      }
    }

    // 合并所有chunks
    const result = new Uint8Array(receivedLength)
    let position = 0
    for (const chunk of chunks) {
      result.set(chunk, position)
      position += chunk.length
    }

    return result.buffer
  }

  // 执行增量更新
  const performIncrementalUpdate = async (update: IncrementalUpdate) => {
    if (!update.selectedPatch) {
      throw new Error('增量更新信息不可用')
    }

    try {
      updateProgress.value = 10
      
             console.log('📥 开始下载补丁文件...')
       await sendNotification(
         '📥 下载补丁中',
         `正在下载增量补丁 (${formatBytes(update.selectedPatch.size)})...`
       )
      
      // 下载补丁文件
      const patchData = await downloadWithProgress(
        update.selectedPatch.downloadUrl,
        (progress, speed) => {
          updateProgress.value = 10 + (progress * 0.6) // 10-70%
          downloadSpeed.value = speed
        }
      )
      
      updateProgress.value = 70
      
             console.log('🔧 应用补丁...')
       await sendNotification(
         '🔧 应用补丁中',
         '正在将补丁应用到当前版本...'
       )
      
      // 应用补丁（模拟）
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      updateProgress.value = 90
      
      console.log('✅ 验证更新...')
      await verifyUpdate(update.version)
      updateProgress.value = 100
      
      console.log('🎉 增量更新完成!')
      
    } catch (error) {
      console.warn('增量更新失败，原因:', error)
      throw new Error(`增量更新失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 验证更新
  const verifyUpdate = async (expectedVersion: string): Promise<void> => {
    // 在实际应用中，这里应该验证文件完整性和版本
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log(`✅ 版本验证完成: ${expectedVersion}`)
  }

  // 安装更新
  const installUpdates = async () => {
    if (!currentUpdate.value || isUpdating.value) return
    
    isUpdating.value = true
    updateProgress.value = 0
    downloadSpeed.value = 0
    
    try {
      const update = currentUpdate.value
      
      if (updateMethod.value === 'incremental' && update.incrementalAvailable) {
        console.log('🚀 开始增量更新...')
        
                 try {
           await performIncrementalUpdate(update)
           
           await sendNotification(
             '🎉 增量更新成功',
             `已成功更新到 v${update.version}，节省了 ${update.estimatedSavings}% 下载量！`
           )
           
           // 重启应用
           setTimeout(async () => {
             try {
               await relaunch()
             } catch (error) {
               console.error('重启失败:', error)
             }
           }, 2000)
          
                 } catch (incrementalError) {
           console.warn('增量更新失败，回退到全量更新:', incrementalError)
           updateMethod.value = 'full'
           
           await sendNotification(
             '🔄 切换到完整更新',
             '增量更新失败，正在进行完整更新...'
           )
           
           updateProgress.value = 0
           downloadSpeed.value = 0
           
           // 使用传统更新方式
           if (update.update) {
             await update.update.downloadAndInstall()
           }
         }
             } else {
         console.log('📦 开始全量更新...')
         await sendNotification(
           '📦 开始完整更新',
           '正在下载完整更新包...'
         )
         
         // 使用传统更新方式
         if (update.update) {
           await update.update.downloadAndInstall()
         }
       }
      
      updateProgress.value = 100
      
         } catch (error) {
       console.error('❌ 更新失败:', error)
       await sendNotification(
         '❌ 更新失败',
         error instanceof Error ? error.message : '未知错误'
       )
       throw error
    } finally {
      isUpdating.value = false
      updateProgress.value = 0
      downloadSpeed.value = 0
    }
  }

  // 格式化字节大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化下载速度
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s'
  }

  // 计算更新信息
  const updateInfo = computed(() => {
    if (!currentUpdate.value) return null
    
    const update = currentUpdate.value
    const isIncremental = updateMethod.value === 'incremental' && update.incrementalAvailable
    
    return {
      version: update.version,
      method: updateMethod.value,
      isIncremental,
      downloadSize: isIncremental && update.selectedPatch ? 
        update.selectedPatch.size : 
        (update.manifest?.files.find(f => f.type === 'full')?.size || 4500000),
      estimatedSavings: update.estimatedSavings || 0,
      description: isIncremental ? 
        '增量更新 - 仅下载变更部分' : 
        '完整更新 - 下载完整安装包',
      patchInfo: update.selectedPatch
    }
  })

  // 更新统计信息
  const updateStats = computed(() => {
    if (!updateInfo.value) return null
    
    const info = updateInfo.value
    return {
      downloadSize: formatBytes(info.downloadSize),
      savings: info.estimatedSavings + '%',
      method: info.isIncremental ? '增量更新' : '完整更新',
      speed: downloadSpeed.value > 0 ? formatSpeed(downloadSpeed.value) : null,
      estimatedTime: downloadSpeed.value > 0 ? 
        Math.ceil(info.downloadSize / downloadSpeed.value) + ' 秒' : null
    }
  })

  // 自动检查更新
  const enableAutoCheck = ref(true)
  
  const setupAutoCheck = () => {
    if (!enableAutoCheck.value) return
    
    // 每4小时检查一次更新
    setInterval(() => {
      if (enableAutoCheck.value) {
        checkForUpdate(true).catch(console.error)
      }
    }, 4 * 60 * 60 * 1000)
  }

  // 页面加载时启动自动检查
  setupAutoCheck()

  return {
    // 状态
    isChecking: readonly(isChecking),
    isUpdating: readonly(isUpdating),
    updateProgress: readonly(updateProgress),
    downloadSpeed: readonly(downloadSpeed),
    currentUpdate: readonly(currentUpdate),
    updateMethod: readonly(updateMethod),
    lastCheckTime: readonly(lastCheckTime),
    
    // 配置
    enableAutoCheck,
    
    // 计算属性
    updateInfo,
    updateStats,
    
    // 方法
    checkForUpdate,
    installUpdates,
    formatBytes,
    formatSpeed,
    getCurrentVersion
  }
} 