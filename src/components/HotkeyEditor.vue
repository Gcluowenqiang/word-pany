<template>
  <div class="hotkey-editor">
    <div class="hotkey-display">
      <span class="hotkey-label">{{ label }}:</span>
      <div class="hotkey-value">
        <span v-if="!isEditing" class="current-value">
          {{ currentValue || '未设置' }}
        </span>
        <span v-else class="listening-hint">
          {{ listeningText }}
        </span>
      </div>
      <div class="hotkey-actions">
        <button 
          v-if="!isEditing"
          @click="startListening"
          class="edit-btn"
        >
          编辑
        </button>
        <button 
          v-if="!isEditing && currentValue"
          @click="clearHotkey"
          class="clear-btn"
        >
          清除
        </button>
        <button 
          v-if="isEditing"
          @click="cancelListening"
          class="cancel-btn"
        >
          取消
        </button>
      </div>
    </div>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  label: string
  value: string
}

interface Emits {
  (e: 'update', newValue: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isEditing = ref(false)
const currentValue = ref(props.value)
const listeningText = ref('按下快捷键组合...')
const errorMessage = ref('')
const capturedKeys = ref<string[]>([])

// 监听键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (!isEditing.value) return

  event.preventDefault()
  event.stopPropagation()

  // ESC 键取消编辑
  if (event.key === 'Escape') {
    cancelListening()
    return
  }

  // 收集修饰键
  const modifiers = []
  if (event.ctrlKey) modifiers.push('Ctrl')
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')
  if (event.metaKey) modifiers.push('Cmd')

  // 获取主键
  let mainKey = ''
  if (event.key.length === 1) {
    // 普通字符键
    mainKey = event.key.toUpperCase()
  } else {
    // 特殊键
    switch (event.key) {
      case 'ArrowUp': mainKey = 'Up'; break
      case 'ArrowDown': mainKey = 'Down'; break
      case 'ArrowLeft': mainKey = 'Left'; break
      case 'ArrowRight': mainKey = 'Right'; break
      case ' ': mainKey = 'Space'; break
      case 'Enter': mainKey = 'Enter'; break
      case 'Tab': mainKey = 'Tab'; break
      case 'Backspace': mainKey = 'Backspace'; break
      case 'Delete': mainKey = 'Delete'; break
      case 'Home': mainKey = 'Home'; break
      case 'End': mainKey = 'End'; break
      case 'PageUp': mainKey = 'PageUp'; break
      case 'PageDown': mainKey = 'PageDown'; break
      default:
        if (event.key.startsWith('F') && event.key.length <= 3) {
          mainKey = event.key // F1-F12
        } else {
          mainKey = event.key
        }
    }
  }

  // 忽略单独的修饰键
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
    // 显示提示，但不保存
    const modifierHint = modifiers.length > 0 ? modifiers.join('+') + '+' : ''
    listeningText.value = `${modifierHint}... (继续按主键)`
    return
  }

  // 构建快捷键字符串
  const keyCombo = [...modifiers, mainKey].join('+')
  
  // 验证快捷键有效性
  if (!validateHotkey(keyCombo)) {
    listeningText.value = `❌ 无效快捷键: ${keyCombo}`
    setTimeout(() => {
      cancelListening()
    }, 1500)
    return
  }
  
  // 实时显示
  listeningText.value = `✅ 检测到: ${keyCombo}`
  
  // 延迟保存，给用户看到效果
  setTimeout(() => {
    saveHotkey(keyCombo)
  }, 500)
}

// 开始监听
const startListening = () => {
  isEditing.value = true
  listeningText.value = '按下快捷键组合... (ESC取消)'
  errorMessage.value = ''
  
  // 添加全局键盘监听
  document.addEventListener('keydown', handleKeyDown, true)
}

// 取消监听
const cancelListening = () => {
  isEditing.value = false
  document.removeEventListener('keydown', handleKeyDown, true)
}

// 保存快捷键
const saveHotkey = (keyCombo: string) => {
  try {
    // 验证快捷键格式
    if (!validateHotkey(keyCombo)) {
      errorMessage.value = '无效的快捷键组合'
      cancelListening()
      return
    }

    currentValue.value = keyCombo
    emit('update', keyCombo)
    
    cancelListening()
    console.log(`✅ 快捷键已保存: ${props.label} = ${keyCombo}`)
  } catch (error) {
    errorMessage.value = '保存快捷键失败'
    console.error('保存快捷键失败:', error)
    cancelListening()
  }
}

// 清除快捷键
const clearHotkey = () => {
  currentValue.value = ''
  emit('update', '')
  console.log(`🗑️ 快捷键已清除: ${props.label}`)
}

// 验证快捷键格式
const validateHotkey = (keyCombo: string): boolean => {
  if (!keyCombo || keyCombo.trim() === '') return false
  
  const parts = keyCombo.split('+')
  if (parts.length === 0) return false
  
  // 至少需要一个主键
  const mainKey = parts[parts.length - 1]
  if (!mainKey || mainKey.trim() === '') return false
  
  // 单独的修饰键无效
  const modifierKeys = ['Ctrl', 'Alt', 'Shift', 'Cmd', 'Meta']
  if (parts.length === 1 && modifierKeys.includes(mainKey)) {
    return false
  }
  
  // 验证修饰键格式
  const modifiers = parts.slice(0, -1)
  for (const modifier of modifiers) {
    if (!modifierKeys.includes(modifier)) {
      return false
    }
  }
  
  return true
}

// 组件挂载时同步当前值
onMounted(() => {
  currentValue.value = props.value
})

// 组件卸载时清理事件监听
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown, true)
})

// 监听props变化
import { watch } from 'vue'
watch(() => props.value, (newValue) => {
  currentValue.value = newValue
})
</script>

<style scoped>
.hotkey-editor {
  margin-bottom: 12px;
}

.hotkey-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

.hotkey-label {
  font-weight: bold;
  min-width: 100px;
  color: #333;
}

.hotkey-value {
  flex: 1;
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 3px;
  min-height: 20px;
  display: flex;
  align-items: center;
}

.current-value {
  color: #333;
  font-family: monospace;
}

.listening-hint {
  color: #007acc;
  font-style: italic;
}

.hotkey-actions {
  display: flex;
  gap: 4px;
}

.edit-btn, .clear-btn, .cancel-btn {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: pointer;
  background: #fff;
}

.edit-btn {
  color: #007acc;
  border-color: #007acc;
}

.edit-btn:hover {
  background: #e6f3ff;
}

.clear-btn {
  color: #d9534f;
  border-color: #d9534f;
}

.clear-btn:hover {
  background: #ffe6e6;
}

.cancel-btn {
  color: #666;
  border-color: #999;
}

.cancel-btn:hover {
  background: #f0f0f0;
}

.error-message {
  color: #d9534f;
  font-size: 12px;
  margin-top: 4px;
  padding: 4px;
  background: #ffe6e6;
  border-radius: 3px;
}
</style> 