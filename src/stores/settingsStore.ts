import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings } from '../types/settings'

export const useSettingsStore = defineStore('settings', () => {
  // 默认设置
  const defaultSettings: Settings = {
    autoSwitch: false,
    switchInterval: 7,
    alwaysOnTop: false,
    showInTray: true,
    enableTTS: true,
    enableHotkeys: false,    // 默认禁用快捷键
    autoCheckUpdates: false, // 默认禁用自动更新检查
    windowSize: {
      width: 400,
      height: 600,
      aspectRatio: '9:16'
    },
    hotkeys: {
      nextWord: '',           // 默认无快捷键配置
      previousWord: '',
      playPronunciation: '',
      togglePause: '',
      toggleWindow: '',
      markMastered: '',
      showSettings: ''
    },
    theme: {
      mode: 'auto',
      primaryColor: '#667eea',
      backgroundColor: '#ffffff'
    }
  }

  // 状态
  const settings = ref<Settings>({ ...defaultSettings })

  // 方法
  const updateSettings = (newSettings: Partial<Settings>) => {
    console.log('🔄 更新设置:', newSettings)
    console.log('🔄 更新前settings:', JSON.stringify(settings.value, null, 2))
    
    // 深度合并，保持响应式
    Object.keys(newSettings).forEach(key => {
      const newValue = newSettings[key as keyof Settings]
      if (newValue !== undefined) {
        if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
          // 对象类型，深度合并
          if (settings.value[key as keyof Settings] && typeof settings.value[key as keyof Settings] === 'object') {
            Object.assign(settings.value[key as keyof Settings], newValue)
          } else {
            (settings.value as any)[key] = { ...newValue }
          }
        } else {
          // 基础类型，直接赋值
          (settings.value as any)[key] = newValue
        }
      }
    })
    
    console.log('🔄 更新后settings:', JSON.stringify(settings.value, null, 2))
    saveSettings()
  }

  const saveSettings = () => {
    try {
      localStorage.setItem('word-pony-settings', JSON.stringify(settings.value))
      console.log('✅ 设置已保存')
    } catch (error) {
      console.error('❌ 设置保存失败:', error)
    }
  }

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('word-pony-settings')
      if (savedSettings) {
        settings.value = { ...defaultSettings, ...JSON.parse(savedSettings) }
        console.log('✅ 设置已加载')
      }
    } catch (error) {
      console.error('❌ 设置加载失败:', error)
      settings.value = { ...defaultSettings }
    }
  }

  const resetSettings = () => {
    settings.value = { ...defaultSettings }
    saveSettings()
  }

  return {
    // 状态
    settings,
    // 方法
    updateSettings,
    saveSettings,
    loadSettings,
    resetSettings
  }
}) 