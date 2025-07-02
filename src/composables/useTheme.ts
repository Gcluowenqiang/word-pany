import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 主题类型定义
export interface ThemeColors {
  primary: string
  primaryShade: string
  primaryTint: string
  primaryRgb: string
  
  secondary: string
  secondaryShade: string
  secondaryTint: string
  secondaryRgb: string
  
  surface: string
  surfaceVariant: string
  onSurface: string
  onSurfaceVariant: string
  
  background: string
  onBackground: string
  
  success: string
  warning: string
  error: string
  info: string
}

export interface Theme {
  id: string
  name: string
  isDark: boolean
  colors: ThemeColors
  description?: string
}

// 预设主题
const lightTheme: Theme = {
  id: 'light',
  name: '明亮主题',
  isDark: false,
  description: '经典的明亮主题，适合日间使用',
  colors: {
    primary: '#409eff',
    primaryShade: '#337ecc',
    primaryTint: '#66b3ff',
    primaryRgb: '64, 158, 255',
    
    secondary: '#909399',
    secondaryShade: '#73767a',
    secondaryTint: '#a6a9ad',
    secondaryRgb: '144, 147, 153',
    
    surface: '#ffffff',
    surfaceVariant: '#f5f7fa',
    onSurface: '#303133',
    onSurfaceVariant: '#606266',
    
    background: '#f8f9fa',
    onBackground: '#303133',
    
    success: '#67c23a',
    warning: '#e6a23c',
    error: '#f56c6c',
    info: '#909399'
  }
}

const darkTheme: Theme = {
  id: 'dark',
  name: '暗黑主题',
  isDark: true,
  description: '舒适的暗黑主题，护眼且现代化',
  colors: {
    primary: '#409eff',
    primaryShade: '#337ecc',
    primaryTint: '#66b3ff',
    primaryRgb: '64, 158, 255',
    
    secondary: '#909399',
    secondaryShade: '#73767a',
    secondaryTint: '#a6a9ad',
    secondaryRgb: '144, 147, 153',
    
    surface: '#2a2d31',
    surfaceVariant: '#36393f',
    onSurface: '#dcddde',
    onSurfaceVariant: '#b9bbbe',
    
    background: '#1e2124',
    onBackground: '#dcddde',
    
    success: '#67c23a',
    warning: '#e6a23c',
    error: '#f56c6c',
    info: '#909399'
  }
}

const blueTheme: Theme = {
  id: 'blue',
  name: '海洋蓝',
  isDark: false,
  description: '清新的海洋蓝主题，提升专注力',
  colors: {
    primary: '#1890ff',
    primaryShade: '#1370cc',
    primaryTint: '#45a1ff',
    primaryRgb: '24, 144, 255',
    
    secondary: '#52c41a',
    secondaryShade: '#42a015',
    secondaryTint: '#6bd43f',
    secondaryRgb: '82, 196, 26',
    
    surface: '#ffffff',
    surfaceVariant: '#f0f9ff',
    onSurface: '#1c1c1c',
    onSurfaceVariant: '#4a5568',
    
    background: '#f7fafc',
    onBackground: '#1c1c1c',
    
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1890ff'
  }
}

const purpleTheme: Theme = {
  id: 'purple',
  name: '优雅紫',
  isDark: false,
  description: '典雅的紫色主题，激发创造力',
  colors: {
    primary: '#722ed1',
    primaryShade: '#5b25a7',
    primaryTint: '#8e47db',
    primaryRgb: '114, 46, 209',
    
    secondary: '#eb2f96',
    secondaryShade: '#bc2578',
    secondaryTint: '#ef5ba4',
    secondaryRgb: '235, 47, 150',
    
    surface: '#ffffff',
    surfaceVariant: '#f9f0ff',
    onSurface: '#1c1c1c',
    onSurfaceVariant: '#4a5568',
    
    background: '#fafafa',
    onBackground: '#1c1c1c',
    
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#722ed1'
  }
}

const greenTheme: Theme = {
  id: 'green',
  name: '自然绿',
  isDark: false,
  description: '清新的自然绿主题，缓解视觉疲劳',
  colors: {
    primary: '#52c41a',
    primaryShade: '#42a015',
    primaryTint: '#6bd43f',
    primaryRgb: '82, 196, 26',
    
    secondary: '#13c2c2',
    secondaryShade: '#0f9b9b',
    secondaryTint: '#42d4d4',
    secondaryRgb: '19, 194, 194',
    
    surface: '#ffffff',
    surfaceVariant: '#f6ffed',
    onSurface: '#1c1c1c',
    onSurfaceVariant: '#4a5568',
    
    background: '#f9fffe',
    onBackground: '#1c1c1c',
    
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#13c2c2'
  }
}

// 预设主题列表
const presetThemes: Theme[] = [lightTheme, darkTheme, blueTheme, purpleTheme, greenTheme]

export function useTheme() {
  // 当前主题
  const currentTheme = ref<Theme>(lightTheme)
  const availableThemes = ref<Theme[]>([...presetThemes])
  
  // 自动检测系统主题偏好
  const systemPrefersDark = ref(false)
  const autoTheme = ref(true)
  
  // 检测系统主题偏好
  const detectSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      systemPrefersDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      
      // 监听系统主题变化
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        systemPrefersDark.value = e.matches
        if (autoTheme.value) {
          applyAutoTheme()
        }
      })
    }
  }
  
  // 应用自动主题
  const applyAutoTheme = () => {
    const targetTheme = systemPrefersDark.value ? darkTheme : lightTheme
    setTheme(targetTheme)
  }
  
  // 设置主题
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme
    applyThemeToDOM(theme)
    saveThemePreference(theme)
  }
  
  // 应用主题到DOM
  const applyThemeToDOM = (theme: Theme) => {
    const root = document.documentElement
    
    // 应用主色调
    root.style.setProperty('--wp-primary', theme.colors.primary)
    root.style.setProperty('--wp-primary-shade', theme.colors.primaryShade)
    root.style.setProperty('--wp-primary-tint', theme.colors.primaryTint)
    root.style.setProperty('--wp-primary-rgb', theme.colors.primaryRgb)
    
    // 应用次要色
    root.style.setProperty('--wp-secondary', theme.colors.secondary)
    root.style.setProperty('--wp-secondary-shade', theme.colors.secondaryShade)
    root.style.setProperty('--wp-secondary-tint', theme.colors.secondaryTint)
    root.style.setProperty('--wp-secondary-rgb', theme.colors.secondaryRgb)
    
    // 应用表面色
    root.style.setProperty('--wp-surface', theme.colors.surface)
    root.style.setProperty('--wp-surface-variant', theme.colors.surfaceVariant)
    root.style.setProperty('--wp-on-surface', theme.colors.onSurface)
    root.style.setProperty('--wp-on-surface-variant', theme.colors.onSurfaceVariant)
    
    // 应用背景色
    root.style.setProperty('--wp-background', theme.colors.background)
    root.style.setProperty('--wp-on-background', theme.colors.onBackground)
    
    // 应用状态色
    root.style.setProperty('--wp-success', theme.colors.success)
    root.style.setProperty('--wp-warning', theme.colors.warning)
    root.style.setProperty('--wp-error', theme.colors.error)
    root.style.setProperty('--wp-info', theme.colors.info)
    
    // 设置暗黑模式类名
    if (theme.isDark) {
      root.classList.add('wp-dark')
      root.classList.remove('wp-light')
    } else {
      root.classList.add('wp-light')
      root.classList.remove('wp-dark')
    }
    
    // 设置主题类名
    root.classList.forEach(className => {
      if (className.startsWith('wp-theme-')) {
        root.classList.remove(className)
      }
    })
    root.classList.add(`wp-theme-${theme.id}`)
  }
  
  // 保存主题偏好
  const saveThemePreference = (theme: Theme) => {
    try {
      localStorage.setItem('wp-theme-preference', JSON.stringify({
        themeId: theme.id,
        autoTheme: autoTheme.value,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('保存主题偏好失败:', error)
    }
  }
  
  // 加载主题偏好
  const loadThemePreference = () => {
    try {
      const saved = localStorage.getItem('wp-theme-preference')
      if (saved) {
        const preference = JSON.parse(saved)
        autoTheme.value = preference.autoTheme ?? true
        
        if (autoTheme.value) {
          applyAutoTheme()
        } else {
          const savedTheme = availableThemes.value.find(t => t.id === preference.themeId)
          if (savedTheme) {
            setTheme(savedTheme)
          } else {
            setTheme(lightTheme)
          }
        }
      } else {
        // 首次使用，应用自动主题
        applyAutoTheme()
      }
    } catch (error) {
      console.error('加载主题偏好失败:', error)
      setTheme(lightTheme)
    }
  }
  
  // 切换自动主题
  const toggleAutoTheme = (enabled: boolean) => {
    autoTheme.value = enabled
    if (enabled) {
      applyAutoTheme()
    }
    saveThemePreference(currentTheme.value)
  }
  
  // 创建自定义主题
  const createCustomTheme = (customTheme: Omit<Theme, 'id'>) => {
    const theme: Theme = {
      ...customTheme,
      id: `custom-${Date.now()}`
    }
    
    availableThemes.value.push(theme)
    setTheme(theme)
    
    // 保存自定义主题到本地存储
    saveCustomThemes()
    
    return theme
  }
  
  // 删除自定义主题
  const deleteCustomTheme = (themeId: string) => {
    const index = availableThemes.value.findIndex(t => t.id === themeId)
    if (index > -1 && themeId.startsWith('custom-')) {
      availableThemes.value.splice(index, 1)
      
      // 如果删除的是当前主题，切换到默认主题
      if (currentTheme.value.id === themeId) {
        setTheme(lightTheme)
      }
      
      saveCustomThemes()
    }
  }
  
  // 保存自定义主题
  const saveCustomThemes = () => {
    try {
      const customThemes = availableThemes.value.filter(t => t.id.startsWith('custom-'))
      localStorage.setItem('wp-custom-themes', JSON.stringify(customThemes))
    } catch (error) {
      console.error('保存自定义主题失败:', error)
    }
  }
  
  // 加载自定义主题
  const loadCustomThemes = () => {
    try {
      const saved = localStorage.getItem('wp-custom-themes')
      if (saved) {
        const customThemes: Theme[] = JSON.parse(saved)
        availableThemes.value = [...presetThemes, ...customThemes]
      }
    } catch (error) {
      console.error('加载自定义主题失败:', error)
    }
  }
  
  // 计算属性
  const isDarkMode = computed(() => currentTheme.value.isDark)
  const themeColors = computed(() => currentTheme.value.colors)
  const presetThemeList = computed(() => presetThemes)
  const customThemeList = computed(() => 
    availableThemes.value.filter(t => t.id.startsWith('custom-'))
  )
  
  // 初始化
  const initializeTheme = () => {
    detectSystemTheme()
    loadCustomThemes()
    loadThemePreference()
  }
  
  return {
    // 状态
    currentTheme,
    availableThemes,
    autoTheme,
    systemPrefersDark,
    
    // 计算属性
    isDarkMode,
    themeColors,
    presetThemeList,
    customThemeList,
    
    // 方法
    setTheme,
    toggleAutoTheme,
    createCustomTheme,
    deleteCustomTheme,
    initializeTheme
  }
} 