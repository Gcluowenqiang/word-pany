import { ref, onMounted, onUnmounted, watch } from 'vue'
import { register, unregister, isRegistered, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { useSettingsStore } from '../stores/settingsStore'

export interface HotkeyConfig {
  [key: string]: string
}

export interface HotkeyCallbacks {
  onNextWord?: () => void
  onPreviousWord?: () => void
  onPlayPronunciation?: () => void
  onTogglePause?: () => void
  onToggleWindow?: () => void
  onMarkMastered?: () => void
  onShowSettings?: () => void
}

export function useHotkeys(callbacks: HotkeyCallbacks) {
  const settingsStore = useSettingsStore()
  const isEnabled = ref(true)
  const registeredKeys = ref<string[]>([])
  const isRegistering = ref(false) // 防止并发注册的锁
  
  // 从设置中获取快捷键配置
  const getCurrentHotkeys = (): HotkeyConfig => {
    const settings = settingsStore.settings
    if (!settings.enableHotkeys) {
      return {} // 如果禁用快捷键，返回空配置
    }
    
    // 过滤掉空的和无效的快捷键配置
    const filteredHotkeys: HotkeyConfig = {}
    Object.entries(settings.hotkeys).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        // 验证快捷键格式
        if (validateShortcut(value)) {
          filteredHotkeys[key] = value
        } else {
          console.warn(`⚠️ 跳过无效快捷键配置: ${key} = ${value}`)
        }
      }
    })
    
    return filteredHotkeys
  }

  // 注册单个快捷键（简化版本，主要用于兼容性）
  const registerHotkey = async (action: string, shortcut: string, callback: () => void) => {
    const normalizedShortcut = normalizeTauriShortcut(shortcut)
    console.log(`🔄 注册单个快捷键: ${action} -> ${shortcut} (规范化: ${normalizedShortcut})`)
    
    try {
      // 🎯 关键修复：只在按键按下时触发，忽略松开事件
      await register(normalizedShortcut, (event: any) => {
        if (event?.state === 'Pressed') {
          console.log(`🎮 快捷键触发 (${action}): 状态=${event.state}`)
          callback()
        } else {
          console.log(`🔕 忽略快捷键松开事件 (${action}): 状态=${event?.state || 'unknown'}`)
        }
      })
      if (!registeredKeys.value.includes(normalizedShortcut)) {
        registeredKeys.value.push(normalizedShortcut)
      }
      console.log(`✅ 单个快捷键注册成功: ${action}`)
      return true
    } catch (error) {
      console.error(`❌ 单个快捷键注册失败: ${action}`, error)
      return false
    }
  }

  // 注销单个快捷键
  const unregisterHotkey = async (shortcut: string) => {
    try {
      await unregister(shortcut)
      registeredKeys.value = registeredKeys.value.filter(key => key !== shortcut)
      console.log(`快捷键注销成功: ${shortcut}`)
      return true
    } catch (error) {
      console.error(`快捷键注销失败: ${shortcut}`, error)
      return false
    }
  }

  // 注册所有快捷键
  const registerAllHotkeys = async () => {
    if (isRegistering.value) {
      console.log('⏳ 快捷键注册正在进行中，跳过重复调用')
      return
    }
    
    if (!isEnabled.value || !settingsStore.settings.enableHotkeys) {
      console.log('快捷键已禁用，跳过注册')
      return
    }

    isRegistering.value = true
    console.log('🔒 开始快捷键批量注册')
    
    try {
      // 先完全清理所有快捷键，确保没有残留的重复注册
      console.log('🧹 清理所有现有快捷键')
      await unregisterAllHotkeys()
      
      const currentHotkeys = getCurrentHotkeys()
      console.log('📋 准备注册的快捷键:', currentHotkeys)
      
      const actions = [
        { action: 'nextWord', callback: callbacks.onNextWord },
        { action: 'previousWord', callback: callbacks.onPreviousWord },
        { action: 'playPronunciation', callback: callbacks.onPlayPronunciation },
        { action: 'togglePause', callback: callbacks.onTogglePause },
        { action: 'toggleWindow', callback: callbacks.onToggleWindow },
        { action: 'markMastered', callback: callbacks.onMarkMastered },
        { action: 'showSettings', callback: callbacks.onShowSettings }
      ]

      for (const { action, callback } of actions) {
        if (callback && currentHotkeys[action]) {
          const normalizedShortcut = normalizeTauriShortcut(currentHotkeys[action])
          console.log(`🔄 直接注册快捷键: ${action} -> ${currentHotkeys[action]} (规范化: ${normalizedShortcut})`)
          
          try {
            // 🎯 关键修复：只在按键按下时触发，忽略松开事件
            await register(normalizedShortcut, (event: any) => {
              if (event?.state === 'Pressed') {
                console.log(`🎮 快捷键触发 (${action}): 状态=${event.state}`)
                callback()
              } else {
                console.log(`🔕 忽略快捷键松开事件 (${action}): 状态=${event?.state || 'unknown'}`)
              }
            })
            registeredKeys.value.push(normalizedShortcut)
            console.log(`✅ 快捷键注册成功: ${action}`)
          } catch (error) {
            console.error(`❌ 快捷键注册失败: ${action}`, error)
          }
        }
      }
      
      console.log('🔓 快捷键批量注册完成')
      console.log('📋 最终已注册快捷键列表:', registeredKeys.value)
    } finally {
      isRegistering.value = false
    }
  }

  // 注销所有快捷键
  const unregisterAllHotkeys = async () => {
    try {
      // 使用 Tauri 的 unregisterAll 来确保完全清理
      await unregisterAll()
      console.log('🧹 已清理所有全局快捷键')
    } catch (error) {
      console.warn('⚠️ unregisterAll 失败，尝试逐个注销:', error)
      // 如果 unregisterAll 失败，回退到逐个注销
      for (const shortcut of registeredKeys.value) {
        await unregisterHotkey(shortcut)
      }
    }
    registeredKeys.value = []
  }

  // 更新快捷键配置（保留此方法以保持兼容性，但现在主要由监听器自动处理）
  const updateHotkeys = async () => {
    console.log('手动触发快捷键更新')
    // 先注销旧的快捷键
    await unregisterAllHotkeys()
    
    // 重新注册
    if (isEnabled.value && settingsStore.settings.enableHotkeys) {
      await registerAllHotkeys()
    }
  }

  // 启用/禁用快捷键
  const toggleHotkeys = async (enabled: boolean) => {
    isEnabled.value = enabled
    
    if (enabled && settingsStore.settings.enableHotkeys) {
      await registerAllHotkeys()
    } else {
      await unregisterAllHotkeys()
    }
  }

  // 获取快捷键状态
  const getHotkeyStatus = () => {
    const currentHotkeys = getCurrentHotkeys()
    return {
      enabled: isEnabled.value && settingsStore.settings.enableHotkeys,
      registered: registeredKeys.value.length,
      config: currentHotkeys,
      availableActions: Object.keys(currentHotkeys)
    }
  }

  // 转换快捷键格式为Tauri兼容格式
  const normalizeTauriShortcut = (shortcut: string): string => {
    if (!shortcut || shortcut.trim() === '') return shortcut
    
    const parts = shortcut.split('+')
    const modifiers = parts.slice(0, -1)
    const mainKey = parts[parts.length - 1]
    
    // 转换修饰键
    const normalizedModifiers = modifiers.map(modifier => {
      switch (modifier.toLowerCase()) {
        case 'ctrl':
        case 'control':
          return 'CmdOrCtrl' // 跨平台兼容
        case 'cmd':
        case 'meta':
          return 'Cmd'
        case 'alt':
          return 'Alt'
        case 'shift':
          return 'Shift'
        default:
          return modifier
      }
    })
    
    // 转换主键
    let normalizedMainKey = mainKey
    switch (mainKey.toLowerCase()) {
      case 'down':
        normalizedMainKey = 'ArrowDown'
        break
      case 'up':
        normalizedMainKey = 'ArrowUp'
        break
      case 'left':
        normalizedMainKey = 'ArrowLeft'
        break
      case 'right':
        normalizedMainKey = 'ArrowRight'
        break
      case 'space':
        normalizedMainKey = 'Space'
        break
      default:
        // 保持原样
        break
    }
    
    return [...normalizedModifiers, normalizedMainKey].join('+')
  }

  // 验证快捷键格式
  const validateShortcut = (shortcut: string): boolean => {
    if (!shortcut || shortcut.trim() === '') return true // 空快捷键是有效的
    
    const validModifiers = ['CmdOrCtrl', 'Cmd', 'Ctrl', 'Alt', 'Shift', 'Super']
    const parts = shortcut.split('+')
    
    if (parts.length === 0) return false
    
    // 最后一个应该是主键
    const mainKey = parts[parts.length - 1]
    if (!mainKey || mainKey.trim() === '') return false
    
    // 单独的修饰键无效（如只有"ctrl"）
    const lowerMainKey = mainKey.toLowerCase()
    const modifierKeysLower = ['cmdorctrl', 'cmd', 'ctrl', 'alt', 'shift', 'super', 'control', 'meta']
    if (parts.length === 1 && modifierKeysLower.includes(lowerMainKey)) {
      return false
    }
    
    // 前面的应该是修饰键
    const modifiers = parts.slice(0, -1)
    for (const modifier of modifiers) {
      // 大小写不敏感检查
      const normalizedModifier = modifier.charAt(0).toUpperCase() + modifier.slice(1).toLowerCase()
      if (!validModifiers.includes(normalizedModifier) && !validModifiers.includes(modifier)) {
        return false
      }
    }
    
    return true
  }

  // 手动刷新快捷键（供外部调用）
  const refreshHotkeys = async () => {
    if (isRegistering.value) {
      console.log('⏳ 快捷键注册正在进行中，跳过刷新操作')
      return
    }
    
    console.log('🔄 手动刷新快捷键')
    // registerAllHotkeys 已经包含了清理逻辑
    if (isEnabled.value && settingsStore.settings.enableHotkeys) {
      await registerAllHotkeys()
    } else {
      await unregisterAllHotkeys()
    }
    console.log('✅ 快捷键刷新完成')
  }

  // 组件挂载时初始化
  onMounted(async () => {
    console.log('🎯 初始化快捷键系统')
    await registerAllHotkeys()
  })

  // 组件卸载时清理
  onUnmounted(async () => {
    console.log('🎯 销毁快捷键系统')
    await unregisterAllHotkeys()
  })

  return {
    isEnabled,
    registeredKeys,
    registerHotkey,
    unregisterHotkey,
    registerAllHotkeys,
    unregisterAllHotkeys,
    updateHotkeys,
    toggleHotkeys,
    getHotkeyStatus,
    validateShortcut,
    getCurrentHotkeys,
    refreshHotkeys,
    normalizeTauriShortcut
  }
} 