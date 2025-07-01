<template>
  <div class="settings-view">
    <div class="settings-header">
      <h2>应用设置</h2>
      <el-button @click="$router.go(-1)" :icon="ArrowLeft">返回</el-button>
    </div>

    <!-- 可滚动的设置内容容器 -->
    <div class="settings-scroll-container">
      <div class="settings-content">
        <!-- 学习设置 -->
        <el-card class="setting-card">
          <template #header>
            <span>学习设置</span>
          </template>
          
          <el-form :model="settings" label-width="120px">
            <el-form-item label="自动切换">
              <el-switch v-model="settings.autoSwitch" />
            </el-form-item>
            
            <el-form-item label="切换间隔" v-if="settings.autoSwitch">
              <el-input-number 
                v-model="settings.switchInterval" 
                :min="1" 
                :max="60"
                suffix="秒"
              />
            </el-form-item>
            
            <el-form-item label="启用语音">
              <el-switch v-model="settings.enableTTS" />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 窗口设置 -->
        <el-card class="setting-card">
          <template #header>
            <span>窗口设置</span>
          </template>
          
          <el-form :model="settings" label-width="120px">
            <el-form-item label="窗口置顶">
              <el-switch v-model="settings.alwaysOnTop" />
            </el-form-item>
            
            <el-form-item label="显示托盘">
              <el-switch v-model="settings.showInTray" />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 学习提醒设置 -->
        <el-card class="setting-card">
          <template #header>
            <div class="reminder-header">
              <span>学习提醒设置</span>
              <el-switch 
                v-model="reminderSettings.enabled" 
                @change="onReminderToggle"
              />
            </div>
          </template>
          
          <div v-if="!reminderSettings.enabled" class="reminder-disabled">
            <p>学习提醒功能已禁用，启用后可配置定时提醒</p>
          </div>
          
          <div v-else class="reminder-settings">
            <!-- 权限状态 -->
            <div class="permission-status" v-if="!permissionGranted">
              <el-alert
                title="需要通知权限"
                description="学习提醒功能需要系统通知权限，请点击下方按钮授权"
                type="warning"
                show-icon
                :closable="false"
              />
              <el-button 
                @click="requestPermission" 
                type="primary" 
                style="margin-top: 10px;"
              >
                🔔 授权通知权限
              </el-button>
            </div>
            
            <!-- 基础设置 -->
            <el-form :model="reminderSettings" label-width="120px" v-if="permissionGranted">
              <el-form-item label="提醒间隔">
                <el-input-number 
                  v-model="reminderSettings.interval" 
                  :min="5" 
                  :max="240"
                  @change="onSettingsChange"
                />
                <span style="margin-left: 8px; color: #666;">分钟</span>
              </el-form-item>
              
              <el-form-item label="每日目标">
                <el-input-number 
                  v-model="reminderSettings.dailyGoal" 
                  :min="1" 
                  :max="200"
                  @change="onSettingsChange"
                />
                <span style="margin-left: 8px; color: #666;">个单词</span>
              </el-form-item>
              
              <el-form-item label="学习时间">
                <div class="time-range">
                  <el-time-picker
                    v-model="startTime"
                    format="HH:mm"
                    placeholder="开始时间"
                    @change="onTimeChange"
                  />
                  <span style="margin: 0 8px;">至</span>
                  <el-time-picker
                    v-model="endTime"
                    format="HH:mm"
                    placeholder="结束时间"
                    @change="onTimeChange"
                  />
                </div>
              </el-form-item>
              
              <el-form-item label="学习日期">
                <div class="weekdays-selector">
                  <el-checkbox-group v-model="selectedWeekdays" @change="onWeekdaysChange">
                    <el-checkbox 
                      v-for="(day, index) in weekdayNames" 
                      :key="index"
                      :value="index"
                      :label="day"
                    />
                  </el-checkbox-group>
                </div>
              </el-form-item>
              
              <el-form-item label="提醒标题">
                <el-input 
                  v-model="reminderSettings.title" 
                  @input="onSettingsChange"
                  placeholder="自定义提醒标题"
                />
              </el-form-item>
              
              <el-form-item label="声音提醒">
                <el-switch 
                  v-model="reminderSettings.playSound" 
                  @change="onSettingsChange"
                />
              </el-form-item>
            </el-form>
            
            <!-- 状态显示 -->
            <div v-if="permissionGranted" class="reminder-status">
              <div class="status-item">
                <span class="status-label">提醒状态:</span>
                <el-tag :type="isReminderActive ? 'success' : 'info'">
                  {{ isReminderActive ? '🟢 运行中' : '⚪ 已停止' }}
                </el-tag>
              </div>
              
              <div class="status-item">
                <span class="status-label">今日进度:</span>
                <el-progress 
                  :percentage="progressPercentage" 
                  :status="progressPercentage >= 100 ? 'success' : ''"
                  style="width: 200px;"
                />
                <span style="margin-left: 8px; color: #666;">
                  {{ studiedToday }}/{{ reminderSettings.dailyGoal }}
                </span>
              </div>
              
              <div class="status-item" v-if="remainingWords > 0">
                <span class="status-label">还需学习:</span>
                <el-tag type="warning">{{ remainingWords }} 个单词</el-tag>
              </div>
            </div>
            
            <!-- 测试按钮 -->
            <div v-if="permissionGranted" class="reminder-actions">
              <el-button @click="testNotification" type="primary" size="small">
                🔔 测试通知
              </el-button>
              <el-button @click="sendTestReminder" type="success" size="small">
                📢 测试学习提醒
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 快捷键设置 -->
        <el-card class="setting-card">
          <template #header>
            <div class="hotkey-header">
              <span>快捷键设置</span>
              <el-switch 
                v-model="settings.enableHotkeys" 
                @change="onHotkeysToggle"
              />
            </div>
          </template>
          
          <div v-if="!settings.enableHotkeys" class="hotkey-disabled">
            <p>快捷键功能已禁用，启用后可配置各项快捷键</p>
          </div>
          
          <div v-else class="hotkey-editors">
            <HotkeyEditor
              label="下一个单词"
              :value="settings.hotkeys.nextWord"
              @update="(value) => updateHotkey('nextWord', value)"
            />
            
            <HotkeyEditor
              label="上一个单词"
              :value="settings.hotkeys.previousWord"
              @update="(value) => updateHotkey('previousWord', value)"
            />
            
            <HotkeyEditor
              label="播放发音"
              :value="settings.hotkeys.playPronunciation"
              @update="(value) => updateHotkey('playPronunciation', value)"
            />
            
            <HotkeyEditor
              label="暂停/继续"
              :value="settings.hotkeys.togglePause"
              @update="(value) => updateHotkey('togglePause', value)"
            />
            
            <HotkeyEditor
              label="切换窗口"
              :value="settings.hotkeys.toggleWindow"
              @update="(value) => updateHotkey('toggleWindow', value)"
            />
            
            <HotkeyEditor
              label="复制单词"
              :value="settings.hotkeys.markMastered"
              @update="(value) => updateHotkey('markMastered', value)"
            />
            
            <HotkeyEditor
              label="打开设置"
              :value="settings.hotkeys.showSettings"
              @update="(value) => updateHotkey('showSettings', value)"
            />
          </div>
          
            <div v-if="settings.enableHotkeys" class="hotkey-tips">
              <div class="hotkey-suggestions">
                <h5>🎯 推荐快捷键组合（较少冲突）：</h5>
                <div class="suggestion-grid">
                  <span class="suggestion-item">Ctrl+J/K</span>
                  <span class="suggestion-item">Alt+N/P</span>
                  <span class="suggestion-item">Ctrl+;</span>
                  <span class="suggestion-item">Alt+Space</span>
                  <span class="suggestion-item">F9-F12</span>
                  <span class="suggestion-item">Ctrl+Shift+字母</span>
                </div>
                <p class="suggestion-note">
                  <strong>⚠️ 避免使用</strong>：Ctrl+方向键（系统滚动）、Ctrl+C/V/X（复制粘贴）、Alt+Tab（切换窗口）等常用系统快捷键
                </p>
              </div>
            </div>
        </el-card>

        <!-- 自动更新管理 -->
        <el-card class="setting-card">
          <template #header>
            <span>🔄 自动更新管理</span>
          </template>
          
          <el-form :model="{ autoCheckUpdates }" label-width="120px">
            <el-form-item label="自动检查更新">
              <el-switch
                v-model="autoCheckUpdates"
                @change="handleAutoUpdateChange"
                active-text="启用"
                inactive-text="禁用"
              />
              <div class="help-text">
                启用后将在应用启动时自动检查更新
              </div>
            </el-form-item>
            
            <el-form-item label="检查更新">
              <el-button 
                type="primary" 
                @click="checkForUpdates"
                :loading="isCheckingUpdate"
                size="default"
              >
                立即检查
              </el-button>
              <span v-if="updateCheckResult" class="update-result">
                {{ updateCheckResult }}
              </span>
            </el-form-item>
            
            <!-- 更新信息显示 -->
            <el-form-item v-if="hasUpdate" label="发现新版本">
              <div class="update-info">
                <el-tag type="success" size="large">{{ updateVersion }}</el-tag>
                <p class="update-description">{{ updateDescription }}</p>
                <div class="update-actions">
                  <el-button 
                    type="primary" 
                    @click="downloadAndInstall"
                    :loading="isUpdating"
                    size="default"
                  >
                    立即更新
                  </el-button>
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 学习进度管理 -->
        <el-card class="setting-card">
          <template #header>
            <span>📊 学习进度管理</span>
          </template>
          
          <el-form :model="{ dailyGoal }" label-width="120px">
            <el-form-item label="每日学习目标">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-input-number 
                  v-model="dailyGoal"
                  :min="1" 
                  :max="100"
                  @change="updateDailyGoal"
                />
                <span style="color: #666;">个单词</span>
              </div>
            </el-form-item>
            
            <el-form-item label="学习统计">
              <div class="progress-stats-grid" v-if="learningStats">
                <div class="stat-card">
                  <div class="stat-label">总词汇量</div>
                  <div class="stat-value">{{ learningStats.total_words }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">已学习</div>
                  <div class="stat-value">{{ learningStats.learned_words }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">已掌握</div>
                  <div class="stat-value">{{ learningStats.mastered_words }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">正确率</div>
                  <div class="stat-value">{{ Math.round(learningStats.correct_rate) }}%</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">平均掌握度</div>
                  <div class="stat-value">{{ Math.round(learningStats.average_mastery) }}%</div>
                </div>
              </div>
            </el-form-item>
            
            <el-form-item label="数据备份">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; gap: 12px;">
                  <el-button 
                    @click="exportProgress" 
                    type="success"
                    :loading="isExporting"
                    :icon="isExporting ? '' : 'Upload'"
                  >
                    {{ isExporting ? '导出中...' : '📤 导出进度' }}
                  </el-button>
                  <el-button 
                    @click="importProgress" 
                    type="warning"
                    :loading="isImporting"
                    :icon="isImporting ? '' : 'Download'"
                  >
                    {{ isImporting ? '导入中...' : '📥 导入进度' }}
                  </el-button>
                </div>
                <div style="color: #666; font-size: 12px;">
                  可以导出学习进度到JSON文件进行备份，或从备份文件恢复学习数据
                </div>
              </div>
            </el-form-item>
            
            <el-form-item label="进度重置">
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <el-button 
                  @click="showResetConfirm = true" 
                  type="danger"
                  :icon="'Delete'"
                >
                  🗑️ 重置所有进度
                </el-button>
                <div style="color: #dc3545; font-size: 12px; font-weight: 500;">
                  ⚠️ 此操作将清除所有学习进度数据，请谨慎操作
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </div>

    <!-- 固定在底部的按钮区域 -->
    <div class="settings-footer">
      <el-button @click="resetSettings" type="danger">重置设置</el-button>
      <el-button @click="saveSettings" type="primary">保存设置</el-button>
    </div>

    <!-- 重置确认对话框 -->
    <div v-if="showResetConfirm" class="modal-overlay">
      <div class="modal">
        <h3>确认重置进度</h3>
        <p>您确定要重置所有学习进度吗？此操作不可撤销。</p>
        <div class="modal-actions">
          <button @click="showResetConfirm = false" class="cancel-btn">
            取消
          </button>
          <button @click="resetAllProgress" class="confirm-btn">
            确认重置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useSettingsStore } from '../stores/settingsStore'
import { ElMessage } from 'element-plus'
import HotkeyEditor from '../components/HotkeyEditor.vue'
import { useNotifications } from '../composables/useNotifications'
import { useProgress } from '../composables/useProgress'
import { save, open } from '@tauri-apps/plugin-dialog'

const settingsStore = useSettingsStore()
const settings = computed(() => settingsStore.settings)

// 学习提醒功能
const {
  reminderSettings,
  permissionGranted,
  isReminderActive,
  progressPercentage,
  remainingWords,
  studiedToday,
  requestPermission,
  sendNotification,
  sendStudyReminder,
  updateReminderSettings,
  initializeNotifications
} = useNotifications()

// 时间选择器的数据
const startTime = ref<Date>(new Date())
const endTime = ref<Date>(new Date())
const selectedWeekdays = ref<number[]>([])
const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 学习进度管理
const { 
  currentStats: learningStats, 
  setDailyGoal,
  exportProgress: exportProgressData,
  importProgress: importProgressData,
  getLearningStats
} = useProgress()

const dailyGoal = ref(20)
const isExporting = ref(false)
const isImporting = ref(false)
const showResetConfirm = ref(false)

// 自动更新相关变量
const autoCheckUpdates = ref(settings.value.autoCheckUpdates || false)
const isCheckingUpdate = ref(false)
const isUpdating = ref(false)
const hasUpdate = ref(false)
const updateVersion = ref('')
const updateDescription = ref('')
const updateCheckResult = ref('')

// 简单的快捷键格式验证
const validateShortcut = (shortcut: string): boolean => {
  if (!shortcut || shortcut.trim() === '') return true // 空快捷键是有效的
  
  const validModifiers = ['CmdOrCtrl', 'Cmd', 'Ctrl', 'Alt', 'Shift', 'Super']
  const parts = shortcut.split('+')
  
  if (parts.length === 0) return false
  
  // 最后一个应该是主键
  const mainKey = parts[parts.length - 1]
  if (!mainKey || mainKey.trim() === '') return false
  
  // 前面的应该是修饰键
  const modifiers = parts.slice(0, -1)
  for (const modifier of modifiers) {
    if (!validModifiers.includes(modifier)) {
      return false
    }
  }
  
  return true
}

const saveSettings = () => {
  settingsStore.saveSettings()
  // 快捷键现在通过监听器自动更新，无需手动调用
  ElMessage.success('设置已保存')
}

const resetSettings = () => {
  settingsStore.resetSettings()
  // 快捷键现在通过监听器自动更新，无需手动调用
  ElMessage.info('设置已重置')
}

const onHotkeysToggle = (enabled: string | number | boolean) => {
  const isEnabled = Boolean(enabled)
  settingsStore.updateSettings({ enableHotkeys: isEnabled })
  // 快捷键开关变化会通过监听器自动处理
  ElMessage.info(isEnabled ? '快捷键已启用' : '快捷键已禁用')
}

const validateHotkey = (action: string, value: string) => {
  if (!validateShortcut(value)) {
    ElMessage.warning(`快捷键格式错误: ${value}`)
    return false
  }
  // 快捷键配置变化会通过监听器自动重新注册
  return true
}

const updateHotkey = (action: string, value: string) => {
  console.log(`🎹 快捷键更新: ${action} = ${value}`)
  
  // 使用updateSettings触发响应式更新
  const updatedHotkeys = { ...settings.value.hotkeys }
  updatedHotkeys[action as keyof typeof updatedHotkeys] = value
  
  settingsStore.updateSettings({ 
    hotkeys: updatedHotkeys 
  })
  
  // 立即保存设置
  settingsStore.saveSettings()
  
  // 手动刷新快捷键注册
  if ((window as any).refreshHotkeys) {
    ;(window as any).refreshHotkeys()
  }
  
  ElMessage.success(`快捷键已更新: ${action}`)
}

const onHotkeyChange = (action: string, value: string) => {
  console.log(`🎹 快捷键输入变化: ${action} = ${value}`)
  
  // 使用updateSettings触发响应式更新
  const updatedHotkeys = { ...settings.value.hotkeys }
  updatedHotkeys[action as keyof typeof updatedHotkeys] = value
  
  settingsStore.updateSettings({ 
    hotkeys: updatedHotkeys 
  })
}

// 学习提醒相关方法
const onReminderToggle = (enabled: string | number | boolean) => {
  const isEnabled = Boolean(enabled)
  updateReminderSettings({ enabled: isEnabled })
  ElMessage.info(isEnabled ? '📢 学习提醒已启用' : '⏹️ 学习提醒已禁用')
}

const onSettingsChange = () => {
  updateReminderSettings({})
}

const onTimeChange = () => {
  const startHour = startTime.value.getHours()
  const startMin = startTime.value.getMinutes()
  const endHour = endTime.value.getHours()
  const endMin = endTime.value.getMinutes()
  
  updateReminderSettings({
    studyStartTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
    studyEndTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
  })
}

const onWeekdaysChange = () => {
  const weekdays = [false, false, false, false, false, false, false]
  selectedWeekdays.value.forEach(index => {
    weekdays[index] = true
  })
  updateReminderSettings({ weekdays })
}

const testNotification = async () => {
  await sendNotification(
    '🔔 测试通知',
    '这是一个测试通知，如果您看到了这条消息，说明通知功能正常工作！'
  )
}

const sendTestReminder = async () => {
  await sendStudyReminder()
}

// 初始化时间选择器
const initializeTimeSelectors = () => {
  const [startHour, startMin] = reminderSettings.value.studyStartTime.split(':').map(Number)
  const [endHour, endMin] = reminderSettings.value.studyEndTime.split(':').map(Number)
  
  startTime.value = new Date()
  startTime.value.setHours(startHour, startMin, 0, 0)
  
  endTime.value = new Date()
  endTime.value.setHours(endHour, endMin, 0, 0)
  
  // 设置选中的星期
  selectedWeekdays.value = reminderSettings.value.weekdays
    .map((selected, index) => selected ? index : -1)
    .filter(index => index !== -1)
}

// 消息提示函数
const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  ElMessage({
    message,
    type,
    duration: 3000
  })
}

// 更新每日目标
const updateDailyGoal = async () => {
  const success = await setDailyGoal(dailyGoal.value)
  if (success) {
    showMessage('每日学习目标已更新', 'success')
  } else {
    showMessage('更新学习目标失败', 'error')
  }
}

// 导出学习进度
const exportProgress = async () => {
  try {
    isExporting.value = true
    
         // 使用文件选择对话框
    const filePath = await save({
      title: '导出学习进度',
      defaultPath: `WordPony学习进度_${new Date().toISOString().split('T')[0]}.json`,
      filters: [{
        name: 'JSON文件',
        extensions: ['json']
      }]
    })
    
    if (filePath) {
      const success = await exportProgressData(filePath)
      if (success) {
        showMessage('学习进度导出成功', 'success')
      } else {
        showMessage('导出学习进度失败', 'error')
      }
    }
  } catch (error) {
    console.error('导出进度失败:', error)
    showMessage('导出学习进度失败', 'error')
  } finally {
    isExporting.value = false
  }
}

// 导入学习进度
const importProgress = async () => {
  try {
    isImporting.value = true
    
         // 使用文件选择对话框
     // const { open } = await import('@tauri-apps/plugin-dialog')
    const filePath = await open({
      title: '导入学习进度',
      multiple: false,
      filters: [{
        name: 'JSON文件',
        extensions: ['json']
      }]
    })
    
    if (filePath) {
      const success = await importProgressData(filePath as string)
      if (success) {
        showMessage('学习进度导入成功', 'success')
        // 重新加载学习统计
        await getLearningStats()
      } else {
        showMessage('导入学习进度失败', 'error')
      }
    }
  } catch (error) {
    console.error('导入进度失败:', error)
    showMessage('导入学习进度失败', 'error')
  } finally {
    isImporting.value = false
  }
}

// 重置所有进度
const resetAllProgress = async () => {
  try {
    // 这里需要调用后端API来重置进度
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('reset_all_progress')
    
    showMessage('所有学习进度已重置', 'success')
    showResetConfirm.value = false
    
    // 重新加载统计数据
    await getLearningStats()
  } catch (error) {
    console.error('重置进度失败:', error)
    showMessage('重置学习进度失败', 'error')
  }
}

// 自动更新相关方法
const handleAutoUpdateChange = (enabled: string | number | boolean) => {
  const isEnabled = Boolean(enabled)
  settingsStore.updateSettings({ autoCheckUpdates: isEnabled })
  showMessage(isEnabled ? '已启用自动检查更新' : '已关闭自动检查更新', 'success')
}

// 检查更新
const checkForUpdates = async () => {
  isCheckingUpdate.value = true
  updateCheckResult.value = ''
  
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    
    console.log('🔍 开始检查更新...')
    const update = await check()
    
    if (update) {
      hasUpdate.value = true
      updateVersion.value = update.version
      updateDescription.value = update.body || '发现新版本，建议立即更新'
      updateCheckResult.value = `发现新版本: ${update.version}`
      showMessage('发现新版本，请查看更新详情', 'info')
    } else {
      hasUpdate.value = false
      updateCheckResult.value = '当前已是最新版本'
      showMessage('当前已是最新版本', 'success')
    }
  } catch (error) {
    console.error('❌ 检查更新失败:', error)
    updateCheckResult.value = '检查更新失败'
    showMessage('检查更新失败，请稍后重试', 'error')
  } finally {
    isCheckingUpdate.value = false
  }
}

// 下载并安装更新
const downloadAndInstall = async () => {
  isUpdating.value = true
  
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const { relaunch } = await import('@tauri-apps/plugin-process')
    
    console.log('📥 开始下载更新...')
    const update = await check()
    
    if (!update) {
      throw new Error('无法获取更新信息')
    }

    // 下载并安装更新
    await update.downloadAndInstall()
    
    showMessage('更新下载完成，即将重启应用...', 'success')
    
    // 延迟重启
    setTimeout(async () => {
      try {
        await relaunch()
      } catch (error) {
        console.error('❌ 重启应用失败:', error)
        showMessage('重启应用失败，请手动重启', 'error')
      }
    }, 2000)
    
  } catch (error) {
    console.error('❌ 更新失败:', error)
    showMessage('更新失败，请稍后重试', 'error')
  } finally {
    isUpdating.value = false
  }
}

// 初始化
onMounted(async () => {
  await initializeNotifications()
  initializeTimeSelectors()
  
  // 加载学习统计数据
  await getLearningStats()
  
  // 从统计数据中获取当前的每日目标
  if (learningStats.value) {
    dailyGoal.value = learningStats.value.daily_goal
  }
})
</script>

<style scoped>
.settings-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.settings-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.settings-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* 可滚动的设置内容容器 */
.settings-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
}

.settings-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: fit-content;
}

.setting-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: none;
}

.setting-card :deep(.el-card__header) {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 12px 16px;
}

.setting-card :deep(.el-card__body) {
  padding: 16px;
}

.hotkey-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.hotkey-disabled {
  text-align: center;
  padding: 20px;
  color: #666;
  background: #f8f9fa;
  border-radius: 6px;
}

.hotkey-tips {
  margin-top: 16px;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 6px;
  border: 1px solid #d4edda;
}

.hotkey-tips h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
}

.hotkey-tips ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #555;
}

.hotkey-tips li {
  margin-bottom: 4px;
}

/* 固定底部按钮区域 */
.settings-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-form-item__label) {
  font-size: 14px;
  color: #555;
}

:deep(.el-input__inner) {
  font-size: 14px;
}

:deep(.el-button) {
  font-size: 14px;
  padding: 8px 16px;
}

/* HotkeyEditor样式 */
.hotkey-editors {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 快捷键建议样式 */
.hotkey-suggestions {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.hotkey-suggestions h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #333;
}

.suggestion-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.suggestion-item {
  padding: 2px 6px;
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  color: #1976d2;
}

.suggestion-note {
  margin: 0;
  font-size: 11px;
  color: #666;
  line-height: 1.4;
}

/* 学习提醒设置样式 */
.reminder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.reminder-disabled {
  text-align: center;
  padding: 20px;
  color: #666;
  background: #f8f9fa;
  border-radius: 6px;
}

.reminder-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.permission-status {
  padding: 12px;
  background: #fff7e6;
  border-radius: 6px;
  border: 1px solid #ffd591;
}

.time-range {
  display: flex;
  align-items: center;
}

.weekdays-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weekdays-selector .el-checkbox {
  margin-right: 0;
}

.reminder-status {
  padding: 16px;
  background: #f0f8ff;
  border-radius: 6px;
  border: 1px solid #d4edda;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
  min-width: 80px;
}

.reminder-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stats-summary {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid #e9ecef;
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-value {
  font-weight: bold;
  color: #007bff;
}

.backup-controls {
  display: flex;
  gap: 10px;
}

.backup-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.3s;
}

.backup-btn:hover:not(:disabled) {
  background: #0056b3;
}

.backup-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.backup-btn.export {
  background: #28a745;
}

.backup-btn.export:hover:not(:disabled) {
  background: #1e7e34;
}

.backup-btn.import {
  background: #ffc107;
  color: #212529;
}

.backup-btn.import:hover:not(:disabled) {
  background: #e0a800;
}

.danger-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.3s;
}

.danger-btn:hover {
  background: #c82333;
}

.setting-description.warning {
  color: #dc3545;
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 400px;
  text-align: center;
}

.modal h3 {
  color: #dc3545;
  margin-bottom: 15px;
}

.modal p {
  margin-bottom: 20px;
  color: #666;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.cancel-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #5a6268;
}

.confirm-btn:hover {
  background: #c82333;
}

/* 学习进度管理样式 */
.progress-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.stat-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  transition: box-shadow 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #007bff;
}

/* 自动更新样式 */
.help-text {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  line-height: 1.4;
}

.update-result {
  margin-left: 12px;
  font-size: 14px;
  color: #666;
}

.update-info {
  background: #f0f9ff;
  border: 1px solid #e1f5fe;
  border-radius: 8px;
  padding: 16px;
  margin-top: 8px;
}

.update-description {
  margin: 8px 0;
  color: #333;
  line-height: 1.5;
  font-size: 14px;
}

.update-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
</style> 