import { ref, computed, readonly } from 'vue'

export interface SimpleUpdateInfo {
  version: string
  currentVersion: string
  downloadUrl: string
  body?: string
  publishedAt?: string
  assets: {
    name: string
    downloadUrl: string
    size: number
  }[]
}

export function useSimpleUpdater() {
  const isChecking = ref(false)
  const currentUpdateInfo = ref<SimpleUpdateInfo | null>(null)
  const errorMessage = ref('')
  
  // GitHub API配置
  const GITHUB_API_URL = 'https://api.github.com/repos/Gcluowenqiang/word-pany/releases/latest'
  const CURRENT_VERSION = '3.0.11' // 这个应该从应用配置获取
  
  // 版本比较函数
  const compareVersions = (version1: string, version2: string): number => {
    const cleanV1 = version1.replace(/^v/, '')
    const cleanV2 = version2.replace(/^v/, '')
    
    const v1Parts = cleanV1.split('.').map(Number)
    const v2Parts = cleanV2.split('.').map(Number)
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length)
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0
      
      if (v1Part > v2Part) return 1
      if (v1Part < v2Part) return -1
    }
    
    return 0
  }
  
  // 获取当前应用版本
  const getCurrentVersion = async (): Promise<string> => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke('get_app_version') as string
    } catch (error) {
      console.warn('无法获取应用版本，使用默认版本:', error)
      return CURRENT_VERSION
    }
  }
  
  // 检查更新
  const checkForUpdate = async (silent = false): Promise<SimpleUpdateInfo | null> => {
    if (isChecking.value) {
      console.warn('更新检查正在进行中')
      return null
    }
    
    try {
      isChecking.value = true
      errorMessage.value = ''
      
      if (!silent) {
        console.log('🔍 开始检查GitHub更新...')
      }
      
      // 获取当前版本
      const currentVersion = await getCurrentVersion()
      
      // 调用GitHub API
      const response = await fetch(GITHUB_API_URL)
      if (!response.ok) {
        throw new Error(`GitHub API请求失败: ${response.status} ${response.statusText}`)
      }
      
      const releaseData = await response.json()
      
      if (!silent) {
        console.log('📡 GitHub Release数据:', {
          tag_name: releaseData.tag_name,
          name: releaseData.name,
          published_at: releaseData.published_at,
          assets_count: releaseData.assets?.length || 0
        })
      }
      
      const latestVersion = releaseData.tag_name || releaseData.name
      const versionComparison = compareVersions(latestVersion, currentVersion)
      
      if (!silent) {
        console.log('🔄 版本比较:', {
          current: currentVersion,
          latest: latestVersion,
          hasUpdate: versionComparison > 0
        })
      }
      
      if (versionComparison > 0) {
        // 找到exe安装包
        const windowsAsset = releaseData.assets?.find((asset: any) => 
          asset.name.endsWith('.exe') || asset.name.includes('setup')
        )
        
        if (!windowsAsset) {
          throw new Error('未找到Windows安装包')
        }
        
        const updateInfo: SimpleUpdateInfo = {
          version: latestVersion,
          currentVersion,
          downloadUrl: windowsAsset.browser_download_url,
          body: releaseData.body,
          publishedAt: releaseData.published_at,
          assets: releaseData.assets.map((asset: any) => ({
            name: asset.name,
            downloadUrl: asset.browser_download_url,
            size: asset.size
          }))
        }
        
        currentUpdateInfo.value = updateInfo
        
        if (!silent) {
          console.log('🎉 发现新版本:', latestVersion)
        }
        
        return updateInfo
      } else {
        currentUpdateInfo.value = null
        
        if (!silent) {
          console.log('✅ 当前已是最新版本')
        }
        
        return null
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      errorMessage.value = errorMsg
      currentUpdateInfo.value = null
      
      console.error('❌ 更新检查失败:', error)
      throw error
    } finally {
      isChecking.value = false
    }
  }
  
  // 下载并安装更新
  const downloadAndInstall = async (updateInfo?: SimpleUpdateInfo): Promise<boolean> => {
    const info = updateInfo || currentUpdateInfo.value
    if (!info) {
      throw new Error('没有可用的更新信息')
    }
    
    try {
      console.log('📥 开始下载更新:', info.downloadUrl)
      
      // 使用系统默认浏览器打开下载链接
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('open_url', { url: info.downloadUrl })
      
      console.log('✅ 已在浏览器中打开下载链接')
      return true
    } catch (error) {
      console.error('❌ 打开下载链接失败:', error)
      throw error
    }
  }
  
  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // 计算属性
  const hasUpdate = computed(() => currentUpdateInfo.value !== null)
  
  const formattedUpdateInfo = computed(() => {
    if (!currentUpdateInfo.value) return null
    
    const info = currentUpdateInfo.value
    const mainAsset = info.assets.find(asset => asset.name.endsWith('.exe'))
    
    return {
      version: info.version,
      currentVersion: info.currentVersion,
      size: mainAsset ? formatFileSize(mainAsset.size) : '未知',
      publishDate: info.publishedAt ? new Date(info.publishedAt).toLocaleDateString('zh-CN') : '未知',
      changelog: info.body || '无更新说明',
      downloadUrl: info.downloadUrl
    }
  })
  
  // 重置状态
  const reset = () => {
    currentUpdateInfo.value = null
    errorMessage.value = ''
  }
  
  return {
    // 状态
    isChecking: readonly(isChecking),
    hasUpdate,
    currentUpdateInfo: readonly(currentUpdateInfo),
    errorMessage: readonly(errorMessage),
    
    // 计算属性
    formattedUpdateInfo,
    
    // 方法
    checkForUpdate,
    downloadAndInstall,
    compareVersions,
    formatFileSize,
    reset
  }
} 